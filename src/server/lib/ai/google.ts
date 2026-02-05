import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiProviderAdapter, AiGenerateInput, GenerateOptions } from "./types";

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

export function createGoogleAdapter(): AiProviderAdapter {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  return {
    id: "google",
    isConfigured() {
      return !!apiKey && apiKey.length > 0;
    },
    async generate(input: AiGenerateInput) {
      if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
      }
      const opts: GenerateOptions = input.options ?? {};
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: input.systemPrompt,
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        },
      });

      const result = await model.generateContent(input.userPrompt);
      const text = result.response.text();
      if (text == null || text === "") {
        throw new Error("Google AI returned no content");
      }
      return text;
    },
  };
}
