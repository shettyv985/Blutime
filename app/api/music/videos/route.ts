import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getTrendingMusic, searchYouTube, YouTubeSearchError } from "@/server/music/youtube";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query && (query.length < 2 || query.length > 120)) {
    return NextResponse.json({ error: "Type at least 2 characters to search." }, { status: 400 });
  }

  try {
    return NextResponse.json({ videos: query ? await searchYouTube(query) : await getTrendingMusic() });
  } catch (error) {
    if (error instanceof YouTubeSearchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "YouTube is not responding. Try again in a moment." }, { status: 502 });
  }
}
