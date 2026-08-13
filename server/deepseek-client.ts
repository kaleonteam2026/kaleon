import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";

export function getDeepSeekClient(apiKey: string): OpenAI {
  return getDeepSeekClientWithBaseUrl(apiKey);
}

export function getDeepSeekClientWithBaseUrl(
  apiKey: string,
  baseUrl?: string,
): OpenAI {
  return new OpenAI({
    baseURL: baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey,
  });
}

export function getDeepSeekModel(): string {
  return getDeepSeekModelWithOverride();
}

export function getDeepSeekModelWithOverride(model?: string): string {
  return model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
}

export interface DeepSeekChatOptions {
  system: string;
  user: string;
  apiKey: string;
  responseFormat?: { type: "json_object" };
  baseUrl?: string;
  model?: string;
}

/** Call DeepSeek chat completions (OpenAI-compatible SDK). */
export async function deepSeekChat({
  system,
  user,
  apiKey,
  responseFormat,
  baseUrl,
  model,
}: DeepSeekChatOptions): Promise<string> {
  const client = getDeepSeekClientWithBaseUrl(apiKey, baseUrl);
  const resolvedModel = model ?? getDeepSeekModel();

  const completion = await client.chat.completions.create(
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      model: resolvedModel,
      temperature: 0.1,
      response_format: responseFormat,
    },
    { timeout: 180000 }, // 3 minutes — avoids socket hangup on slow DeepSeek responses
  );

  const content = completion.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("DeepSeek returned an empty response");
  }
  return content;
}
