export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "workspace";
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = base;
  let suffix = 0;
  while (await exists(slug)) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}
