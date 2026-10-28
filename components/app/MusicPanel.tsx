"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";

type YouTubeSource = {
  videoId: string | null;
  listId: string | null;
};

type SearchResult = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
};

type NowPlaying = {
  source: YouTubeSource;
  queue: string[];
};

const musicUrlStorageKey = "blu-time-music-url";
// Lofi Girl "Study Sessions". A playlist, because live-stream video IDs change whenever the stream restarts.
const fallbackDefaultUrl = "https://www.youtube.com/playlist?list=PL6NdkXsPL07LBOz-XhgCJJGlI4jarMKzp";
const teamDefaultUrl = process.env.NEXT_PUBLIC_YOUTUBE_DEFAULT_URL?.trim() || fallbackDefaultUrl;
const quickSearches = ["Lofi focus", "Malayalam hits", "Bollywood chill", "Instrumental study"];
const maxQueuedVideos = 20;

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const listIdPattern = /^[A-Za-z0-9_-]{10,}$/;

function parseYouTubeUrl(input: string): YouTubeSource | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const pathParts = url.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = pathParts[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (pathParts[0] === "watch") videoId = url.searchParams.get("v");
    if (["shorts", "live", "embed"].includes(pathParts[0] ?? "") && pathParts[1] !== "videoseries") {
      videoId = pathParts[1] ?? null;
    }
  } else {
    return null;
  }

  const listId = url.searchParams.get("list");
  const source = {
    videoId: videoId && videoIdPattern.test(videoId) ? videoId : null,
    listId: listId && listIdPattern.test(listId) ? listId : null,
  };

  return source.videoId || source.listId ? source : null;
}

function embedUrlFor(nowPlaying: NowPlaying, autoplay: boolean) {
  const { source, queue } = nowPlaying;
  const params = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (autoplay) params.set("autoplay", "1");
  if (source.listId) params.set("list", source.listId);
  // `playlist` makes the embed carry on through the rest of the search results.
  if (!source.listId && queue.length > 0) params.set("playlist", queue.join(","));

  return `https://www.youtube-nocookie.com/embed/${source.videoId ?? "videoseries"}?${params.toString()}`;
}

const musicUrlChangeEvent = "blu-time:music-url-changed";
let unsavedMusicUrl: string | null = null;

function readSavedUrl() {
  try {
    return window.localStorage.getItem(musicUrlStorageKey);
  } catch {
    return unsavedMusicUrl;
  }
}

function writeSavedUrl(value: string | null) {
  unsavedMusicUrl = value;
  try {
    if (value) window.localStorage.setItem(musicUrlStorageKey, value);
    else window.localStorage.removeItem(musicUrlStorageKey);
  } catch {
    // Storage can be blocked; the choice then lasts until the page reloads.
  }
  window.dispatchEvent(new Event(musicUrlChangeEvent));
}

function subscribeToSavedUrl(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(musicUrlChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(musicUrlChangeEvent, onChange);
  };
}

export function MusicPanel() {
  const savedUrl = useSyncExternalStore(subscribeToSavedUrl, readSavedUrl, () => null);
  const savedSource = savedUrl ? parseYouTubeUrl(savedUrl) : null;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<NowPlaying | null>(null);
  const defaultSource = parseYouTubeUrl(teamDefaultUrl) ?? parseYouTubeUrl(fallbackDefaultUrl);
  const nowPlaying: NowPlaying | null =
    picked ?? (savedSource ? { source: savedSource, queue: [] } : defaultSource ? { source: defaultSource, queue: [] } : null);
  const isCustom = Boolean(picked || savedSource);

  function play(source: YouTubeSource, queue: string[], url: string) {
    setPicked({ source, queue });
    writeSavedUrl(url);
  }

  async function runSearch(term: string) {
    const trimmed = term.trim();
    const pastedSource = parseYouTubeUrl(trimmed);

    if (pastedSource) {
      play(pastedSource, [], trimmed);
      setQuery("");
      setMessage("");
      return;
    }

    if (trimmed.length < 2) {
      setMessage("Type a song, artist or mood to search.");
      return;
    }

    setQuery(trimmed);
    setSearching(true);
    setMessage("");

    const response = await fetch(`/api/music/search?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { results?: SearchResult[]; error?: string } | null;

    setSearching(false);

    if (!response.ok || !payload?.results) {
      setResults([]);
      setMessage(payload?.error ?? "YouTube search failed. Try again in a moment.");
      return;
    }

    setResults(payload.results);
    if (payload.results.length === 0) setMessage(`Nothing found for "${trimmed}".`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function playResult(index: number) {
    const result = results[index];
    const queue = results.slice(index + 1, index + 1 + maxQueuedVideos).map((item) => item.id);
    play({ videoId: result.id, listId: null }, queue, `https://www.youtube.com/watch?v=${result.id}`);
  }

  function useTeamDefault() {
    setPicked(null);
    writeSavedUrl(null);
  }

  return (
    <div className="premium-panel flex min-w-0 flex-col p-5 sm:p-6 md:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Music</p>
          <h2 className="mt-2 text-2xl font-normal">Listen while you work</h2>
        </div>
        {isCustom ? (
          <button
            type="button"
            onClick={useTeamDefault}
            className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-muted"
          >
            Back to team default
          </button>
        ) : (
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-muted">Team default</span>
        )}
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-[var(--border-soft)] bg-black">
          {nowPlaying ? (
            <iframe
              key={embedUrlFor(nowPlaying, Boolean(picked))}
              src={embedUrlFor(nowPlaying, Boolean(picked))}
              title="BluTime music player"
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <form onSubmit={submitSearch} role="search" className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search YouTube music"
              aria-label="Search YouTube music"
              className="min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {message ? <p className="text-sm text-[var(--accent-breeze)]">{message}</p> : null}

          {results.length > 0 ? (
            <ul className="scroll-area flex max-h-[220px] flex-col gap-1 overflow-auto pr-1 lg:max-h-[360px]">
              {results.map((result, index) => {
                const playingThis = picked?.source.videoId === result.id;

                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => playResult(index)}
                      aria-current={playingThis ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg! border p-2 text-left transition-colors ${
                        playingThis
                          ? "border-[var(--accent-breeze)] bg-[var(--surface-soft)]"
                          : "border-transparent hover:border-[var(--border-soft)] hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      {result.thumbnailUrl ? (
                        // Small external YouTube thumbnails; next/image would need a remote-image config for one decorative image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.thumbnailUrl}
                          alt=""
                          width={96}
                          height={54}
                          loading="lazy"
                          className="h-[54px] w-24 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="h-[54px] w-24 shrink-0 rounded bg-black" />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-sm leading-snug text-[var(--foreground)]">{result.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted">
                          {playingThis ? "Now playing · " : ""}
                          {result.channelTitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">Search a song, artist or mood, or try one of these:</p>
              <div className="flex flex-wrap gap-2">
                {quickSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    disabled={searching}
                    onClick={() => void runSearch(term)}
                    className="rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs text-muted disabled:opacity-50"
                  >
                    {term}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">You can also paste a YouTube link into the search box.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
