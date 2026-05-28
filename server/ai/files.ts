import "server-only";

import type { AiFileSource } from "@/db/schema";

export const maxAiFileBytes = 5 * 1024 * 1024;
const maxExtractedChars = 80_000;

const textExtensions = new Set([
  "csv",
  "txt",
  "md",
  "markdown",
  "json",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "sql",
  "log",
]);

function fileExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function extractTextFromFile(filename: string, contentType: string, buffer: Buffer) {
  const extension = fileExtension(filename);
  const looksTextLike =
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    textExtensions.has(extension);

  if (!looksTextLike) return null;

  const text = buffer.toString("utf8").replace(/\u0000/g, "").trim();
  if (!text) return null;
  return text.length > maxExtractedChars ? `${text.slice(0, maxExtractedChars)}\n[Truncated]` : text;
}

export function aiFileToContext(file: Pick<AiFileSource, "filename" | "contentType" | "sizeBytes" | "extractedText">) {
  const text = file.extractedText
    ? `\nExtracted text:\n${file.extractedText}`
    : "\nNo reliable text extraction available. If using Manus, the original file is attached for direct analysis.";

  return `FILE: ${file.filename}
Type: ${file.contentType || "unknown"}
Size: ${file.sizeBytes} bytes${text}`;
}

export function aiFileToBuffer(file: Pick<AiFileSource, "storageBase64">) {
  return Buffer.from(file.storageBase64, "base64");
}
