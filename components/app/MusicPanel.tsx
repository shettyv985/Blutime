"use client";

import { useState } from "react";

type MusicDestination = {
  label: string;
  url: string;
};

const youTube: MusicDestination = { label: "YouTube", url: "https://www.youtube.com/" };
const youTubeMusic: MusicDestination = { label: "YouTube Music", url: "https://music.youtube.com/" };

// YouTube refuses to be framed (X-Frame-Options: SAMEORIGIN), so it opens as its own window docked to the
// right edge of the screen. YouTube also isolates windows opened by other sites (Cross-Origin-Opener-Policy),
// so BluTime cannot track or refocus the window after opening it.
function openDockedWindow(destination: MusicDestination) {
  const screenLeft = (window.screen as Screen & { availLeft?: number }).availLeft ?? 0;
  const screenTop = (window.screen as Screen & { availTop?: number }).availTop ?? 0;
  const width = Math.min(560, Math.max(420, Math.round(window.screen.availWidth * 0.36)));
  const height = window.screen.availHeight;
  const left = screenLeft + window.screen.availWidth - width;
  const features = `popup,width=${width},height=${height},left=${left},top=${screenTop}`;

  const opened = window.open(destination.url, "_blank", features);
  if (opened) opened.opener = null;
  return Boolean(opened);
}

export function MusicPanel() {
  const [message, setMessage] = useState("");

  function open(destination: MusicDestination) {
    setMessage(
      openDockedWindow(destination)
        ? `${destination.label} opened in its own window on the right. It keeps playing while you work here.`
        : "Your browser blocked the pop-up. Allow pop-ups for BluTime, then try again."
    );
  }

  return (
    <div className="premium-panel flex flex-col p-5 sm:p-6 md:col-span-2">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Music</p>
        <h2 className="mt-2 text-2xl font-normal">Listen while you work</h2>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
        <span
          aria-hidden="true"
          className="flex h-20 w-28 items-center justify-center rounded-[22px] bg-[#ff0033] shadow-[0_12px_40px_rgba(255,0,51,0.25)]"
        >
          <span className="ml-1 h-0 w-0 border-y-[16px] border-l-[26px] border-y-transparent border-l-white" />
        </span>

        <div className="max-w-md">
          <p className="text-xl">The real YouTube, one click away</p>
          <p className="mt-2 text-sm text-muted">
            Search, play and use your own playlists in full YouTube. It opens beside BluTime and keeps playing while
            your timers run.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => open(youTube)}
            className="border border-[#ff0033] bg-[#ff0033]! px-6 py-3 text-base text-white! hover:bg-[#e0002d]!"
          >
            Open YouTube
          </button>
          <button
            type="button"
            onClick={() => open(youTubeMusic)}
            className="border border-[var(--border)] px-6 py-3 text-base"
          >
            Open YouTube Music
          </button>
        </div>

        {message ? (
          <p role="status" className="max-w-md text-sm text-[var(--accent-breeze)]">
            {message}
          </p>
        ) : (
          <p className="max-w-md text-xs text-muted">
            Sign in to YouTube in that window once to keep your likes, history and playlists.
          </p>
        )}
      </div>
    </div>
  );
}
