/**
 * Department-based doc generation schema.
 * Used by the AI orchestrator and frontend (wizard, tree).
 */

export const DEPARTMENT_IDS = [
  "compliance",
  "product",
  "design",
  "marketing",
  "technical",
] as const;

export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

/** Display label for each department (folder name in tree) */
export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  compliance: "Compliance",
  product: "Product",
  design: "Design",
  marketing: "Marketing",
  technical: "Technical",
};

/** Document slugs (file names) per department. Order = generation order. */
export const DEPARTMENT_DOCUMENTS: Record<DepartmentId, readonly string[]> = {
  compliance: ["compliance-overview.md"],
  product: [
    "competitive-landscape.md",
    "detailed-specifications.md",
    "features-prd.md",
    "product-strategy.md",
    "user-stories.md",
  ],
  design: [
    "ui-wireframes.md",
    "ux-strategy.md",
    "brand-colours.md",
    "design-system.md",
  ],
  marketing: [
    "brand-positioning.md",
    "go-to-market.md",
    "brand-voice.md",
    "brand-guidelines.md",
    "seo-strategy.md",
    "llm-ai-seo.md",
  ],
  technical: [
    "system-architecture.md",
    "api-specifications-backend.md",
    "db-design-structure.md",
    "software-requirements-specification.md",
  ],
};

/** Folder name for document tree (same as label; used as path segment) */
export function getDepartmentFolderName(id: DepartmentId): string {
  return DEPARTMENT_LABELS[id];
}

/** All doc slugs for a department */
export function getDepartmentDocSlugs(id: DepartmentId): readonly string[] {
  return DEPARTMENT_DOCUMENTS[id];
}

/** Path prefix for "generated" docs (for MCP filter). E.g. "Compliance/", "Product/" */
export const DEPARTMENT_PATH_PREFIXES: Record<DepartmentId, string> = {
  compliance: "Compliance/",
  product: "Product/",
  design: "Design/",
  marketing: "Marketing/",
  technical: "Technical/",
};

export function isDepartmentId(s: string): s is DepartmentId {
  return DEPARTMENT_IDS.includes(s as DepartmentId);
}
