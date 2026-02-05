import Anthropic from "@anthropic-ai/sdk";
import type { AiProviderAdapter, AiGenerateInput, GenerateOptions } from "./types";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export function createAnthropicAdapter(): AiProviderAdapter {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  return {
    id: "anthropic",
    isConfigured() {
      return !!apiKey && apiKey.length > 0;
    },
    async generate(input: AiGenerateInput) {
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not set");
      }
      const client = new Anthropic({ apiKey });
      const opts: GenerateOptions = input.options ?? {};
      const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        temperature,
        system: input.systemPrompt,
        messages: [{ role: "user", content: input.userPrompt }],
      });

      const block = message.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") {
        throw new Error("Anthropic returned no text content");
      }
      return block.text;
    },
  };
}
