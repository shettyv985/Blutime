import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiFileSources, aiSheetSources } from "@/db/schema";
import { aiFileToBuffer, aiFileToContext } from "@/server/ai/files";
import { askAiBrain } from "@/server/ai/providers";
import { buildBluTimeContext } from "@/server/ai/app-context";
import { fetchGoogleWorkbook, sheetWorkbookToText } from "@/server/ai/google-sheets";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    question?: string;
    provider?: string;
    taskId?: string | null;
    sourceIds?: string[];
    fileIds?: string[];
    links?: string[];
    conversationContext?: string;
    includeContext?: boolean;
  } | null;

  const question = body?.question?.trim() ?? "";
  const sourceIds = body?.sourceIds ?? [];
  const fileIds = body?.fileIds ?? [];
  const links = (body?.links ?? []).map((link) => link.trim()).filter(Boolean);
  const provider = body?.provider;
  const taskId = body?.taskId ?? null;
  const includeContext = body?.includeContext ?? !taskId;
  const shouldLoadContext = provider === "openai" || includeContext || !taskId;

  if (question.length < 3) {
    return NextResponse.json({ error: "Ask a proper question first." }, { status: 400 });
  }

  const sources =
    shouldLoadContext && sourceIds.length > 0
      ? await db
          .select({
            id: aiSheetSources.id,
            name: aiSheetSources.name,
            sheetUrl: aiSheetSources.sheetUrl,
          })
          .from(aiSheetSources)
          .where(and(eq(aiSheetSources.isActive, true), inArray(aiSheetSources.id, sourceIds)))
      : [];

  const files =
    shouldLoadContext && fileIds.length > 0
      ? await db
          .select({
            id: aiFileSources.id,
            filename: aiFileSources.filename,
            contentType: aiFileSources.contentType,
            sizeBytes: aiFileSources.sizeBytes,
            storageBase64: aiFileSources.storageBase64,
            extractedText: aiFileSources.extractedText,
          })
          .from(aiFileSources)
          .where(and(eq(aiFileSources.isActive, true), inArray(aiFileSources.id, fileIds)))
      : [];

  try {
    const sheetUrls = shouldLoadContext
      ? [...sources.map((source) => source.sheetUrl), ...links.filter((link) => link.includes("docs.google.com/spreadsheets"))]
      : [];
    const uniqueSheetUrls = [...new Set(sheetUrls)];

    const [appContext, workbooks] = await Promise.all([
      shouldLoadContext
        ? buildBluTimeContext(question)
        : Promise.resolve("No refreshed BluTime context attached to this follow-up. Use the context already available in the Manus task."),
      Promise.all(uniqueSheetUrls.map((sheetUrl) => fetchGoogleWorkbook(sheetUrl))),
    ]);

    const result = await askAiBrain({
      provider,
      taskId,
      question,
      appContext,
      sheetContexts: workbooks.map(sheetWorkbookToText),
      fileContexts: files.map(aiFileToContext),
      fileAttachments: files.map((file) => ({
        filename: file.filename,
        contentType: file.contentType,
        bytes: aiFileToBuffer(file),
        contextText: file.extractedText ?? undefined,
      })),
      links,
      conversationContext: body?.conversationContext,
    });

    return NextResponse.json({
      ...result,
      sheets: workbooks.map((workbook) => ({
        title: workbook.title,
        spreadsheetId: workbook.spreadsheetId,
        tabs: workbook.sheets.map((sheet) => ({
          title: sheet.title,
          rows: sheet.totalRows,
          includedRows: sheet.rows.length,
          truncated: sheet.truncated,
        })),
      })),
      files: files.map((file) => ({
        id: file.id,
        filename: file.filename,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        hasExtractedText: Boolean(file.extractedText),
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 500 });
  }
}
