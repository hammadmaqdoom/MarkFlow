export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "")
    .split("/")
    .filter((p) => p !== ".." && p !== ".")
    .join("/");
}

export function pathFromParentAndName(parentPath: string | null, name: string): string {
  const safeName = name.replace(/\//g, "-").replace(/^\.+/, "");
  if (!parentPath) return safeName;
  return normalizePath(`${parentPath}/${safeName}`);
}
