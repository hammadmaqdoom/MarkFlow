/**
 * Department IDs and labels for AI doc generation wizard (client-safe).
 * Keep in sync with src/server/lib/departments.ts for doc slugs.
 */

export const DEPARTMENT_IDS = [
  "compliance",
  "product",
  "design",
  "marketing",
  "technical",
] as const;

export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  compliance: "Compliance",
  product: "Product",
  design: "Design",
  marketing: "Marketing",
  technical: "Technical",
};

export const AI_PROVIDER_IDS = ["openai", "anthropic", "google"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  openai: "OpenAI (GPT-4)",
  anthropic: "Claude (Anthropic)",
  google: "Google (Gemini)",
};
