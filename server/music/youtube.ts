import "server-only";

export type YouTubeSearchResult = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
};

export class YouTubeSearchError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

// Each search costs 100 of the default 10,000 daily API units, so repeated searches are served from memory.
const cacheTtlMs = 6 * 60 * 60 * 1000;
const maxCachedQueries = 300;
const searchCache = new Map<string, { expiresAt: number; results: YouTubeSearchResult[] }>();

function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || "";
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

function errorFromResponse(status: number, payload: YouTubeSearchResponse | null) {
  const reasons = payload?.error?.errors?.map((error) => error.reason) ?? [];

  if (reasons.includes("quotaExceeded") || reasons.includes("dailyLimitExceeded")) {
    return new YouTubeSearchError("Today's YouTube search limit is used up. Paste a YouTube link instead, or try again tomorrow.", 429);
  }

  if (reasons.includes("accessNotConfigured") || reasons.includes("forbidden") || status === 403) {
    return new YouTubeSearchError("YouTube search isn't enabled for this server's Google API key.", 503);
  }

  return new YouTubeSearchError("YouTube search failed. Try again in a moment.", 502);
}

export async function searchYouTube(query: string) {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = searchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const apiKey = getYouTubeApiKey();
  if (!apiKey) {
    throw new YouTubeSearchError("YouTube search isn't set up yet. Add YOUTUBE_API_KEY to the server environment.", 503);
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("regionCode", "IN");
  url.searchParams.set("maxResults", "15");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as YouTubeSearchResponse | null;

  if (!response.ok || !payload) {
    throw errorFromResponse(response.status, payload);
  }

  const results = (payload.items ?? [])
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) return null;

      return {
        id,
        title: decodeHtmlEntities(item.snippet?.title ?? "Untitled video"),
        channelTitle: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
      };
    })
    .filter((result): result is YouTubeSearchResult => Boolean(result));

  if (searchCache.size >= maxCachedQueries) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey !== undefined) searchCache.delete(oldestKey);
  }
  searchCache.set(normalizedQuery, { expiresAt: Date.now() + cacheTtlMs, results });

  return results;
}
