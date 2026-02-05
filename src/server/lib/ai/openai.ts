import OpenAI from "openai";
import type { AiProviderAdapter, AiGenerateInput, GenerateOptions } from "./types";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export function createOpenAiAdapter(): AiProviderAdapter {
  const apiKey = process.env.OPENAI_API_KEY;

  return {
    id: "openai",
    isConfigured() {
      return !!apiKey && apiKey.length > 0;
    },
    async generate(input: AiGenerateInput) {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
      }
      const client = new OpenAI({ apiKey });
      const opts: GenerateOptions = input.options ?? {};
      const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
      const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;

      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const content = completion.choices[0]?.message?.content;
      if (content == null) {
        throw new Error("OpenAI returned no content");
      }
      return content;
    },
  };
}
