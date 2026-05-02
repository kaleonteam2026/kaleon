import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Nav from "@/components/nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ExternalLink, Search, Loader2, GraduationCap, MapPin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Match {
  universityId: string;
  name: string;
  system: string;
  location: string;
  compatibilityScore: number;
  fitLabel: string;
  fitColor: string;
  gpaRangeMin: number;
  gpaRangeRecommended: number;
  costCategory: string;
  transferFriendliness: number;
  officialTransferUrl: string;
  notes: string;
  majors: string[];
  careerTags: string[];
}

const FIT_COLORS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

const SCORE_BAR: Record<string, string> = {
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  yellow: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

const COST_LABELS: Record<string, string> = {
  low: "Low (CSU rate)", medium: "Medium", high: "High (UC rate)", very_high: "High (Private)",
};

export default function Matches() {
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSystem, setFilterSystem] = useState("all");
  const pid = parseInt(profileId);

  useEffect(() => {
    fetch(`/api/profiles/${pid}/generate-matches`, { method: "POST", credentials: "include" })
      .then(r => r.json())
      .then((m: Match[]) => setMatches(m))
      .catch(() => toast({ title: "Error loading matches", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [pid]);

  const filtered = matches.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.location.toLowerCase().includes(search.toLowerCase());
    const matchSystem = filterSystem === "all" || m.system === filterSystem;
    return matchSearch && matchSystem;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Calculating your university matches…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav profileId={pid} />
      <main className="pt-14 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="py-8">
          <h1 className="text-2xl font-bold text-slate-900">University Matches</h1>
          <p className="text-slate-500 text-sm mt-1">
            {matches.length} universities ranked by compatibility with your profile. Scores are AI estimates — always verify requirements.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search universities…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {["all", "UC", "CSU", "Private"].map(sys => (
              <button
                key={sys}
                onClick={() => setFilterSystem(sys)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  filterSystem === sys ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                )}
              >
                {sys === "all" ? "All" : sys}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 pb-12">
          {filtered.map((match, idx) => (
            <Card key={match.universityId} className="hover:border-indigo-200 hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{match.name}</h3>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{match.system}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", FIT_COLORS[match.fitColor])}>
                        {match.fitLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                      <MapPin className="h-3 w-3" />
                      {match.location}
                    </div>

                    {/* Score bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={cn("h-1.5 rounded-full transition-all", SCORE_BAR[match.fitColor])}
                          style={{ width: `${match.compatibilityScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-600 w-8 text-right">{match.compatibilityScore}%</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        GPA: {match.gpaRangeMin.toFixed(1)}–{match.gpaRangeRecommended.toFixed(1)}
                      </span>
                      <span>Cost: {COST_LABELS[match.costCategory] ?? match.costCategory}</span>
                      <span>Transfer-friendliness: {match.transferFriendliness}/100</span>
                    </div>

                    {match.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">{match.notes}</p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {match.majors.slice(0, 4).map(m => (
                        <span key={m} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Official link */}
                  <a
                    href={match.officialTransferUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                    title="Official transfer info"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disclaimer + CTA */}
        <div className="border-t border-slate-200 py-8 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>Disclaimer:</strong> Compatibility scores are AI estimates based on publicly available data as of early 2025.
            They are not guarantees of admission. GPA ranges and requirements change — always verify with official sources.
          </div>
          <div className="text-right">
            <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-indigo-600 hover:bg-indigo-700">
              Generate AI Pathways <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
