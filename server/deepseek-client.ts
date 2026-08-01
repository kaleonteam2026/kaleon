import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";

export function getDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey,
  });
}

export function getDeepSeekModel(): string {
  return process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
}

/**
 * Print the effective DeepSeek configuration at startup so deployed logs
 * show which base URL / model / thinking mode the running server is using.
 * Call once during server boot.
 */
export function logDeepSeekConfig(): void {
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;
  const model = getDeepSeekModel();
  console.log(`[deepseek] base_url=${baseUrl} model=${model} thinking=disabled`);
}

export interface DeepSeekChatOptions {
  system: string;
  user: string;
  apiKey: string;
}

/** Call DeepSeek chat completions (OpenAI-compatible SDK). */
export async function deepSeekChat({
  system,
  user,
  apiKey,
}: DeepSeekChatOptions): Promise<string> {
  const client = getDeepSeekClient(apiKey);
  const model = getDeepSeekModel();

  const completion = await client.chat.completions.create(
    {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      model,
      temperature: 0.1,
      // Explicitly disable thinking mode. DeepSeek V4 enables it by default,
      // which sends all output tokens to `reasoning_content` and leaves
      // `content` empty — breaking these stateless single-turn calls.
      //
      // `thinking` is a DeepSeek-specific extension the OpenAI SDK types
      // don't know about, so cast through an intersection.
      ...({
        thinking: { type: "disabled" },
      } as Record<string, unknown>),
    },
    { timeout: 180000 }, // 3 minutes — avoids socket hangup on slow DeepSeek responses
  );

  const content = completion.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("DeepSeek returned an empty response");
  }
  return content;
}
