import {
  getAnthropic,
  isAnthropicConfigured,
} from "@workspace/integrations-anthropic-ai";

export { getAnthropic, isAnthropicConfigured };

export class AiNotConfiguredError extends Error {
  readonly status = 503;

  constructor() {
    super(
      "AI features are disabled. Configure AI_INTEGRATIONS_ANTHROPIC_BASE_URL and AI_INTEGRATIONS_ANTHROPIC_API_KEY to enable them.",
    );
    this.name = "AiNotConfiguredError";
  }
}

export function requireAnthropic() {
  if (!isAnthropicConfigured()) {
    throw new AiNotConfiguredError();
  }
  return getAnthropic();
}
