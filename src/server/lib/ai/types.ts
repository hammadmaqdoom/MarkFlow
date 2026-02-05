/**
 * AI provider types for documentation generation.
 */

export const AI_PROVIDER_IDS = ["openai", "anthropic", "google"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface GenerateOptions {
  /** Max tokens for completion (default provider-specific) */
  maxTokens?: number;
  /** Temperature 0–1 (default 0.7) */
  temperature?: number;
}

export interface AiGenerateInput {
  systemPrompt: string;
  userPrompt: string;
  options?: GenerateOptions;
}

/**
 * Single interface for all AI providers. Returns the generated text (markdown).
 */
export interface AiProviderAdapter {
  readonly id: AiProviderId;
  generate(input: AiGenerateInput): Promise<string>;
  /** Whether the provider is configured (API key set) */
  isConfigured(): boolean;
}
