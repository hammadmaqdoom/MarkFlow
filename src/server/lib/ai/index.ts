import type { AiProviderId, AiProviderAdapter } from "./types";
import { createOpenAiAdapter } from "./openai";
import { createAnthropicAdapter } from "./anthropic";
import { createGoogleAdapter } from "./google";

export type { AiProviderId, AiProviderAdapter, AiGenerateInput, GenerateOptions } from "./types";

const adapters: Record<AiProviderId, () => AiProviderAdapter> = {
  openai: createOpenAiAdapter,
  anthropic: createAnthropicAdapter,
  google: createGoogleAdapter,
};

export function getAiProvider(providerId: AiProviderId): AiProviderAdapter {
  const factory = adapters[providerId];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${providerId}`);
  }
  return factory();
}

export function getConfiguredProviders(): AiProviderId[] {
  return (["openai", "anthropic", "google"] as const).filter((id) =>
    getAiProvider(id).isConfigured()
  );
}
