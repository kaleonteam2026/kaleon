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

  const completion = await client.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    model,
    temperature: 0.1,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("DeepSeek returned an empty response");
  }
  return content;
}
