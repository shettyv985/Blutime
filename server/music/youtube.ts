import "server-only";

export type YouTubeVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  isLive: boolean;
};

type YouTubeApiError = { code?: number; message?: string; errors?: Array<{ reason?: string }> };

type YouTubeVideoItem = {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
};

type YouTubeSearchResponse = {
  items?: Array<{ id?: { videoId?: string } }>;
  error?: YouTubeApiError;
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
  error?: YouTubeApiError;
};

type YouTubePlaylistItemsResponse = {
  items?: Array<{ contentDetails?: { videoId?: string } }>;
  nextPageToken?: string;
  error?: YouTubeApiError;
};

type YouTubePlaylistsResponse = {
  items?: Array<{ id?: string; snippet?: { title?: string } }>;
  error?: YouTubeApiError;
};

export type YouTubePlaylist = {
  id: string;
  title: string;
  videos: YouTubeVideo[];
};

export class YouTubeSearchError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

// A search costs 100 of the default 10,000 daily quota units; a videos lookup costs 1.
// Next's shared data cache keeps only successful responses, so a quota error is never cached.
const searchRevalidateSeconds = 12 * 60 * 60;
const videosRevalidateSeconds = 60 * 60;
const musicCategoryId = "10";
const regionCode = "IN";
const maxResults = "24";
const playlistRevalidateSeconds = 10 * 60;
const maxPlaylistVideos = 200;
export const youTubePlaylistIdPattern = /^[A-Za-z0-9_-]{10,64}$/;

// The home feed's "All" tab: what's trending in the languages the team listens to, mixed together.
// Each is a search for music published in the last month, most viewed first (100 quota units each,
// cached for 12 hours and shared by everyone, so about 1,000 units a day in total).
const homeFeedLanguages = ["malayalam", "hindi", "tamil", "telugu", "english"];
const homeFeedSongsPerLanguage = 10;
const trendingWindowDays = 30;

function getYouTubeApiKey() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || "";
  if (!apiKey) {
    throw new YouTubeSearchError("YouTube isn't set up yet. Add YOUTUBE_API_KEY to the server environment.", 503);
  }
  return apiKey;
}

function decodeHtmlEntities(text: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => namedEntities[name.toLowerCase()] ?? match);
}

function parseIsoDuration(value: string | undefined) {
  const match = value?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return null;

  const [days, hours, minutes, seconds] = match.slice(1).map((part) => Number(part ?? 0));
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function errorFromResponse(status: number, error: YouTubeApiError | undefined) {
  const reasons = error?.errors?.map((item) => item.reason) ?? [];

  if (reasons.includes("quotaExceeded") || reasons.includes("dailyLimitExceeded")) {
    return new YouTubeSearchError("Today's YouTube search limit is used up. Try a category, or search again tomorrow.", 429);
  }

  if (reasons.includes("playlistNotFound") || status === 404) {
    return new YouTubeSearchError(
      "That playlist couldn't be opened. Make sure it's public or unlisted (YouTube Mixes and private playlists can't be played here).",
      404
    );
  }

  if (reasons.includes("accessNotConfigured") || reasons.includes("forbidden") || status === 403) {
    return new YouTubeSearchError("YouTube isn't enabled for this server's Google API key.", 503);
  }

  return new YouTubeSearchError("YouTube is not responding. Try again in a moment.", 502);
}

async function youTubeFetch<T extends { error?: YouTubeApiError }>(
  path: string,
  params: Record<string, string>,
  revalidate: number
) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", getYouTubeApiKey());

  const response = await fetch(url, { next: { revalidate } });
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw errorFromResponse(response.status, payload?.error);
  }

  return payload;
}

function toVideo(item: YouTubeVideoItem): YouTubeVideo | null {
  if (!item.id) return null;
  const thumbnails = item.snippet?.thumbnails;
  const viewCount = Number(item.statistics?.viewCount);

  return {
    id: item.id,
    title: decodeHtmlEntities(item.snippet?.title ?? "Untitled video"),
    channelTitle: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
    thumbnailUrl: thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    durationSeconds: parseIsoDuration(item.contentDetails?.duration),
    viewCount: Number.isFinite(viewCount) ? viewCount : null,
    isLive: item.snippet?.liveBroadcastContent === "live",
  };
}

function toVideos(items: YouTubeVideoItem[] | undefined) {
  return (items ?? []).map(toVideo).filter((video): video is YouTubeVideo => Boolean(video));
}

async function videosByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const items: YouTubeVideoItem[] = [];
  // The API takes up to 50 IDs per request.
  for (let start = 0; start < ids.length; start += 50) {
    const payload = await youTubeFetch<YouTubeVideosResponse>(
      "videos",
      { part: "snippet,contentDetails,statistics", id: ids.slice(start, start + 50).join(",") },
      videosRevalidateSeconds
    );
    items.push(...(payload.items ?? []));
  }
  const byId = new Map(toVideos(items).map((video) => [video.id, video]));

  return ids.map((id) => byId.get(id)).filter((video): video is YouTubeVideo => Boolean(video));
}

export async function searchYouTube(query: string) {
  const payload = await youTubeFetch<YouTubeSearchResponse>(
    "search",
    {
      part: "id",
      type: "video",
      videoEmbeddable: "true",
      safeSearch: "moderate",
      regionCode,
      maxResults,
      q: query.trim().toLowerCase().replace(/\s+/g, " "),
    },
    searchRevalidateSeconds
  );

  const ids = (payload.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
  return videosByIds(ids);
}

// Most-viewed music in one language from the last month. The start date only changes once a day, so the
// request URL (and its cache entry) stays the same all day.
async function trendingInLanguage(language: string) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - trendingWindowDays);

  const payload = await youTubeFetch<YouTubeSearchResponse>(
    "search",
    {
      part: "id",
      type: "video",
      videoCategoryId: musicCategoryId,
      videoEmbeddable: "true",
      safeSearch: "moderate",
      order: "viewCount",
      publishedAfter: since.toISOString(),
      regionCode,
      maxResults: String(homeFeedSongsPerLanguage),
      q: `${language} songs`,
    },
    searchRevalidateSeconds
  );

  return (payload.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => Boolean(id));
}

export async function getTrendingMusic() {
  const results = await Promise.allSettled(homeFeedLanguages.map(trendingInLanguage));
  const lists = results.map((result) => (result.status === "fulfilled" ? result.value : []));

  if (lists.every((list) => list.length === 0)) {
    const failure = results.find((result) => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    return [];
  }

  // Take turns between languages so the grid is mixed: Malayalam, Hindi, Tamil, Telugu, English, then again.
  const ids: string[] = [];
  for (let position = 0; position < homeFeedSongsPerLanguage; position += 1) {
    for (const list of lists) {
      const id = list[position];
      if (id && !ids.includes(id)) ids.push(id);
    }
  }

  return videosByIds(ids);
}

// The songs of a public or unlisted YouTube playlist, in its own order (1 quota unit per 50 songs).
export async function getYouTubePlaylist(playlistId: string): Promise<YouTubePlaylist> {
  if (/^(RD|UL|LL|WL)/.test(playlistId)) {
    throw new YouTubeSearchError(
      "YouTube Mixes, Liked videos and Watch later can't be played here. Paste a public or unlisted playlist link instead.",
      400
    );
  }

  const meta = await youTubeFetch<YouTubePlaylistsResponse>(
    "playlists",
    { part: "snippet", id: playlistId, maxResults: "1" },
    playlistRevalidateSeconds
  );
  const playlist = meta.items?.[0];
  if (!playlist) throw errorFromResponse(404, undefined);

  const ids: string[] = [];
  let pageToken = "";
  while (ids.length < maxPlaylistVideos) {
    const page = await youTubeFetch<YouTubePlaylistItemsResponse>(
      "playlistItems",
      { part: "contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) },
      playlistRevalidateSeconds
    );
    ids.push(...(page.items ?? []).map((item) => item.contentDetails?.videoId).filter((id): id is string => Boolean(id)));
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  return {
    id: playlistId,
    title: decodeHtmlEntities(playlist.snippet?.title ?? "YouTube playlist"),
    videos: await videosByIds([...new Set(ids)].slice(0, maxPlaylistVideos)),
  };
}
