import OpenAI from "openai";
import { logger } from "./logger";

if (!process.env.GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY is not set — AI features will be unavailable");
}

// Gemini exposes an OpenAI-compatible endpoint, so we can keep using the
// `openai` SDK — just point it at Google's base URL with a Gemini key.
export const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 2048
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gemini-2.5-flash",
    messages,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || "";
}