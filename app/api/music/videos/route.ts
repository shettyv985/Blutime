import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import {
  getTrendingMusic,
  getYouTubePlaylist,
  searchYouTube,
  YouTubeSearchError,
  youTubePlaylistIdPattern,
} from "@/server/music/youtube";

// GET /api/music/videos          trending Malayalam, Hindi, Tamil, Telugu and English songs (home feed)
// GET /api/music/videos?q=       search
// GET /api/music/videos?list=    the songs in a public or unlisted YouTube playlist
export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  const playlistId = searchParams.get("list")?.trim() ?? "";

  if (query && (query.length < 2 || query.length > 120)) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  if (playlistId && !youTubePlaylistIdPattern.test(playlistId)) {
    return NextResponse.json({ error: "That doesn't look like a YouTube playlist link." }, { status: 400 });
  }

  try {
    if (playlistId) {
      return NextResponse.json({ playlist: await getYouTubePlaylist(playlistId) });
    }

    return NextResponse.json({ videos: query ? await searchYouTube(query) : await getTrendingMusic() });
  } catch (error) {
    if (error instanceof YouTubeSearchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "YouTube is not responding. Try again in a moment." }, { status: 502 });
  }
}
