const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";
const API_KEY_ENV_VAR = "DEEPSEEK_API_KEY";

const PLACEHOLDER_VALUES = new Set([
  "your_deepseek_api_key",
  "your_api_key",
  "placeholder",
  "changeme",
  "replace_me",
  "test_key",
  "demo_key",
]);

export type ProviderCredentialStatus = "configured" | "missing" | "placeholder";

export interface DeepSeekRuntimeConfig {
  provider: "DeepSeek";
  apiKeyEnvVar: typeof API_KEY_ENV_VAR;
  apiKey: string;
  credentialStatus: ProviderCredentialStatus;
  baseUrl: string;
  model: string;
}

export type PathwayGenerationErrorCode =
  | "provider_not_configured"
  | "provider_placeholder_key"
  | "provider_auth_failed"
  | "provider_network_failed"
  | "provider_malformed_response"
  | "generation_failed";

export class PathwayGenerationError extends Error {
  code: PathwayGenerationErrorCode;
  status: number;
  detail?: string;

  constructor(
    code: PathwayGenerationErrorCode,
    message: string,
    status: number,
    detail?: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "PathwayGenerationError";
    this.code = code;
    this.status = status;
    this.detail = detail;
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", {
        value: cause,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
  }
}

export function getDeepSeekRuntimeConfig(
  env: Record<string, string | undefined>,
): DeepSeekRuntimeConfig {
  const apiKey = env.DEEPSEEK_API_KEY?.trim() ?? "";
  return {
    provider: "DeepSeek",
    apiKeyEnvVar: API_KEY_ENV_VAR,
    apiKey,
    credentialStatus: getCredentialStatus(apiKey),
    baseUrl: env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL,
    model: env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function assertDeepSeekConfigured(config: DeepSeekRuntimeConfig): string {
  if (config.credentialStatus === "missing") {
    throw new PathwayGenerationError(
      "provider_not_configured",
      "Pathway generation is not configured right now.",
      503,
      `Missing ${config.apiKeyEnvVar}`,
    );
  }

  if (config.credentialStatus === "placeholder") {
    throw new PathwayGenerationError(
      "provider_placeholder_key",
      "Pathway generation is not configured with a real provider key yet.",
      503,
      `Placeholder ${config.apiKeyEnvVar}`,
    );
  }

  return config.apiKey;
}

export function normalizePathwayError(error: unknown): PathwayGenerationError {
  if (error instanceof PathwayGenerationError) {
    return error;
  }

  const status = Number(
    (error as { status?: unknown })?.status ??
      (error as { cause?: { status?: unknown } })?.cause?.status ??
      0,
  );
  const message = String((error as { message?: unknown })?.message ?? "Unknown pathway generation error");
  const detail = status > 0 ? `HTTP ${status}: ${message}` : message;

  if (
    status === 401 ||
    status === 403 ||
    /authentication fails|invalid api key|incorrect api key|unauthorized|forbidden/i.test(message)
  ) {
    return new PathwayGenerationError(
      "provider_auth_failed",
      "Pathway generation is temporarily unavailable because provider authentication failed.",
      502,
      detail,
      error,
    );
  }

  if (
    /could not parse pathway json|expected exactly 3 pathways|expected each pathway type once|empty response|non-empty pathways array/i.test(message)
  ) {
    return new PathwayGenerationError(
      "provider_malformed_response",
      "Pathway generation returned an unreadable result. Please try again.",
      502,
      detail,
      error,
    );
  }

  if (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /fetch failed|timed out|timeout|socket hang up|network|econnreset|econnrefused|enotfound|service unavailable|bad gateway/i.test(message)
  ) {
    return new PathwayGenerationError(
      "provider_network_failed",
      "Pathway generation could not reach the provider right now. Please try again.",
      status === 429 ? 429 : 502,
      detail,
      error,
    );
  }

  return new PathwayGenerationError(
    "generation_failed",
    "Pathway generation failed before Kaleon could finish. Please try again.",
    502,
    detail,
    error,
  );
}

function getCredentialStatus(value: string): ProviderCredentialStatus {
  if (!value) return "missing";
  if (isPlaceholderValue(value)) return "placeholder";
  return "configured";
}

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_VALUES.has(normalized)) return true;
  if (/^(your_|<your|replace[_-]?me|example[_-]?key)/i.test(normalized)) return true;
  if (/deepseek_api_key/.test(normalized)) return true;
  return false;
}
