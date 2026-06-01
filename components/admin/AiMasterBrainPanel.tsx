"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type SheetSource = {
  id: string;
  name: string;
  sheetUrl: string;
  spreadsheetId: string;
  updatedAt: string;
};

type FileSource = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type AiSheetSummary = {
  title: string;
  spreadsheetId: string;
  tabs: Array<{ title: string; rows: number; includedRows: number; truncated: boolean }>;
};

type AiFileSummary = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  hasExtractedText: boolean;
};

type AiGeneratedAttachment = {
  filename: string;
  contentType: string;
  type: string;
  url: string;
};

type AiResult = {
  provider: "manus" | "openai";
  mode?: "async" | "sync";
  answer?: string;
  taskId?: string;
  taskUrl?: string;
  status?: string;
  statusText?: string;
  sheets?: AiSheetSummary[];
  files?: AiFileSummary[];
  attachments?: AiGeneratedAttachment[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
  sheets?: AiSheetSummary[];
  files?: AiFileSummary[];
  attachments?: AiGeneratedAttachment[];
};

type SavedAiChat = {
  id: string;
  title: string;
  provider: "manus" | "openai";
  messages: ChatMessage[];
  activeTaskId: string | null;
  activeTaskUrl: string | null;
  includeContextOnNextMessage: boolean;
  selectedSourceIds: string[];
  selectedFileIds: string[];
  attachedLinks: string[];
  createdAt: string;
  updatedAt: string;
};

const maxFileBytes = 5 * 1024 * 1024;
const chatStorageKey = "blu-time-ai-master-brain-chats";
const activeChatStorageKey = "blu-time-ai-master-brain-active-chat";

function createLocalId() {
  return crypto.randomUUID();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatContentType(contentType: string) {
  return contentType.split(";")[0]?.trim() || "file";
}

function conversationToText(messages: ChatMessage[]) {
  return messages
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function createBlankChat(): SavedAiChat {
  const now = new Date().toISOString();
  return {
    id: createLocalId(),
    title: "New chat",
    provider: "manus",
    messages: [],
    activeTaskId: null,
    activeTaskUrl: null,
    includeContextOnNextMessage: true,
    selectedSourceIds: [],
    selectedFileIds: [],
    attachedLinks: [],
    createdAt: now,
    updatedAt: now,
  };
}

function readSavedChats() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(chatStorageKey) ?? "[]") as SavedAiChat[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((chat) => chat?.id && chat?.title);
  } catch {
    return [];
  }
}

function sortChatsByUpdatedAt(chats: SavedAiChat[]) {
  return [...chats].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

async function fetchDbChats() {
  const response = await fetch("/api/admin/ai/chats", { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as { chats?: SavedAiChat[]; error?: string } | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? "Could not load saved chats.");
  }

  return payload.chats ?? [];
}

async function createDbChat(provider: "manus" | "openai") {
  const response = await fetch("/api/admin/ai/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  const payload = (await response.json().catch(() => null)) as { chat?: SavedAiChat; error?: string } | null;

  if (!response.ok || !payload?.chat) {
    throw new Error(payload?.error ?? "Could not create chat.");
  }

  return payload.chat;
}

function firstUserPrompt(messages: ChatMessage[]) {
  return messages.find((message) => message.role === "user")?.content.trim() ?? "";
}

function chatTitleFromPrompt(prompt: string) {
  if (!prompt) return "New chat";
  return prompt.length > 54 ? `${prompt.slice(0, 54).trim()}...` : prompt;
}

function formatChatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function statusLabel(status?: string) {
  if (!status || status === "stopped") return null;
  if (status === "running") return "working";
  return status;
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(text: string) {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const token = match[0];
    const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>);
    } else if (markdownLink) {
      parts.push(
        <a key={`${token}-${match.index}`} href={markdownLink[2]} target="_blank" rel="noreferrer">
          {markdownLink[1]}
        </a>
      );
    } else {
      parts.push(
        <a key={`${token}-${match.index}`} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function AiMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|") && lines[index + 1] && isTableDivider(lines[index + 1])) {
      const headers = tableCells(trimmed);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }

      blocks.push(
        <div key={`table-${index}`} className="ai-response-table-wrap">
          <table className="ai-response-table">
            <thead>
              <tr>
                {headers.map((header, headerIndex) => (
                  <th key={`${header}-${headerIndex}`}>{renderInline(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`cell-${cellIndex}`}>{renderInline(row[cellIndex] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length === 2 ? "h3" : "h4";
      blocks.push(<Tag key={`heading-${index}`}>{renderInline(heading[2])}</Tag>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];

      while (index < lines.length) {
        const item = lines[index].trim();
        if (ordered && !/^\d+\.\s+/.test(item)) break;
        if (!ordered && !/^[-*]\s+/.test(item)) break;
        items.push(item.replace(/^([-*]|\d+\.)\s+/, ""));
        index += 1;
      }

      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      blocks.push(<blockquote key={`quote-${index}`}>{renderInline(trimmed.replace(/^>\s?/, ""))}</blockquote>);
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index].trim();
      if (
        !paragraphLine ||
        paragraphLine.startsWith("|") ||
        paragraphLine.startsWith(">") ||
        paragraphLine.match(/^(#{2,4})\s+/) ||
        paragraphLine.match(/^[-*]\s+/) ||
        paragraphLine.match(/^\d+\.\s+/)
      ) {
        break;
      }
      paragraph.push(paragraphLine);
      index += 1;
    }

    blocks.push(<p key={`paragraph-${index}`}>{renderInline(paragraph.join(" "))}</p>);
  }

  return <div className="ai-response">{blocks}</div>;
}

export function AiMasterBrainPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sources, setSources] = useState<SheetSource[]>([]);
  const [files, setFiles] = useState<FileSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [linkDraft, setLinkDraft] = useState("");
  const [provider, setProvider] = useState<"manus" | "openai">("manus");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [includeContextOnNextMessage, setIncludeContextOnNextMessage] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskUrl, setActiveTaskUrl] = useState<string | null>(null);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [savingSource, setSavingSource] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [chatHydrated, setChatHydrated] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedAiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const selectedContextCount = selectedSourceIds.length + selectedFileIds.length + attachedLinks.length;
  const canSend = draft.trim().length >= 2 && !asking && !pendingAssistantId;
  const sortedChats = sortChatsByUpdatedAt(savedChats);
  const activeChat = savedChats.find((chat) => chat.id === activeChatId) ?? null;

  function restoreChat(chat: SavedAiChat) {
    setActiveChatId(chat.id);
    setProvider(chat.provider);
    setMessages(chat.messages);
    setActiveTaskId(chat.activeTaskId);
    setActiveTaskUrl(chat.activeTaskUrl);
    setPendingAssistantId(null);
    setSelectedSourceIds(chat.selectedSourceIds ?? []);
    setSelectedFileIds(chat.selectedFileIds ?? []);
    setAttachedLinks(chat.attachedLinks ?? []);
    setIncludeContextOnNextMessage(chat.includeContextOnNextMessage);
    setDraft("");
    setError("");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(activeChatStorageKey, chat.id);
    }
  }

  function writeSavedChats(nextChats: SavedAiChat[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chatStorageKey, JSON.stringify(nextChats.slice(0, 40)));
  }

  async function persistChatToDatabase(chat: SavedAiChat) {
    const response = await fetch(`/api/admin/ai/chats/${encodeURIComponent(chat.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: chat.title,
        provider: chat.provider,
        messages: chat.messages,
        activeTaskId: chat.activeTaskId,
        activeTaskUrl: chat.activeTaskUrl,
        includeContextOnNextMessage: chat.includeContextOnNextMessage,
        selectedSourceIds: chat.selectedSourceIds,
        selectedFileIds: chat.selectedFileIds,
        attachedLinks: chat.attachedLinks,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Could not save chat.");
    }
  }

  function buildChatSnapshot(patch: Partial<SavedAiChat> = {}) {
    const now = new Date().toISOString();
    const base = activeChat ?? createBlankChat();
    const nextMessages = patch.messages ?? messages;
    const firstPrompt = firstUserPrompt(nextMessages);

    return {
      ...base,
      title:
        patch.title ??
        (base.title === "New chat" && firstPrompt ? chatTitleFromPrompt(firstPrompt) : base.title),
      provider: patch.provider ?? provider,
      messages: nextMessages,
      activeTaskId: patch.activeTaskId !== undefined ? patch.activeTaskId : activeTaskId,
      activeTaskUrl: patch.activeTaskUrl !== undefined ? patch.activeTaskUrl : activeTaskUrl,
      includeContextOnNextMessage:
        patch.includeContextOnNextMessage !== undefined
          ? patch.includeContextOnNextMessage
          : includeContextOnNextMessage,
      selectedSourceIds: patch.selectedSourceIds ?? selectedSourceIds,
      selectedFileIds: patch.selectedFileIds ?? selectedFileIds,
      attachedLinks: patch.attachedLinks ?? attachedLinks,
      updatedAt: now,
    };
  }

  async function saveChatSnapshot(snapshot: SavedAiChat) {
    setSavedChats((current) => {
      const exists = current.some((chat) => chat.id === snapshot.id);
      const next = sortChatsByUpdatedAt(exists ? current.map((chat) => (chat.id === snapshot.id ? snapshot : chat)) : [snapshot, ...current]);
      writeSavedChats(next);
      return next;
    });

    await persistChatToDatabase(snapshot);
  }

  async function loadSources() {
    setLoadingSources(true);
    const response = await fetch("/api/admin/ai/sources");
    const payload = (await response.json().catch(() => null)) as { sources?: SheetSource[]; error?: string } | null;
    setLoadingSources(false);

    if (!response.ok || !payload) {
      setError(payload?.error ?? "Could not load sheet sources.");
      return;
    }

    setSources(payload.sources ?? []);
    setSelectedSourceIds((current) => current.filter((id) => payload.sources?.some((source) => source.id === id)));
  }

  async function loadFiles() {
    setLoadingFiles(true);
    const response = await fetch("/api/admin/ai/files");
    const payload = (await response.json().catch(() => null)) as { files?: FileSource[]; error?: string } | null;
    setLoadingFiles(false);

    if (!response.ok || !payload) {
      setError(payload?.error ?? "Could not load files.");
      return;
    }

    setFiles(payload.files ?? []);
    setSelectedFileIds((current) => current.filter((id) => payload.files?.some((file) => file.id === id)));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSavedChats() {
      try {
        let dbChats = await fetchDbChats();

        if (dbChats.length === 0) {
          dbChats = [await createDbChat("manus")];
        }

        if (cancelled) return;

        const activeStoredId = window.localStorage.getItem(activeChatStorageKey);
        const sortedDbChats = sortChatsByUpdatedAt(dbChats);
        const chatToRestore = sortedDbChats.find((chat) => chat.id === activeStoredId) ?? sortedDbChats[0];

        setSavedChats(sortedDbChats);
        restoreChat(chatToRestore);
        writeSavedChats(sortedDbChats);
      } catch (loadError) {
        const localChats = readSavedChats();
        const fallbackChat = localChats[0] ?? createBlankChat();
        setSavedChats(localChats.length > 0 ? localChats : [fallbackChat]);
        restoreChat(fallbackChat);
        setError(loadError instanceof Error ? loadError.message : "Could not load saved chats.");
      } finally {
        if (!cancelled) setChatHydrated(true);
      }
    }

    void loadSavedChats();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chatHydrated || !activeChatId) return;

    let snapshotToSave: SavedAiChat | null = null;

    setSavedChats((current) => {
      const now = new Date().toISOString();
      const firstPrompt = firstUserPrompt(messages);
      const next = current.map((chat) => {
        if (chat.id !== activeChatId) return chat;

        snapshotToSave = {
          ...chat,
          title: chat.title === "New chat" && firstPrompt ? chatTitleFromPrompt(firstPrompt) : chat.title,
          provider,
          messages,
          activeTaskId,
          activeTaskUrl,
          includeContextOnNextMessage,
          selectedSourceIds,
          selectedFileIds,
          attachedLinks,
          updatedAt: messages.length > 0 ? now : chat.updatedAt,
        };

        return snapshotToSave;
      });

      writeSavedChats(next);
      return next;
    });

    if (snapshotToSave) {
      void persistChatToDatabase(snapshotToSave);
    }
  }, [
    activeChatId,
    activeTaskId,
    activeTaskUrl,
    attachedLinks,
    chatHydrated,
    includeContextOnNextMessage,
    messages,
    provider,
    selectedFileIds,
    selectedSourceIds,
  ]);

  useEffect(() => {
    void loadSources();
    void loadFiles();
  }, []);

  useEffect(() => {
    if (!activeTaskId || !pendingAssistantId || provider !== "manus") return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/admin/ai/tasks/${encodeURIComponent(activeTaskId)}`);
      const payload = (await response.json().catch(() => null)) as (AiResult & { error?: string }) | null;

      if (!response.ok || !payload) {
        setError(payload?.error ?? "Could not poll Manus task.");
        setPendingAssistantId(null);
        window.clearInterval(interval);
        return;
      }

      let nextMessages: ChatMessage[] = [];
      setMessages((current) =>
        (nextMessages = current.map((message) =>
          message.id === pendingAssistantId
            ? {
                ...message,
                content: payload.answer || payload.statusText || "Manus is still working...",
                status: payload.status,
                attachments: payload.attachments && payload.attachments.length > 0 ? payload.attachments : message.attachments,
              }
            : message
        ))
      );

      if (nextMessages.length > 0) {
        void saveChatSnapshot(buildChatSnapshot({ messages: nextMessages }));
      }

      if (payload.status === "stopped" || payload.status === "error") {
        setPendingAssistantId(null);
        window.clearInterval(interval);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeTaskId, pendingAssistantId, provider]);

  async function saveSource() {
    setSavingSource(true);
    setError("");

    const response = await fetch("/api/admin/ai/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sourceName, sheetUrl }),
    });
    const payload = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;

    setSavingSource(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not save Google Sheet source.");
      return;
    }

    setSourceName("");
    setSheetUrl("");
    await loadSources();
    if (payload?.id) setSelectedSourceIds((current) => [...new Set([...current, payload.id as string])]);
    setIncludeContextOnNextMessage(true);
  }

  async function deleteSource(id: string) {
    const confirmed = window.confirm("Remove this sheet source from AI context?");
    if (!confirmed) return;

    setError("");
    const response = await fetch(`/api/admin/ai/sources/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not remove sheet source.");
      return;
    }

    await loadSources();
  }

  async function uploadFiles(uploadList: FileList | File[]) {
    const uploadArray = Array.from(uploadList);
    if (uploadArray.length === 0) return;

    const oversized = uploadArray.find((file) => file.size > maxFileBytes);
    if (oversized) {
      setError(`${oversized.name} is over the 5MB limit.`);
      return;
    }

    const formData = new FormData();
    uploadArray.forEach((file) => formData.append("files", file));

    setUploadingFiles(true);
    setError("");

    const response = await fetch("/api/admin/ai/files", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as { files?: FileSource[]; error?: string } | null;

    setUploadingFiles(false);

    if (!response.ok || !payload) {
      setError(payload?.error ?? "Could not upload files.");
      return;
    }

    await loadFiles();
    setSelectedFileIds((current) => [...new Set([...current, ...(payload.files ?? []).map((file) => file.id)])]);
    setIncludeContextOnNextMessage(true);
  }

  async function deleteFile(id: string) {
    const confirmed = window.confirm("Remove this saved file from AI context?");
    if (!confirmed) return;

    setError("");
    const response = await fetch(`/api/admin/ai/files/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not remove file.");
      return;
    }

    await loadFiles();
  }

  function addLink() {
    const value = linkDraft.trim();
    if (!value) return;
    setAttachedLinks((current) => [...new Set([...current, value])]);
    setLinkDraft("");
    setIncludeContextOnNextMessage(true);
  }

  async function sendMessage() {
    if (!canSend) return;

    const userMessage: ChatMessage = { id: createLocalId(), role: "user", content: draft.trim() };
    const assistantId = createLocalId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: provider === "manus" ? "Starting Manus..." : "Thinking...",
      status: "running",
    };
    const conversationContext = conversationToText(messages);
    const shouldAttachContext = !activeTaskId || includeContextOnNextMessage || provider === "openai";
    const pendingMessages = [...messages, userMessage, assistantMessage];

    setMessages(pendingMessages);
    setDraft("");
    setAsking(true);
    setError("");
    await saveChatSnapshot(buildChatSnapshot({ messages: pendingMessages }));

    const response = await fetch("/api/admin/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        taskId: provider === "manus" ? activeTaskId : null,
        question: userMessage.content,
        sourceIds: shouldAttachContext ? selectedSourceIds : [],
        fileIds: shouldAttachContext ? selectedFileIds : [],
        links: shouldAttachContext ? attachedLinks : [],
        conversationContext,
        includeContext: shouldAttachContext,
      }),
    });
    const payload = (await response.json().catch(() => null)) as (AiResult & { error?: string }) | null;

    setAsking(false);

    if (!response.ok || !payload) {
      const failedMessages = pendingMessages.filter((message) => message.id !== assistantId);
      setMessages(failedMessages);
      await saveChatSnapshot(buildChatSnapshot({ messages: failedMessages }));
      setError(payload?.error ?? "AI request failed.");
      return;
    }

    if (payload.taskId) setActiveTaskId(payload.taskId);
    if (payload.taskUrl) setActiveTaskUrl(payload.taskUrl);

    const answeredMessages = pendingMessages.map((message) =>
        message.id === assistantId
          ? {
              ...message,
              content: payload.answer || payload.statusText || "AI is working...",
              status: payload.status,
              sheets: payload.sheets,
              files: payload.files,
              attachments: payload.attachments,
            }
          : message
    );
    setMessages(answeredMessages);

    await saveChatSnapshot(
      buildChatSnapshot({
        messages: answeredMessages,
        activeTaskId: payload.taskId ?? activeTaskId,
        activeTaskUrl: payload.taskUrl ?? activeTaskUrl,
        includeContextOnNextMessage: payload.provider === "manus" ? false : includeContextOnNextMessage,
      })
    );

    if (payload.provider === "manus" && payload.taskId && payload.status !== "stopped" && payload.status !== "error") {
      setPendingAssistantId(assistantId);
    }

    if (payload.provider === "manus") {
      setIncludeContextOnNextMessage(false);
    }
  }

  function toggleSource(id: string) {
    setSelectedSourceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleFile(id: string) {
    setSelectedFileIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function openSavedChat(chatId: string) {
    const chat = savedChats.find((item) => item.id === chatId);
    if (!chat) return;
    restoreChat(chat);
  }

  async function startNewChat() {
    try {
      const chat = await createDbChat(provider);
      const nextChats = [chat, ...savedChats];
      setSavedChats(nextChats);
      writeSavedChats(nextChats);
      restoreChat(chat);
    } catch (createError) {
      const chat = createBlankChat();
      const nextChats = [chat, ...savedChats];
      setSavedChats(nextChats);
      writeSavedChats(nextChats);
      restoreChat(chat);
      setError(createError instanceof Error ? createError.message : "Could not create chat.");
    }
  }

  function startRenamingChat(chat: SavedAiChat) {
    setRenamingChatId(chat.id);
    setRenameDraft(chat.title);
  }

  function saveChatName(chatId: string) {
    const title = renameDraft.trim();
    if (!title) return;

    let renamedChat: SavedAiChat | null = null;

    setSavedChats((current) => {
      const next = current.map((chat) =>
        chat.id === chatId ? (renamedChat = { ...chat, title, updatedAt: new Date().toISOString() }) : chat
      );
      writeSavedChats(next);
      return next;
    });

    if (renamedChat) {
      void persistChatToDatabase(renamedChat);
    }

    setRenamingChatId(null);
    setRenameDraft("");
  }

  async function deleteChat(chatId: string) {
    const chat = savedChats.find((item) => item.id === chatId);
    const confirmed = window.confirm(`Delete "${chat?.title ?? "this chat"}"?`);
    if (!confirmed) return;

    setError("");

    const response = await fetch(`/api/admin/ai/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not delete chat.");
      return;
    }

    const remainingChats = savedChats.filter((item) => item.id !== chatId);
    let nextChats = remainingChats;
    let chatToOpen = remainingChats[0] ?? null;

    if (!chatToOpen) {
      try {
        chatToOpen = await createDbChat(provider);
        nextChats = [chatToOpen];
      } catch (createError) {
        const fallback = createBlankChat();
        chatToOpen = fallback;
        nextChats = [fallback];
        setError(createError instanceof Error ? createError.message : "Chat deleted, but could not create a new chat.");
      }
    }

    setSavedChats(nextChats);
    writeSavedChats(nextChats);

    if (activeChatId === chatId || !activeChatId) {
      restoreChat(chatToOpen);
    }
  }

  const selectedSummary = useMemo(() => {
    if (selectedContextCount === 0) return "BluTime only";
    return `${selectedSourceIds.length} sheets / ${selectedFileIds.length} files / ${attachedLinks.length} links`;
  }, [attachedLinks.length, selectedContextCount, selectedFileIds.length, selectedSourceIds.length]);

  return (
    <section className="card module-theme-panel mt-4 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent-breeze)]">ai</p>
          <h2 className="mt-2 text-4xl font-normal">AI Master Brain</h2>
          <p className="mt-3 text-base text-muted">
            A private mini chat for BluTime context, Google Sheets, saved files, and links. Chats are saved in this browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTaskUrl ? (
            <a href={activeTaskUrl} target="_blank" rel="noreferrer" className="border border-[var(--border)] px-4 py-2 text-sm text-[var(--accent-breeze)]">
              Open Manus task
            </a>
          ) : null}
          <button type="button" onClick={() => void startNewChat()} className="border border-[var(--border)] px-4 py-2 text-sm">
            New chat
          </button>
        </div>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-[var(--accent-sunset)] px-4 py-3 text-base text-[var(--accent-sunset)]">{error}</p> : null}

      <div className="mt-7 grid gap-4 xl:grid-cols-[420px_1fr]">
        <aside className="grid gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">saved chats</p>
                <h3 className="mt-2 text-2xl font-normal">Sessions</h3>
              </div>
              <span className="text-sm text-muted">{savedChats.length}</span>
            </div>

            <div className="mt-4 grid max-h-[320px] gap-2 overflow-y-auto pr-1">
              {sortedChats.map((chat) => {
                const selected = chat.id === activeChatId;
                const messageCount = chat.messages.length;

                return (
                  <div
                    key={chat.id}
                    className={`ai-chat-session ${selected ? "ai-chat-session-active" : ""}`}
                  >
                    {renamingChatId === chat.id ? (
                      <div className="grid gap-2">
                        <input
                          value={renameDraft}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveChatName(chat.id);
                            if (event.key === "Escape") setRenamingChatId(null);
                          }}
                          className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => saveChatName(chat.id)} className="border border-[var(--border)] px-3 py-1 text-xs">
                            Save
                          </button>
                          <button type="button" onClick={() => setRenamingChatId(null)} className="border border-[var(--border)] px-3 py-1 text-xs text-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => openSavedChat(chat.id)}
                          disabled={asking || Boolean(pendingAssistantId)}
                          className="min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="block truncate text-base">{chat.title}</span>
                          <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                            {messageCount} messages / {chat.provider} / {formatChatTimestamp(chat.updatedAt)}
                          </span>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => startRenamingChat(chat)} className="text-xs text-[var(--accent-breeze)]">
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteChat(chat.id)}
                            className="text-xs text-[var(--accent-sunset)]"
                          >
                            Delete
                          </button>
                          {selected ? <span className="text-xs text-muted">Current chat</span> : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">model</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as "manus" | "openai")}
                className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
              >
                <option value="manus">Manus</option>
                <option value="openai">OpenAI</option>
              </select>
              <span className="rounded-full border border-[var(--border-soft)] px-4 py-3 text-sm text-muted">{selectedSummary}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">sheets</p>
                <h3 className="mt-2 text-2xl font-normal">Google Sheets</h3>
              </div>
              <span className="text-sm text-muted">{sources.length}</span>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Source name"
                className="w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
              />
              <input
                value={sheetUrl}
                onChange={(event) => setSheetUrl(event.target.value)}
                placeholder="Paste Google Sheet URL"
                className="w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
              />
              <button
                type="button"
                onClick={() => void saveSource()}
                disabled={savingSource || !sheetUrl.trim()}
                className="border border-[var(--border-strong)] px-5 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSource ? "Saving..." : "Save sheet"}
              </button>
            </div>

            <div className="mt-4 grid max-h-[300px] gap-3 overflow-y-auto pr-1">
              {loadingSources ? <p className="text-base text-muted">Loading sheets...</p> : null}
              {sources.map((source) => (
                <div key={source.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--background)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      <input type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} className="mt-1" />
                      <span className="min-w-0">
                        <span className="block text-base">{source.name}</span>
                        <span className="mt-1 block break-all font-mono text-[11px] text-muted">{source.spreadsheetId}</span>
                      </span>
                    </label>
                    <button type="button" onClick={() => void deleteSource(source.id)} className="border border-[var(--border)] px-3 py-2 text-xs text-muted">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">files</p>
                <h3 className="mt-2 text-2xl font-normal">Drop files</h3>
              </div>
              <span className="text-sm text-muted">5MB max</span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadFiles(event.dataTransfer.files);
              }}
              className="mt-4 w-full border border-dashed border-[var(--border-strong)] bg-[var(--background)] px-5 py-8 text-center text-base"
            >
              {uploadingFiles ? "Uploading..." : "Drop files here or click to upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />

            <div className="mt-4 grid max-h-[260px] gap-3 overflow-y-auto pr-1">
              {loadingFiles ? <p className="text-base text-muted">Loading files...</p> : null}
              {files.map((file) => (
                <div key={file.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--background)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      <input type="checkbox" checked={selectedFileIds.includes(file.id)} onChange={() => toggleFile(file.id)} className="mt-1" />
                      <span className="min-w-0">
                        <span className="block truncate text-base">{file.filename}</span>
                        <span className="mt-1 block text-xs text-muted">{formatBytes(file.sizeBytes)} / {file.contentType || "unknown"}</span>
                      </span>
                    </label>
                    <button type="button" onClick={() => void deleteFile(file.id)} className="border border-[var(--border)] px-3 py-2 text-xs text-muted">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">links</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={linkDraft}
                onChange={(event) => setLinkDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Paste sheet or reference link"
                className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
              />
              <button type="button" onClick={addLink} className="border border-[var(--border-strong)] px-5 py-3 text-base">
                Add
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {attachedLinks.map((link) => (
                <div key={link} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] px-4 py-3">
                  <span className="min-w-0 break-all text-sm text-muted">{link}</span>
                  <button type="button" onClick={() => setAttachedLinks((current) => current.filter((item) => item !== link))} className="text-sm text-[var(--accent-sunset)]">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">chat</p>
              <h3 className="mt-2 text-2xl font-normal">{activeChat?.title ?? "One-to-one session"}</h3>
            </div>
            <span className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-muted">
              {activeTaskId ? "Manus thread active" : "Local saved chat"}
            </span>
          </div>

          <div className="mt-5 grid min-h-[520px] content-start gap-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--background)] p-6">
                <p className="text-2xl">Ask something operational.</p>
                <p className="mt-3 text-base text-muted">
                  Example: compare a person&apos;s salary sheet row with BluTime output, time spent, clients handled, and recent work summaries.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`ai-chat-message rounded-2xl border p-5 ${
                  message.role === "user"
                    ? "ai-chat-user border-[var(--accent-breeze)] bg-[rgba(160,195,236,0.08)]"
                    : "ai-chat-assistant border-[var(--border-soft)] bg-[var(--background)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
                    {message.role === "assistant" ? "AI Master Brain" : "You"}
                  </p>
                  {statusLabel(message.status) ? (
                    <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-muted">
                      {statusLabel(message.status)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  {message.role === "assistant" ? (
                    <AiMarkdown text={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap text-base leading-7">{message.content}</div>
                  )}
                </div>

                {message.sheets && message.sheets.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {message.sheets.map((sheet) => (
                      <div key={sheet.spreadsheetId} className="rounded-xl border border-[var(--border-soft)] px-4 py-3 text-sm text-muted">
                        <strong className="text-[var(--foreground)]">{sheet.title}</strong>
                        <span className="mt-1 block">{sheet.tabs.map((tab) => `${tab.title}: ${tab.includedRows}/${tab.rows}`).join(" | ")}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {message.files && message.files.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {message.files.map((file) => (
                      <span key={file.id} className="rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs text-muted">
                        {file.filename}
                      </span>
                    ))}
                  </div>
                ) : null}

                {message.attachments && message.attachments.length > 0 ? (
                  <div className="ai-generated-files mt-4 grid gap-3">
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Files from Manus</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {message.attachments.map((attachment, index) => (
                        <a
                          key={`${attachment.url}-${index}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          download={attachment.filename}
                          className="ai-generated-file rounded-2xl border border-[var(--border-soft)] px-4 py-3"
                        >
                          <span className="block truncate text-base text-[var(--foreground)]">{attachment.filename}</span>
                          <span className="mt-1 block font-mono text-xs uppercase tracking-[0.12em] text-muted">
                            {formatContentType(attachment.contentType)} / open or download
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Message AI Master Brain..."
              rows={5}
              className="w-full resize-y border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-3 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={includeContextOnNextMessage}
                  onChange={(event) => setIncludeContextOnNextMessage(event.target.checked)}
                />
                <span>
                  Attach selected context to this message
                  {activeTaskId && provider === "manus" ? " (off by default for follow-ups)" : ""}
                </span>
              </label>
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!canSend}
                className="border border-[var(--border-strong)] px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {asking || pendingAssistantId ? "Working..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
