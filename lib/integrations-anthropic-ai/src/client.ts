import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

/** True when both AI_INTEGRATIONS_ANTHROPIC_* env vars are set. */
export function isAnthropicConfigured(): boolean {
  return Boolean(
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL?.trim() &&
      process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY?.trim(),
  );
}

/** Returns the Anthropic client; throws if credentials are not configured. */
export function getAnthropic(): Anthropic {
  if (!isAnthropicConfigured()) {
    throw new Error(
      "AI is not configured. Set AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY to enable AI features.",
    );
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY!,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL!,
    });
  }
  return cachedClient;
}
