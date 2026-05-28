export const defaultDepartments = [
  { name: "Editor", slug: "editor" },
  { name: "Designer", slug: "designer" },
  { name: "Content Writer", slug: "content_writer" },
  { name: "Production", slug: "production" },
  { name: "Account Manager", slug: "account_manager" },
  { name: "Performance Executive", slug: "performance_executive" },
  { name: "SEO Manager", slug: "seo" },
  { name: "Web Developer", slug: "website" },
  { name: "HR", slug: "hr" },
  { name: "Operations", slug: "operations" },
  { name: "Boss", slug: "boss" },
] as const;

export const defaultCategories = [
  "client meeting",
  "client call",
  "internal meeting",
  "research",
  "reporting",
  "operational work",
  "editing - normal",
  "editing - ai",
  "design - normal",
  "design - ai",
  "social media script writing",
  "performance script writing",
  "revision",
  "shoot",
] as const;

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
