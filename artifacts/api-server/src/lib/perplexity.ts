export interface PerplexityCitation {
  title?: string;
  url: string;
}

export interface PerplexityResult {
  answer: string;
  citations: PerplexityCitation[];
  model: string;
}

interface PerplexityChoice {
  message: { role: string; content: string };
}

interface PerplexityResponse {
  choices: PerplexityChoice[];
  citations?: string[];
  search_results?: Array<{ title?: string; url: string }>;
  model: string;
}

export async function perplexitySearch(opts: {
  query: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const body = {
    model: opts.model ?? "sonar",
    messages: [
      ...(opts.systemPrompt ? [{ role: "system", content: opts.systemPrompt }] : []),
      { role: "user", content: opts.query },
    ],
    max_tokens: opts.maxTokens ?? 800,
    temperature: 0.2,
    return_citations: true,
  };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as PerplexityResponse;
  const answer = data.choices?.[0]?.message?.content ?? "";

  const citations: PerplexityCitation[] = [];
  if (data.search_results && data.search_results.length > 0) {
    for (const r of data.search_results) citations.push({ title: r.title, url: r.url });
  } else if (data.citations) {
    for (const url of data.citations) citations.push({ url });
  }

  return { answer, citations, model: data.model };
}
