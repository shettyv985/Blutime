"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";

type YouTubeSource = {
  videoId: string | null;
  listId: string | null;
};

const musicUrlStorageKey = "blu-time-music-url";
// Lofi Girl "Study Sessions". A playlist, because live-stream video IDs change whenever the stream restarts.
const fallbackDefaultUrl = "https://www.youtube.com/playlist?list=PL6NdkXsPL07LBOz-XhgCJJGlI4jarMKzp";
const teamDefaultUrl = process.env.NEXT_PUBLIC_YOUTUBE_DEFAULT_URL?.trim() || fallbackDefaultUrl;

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const listIdPattern = /^[A-Za-z0-9_-]{10,}$/;

function parseYouTubeUrl(input: string): YouTubeSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

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

function embedUrlFor(source: YouTubeSource) {
  const params = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (source.listId) params.set("list", source.listId);

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
  const customUrl = savedUrl && parseYouTubeUrl(savedUrl) ? savedUrl : null;
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const activeSource = parseYouTubeUrl(customUrl ?? teamDefaultUrl) ?? parseYouTubeUrl(fallbackDefaultUrl);

  function playLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!parseYouTubeUrl(draft)) {
      setMessage("Paste a YouTube video, playlist or live link.");
      return;
    }

    writeSavedUrl(draft.trim());
    setDraft("");
    setMessage("");
  }

  function useTeamDefault() {
    writeSavedUrl(null);
    setMessage("");
  }

  return (
    <div className="premium-panel flex flex-col p-5 sm:p-6 md:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Music</p>
          <h2 className="mt-2 text-2xl font-normal">Listen while you work</h2>
        </div>
        <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-muted">
          {customUrl ? "Your link" : "Team default"}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:items-start">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-[var(--border-soft)] bg-black">
          {activeSource ? (
            <iframe
              key={embedUrlFor(activeSource)}
              src={embedUrlFor(activeSource)}
              title="BluTime music player"
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <form onSubmit={playLink} className="flex flex-col gap-2">
            <label htmlFor="music-link" className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
              Play your own
            </label>
            <div className="flex gap-2">
              <input
                id="music-link"
                type="text"
                inputMode="url"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Paste a YouTube link"
                className="min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                Play
              </button>
            </div>
          </form>

          {message ? <p className="text-sm text-[var(--accent-breeze)]">{message}</p> : null}

          {customUrl ? (
            <button
              type="button"
              onClick={useTeamDefault}
              className="self-start rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs text-muted"
            >
              Back to team default
            </button>
          ) : null}

          <p className="text-xs text-muted">
            Videos, playlists and live streams work. Your link is saved in this browser only. Some label-owned music
            videos can&apos;t be played outside YouTube.
          </p>
        </div>
      </div>
    </div>
  );
}
