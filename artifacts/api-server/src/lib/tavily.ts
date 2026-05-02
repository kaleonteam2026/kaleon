export interface TavilyCitation {
  title?: string;
  url: string;
  snippet?: string;
}

export interface TavilyResult {
  answer: string;
  citations: TavilyCitation[];
}

interface TavilyRawResult {
  title?: string;
  url: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyRawResult[];
}

export async function tavilySearch(opts: {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean | "basic" | "advanced";
  topic?: "general" | "news";
  days?: number;
}): Promise<TavilyResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const body: Record<string, unknown> = {
    query: opts.query,
    search_depth: opts.searchDepth ?? "advanced",
    include_answer: opts.includeAnswer ?? "advanced",
    max_results: opts.maxResults ?? 8,
    topic: opts.topic ?? "general",
  };
  if (opts.days) body.days = opts.days;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as TavilyResponse;
  const answer = data.answer ?? "";
  const citations: TavilyCitation[] = (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 200),
  }));

  return { answer, citations };
}
