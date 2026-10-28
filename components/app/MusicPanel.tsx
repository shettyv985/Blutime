"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Video = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  isLive: boolean;
};

type Feed = {
  key: string;
  videos: Video[];
  loading: boolean;
  error: string;
};

type NowPlaying = {
  list: Video[];
  index: number;
};

type YouTubePlayer = {
  loadVideoById: (videoId: string) => void;
  getVideoData: () => { video_id?: string; title?: string; author?: string };
  destroy: () => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number>;
      events?: { onStateChange?: (event: { data: number; target: YouTubePlayer }) => void };
    }
  ) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// YouTube's own site refuses to be framed (X-Frame-Options: SAMEORIGIN), so this panel recreates its
// browse/watch flow with the YouTube Data API and plays videos through the official IFrame Player API.
const homeChip = "All";
const chips = [homeChip, "Malayalam", "Bollywood", "Tamil", "Lofi", "Devotional", "English pop", "Instrumental"];
const chipQueries: Record<string, string> = {
  Malayalam: "malayalam songs",
  Bollywood: "bollywood songs",
  Tamil: "tamil songs",
  Lofi: "lofi music",
  Devotional: "devotional songs",
  "English pop": "english pop songs",
  Instrumental: "instrumental music for work",
};
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const pastedLinkTitle = "YouTube video";

let youTubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  youTubeApiPromise ??= new Promise<YouTubeNamespace>((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT) resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.append(script);
  });

  return youTubeApiPromise;
}

function videoIdFromLink(input: string) {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    let videoId: string | null = null;

    if (host === "youtu.be") videoId = pathParts[0] ?? null;
    if (host === "youtube.com" && pathParts[0] === "watch") videoId = url.searchParams.get("v");
    if (host === "youtube.com" && ["shorts", "live", "embed"].includes(pathParts[0] ?? "")) videoId = pathParts[1] ?? null;

    return videoId && videoIdPattern.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

const viewFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(value: string | null) {
  if (!value) return "";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Number.isNaN(seconds)) return "";

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.trunc(seconds / size), unit);
  }
  return "just now";
}

function videoMeta(video: Video) {
  return [video.viewCount !== null ? `${viewFormatter.format(video.viewCount)} views` : "", timeAgo(video.publishedAt)]
    .filter(Boolean)
    .join(" · ");
}

function Thumbnail({ video, className }: { video: Video; className: string }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-[#272727] ${className}`}>
      {video.thumbnailUrl ? (
        // Remote YouTube thumbnails; next/image would need a remote-image config for these decorative images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : null}
      {video.isLive ? (
        <span className="absolute bottom-1 right-1 rounded bg-[#cc0000] px-1 text-[11px] font-medium text-white">LIVE</span>
      ) : video.durationSeconds ? (
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      ) : null}
    </span>
  );
}

export function MusicPanel() {
  const [view, setView] = useState<"home" | "watch">("home");
  const [activeChip, setActiveChip] = useState<string | null>(homeChip);
  const [query, setQuery] = useState("");
  const [feed, setFeed] = useState<Feed>({ key: homeChip, videos: [], loading: true, error: "" });
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const feedCacheRef = useRef(new Map<string, Video[]>());
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const nowPlayingRef = useRef<NowPlaying | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const currentVideo = nowPlaying ? nowPlaying.list[nowPlaying.index] : null;

  const fetchFeed = useCallback(async (key: string, searchQuery: string) => {
    const cached = feedCacheRef.current.get(key);
    if (cached) {
      setFeed({ key, videos: cached, loading: false, error: "" });
      return;
    }

    const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
    const response = await fetch(`/api/music/videos${params}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { videos?: Video[]; error?: string } | null;

    if (!response.ok || !payload?.videos) {
      setFeed({ key, videos: [], loading: false, error: payload?.error ?? "YouTube is not responding. Try again in a moment." });
      return;
    }

    feedCacheRef.current.set(key, payload.videos);
    setFeed({ key, videos: payload.videos, loading: false, error: "" });
  }, []);

  useEffect(() => {
    void fetchFeed(homeChip, "");
  }, [fetchFeed]);

  const playNext = useCallback(() => {
    const current = nowPlayingRef.current;
    if (current && current.index + 1 < current.list.length) {
      setNowPlaying({ list: current.list, index: current.index + 1 });
    }
  }, []);

  // A pasted link has no Data API details, so take its title and channel from the player once it plays.
  const fillPastedVideoDetails = useCallback((player: YouTubePlayer) => {
    const data = player.getVideoData();
    setNowPlaying((current) => {
      const video = current?.list[current.index];
      if (!current || !video || video.title !== pastedLinkTitle || video.id !== data.video_id || !data.title) return current;
      const list = current.list.map((item, index) =>
        index === current.index ? { ...item, title: data.title ?? item.title, channelTitle: data.author ?? item.channelTitle } : item
      );
      return { list, index: current.index };
    });
  }, []);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
    const videoId = nowPlaying?.list[nowPlaying.index]?.id;
    const host = playerHostRef.current;
    if (!videoId || !host) return;

    if (playerRef.current) {
      if (loadedVideoIdRef.current !== videoId) playerRef.current.loadVideoById(videoId);
      loadedVideoIdRef.current = videoId;
      return;
    }

    let cancelled = false;
    void loadYouTubeApi().then((youTube) => {
      if (cancelled || playerRef.current) return;
      const mount = document.createElement("div");
      host.replaceChildren(mount);
      loadedVideoIdRef.current = videoId;
      playerRef.current = new youTube.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onStateChange: (event) => {
            if (event.data === youTube.PlayerState.ENDED) playNext();
            if (event.data === youTube.PlayerState.PLAYING) fillPastedVideoDetails(event.target);
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [nowPlaying, playNext, fillPastedVideoDetails]);

  useEffect(() => {
    return () => playerRef.current?.destroy();
  }, []);

  function showFeed(key: string, searchQuery: string) {
    setView("home");
    if (feed.key === key && !feed.error) return;
    setFeed({ key, videos: [], loading: true, error: "" });
    void fetchFeed(key, searchQuery);
  }

  function selectChip(chip: string) {
    setActiveChip(chip);
    setQuery("");
    showFeed(chip, chip === homeChip ? "" : chipQueries[chip] ?? chip);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const linkedVideoId = videoIdFromLink(trimmed);

    if (linkedVideoId) {
      play(
        [{ id: linkedVideoId, title: pastedLinkTitle, channelTitle: "", thumbnailUrl: null, publishedAt: null, durationSeconds: null, viewCount: null, isLive: false }],
        0
      );
      setQuery("");
      return;
    }

    if (trimmed.length < 2) return;
    setActiveChip(null);
    showFeed(`search:${trimmed.toLowerCase()}`, trimmed);
  }

  function play(list: Video[], index: number) {
    setNowPlaying({ list, index });
    setView("watch");
  }

  function closePlayer() {
    playerRef.current?.destroy();
    playerRef.current = null;
    loadedVideoIdRef.current = null;
    playerHostRef.current?.replaceChildren();
    setNowPlaying(null);
    setView("home");
  }

  const showMiniPlayer = Boolean(nowPlaying) && view === "home";

  return (
    <div className="premium-panel flex h-[640px] min-w-0 flex-col overflow-hidden md:col-span-2">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3">
        {view === "watch" ? (
          <button
            type="button"
            onClick={() => setView("home")}
            aria-label="Back to home"
            className="flex h-9 w-9 shrink-0 items-center justify-center hover:bg-white/10"
          >
            <i className="ti ti-arrow-left text-lg" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => selectChip(homeChip)}
          className="flex shrink-0 items-center gap-2"
          aria-label="Music home"
        >
          <span aria-hidden="true" className="flex h-6 w-8 items-center justify-center rounded-md bg-[#ff0033]">
            <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
          </span>
          <span className="hidden text-base font-medium tracking-tight sm:inline">Music</span>
        </button>

        <form onSubmit={submitSearch} role="search" className="ml-auto flex min-w-0 max-w-xl flex-1">
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-[#303030] bg-[#121212] pl-4 focus-within:border-[#1c62b9]">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search YouTube"
              className="min-h-0! min-w-0 flex-1 rounded-none! border-0! bg-transparent! py-2 text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-9 w-14 shrink-0 items-center justify-center border-l border-[#303030] bg-[#222222]! hover:bg-[#303030]!"
            >
              <i className="ti ti-search text-lg" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="relative min-h-0 flex-1">
        {view === "home" ? (
          <div className={`scroll-area absolute inset-0 overflow-auto px-4 ${showMiniPlayer ? "pb-[236px]" : "pb-4"}`}>
            <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => selectChip(chip)}
                  className={`shrink-0 rounded-lg! px-3 py-1.5 text-sm ${
                    activeChip === chip ? "bg-white! text-black!" : "bg-white/10! hover:bg-white/20!"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {feed.loading ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index}>
                    <div className="aspect-video animate-pulse rounded-xl bg-[#272727]" />
                    <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-[#272727]" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#272727]" />
                  </div>
                ))}
              </div>
            ) : feed.error ? (
              <div className="flex flex-col items-start gap-3 py-6">
                <p className="text-sm text-[var(--accent-breeze)]">{feed.error}</p>
                <button
                  type="button"
                  onClick={() => showFeed(feed.key, feed.key === homeChip ? "" : feed.key.replace(/^search:/, ""))}
                  className="border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Try again
                </button>
              </div>
            ) : feed.videos.length === 0 ? (
              <p className="py-6 text-sm text-muted">No videos found. Try another search.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                {feed.videos.map((video, index) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => play(feed.videos, index)}
                    className="group flex min-w-0 flex-col rounded-none! text-left"
                  >
                    <Thumbnail video={video} className="aspect-video w-full rounded-xl transition-[border-radius] group-hover:rounded-none" />
                    <span className="mt-3 line-clamp-2 text-sm font-medium leading-snug">{video.title}</span>
                    <span className="mt-1 truncate text-xs text-muted">{video.channelTitle}</span>
                    <span className="truncate text-xs text-muted">{videoMeta(video)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {view === "watch" && nowPlaying && currentVideo ? (
          <div className="absolute inset-0 flex flex-col gap-4 p-4 xl:flex-row">
            <div className="flex min-w-0 flex-col xl:flex-1">
              {/* Same size as the player, which sits on top of this space. */}
              <div className="aspect-video w-full shrink-0" />
              <h3 className="mt-3 line-clamp-2 text-base font-medium leading-snug">{currentVideo.title}</h3>
              <p className="mt-1 truncate text-xs text-muted">
                {[currentVideo.channelTitle, videoMeta(currentVideo)].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="scroll-area flex min-h-0 flex-1 flex-col gap-2 overflow-auto xl:w-[300px] xl:flex-none">
              <p className="text-sm font-medium">Up next</p>
              {nowPlaying.list.map((video, index) => {
                const isCurrent = index === nowPlaying.index;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => play(nowPlaying.list, index)}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`flex min-w-0 gap-2 rounded-lg! p-1 text-left ${isCurrent ? "bg-white/10!" : "hover:bg-white/5!"}`}
                  >
                    <Thumbnail video={video} className="aspect-video w-[120px] rounded-lg" />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-xs font-medium leading-snug">{video.title}</span>
                      <span className="mt-1 block truncate text-[11px] text-muted">
                        {isCurrent ? "Now playing" : video.channelTitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* One player for the whole panel: it moves between the watch area and the mini player without reloading. */}
        <div
          className={
            !nowPlaying
              ? "hidden"
              : view === "watch"
                ? "absolute left-4 top-4 z-20 aspect-video w-[calc(100%-32px)] overflow-hidden rounded-xl bg-black xl:w-[calc(100%-348px)]"
                : "absolute bottom-3 right-3 z-20 aspect-video w-[356px] max-w-[calc(100%-24px)] overflow-hidden rounded-xl bg-black shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          }
        >
          <div ref={playerHostRef} className="h-full w-full" />
        </div>

        {showMiniPlayer && currentVideo ? (
          <div className="absolute bottom-[215px] right-3 z-20 flex w-[356px] max-w-[calc(100%-24px)] items-center gap-2 rounded-lg bg-[#212121] px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate text-xs">{currentVideo.title}</span>
            <button type="button" onClick={() => setView("watch")} aria-label="Expand player" className="flex h-7 w-7 items-center justify-center hover:bg-white/10!">
              <i className="ti ti-arrows-maximize" aria-hidden="true" />
            </button>
            <button type="button" onClick={closePlayer} aria-label="Close player" className="flex h-7 w-7 items-center justify-center hover:bg-white/10!">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
