/**
 * Resolve a relative or absolute path against a base document path.
 * 
 * Examples:
 *   resolveDocPath("docs/getting-started.md", "./guide.md") => "docs/guide.md"
 *   resolveDocPath("docs/intro/overview.md", "../api/auth.md") => "docs/api/auth.md"
 *   resolveDocPath("docs/intro.md", "/api/endpoints.md") => "api/endpoints.md"
 *   resolveDocPath("readme.md", "other.md") => "other.md"
 */
export function resolveDocPath(basePath: string, relativePath: string): string {
  // Normalize input
  const normalizedRelative = relativePath.replace(/\\/g, "/").trim();
  
  // If the path starts with http(s) or #, it's not a document link
  if (
    normalizedRelative.startsWith("http://") ||
    normalizedRelative.startsWith("https://") ||
    normalizedRelative.startsWith("#") ||
    normalizedRelative.startsWith("mailto:")
  ) {
    return relativePath;
  }

  // Absolute path from project root (starts with /)
  if (normalizedRelative.startsWith("/")) {
    return normalizedRelative.slice(1).replace(/^\/+/, "");
  }

  // Get the directory of the base path
  const baseSegments = basePath.replace(/\\/g, "/").split("/");
  // Remove the filename to get the directory
  baseSegments.pop();
  
  // Split the relative path
  const relativeSegments = normalizedRelative.split("/");
  
  // Combine and resolve . and ..
  const resultSegments = [...baseSegments];
  
  for (const segment of relativeSegments) {
    if (segment === "." || segment === "") {
      // Current directory, skip
      continue;
    } else if (segment === "..") {
      // Parent directory
      if (resultSegments.length > 0) {
        resultSegments.pop();
      }
    } else {
      resultSegments.push(segment);
    }
  }
  
  return resultSegments.join("/");
}

/**
 * Check if a link href is an internal document link
 */
export function isInternalDocLink(href: string): boolean {
  if (!href) return false;
  
  // External links
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return false;
  }
  
  // Anchor links
  if (href.startsWith("#")) {
    return false;
  }
  
  // Email links
  if (href.startsWith("mailto:")) {
    return false;
  }
  
  // Tel links
  if (href.startsWith("tel:")) {
    return false;
  }
  
  // Data URLs
  if (href.startsWith("data:")) {
    return false;
  }
  
  // Likely an internal document link (relative or absolute path)
  return true;
}
