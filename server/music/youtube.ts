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

  const payload = await youTubeFetch<YouTubeVideosResponse>(
    "videos",
    { part: "snippet,contentDetails,statistics", id: ids.join(",") },
    videosRevalidateSeconds
  );
  const byId = new Map(toVideos(payload.items).map((video) => [video.id, video]));

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

export async function getTrendingMusic() {
  const payload = await youTubeFetch<YouTubeVideosResponse>(
    "videos",
    {
      part: "snippet,contentDetails,statistics",
      chart: "mostPopular",
      videoCategoryId: musicCategoryId,
      regionCode,
      maxResults,
    },
    videosRevalidateSeconds
  );

  return toVideos(payload.items);
}
