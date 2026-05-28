import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { CheckSquare, Square, CheckCircle2 } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

// ─── Section colour theme ────────────────────────────────────────────────────
export function getSectionTheme(text: string) {
  const t = text.toLowerCase();
  if (t.includes("executive") || t.includes("summary"))    return { border: "border-indigo-400",  bg: "bg-indigo-50",  heading: "text-indigo-800" };
  if (t.includes("profile")   || t.includes("snapshot"))   return { border: "border-slate-400",   bg: "bg-slate-50",   heading: "text-slate-800" };
  if (t.includes("pathway")   || t.includes("overview"))   return { border: "border-blue-400",    bg: "bg-blue-50",    heading: "text-blue-800" };
  if (t.includes("semester")  || t.includes("academic plan")) return { border: "border-violet-400", bg: "bg-violet-50", heading: "text-violet-800" };
  if (t.includes("transfer requirements") || t.includes("application deadline")) return { border: "border-emerald-400", bg: "bg-emerald-50", heading: "text-emerald-800" };
  if (t.includes("scholarship"))                            return { border: "border-amber-400",   bg: "bg-amber-50",   heading: "text-amber-800" };
  if (t.includes("community college on-site") || t.includes("community college opportunities")) return { border: "border-lime-500", bg: "bg-lime-50", heading: "text-lime-800" };
  if (t.includes("on-site") || t.includes("university on-site") || t.includes("opportunit") || t.includes("extracurricular")) return { border: "border-teal-400", bg: "bg-teal-50", heading: "text-teal-800" };
  if (t.includes("career preparation") || t.includes("resume")) return { border: "border-orange-400", bg: "bg-orange-50", heading: "text-orange-800" };
  if (t.includes("university year") || t.includes("success roadmap")) return { border: "border-violet-500", bg: "bg-violet-50",  heading: "text-violet-900" };
  if (t.includes("field-specific") || t.includes("excellence"))       return { border: "border-fuchsia-400", bg: "bg-fuchsia-50", heading: "text-fuchsia-800" };
  if (t.includes("networking") || t.includes("professional network")) return { border: "border-sky-400",    bg: "bg-sky-50",    heading: "text-sky-800" };
  if (t.includes("internship") || t.includes("research roadmap"))     return { border: "border-teal-500",   bg: "bg-teal-50",   heading: "text-teal-900" };
  if (t.includes("graduate school") || t.includes("career launch"))   return { border: "border-indigo-500", bg: "bg-indigo-50", heading: "text-indigo-900" };
  if (t.includes("action") || t.includes("monthly"))       return { border: "border-cyan-400",   bg: "bg-cyan-50",   heading: "text-cyan-800" };
  if (t.includes("risk") || t.includes("alert"))           return { border: "border-rose-400",   bg: "bg-rose-50",   heading: "text-rose-800" };
  if (t.includes("advisor") || t.includes("meeting") || t.includes("verification")) return { border: "border-purple-400", bg: "bg-purple-50", heading: "text-purple-800" };
  return { border: "border-slate-300", bg: "bg-white", heading: "text-slate-800" };
}

// ─── Parse task-list prefix ──────────────────────────────────────────────────
export function parseTaskItem(children: React.ReactNode): { isTask: boolean; checked: boolean; content: React.ReactNode } {
  const check = (s: string) => {
    const m = s.match(/^\[( |x|X)\]\s*(.*)/s);
    return m ? { isTask: true, checked: m[1].toLowerCase() === "x", rest: m[2] } : null;
  };
  if (typeof children === "string") {
    const m = check(children);
    if (m) return { isTask: true, checked: m.checked, content: m.rest };
  }
  if (Array.isArray(children) && typeof children[0] === "string") {
    const m = check(children[0]);
    if (m) return { isTask: true, checked: m.checked, content: [m.rest, ...children.slice(1)] };
  }
  return { isTask: false, checked: false, content: children };
}

// ─── Markdown table parser ────────────────────────────────────────────────────
type Chunk = { kind: "prose"; text: string } | { kind: "table"; headers: string[]; rows: string[][] };

export function splitIntoChunks(md: string): Chunk[] {
  const lines = md.split("\n");
  const chunks: Chunk[] = [];
  let proseLines: string[] = [];
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|/.test(l);
  const isSepRow   = (l: string) => /^\s*\|[\s|:-]+\|[\s|:-]*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isTableRow(line) && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      if (proseLines.length) {
        chunks.push({ kind: "prose", text: proseLines.join("\n") });
        proseLines = [];
      }
      const parseRow = (r: string) =>
        r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
      const headers = parseRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      chunks.push({ kind: "table", headers, rows });
    } else {
      proseLines.push(line);
      i++;
    }
  }
  if (proseLines.length) chunks.push({ kind: "prose", text: proseLines.join("\n") });
  return chunks;
}

// ─── Table renderers ──────────────────────────────────────────────────────────
function KeyValueCard({ rows }: { rows: string[][] }) {
  const scoreBadge = (val: string) => {
    const m = val.match(/^(\d+)\s*[/\/]\s*100/);
    if (!m) return null;
    const n = parseInt(m[1]);
    const color = n >= 85 ? "bg-emerald-100 text-emerald-700" : n >= 70 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
    return <span className={cn("ml-2 text-xs font-semibold px-2 py-0.5 rounded-full", color)}>{n}/100</span>;
  };
  return (
    <div className="my-5 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {rows.map(([label, value], i) => (
        <div key={i} className={cn(
          "flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0",
          i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
        )}>
          <span className="w-44 flex-shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wide pt-0.5">{label}</span>
          <span className="flex-1 text-sm text-slate-800 leading-snug">
            {value}{scoreBadge(value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-700 text-white">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {row.map((cell, ci) => (
                <td key={ci} className={cn(
                  "px-4 py-3 align-top border-t border-slate-100 text-slate-700",
                  ci === 0 ? "font-semibold text-slate-800 whitespace-nowrap" : ""
                )}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (headers.length === 2) return <KeyValueCard rows={rows} />;
  return <DataTable headers={headers} rows={rows} />;
}

// ─── ReactMarkdown components ─────────────────────────────────────────────────
export function makeComponents(
  setSection: (s: string) => void
): ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-slate-900 mb-3 pb-3 border-b-2 border-indigo-200">{children}</h1>
    ),
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children ?? "");
      const t = getSectionTheme(text);
      setTimeout(() => setSection(text), 0);
      return (
        <h2 className={cn("text-base font-bold mt-10 mb-3 px-4 py-2.5 rounded-lg border-l-4", t.border, t.bg, t.heading)}>
          {children}
        </h2>
      );
    },
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold text-slate-800 mt-5 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-400 rounded-full inline-block flex-shrink-0" />
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-1.5">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 my-5 rounded-r-lg text-amber-800 text-sm not-italic">
        {children}
      </blockquote>
    ),
    ul: ({ children }) => <ul className="space-y-1.5 my-3 ml-1">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-1.5 my-3 ml-1 list-none">{children}</ol>,
    li: ({ children, ...props }) => {
      const { isTask, checked, content } = parseTaskItem(children);
      if (isTask) {
        return (
          <li className="flex items-start gap-2.5 py-0.5">
            {checked
              ? <CheckSquare className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              : <Square className="h-4 w-4 text-slate-300 flex-shrink-0 mt-0.5" />}
            <span className={cn("text-sm leading-relaxed", checked ? "text-slate-400 line-through" : "text-slate-700")}>
              {content}
            </span>
          </li>
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordered = (props as any).ordered ?? false;
      if (ordered) {
        return (
          <li className="flex items-start gap-2.5 py-0.5">
            <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-700 leading-relaxed">{children}</span>
          </li>
        );
      }
      return (
        <li className="flex items-start gap-2 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-[0.45rem]" />
          <span className="text-sm text-slate-700 leading-relaxed">{children}</span>
        </li>
      );
    },
    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
    em:     ({ children }) => <em className="italic text-slate-600">{children}</em>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
        {children}
      </a>
    ),
    p:  ({ children }) => <p className="text-slate-600 leading-relaxed mb-3 text-sm">{children}</p>,
    hr: ()              => <hr className="border-slate-200 my-8" />,
    code: ({ children, ...props }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inline = (props as any).inline ?? true;
      return inline
        ? <code className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>
        : <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 my-4 overflow-x-auto text-xs font-mono"><code>{children}</code></pre>;
    },
    table: ({ children }) => <>{children}</>,
    thead: ({ children }) => <>{children}</>,
    tbody: ({ children }) => <>{children}</>,
    th:    ()            => null,
    td:    ()            => null,
    tr:    ()            => null,
  };
}

// ─── Main rendered content ────────────────────────────────────────────────────
export function MarkdownContent({ markdown, setSection }: { markdown: string; setSection: (s: string) => void }) {
  const chunks = splitIntoChunks(markdown);
  const components = makeComponents(setSection);
  return (
    <>
      {chunks.map((chunk, idx) =>
        chunk.kind === "table"
          ? <MarkdownTable key={idx} headers={chunk.headers} rows={chunk.rows} />
          : <ReactMarkdown key={idx} components={components}>{chunk.text}</ReactMarkdown>
      )}
    </>
  );
}
