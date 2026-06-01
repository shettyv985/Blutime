import "server-only";

export type AiProvider = "manus" | "openai";

export type AiStartResult = {
  provider: AiProvider;
  mode: "async" | "sync";
  answer?: string;
  taskId?: string;
  taskUrl?: string;
  status?: string;
  attachments?: AiGeneratedAttachment[];
};

export type AiFileAttachment = {
  filename: string;
  contentType: string;
  bytes: Buffer;
  contextText?: string;
};

export type AiGeneratedAttachment = {
  filename: string;
  contentType: string;
  type: string;
  url: string;
};

type ManusMessage = {
  type: string;
  assistant_message?: {
    content?: string;
    attachments?: Array<{
      content_type?: string;
      filename?: string;
      type?: string;
      url?: string;
    }>;
  };
  error_message?: { content?: string };
  status_update?: { agent_status?: string; brief?: string; description?: string };
};

export function resolveAiProvider(requested?: string | null): AiProvider {
  if (requested === "openai") return "openai";
  if (requested === "manus") return "manus";
  if (process.env.MANUS_API_KEY) return "manus";
  return "openai";
}

function buildInitialPrompt(params: {
  question: string;
  appContext: string;
  sheetContexts: string[];
  fileContexts: string[];
  links: string[];
  conversationContext?: string;
}) {
  return `You are BluTime's AI Master Brain for Blusteak leadership.

Use the provided BluTime app data and Google Sheet data as evidence. The user may ask about salary, output, time taken, client load, productivity, or operational judgement.

Rules:
- Be direct, but do not overclaim when data is missing.
- Use salary/sheet data only when it is present in the provided sheet context.
- Compare output quantity, time spent, client/category spread, and quality signals from output summaries.
- Mention evidence used and missing data.
- If judging whether someone is worth keeping, give a balanced recommendation with confidence and concrete reasons.
- Do not invent salary, revenue, or HR facts.
- If a question needs pending tasks, use Basecamp pending-task context when it is provided. Work logs are not the same as pending tasks.

QUESTION
${params.question}

CURRENT SAVED CHAT CONTEXT
${params.conversationContext || "(No earlier messages saved for this chat.)"}

${params.appContext}

GOOGLE SHEET CONTEXT
${params.sheetContexts.length > 0 ? params.sheetContexts.join("\n\n---\n\n") : "(No sheet source selected.)"}

FILE CONTEXT
${params.fileContexts.length > 0 ? params.fileContexts.join("\n\n---\n\n") : "(No files selected.)"}

LINKS ATTACHED
${params.links.length > 0 ? params.links.map((link) => `- ${link}`).join("\n") : "(No links attached.)"}`;
}

function buildFollowUpPrompt(params: {
  question: string;
  appContext: string;
  sheetContexts: string[];
  fileContexts: string[];
  links: string[];
  conversationContext?: string;
}) {
  const hasRefreshedAppContext = !params.appContext.startsWith("No refreshed BluTime context");
  const hasNewContext =
    hasRefreshedAppContext || params.sheetContexts.length > 0 || params.fileContexts.length > 0 || params.links.length > 0;

  return `FOLLOW-UP MESSAGE
${params.question}

Use the context and files already attached earlier in this Manus task. Do not ask for the same context again.

CURRENT SAVED CHAT CONTEXT
${params.conversationContext || "(No earlier messages saved for this chat.)"}

${hasNewContext ? `NEW CONTEXT ATTACHED TO THIS MESSAGE

${hasRefreshedAppContext ? params.appContext : ""}

GOOGLE SHEET CONTEXT
${params.sheetContexts.length > 0 ? params.sheetContexts.join("\n\n---\n\n") : "(No new sheet context.)"}

FILE CONTEXT
${params.fileContexts.length > 0 ? params.fileContexts.join("\n\n---\n\n") : "(No new file context.)"}

LINKS
${params.links.length > 0 ? params.links.map((link) => `- ${link}`).join("\n") : "(No new links.)"}` : ""}`;
}

async function uploadManusFile(file: AiFileAttachment) {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) {
    throw new Error("MANUS_API_KEY is missing.");
  }

  const createResponse = await fetch("https://api.manus.ai/v2/file.upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": apiKey,
    },
    body: JSON.stringify({ filename: file.filename }),
  });

  const createPayload = (await createResponse.json().catch(() => null)) as
    | { file?: { id?: string }; upload_url?: string; error?: { message?: string } }
    | null;

  if (!createResponse.ok || !createPayload?.file?.id || !createPayload.upload_url) {
    throw new Error(createPayload?.error?.message ?? `Could not prepare Manus upload for ${file.filename}.`);
  }

  const uploadResponse = await fetch(createPayload.upload_url, {
    method: "PUT",
    headers: file.contentType ? { "Content-Type": file.contentType } : undefined,
    body: new Blob([new Uint8Array(file.bytes)], { type: file.contentType || "application/octet-stream" }),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Could not upload ${file.filename} to Manus.`);
  }

  return createPayload.file.id;
}

async function buildManusContent(prompt: string, files: AiFileAttachment[]) {
  const fileIds = await Promise.all(files.map(uploadManusFile));
  return [
    { type: "text", text: prompt },
    ...fileIds.map((fileId) => ({ type: "file", file_id: fileId })),
  ];
}

async function startManusTask(prompt: string, files: AiFileAttachment[]): Promise<AiStartResult> {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) {
    throw new Error("MANUS_API_KEY is missing.");
  }

  const content = await buildManusContent(prompt, files);

  const response = await fetch("https://api.manus.ai/v2/task.create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": apiKey,
    },
    body: JSON.stringify({
      title: "BluTime AI Master Brain",
      hide_in_task_list: false,
      share_visibility: "private",
      agent_profile: process.env.MANUS_AGENT_PROFILE ?? "manus-1.6-lite",
      message: {
        content,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; task_id?: string; task_url?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.task_id) {
    throw new Error(payload?.error?.message ?? "Could not start Manus task.");
  }

  return {
    provider: "manus",
    mode: "async",
    taskId: payload.task_id,
    taskUrl: payload.task_url,
    status: "running",
    answer: "Manus task started. Polling for the answer...",
  };
}

async function sendManusMessage(taskId: string, prompt: string, files: AiFileAttachment[]): Promise<AiStartResult> {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) {
    throw new Error("MANUS_API_KEY is missing.");
  }

  const content = await buildManusContent(prompt, files);

  const response = await fetch("https://api.manus.ai/v2/task.sendMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-manus-api-key": apiKey,
    },
    body: JSON.stringify({
      task_id: taskId,
      agent_profile: process.env.MANUS_AGENT_PROFILE ?? "manus-1.6-lite",
      message: { content },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; task_id?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "Could not send Manus follow-up.");
  }

  return {
    provider: "manus",
    mode: "async",
    taskId,
    status: "running",
    answer: "Follow-up sent to Manus. Polling for the answer...",
  };
}

async function askOpenAi(prompt: string): Promise<AiStartResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: prompt,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { output_text?: string; error?: { message?: string }; output?: Array<{ content?: Array<{ text?: string }> }> }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "OpenAI request failed.");
  }

  const answer =
    payload?.output_text ??
    payload?.output?.flatMap((item) => item.content ?? []).map((item) => item.text).filter(Boolean).join("\n") ??
    "No answer returned.";

  return {
    provider: "openai",
    mode: "sync",
    status: "stopped",
    answer,
  };
}

export async function askAiBrain(params: {
  provider?: string | null;
  question: string;
  appContext: string;
  sheetContexts: string[];
  fileContexts?: string[];
  fileAttachments?: AiFileAttachment[];
  links?: string[];
  conversationContext?: string;
  taskId?: string | null;
}) {
  const provider = resolveAiProvider(params.provider);

  if (provider === "manus") {
    const prompt = params.taskId
      ? buildFollowUpPrompt({
          question: params.question,
          appContext: params.appContext,
          sheetContexts: params.sheetContexts,
          fileContexts: params.fileContexts ?? [],
          links: params.links ?? [],
          conversationContext: params.conversationContext,
        })
      : buildInitialPrompt({
          question: params.question,
          appContext: params.appContext,
          sheetContexts: params.sheetContexts,
          fileContexts: params.fileContexts ?? [],
          links: params.links ?? [],
          conversationContext: params.conversationContext,
        });

    if (params.taskId) {
      return sendManusMessage(params.taskId, prompt, params.fileAttachments ?? []);
    }
    return startManusTask(prompt, params.fileAttachments ?? []);
  }

  const prompt = buildInitialPrompt({
    question: params.question,
    appContext: params.appContext,
    sheetContexts: params.sheetContexts,
    fileContexts: params.fileContexts ?? [],
    links: params.links ?? [],
    conversationContext: params.conversationContext,
  });

  return askOpenAi(prompt);
}

export async function getManusTaskMessages(taskId: string) {
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey) {
    throw new Error("MANUS_API_KEY is missing.");
  }

  const url = new URL("https://api.manus.ai/v2/task.listMessages");
  url.searchParams.set("task_id", taskId);
  url.searchParams.set("order", "desc");
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: { "x-manus-api-key": apiKey },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; messages?: ManusMessage[]; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.messages) {
    throw new Error(payload?.error?.message ?? "Could not read Manus task.");
  }

  const latestStatus = payload.messages.find((message) => message.type === "status_update")?.status_update;
  const latestAssistantMessage = payload.messages.find((message) => message.type === "assistant_message")?.assistant_message;
  const latestAnswer = latestAssistantMessage?.content;
  const latestError = payload.messages.find((message) => message.type === "error_message")?.error_message?.content;
  const attachments =
    latestAssistantMessage?.attachments
      ?.filter((attachment) => attachment.url)
      .map((attachment) => ({
        filename: attachment.filename || "Manus file",
        contentType: attachment.content_type || "application/octet-stream",
        type: attachment.type || "file",
        url: attachment.url as string,
      })) ?? [];

  return {
    provider: "manus" as const,
    status: latestStatus?.agent_status ?? "running",
    statusText: latestStatus?.brief ?? latestStatus?.description ?? "",
    answer: latestAnswer ?? latestError ?? "",
    error: latestError,
    attachments,
  };
}
