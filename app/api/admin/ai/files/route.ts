import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiFileSources } from "@/db/schema";
import { extractTextFromFile, maxAiFileBytes } from "@/server/ai/files";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const files = await db
    .select({
      id: aiFileSources.id,
      filename: aiFileSources.filename,
      contentType: aiFileSources.contentType,
      sizeBytes: aiFileSources.sizeBytes,
      createdAt: aiFileSources.createdAt,
    })
    .from(aiFileSources)
    .where(eq(aiFileSources.isActive, true))
    .orderBy(asc(aiFileSources.filename));

  return NextResponse.json({ files, maxFileBytes: maxAiFileBytes });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const uploads = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (uploads.length === 0) {
    return NextResponse.json({ error: "Drop at least one file." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const savedFiles = [];

  for (const upload of uploads) {
    if (upload.size > maxAiFileBytes) {
      return NextResponse.json({ error: `${upload.name} is over the 5MB limit.` }, { status: 400 });
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    const id = createId();
    const contentType = upload.type || "application/octet-stream";
    const extractedText = extractTextFromFile(upload.name, contentType, buffer);

    await db.insert(aiFileSources).values({
      id,
      filename: upload.name,
      contentType,
      sizeBytes: upload.size,
      storageBase64: buffer.toString("base64"),
      extractedText,
      createdByUserId: user.userId,
      createdAt: now,
      updatedAt: now,
    });

    savedFiles.push({
      id,
      filename: upload.name,
      contentType,
      sizeBytes: upload.size,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true, files: savedFiles, maxFileBytes: maxAiFileBytes });
}
