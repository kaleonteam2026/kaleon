import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, Loader2, BookOpen, AlertTriangle,
  CheckSquare, Square, CheckCircle2
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

// Section color themes mapped by keyword in h2 headings
function getSectionTheme(text: string): { border: string; bg: string; heading: string } {
  const t = text.toLowerCase();
  if (t.includes("executive") || t.includes("summary")) return { border: "border-indigo-300", bg: "bg-indigo-50/40", heading: "text-indigo-800" };
  if (t.includes("profile") || t.includes("snapshot")) return { border: "border-slate-300", bg: "bg-slate-50/60", heading: "text-slate-800" };
  if (t.includes("pathway") || t.includes("overview")) return { border: "border-blue-300", bg: "bg-blue-50/40", heading: "text-blue-800" };
  if (t.includes("semester") || t.includes("academic") || t.includes("plan")) return { border: "border-violet-300", bg: "bg-violet-50/40", heading: "text-violet-800" };
  if (t.includes("transfer") || t.includes("checklist") || t.includes("deadline")) return { border: "border-emerald-300", bg: "bg-emerald-50/40", heading: "text-emerald-800" };
  if (t.includes("scholarship")) return { border: "border-amber-300", bg: "bg-amber-50/40", heading: "text-amber-800" };
  if (t.includes("extracurricular") || t.includes("campus") || t.includes("opportunit")) return { border: "border-teal-300", bg: "bg-teal-50/40", heading: "text-teal-800" };
  if (t.includes("career") || t.includes("resume")) return { border: "border-orange-300", bg: "bg-orange-50/40", heading: "text-orange-800" };
  if (t.includes("action") || t.includes("monthly")) return { border: "border-cyan-300", bg: "bg-cyan-50/40", heading: "text-cyan-800" };
  if (t.includes("risk") || t.includes("alert")) return { border: "border-rose-300", bg: "bg-rose-50/40", heading: "text-rose-800" };
  if (t.includes("advisor") || t.includes("meeting") || t.includes("verification")) return { border: "border-purple-300", bg: "bg-purple-50/40", heading: "text-purple-800" };
  return { border: "border-slate-200", bg: "bg-white", heading: "text-slate-800" };
}

// Parse a list item text to detect task-list syntax: "[ ]" or "[x]" or "[X]"
function parseListItem(children: React.ReactNode): { isTask: boolean; checked: boolean; content: React.ReactNode } {
  if (typeof children === "string") {
    const match = children.match(/^\[( |x|X)\]\s*(.*)/s);
    if (match) return { isTask: true, checked: match[1].toLowerCase() === "x", content: match[2] };
  }
  // ReactMarkdown passes children as an array — check if first child is a string
  if (Array.isArray(children)) {
    const first = children[0];
    if (typeof first === "string") {
      const match = first.match(/^\[( |x|X)\]\s*(.*)/s);
      if (match) {
        const rest = children.slice(1);
        const content = [match[2], ...rest];
        return { isTask: true, checked: match[1].toLowerCase() === "x", content };
      }
    }
  }
  return { isTask: false, checked: false, content: children };
}

export default function Guidebook() {
  const { guidebookId } = useParams<{ guidebookId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [guidebook, setGuidebook] = useState<Guidebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<string>("");
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
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const theme = getSectionTheme(currentSection);

  const components: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
    // H1 = document title (only appears once at top)
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-slate-900 mb-2 pb-3 border-b-2 border-indigo-200">
        {children}
      </h1>
    ),

    // H2 = major sections — rendered as colored section headers
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const t = getSectionTheme(text);
      // Update tracking state via side-effect (renders on server too, but fine for client)
      setTimeout(() => setCurrentSection(text), 0);
      return (
        <h2 className={cn(
          "text-lg font-bold mt-10 mb-4 px-4 py-2.5 rounded-lg border-l-4",
          t.border, t.bg, t.heading
        )}>
          {children}
        </h2>
      );
    },

    // H3 = sub-sections
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-slate-800 mt-5 mb-2 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-400 rounded-full inline-block flex-shrink-0" />
        {children}
      </h3>
    ),

    // H4 = labels inside sub-sections
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mt-4 mb-1.5">
        {children}
      </h4>
    ),

    // Blockquote = disclaimer / callout
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 my-6 rounded-r-lg text-amber-800 text-sm not-italic">
        {children}
      </blockquote>
    ),

    // Tables — clean alternating rows
    table: ({ children }) => (
      <div className="overflow-x-auto my-5 rounded-lg border border-slate-200 shadow-sm">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-700 text-white">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left font-semibold text-sm">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 text-slate-700 align-top">{children}</td>
    ),
    tr: ({ children, ...props }) => {
      // @ts-expect-error rowIndex
      const idx = props["data-row-index"] ?? 0;
      return <tr className={cn(idx % 2 === 0 ? "bg-white" : "bg-slate-50/70")}>{children}</tr>;
    },

    // Unordered lists — detect task lists ([ ] / [x])
    ul: ({ children }) => <ul className="space-y-1.5 my-3 ml-1">{children}</ul>,
    ol: ({ children }) => (
      <ol className="space-y-1.5 my-3 ml-1 list-none counter-reset-item">
        {children}
      </ol>
    ),

    li: ({ children, ...props }) => {
      // Detect task-list items ([ ] / [x])
      const { isTask, checked, content } = parseListItem(children);

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

      // Check if inside an ordered list (has `ordered` prop via parent context)
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
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-2" />
          <span className="text-sm text-slate-700 leading-relaxed">{children}</span>
        </li>
      );
    },

    strong: ({ children }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),

    em: ({ children }) => (
      <em className="italic text-slate-600">{children}</em>
    ),

    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
        {children}
      </a>
    ),

    p: ({ children }) => (
      <p className="text-slate-600 leading-relaxed mb-3 text-sm">{children}</p>
    ),

    hr: () => <hr className="border-slate-200 my-8" />,

    code: ({ children, ...props }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inline = (props as any).inline ?? true;
      if (inline) {
        return <code className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded font-mono">{children}</code>;
      }
      return (
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 my-4 overflow-x-auto text-xs font-mono">
          <code>{children}</code>
        </pre>
      );
    },
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Nav profileId={guidebook.profileId} />
      <main className="pt-14 px-4 md:px-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="py-6 flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
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

        {/* Disclaimer banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            This guidebook is AI-generated and is <strong>not a substitute</strong> for official academic advising.
            Verify all requirements with your counselor and each university's official transfer admissions page.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Square className="h-3.5 w-3.5 text-slate-300" /> Not completed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" /> Action item
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Note
          </span>
        </div>

        {/* Guidebook content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 md:px-10 py-8 mb-12">
          <ReactMarkdown
            components={components}
          >
            {guidebook.contentMarkdown ?? "No content available."}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="text-center pb-12">
          <Button onClick={downloadMarkdown} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Download Guidebook
          </Button>
          <p className="text-xs text-slate-400 mt-3">
            Pathwise CC · AI-generated · Always verify with official sources
          </p>
        </div>
      </main>
    </div>
  );
}
