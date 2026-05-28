import "server-only";

import { importPKCS8, SignJWT } from "jose";

export type SheetTable = {
  title: string;
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  truncated: boolean;
};

export type SheetWorkbook = {
  spreadsheetId: string;
  title: string;
  fetchedAt: string;
  sheets: SheetTable[];
};

const sheetsScope = "https://www.googleapis.com/auth/spreadsheets.readonly";
const maxRowsPerSheet = Number(process.env.AI_SHEET_MAX_ROWS ?? 300);

export function extractSpreadsheetId(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  throw new Error("Invalid Google Sheet URL. Paste the full Google Sheet link.");
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

async function getServiceAccountToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) return null;

  const key = await importPKCS8(normalizePrivateKey(privateKey), "RS256");
  const assertion = await new SignJWT({ scope: sheetsScope })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? "Google service account authentication failed.");
  }

  return payload.access_token;
}

async function googleSheetsFetch(path: string, token: string | null) {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${path}`);

  if (!token && apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      "Could not read Google Sheet. Share it with the service account or add a Google Sheets API key.";
    throw new Error(message);
  }

  return payload;
}

function rowsFromValues(values: string[][] | undefined): Pick<SheetTable, "headers" | "rows" | "totalRows" | "truncated"> {
  const safeValues = values ?? [];
  const [headerRow, ...bodyRows] = safeValues;
  const width = Math.max(headerRow?.length ?? 0, ...bodyRows.map((row) => row.length), 1);
  const headers = Array.from({ length: width }, (_, index) => {
    const header = headerRow?.[index]?.trim();
    return header || `Column ${index + 1}`;
  });
  const limitedRows = bodyRows.slice(0, maxRowsPerSheet);

  return {
    headers,
    rows: limitedRows.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()]))
    ),
    totalRows: bodyRows.length,
    truncated: bodyRows.length > limitedRows.length,
  };
}

export async function fetchGoogleWorkbook(sheetUrl: string): Promise<SheetWorkbook> {
  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  const token = await getServiceAccountToken();

  if (!token && !process.env.GOOGLE_SHEETS_API_KEY) {
    throw new Error("Missing Google Sheets access. Add GOOGLE_SERVICE_ACCOUNT_* or GOOGLE_SHEETS_API_KEY.");
  }

  const metadata = (await googleSheetsFetch(`${spreadsheetId}?includeGridData=false`, token)) as {
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  };

  const titles = (metadata.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title));

  const sheets = await Promise.all(
    titles.map(async (title) => {
      const range = encodeURIComponent(title);
      const valuesPayload = (await googleSheetsFetch(
        `${spreadsheetId}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
        token
      )) as { values?: string[][] };
      return {
        title,
        ...rowsFromValues(valuesPayload.values),
      };
    })
  );

  return {
    spreadsheetId,
    title: metadata.properties?.title ?? "Google Sheet",
    fetchedAt: new Date().toISOString(),
    sheets,
  };
}

export function sheetWorkbookToText(workbook: SheetWorkbook) {
  const blocks = workbook.sheets.map((sheet) => {
    const rows = sheet.rows.map((row, index) => `${index + 1}. ${JSON.stringify(row)}`).join("\n");
    const truncation = sheet.truncated ? `\n[Truncated: showing ${sheet.rows.length} of ${sheet.totalRows} data rows]` : "";
    return `TAB: ${sheet.title}\nHeaders: ${sheet.headers.join(" | ")}\nRows:\n${rows || "(empty)"}${truncation}`;
  });

  return `GOOGLE SHEET: ${workbook.title}\nSpreadsheet ID: ${workbook.spreadsheetId}\nFetched at: ${workbook.fetchedAt}\n\n${blocks.join("\n\n")}`;
}
