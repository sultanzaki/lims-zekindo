import OpenAI from "openai";

let cached: OpenAI | null = null;

/**
 * Points at whatever OpenAI-compatible gateway is configured in the
 * environment (AI_BASE_URL/AI_API_KEY) — the model itself (Claude, GPT,
 * DeepSeek, …) is just a `model` string on that same gateway, so swapping
 * providers is a config change, not a code change.
 */
export function getAiClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.AI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error("The assistant isn't configured yet — set AI_API_KEY and AI_BASE_URL in the environment.");
  }
  cached = new OpenAI({ apiKey, baseURL });
  return cached;
}

export const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
