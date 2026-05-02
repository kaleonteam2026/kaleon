import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, Loader2, BookOpen, AlertTriangle,
  CheckSquare, Square, CheckCircle2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface Guidebook {
  id: number;
  title?: string;
  contentMarkdown?: string;
  profileId?: number;
  createdAt?: string;
}

// ─── Section colour theme ────────────────────────────────────────────────────
function getSectionTheme(text: string) {
  const t = text.toLowerCase();
  if (t.includes("executive") || t.includes("summary"))  return { border: "border-indigo-400", bg: "bg-indigo-50", heading: "text-indigo-800" };
  if (t.includes("profile")  || t.includes("snapshot"))  return { border: "border-slate-400",  bg: "bg-slate-50",  heading: "text-slate-800" };
  if (t.includes("pathway")  || t.includes("overview"))  return { border: "border-blue-400",   bg: "bg-blue-50",   heading: "text-blue-800" };
  if (t.includes("semester") || t.includes("academic"))  return { border: "border-violet-400", bg: "bg-violet-50", heading: "text-violet-800" };
  if (t.includes("transfer") || t.includes("checklist") || t.includes("deadline")) return { border: "border-emerald-400", bg: "bg-emerald-50", heading: "text-emerald-800" };
  if (t.includes("scholarship"))                          return { border: "border-amber-400",  bg: "bg-amber-50",  heading: "text-amber-800" };
  if (t.includes("extracurricular") || t.includes("campus") || t.includes("opportunit")) return { border: "border-teal-400", bg: "bg-teal-50", heading: "text-teal-800" };
  if (t.includes("career")   || t.includes("resume"))    return { border: "border-orange-400", bg: "bg-orange-50", heading: "text-orange-800" };
  if (t.includes("action")   || t.includes("monthly"))   return { border: "border-cyan-400",   bg: "bg-cyan-50",   heading: "text-cyan-800" };
  if (t.includes("risk")     || t.includes("alert"))     return { border: "border-rose-400",   bg: "bg-rose-50",   heading: "text-rose-800" };
  if (t.includes("advisor")  || t.includes("meeting") || t.includes("verification")) return { border: "border-purple-400", bg: "bg-purple-50", heading: "text-purple-800" };
  return { border: "border-slate-300", bg: "bg-white", heading: "text-slate-800" };
}

// ─── Parse task-list prefix from li children ─────────────────────────────────
function parseTaskItem(children: React.ReactNode): { isTask: boolean; checked: boolean; content: React.ReactNode } {
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
// Splits raw markdown into alternating [prose, table, prose, table …] chunks.
type Chunk = { kind: "prose"; text: string } | { kind: "table"; headers: string[]; rows: string[][] };

function splitIntoChunks(md: string): Chunk[] {
  const lines = md.split("\n");
  const chunks: Chunk[] = [];
  let proseLines: string[] = [];
  let i = 0;

  const isTableRow = (l: string) => /^\s*\|/.test(l);
  const isSepRow   = (l: string) => /^\s*\|[\s|:-]+\|[\s|:-]*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    // Detect start of a markdown table: a row followed by a separator row
    if (isTableRow(line) && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      // Flush pending prose
      if (proseLines.length) {
        chunks.push({ kind: "prose", text: proseLines.join("\n") });
        proseLines = [];
      }
      // Parse header
      const parseRow = (r: string) =>
        r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
      const headers = parseRow(line);
      i += 2; // skip header + separator
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

// ─── Styled table renderer ────────────────────────────────────────────────────
function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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
                  ci === 0 ? "font-medium text-slate-800 whitespace-nowrap" : ""
                )}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ReactMarkdown custom components (prose only — tables handled above) ──────
function makeComponents(
  setSection: (s: string) => void
): ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-slate-900 mb-3 pb-3 border-b-2 border-indigo-200">
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children ?? "");
      const t = getSectionTheme(text);
      setTimeout(() => setSection(text), 0);
      return (
        <h2 className={cn(
          "text-base font-bold mt-10 mb-3 px-4 py-2.5 rounded-lg border-l-4",
          t.border, t.bg, t.heading
        )}>
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
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-1.5">
        {children}
      </h4>
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
    // Suppress raw table elements — we handle tables ourselves via splitIntoChunks
    table: ({ children }) => <>{children}</>,
    thead: ({ children }) => <>{children}</>,
    tbody: ({ children }) => <>{children}</>,
    th:    ()            => null,
    td:    ()            => null,
    tr:    ()            => null,
  };
}

// ─── Main rendered content ────────────────────────────────────────────────────
function GuidebookContent({ markdown, setSection }: { markdown: string; setSection: (s: string) => void }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Guidebook() {
  const { guidebookId } = useParams<{ guidebookId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [guidebook, setGuidebook] = useState<Guidebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCurrentSection] = useState("");
  const gid = parseInt(guidebookId);

  useEffect(() => {
    fetch(`/api/guidebooks/${gid}`, { credentials: "include" })
      .then(r => r.json())
      .then((g: Guidebook) => setGuidebook(g))
      .catch(() => toast({ title: "Error loading guidebook", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [gid]);

  const downloadMarkdown = () => {
    if (!guidebook?.contentMarkdown) return;
    const blob = new Blob([guidebook.contentMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-guidebook-${guidebook.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Guidebook downloaded!" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading your guidebook…</p>
        </div>
      </div>
    );
  }

  if (!guidebook) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Guidebook not found.</p>
          <Button variant="outline" onClick={() => window.history.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Nav profileId={guidebook.profileId} />
      <main className="pt-14 px-4 md:px-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="py-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Pathways
            </button>
            <h1 className="text-xl font-bold text-slate-900">{guidebook.title ?? "Your Transfer Guidebook"}</h1>
            {guidebook.createdAt && (
              <p className="text-xs text-slate-400 mt-1">
                Generated {new Date(guidebook.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <Button onClick={downloadMarkdown} variant="outline" size="sm" className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            This guidebook is AI-generated and is <strong>not a substitute</strong> for official academic advising.
            Verify all requirements with your counselor and each university's official admissions page.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-5 mb-5 px-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Square className="h-3.5 w-3.5 text-slate-300" /> Pending</span>
          <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Done</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Action step</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Note</span>
        </div>

        {/* Guidebook content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 md:px-10 py-8 mb-12">
          <GuidebookContent
            markdown={guidebook.contentMarkdown ?? "No content available."}
            setSection={setCurrentSection}
          />
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <Button onClick={downloadMarkdown} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Download Guidebook
          </Button>
          <p className="text-xs text-slate-400 mt-3">Pathwise CC · AI-generated · Always verify with official sources</p>
        </div>
      </main>
    </div>
  );
}
