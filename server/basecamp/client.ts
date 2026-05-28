import "server-only";

type BasecampTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type BasecampTodo = {
  id: number | string;
  content?: string;
  title?: string;
  app_url?: string;
  due_on?: string | null;
  starts_on?: string | null;
  completed?: boolean;
  type?: string;
  parent?: {
    id?: number | string;
    title?: string;
    app_url?: string;
  } | null;
  bucket?: {
    id?: number | string;
    name?: string;
    app_url?: string;
  } | null;
  children?: BasecampTodo[];
};

export type NormalizedBasecampTask = {
  id: string;
  title: string;
  appUrl: string | null;
  dueOn: string | null;
  projectId: string | null;
  projectName: string;
  parentId: string | null;
  parentTitle: string | null;
  isChild: boolean;
  overdue: boolean;
};

export type BacklogBasecampTask = NormalizedBasecampTask & {
  dueStatus: "overdue" | "today" | "upcoming";
};

export type BasecampProject = {
  id: number | string;
  name: string;
  status?: string;
  app_url?: string;
  url?: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function isDueTodayOrOverdue(dueOn?: string | null) {
  return Boolean(dueOn && dueOn <= todayKey());
}

function decodeHtmlEntities(text: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => namedEntities[name.toLowerCase()] ?? match);
}

function basecampPlainText(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;

  const text = decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  return text || fallback;
}

async function getAccessToken() {
  const params = new URLSearchParams({
    type: "refresh",
    refresh_token: requireEnv("BASECAMP_REFRESH_TOKEN"),
    client_id: requireEnv("BASECAMP_CLIENT_ID"),
    client_secret: requireEnv("BASECAMP_CLIENT_SECRET"),
  });

  const response = await fetch(
    `https://launchpad.37signals.com/authorization/token?${params.toString()}`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(`Basecamp token refresh failed: ${response.status}`);
  }

  const payload = (await response.json()) as BasecampTokenResponse;
  return payload.access_token;
}

async function basecampFetch<T>(path: string) {
  const accountId = requireEnv("BASECAMP_ACCOUNT_ID");
  const accessToken = await getAccessToken();
  const response = await fetch(`https://3.basecampapi.com/${accountId}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "blu-time (operations@blusteak.com)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Basecamp request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function nextPagePath(linkHeader: string | null) {
  if (!linkHeader) return null;

  for (const linkPart of linkHeader.split(",")) {
    const [urlPart, relPart] = linkPart.split(";").map((part) => part.trim());
    if (relPart !== 'rel="next"') continue;

    const url = urlPart.replace(/^<|>$/g, "");
    const nextUrl = new URL(url);
    return `${nextUrl.pathname.replace(`/${requireEnv("BASECAMP_ACCOUNT_ID")}`, "")}${nextUrl.search}`;
  }

  return null;
}

async function basecampFetchPaginated<T>(path: string) {
  const accountId = requireEnv("BASECAMP_ACCOUNT_ID");
  const accessToken = await getAccessToken();
  const rows: T[] = [];
  let nextPath: string | null = path;

  while (nextPath) {
    const response = await fetch(`https://3.basecampapi.com/${accountId}${nextPath}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "blu-time (operations@blusteak.com)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Basecamp request failed: ${response.status}`);
    }

    rows.push(...((await response.json()) as T[]));
    nextPath = nextPagePath(response.headers.get("link"));
  }

  return rows;
}

function normalizeTodo(todo: BasecampTodo, parent?: BasecampTodo): NormalizedBasecampTask | null {
  const dueOn = todo.due_on ?? parent?.due_on ?? null;

  if (!isDueTodayOrOverdue(dueOn)) return null;

  const bucket = todo.bucket ?? parent?.bucket ?? null;
  const parentInfo = parent ?? todo.parent ?? null;
  const id = String(todo.id);

  return {
    id,
    title: basecampPlainText(todo.title ?? todo.content, "Untitled Basecamp task"),
    appUrl: todo.app_url ?? null,
    dueOn,
    projectId: bucket?.id ? String(bucket.id) : null,
    projectName: basecampPlainText(bucket?.name, "Basecamp project"),
    parentId: parentInfo?.id ? String(parentInfo.id) : null,
    parentTitle: parentInfo?.title ? basecampPlainText(parentInfo.title, "Untitled parent") : null,
    isChild: Boolean(parent),
    overdue: Boolean(dueOn && dueOn < todayKey()),
  };
}

function flattenTodos(todos: BasecampTodo[]) {
  const tasks: NormalizedBasecampTask[] = [];

  for (const todo of todos) {
    const normalizedParent = normalizeTodo(todo);
    if (normalizedParent) tasks.push(normalizedParent);

    for (const child of todo.children ?? []) {
      const normalizedChild = normalizeTodo(child, todo);
      if (normalizedChild) tasks.push(normalizedChild);
    }
  }

  return tasks.sort((left, right) => {
    if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
    return (left.dueOn ?? "").localeCompare(right.dueOn ?? "");
  });
}

function normalizeBacklogTodo(todo: BasecampTodo, parent?: BasecampTodo): BacklogBasecampTask | null {
  const dueOn = todo.due_on ?? parent?.due_on ?? null;

  if (!dueOn || !dueOn.startsWith("2026")) return null;

  const bucket = todo.bucket ?? parent?.bucket ?? null;
  const parentInfo = parent ?? todo.parent ?? null;
  const id = String(todo.id);
  const today = todayKey();

  return {
    id,
    title: basecampPlainText(todo.title ?? todo.content, "Untitled Basecamp task"),
    appUrl: todo.app_url ?? null,
    dueOn,
    projectId: bucket?.id ? String(bucket.id) : null,
    projectName: basecampPlainText(bucket?.name, "Basecamp project"),
    parentId: parentInfo?.id ? String(parentInfo.id) : null,
    parentTitle: parentInfo?.title ? basecampPlainText(parentInfo.title, "Untitled parent") : null,
    isChild: Boolean(parent),
    overdue: dueOn < today,
    dueStatus: dueOn < today ? "overdue" : dueOn === today ? "today" : "upcoming",
  };
}

function flattenBacklogTodos(todos: BasecampTodo[]) {
  const tasks: BacklogBasecampTask[] = [];

  for (const todo of todos) {
    const normalizedParent = normalizeBacklogTodo(todo);
    if (normalizedParent) tasks.push(normalizedParent);

    for (const child of todo.children ?? []) {
      const normalizedChild = normalizeBacklogTodo(child, todo);
      if (normalizedChild) tasks.push(normalizedChild);
    }
  }

  return tasks.sort((left, right) => (left.dueOn ?? "").localeCompare(right.dueOn ?? ""));
}

export async function getAssignedTasksForPerson(basecampPersonId: string) {
  const payload = await basecampFetch<{ todos?: BasecampTodo[] }>(
    `/reports/todos/assigned/${basecampPersonId}.json?group_by=date`
  );

  return flattenTodos(payload.todos ?? []);
}

export async function getBacklogTasksForPerson(basecampPersonId: string) {
  const payload = await basecampFetch<{ todos?: BasecampTodo[] }>(
    `/reports/todos/assigned/${basecampPersonId}.json?group_by=date`
  );

  return flattenBacklogTodos(payload.todos ?? []);
}

export async function getBasecampProjects() {
  return basecampFetchPaginated<BasecampProject>("/projects.json");
}
