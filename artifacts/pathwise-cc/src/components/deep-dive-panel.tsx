import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeepDiveCitation { title?: string; url: string; snippet?: string }
interface DeepDiveSection { key: string; title: string; body: string; citations: DeepDiveCitation[] }
interface DeepDiveReport {
  universityId: string;
  universityName: string;
  major: string;
  generatedAt: string;
  sections: DeepDiveSection[];
  disclaimer: string;
}
interface CapInfo { used: number; cap: number; remaining: number }
interface DeepDiveResponse {
  cached: boolean;
  report: DeepDiveReport;
  expiresAt: string;
  generatedAt: string;
  aiCredits?: CapInfo & { user?: CapInfo; global?: CapInfo };
}

const SECTION_THEME: Record<string, string> = {
  admissions: "border-emerald-300 bg-emerald-50",
  cost: "border-amber-300 bg-amber-50",
  outcomes: "border-violet-300 bg-violet-50",
  campus_life: "border-sky-300 bg-sky-50",
  news: "border-rose-300 bg-rose-50",
};

export default function DeepDivePanel({ universityId, universityName, profileId }: { universityId: string; universityName: string; profileId: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeepDiveResponse | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ admissions: true });
  const [hasFetchedCache, setHasFetchedCache] = useState(false);

  async function loadCache() {
    if (hasFetchedCache) return;
    setHasFetchedCache(true);
    try {
      const res = await fetch(`/api/universities/${universityId}/deep-dive?profileId=${profileId}`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
  }

  async function runDeepDive() {
    setLoading(true);
    try {
      const res = await fetch(`/api/universities/${universityId}/deep-dive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileId }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Deep Dive failed", description: body.error ?? "Please try again later.", variant: "destructive" });
        return;
      }
      const resp = body as DeepDiveResponse;
      setData(resp);
      const credits = resp.aiCredits;
      const personal = credits?.user ?? credits;
      if (resp.cached) {
        toast({ title: "Loaded cached Deep Dive", description: personal ? `${personal.remaining} of ${personal.cap} of your daily AI credits left.` : undefined });
      } else if (personal) {
        toast({ title: "Deep Dive ready", description: `${personal.remaining} of ${personal.cap} of your daily AI credits left.` });
      }
    } catch (err) {
      toast({ title: "Network error", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <Collapsible open={open} onOpenChange={(v) => { setOpen(v); if (v) loadCache(); }}>
        <div className="flex items-center justify-between gap-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-indigo-700">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Deep Dive Report
            </button>
          </CollapsibleTrigger>
          {open && (
            <div className="flex items-center gap-2">
              {data?.aiCredits && (() => {
                const personal = data.aiCredits.user ?? data.aiCredits;
                const global = data.aiCredits.global;
                const title = global
                  ? `Your personal daily limit. App-wide: ${global.remaining}/${global.cap} left today.`
                  : "Your personal daily AI limit";
                return (
                  <span className="text-[10px] font-mono text-slate-500" title={title}>
                    {personal.remaining}/{personal.cap} your daily AI
                  </span>
                );
              })()}
              <Button
                size="sm"
                onClick={runDeepDive}
                disabled={loading || !!data}
                title={data ? `Cached until ${new Date(data.expiresAt).toLocaleDateString()}` : undefined}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                {loading ? "Researching…" : data ? "Cached for 30 days" : "Run Deep Dive"}
              </Button>
            </div>
          )}
        </div>

        <CollapsibleContent className="mt-3 space-y-2">
          {!data && !loading && (
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3">
              Generates a multi-source report on {universityName}: admissions, cost, major outcomes, campus life, and recent news.
              Uses one of your daily AI credits and is cached for 30 days per major.
            </div>
          )}

          {loading && (
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching public sources and synthesizing — this can take 20-40 seconds.
            </div>
          )}

          {data && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500">
                Generated {new Date(data.generatedAt).toLocaleDateString()} • Major: {data.report.major}
                {data.cached && <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded">cached</span>}
              </div>
              {data.report.sections.map((sec) => {
                const isOpen = openSections[sec.key] ?? false;
                return (
                  <div key={sec.key} className={cn("border rounded-md", SECTION_THEME[sec.key] ?? "border-slate-200 bg-white")}>
                    <button
                      onClick={() => setOpenSections((s) => ({ ...s, [sec.key]: !isOpen }))}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                    >
                      <span className="text-xs font-semibold text-slate-800">{sec.title}</span>
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{sec.body}</p>
                        {sec.citations.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/70">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Sources</div>
                            <ol className="space-y-1">
                              {sec.citations.map((c, i) => (
                                <li key={c.url + i} className="text-[11px]">
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                                  >
                                    [{i + 1}] {c.title ?? c.url}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="text-[10px] text-slate-400 italic pt-1">{data.report.disclaimer}</div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
