/**
 * Domain-based doc generation schema.
 * Used by the AI orchestrator and frontend (wizard, tree).
 */

export const DOMAIN_IDS = [
  "compliance",
  "product",
  "design",
  "marketing",
  "technical",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

/** Display label for each domain (folder name in tree) */
export const DOMAIN_LABELS: Record<DomainId, string> = {
  compliance: "Compliance",
  product: "Product",
  design: "Design",
  marketing: "Marketing",
  technical: "Technical",
};

/** Document slugs (file names) per domain. Order = generation order. */
export const DOMAIN_DOCUMENTS: Record<DomainId, readonly string[]> = {
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
export function getDomainFolderName(id: DomainId): string {
  return DOMAIN_LABELS[id];
}

/** All doc slugs for a domain */
export function getDomainDocSlugs(id: DomainId): readonly string[] {
  return DOMAIN_DOCUMENTS[id];
}

/** Path prefix for "generated" docs (for MCP filter). E.g. "Compliance/", "Product/" */
export const DOMAIN_PATH_PREFIXES: Record<DomainId, string> = {
  compliance: "Compliance/",
  product: "Product/",
  design: "Design/",
  marketing: "Marketing/",
  technical: "Technical/",
};

export function isDomainId(s: string): s is DomainId {
  return DOMAIN_IDS.includes(s as DomainId);
}
