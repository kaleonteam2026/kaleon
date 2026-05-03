import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Nav from "@/components/nav";
import { fadeUp, staggerContainer, useMotionEnabled } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ExternalLink, Search, Loader2, GraduationCap, MapPin, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import DeepDivePanel from "@/components/deep-dive-panel";

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

const COST_KEYS: Record<string, string> = {
  low: "pages.matches.cost_low",
  medium: "pages.matches.cost_medium",
  high: "pages.matches.cost_high",
  very_high: "pages.matches.cost_very_high",
};

export default function Matches() {
  const { t } = useTranslation();
  const { profileId } = useParams<{ profileId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSystem, setFilterSystem] = useState("all");
  const pid = parseInt(profileId);
  const motionEnabled = useMotionEnabled();
  const itemVariants = useMemo(() => fadeUp(8, 0.22), []);
  const containerVariants = useMemo(() => staggerContainer(0.05), []);

  useEffect(() => {
    fetch(`/api/profiles/${pid}/generate-matches`, { method: "POST", credentials: "include" })
      .then(r => r.json())
      .then((m: Match[]) => setMatches(m))
      .catch(() => toast({ title: t("pages.matches.toastError"), variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [pid]);

  const filtered = matches.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.location.toLowerCase().includes(search.toLowerCase());
    const matchSystem = filterSystem === "all" || m.system === filterSystem;
    return matchSearch && matchSystem;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-sm text-slate-500">{t("pages.matches.calculating")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: ".pwc-font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }" }} />
      <Nav profileId={pid} />
      <main id="main-content" tabIndex={-1} className="pt-14 pb-20 md:pb-8 focus:outline-none px-4 md:px-8 max-w-5xl mx-auto">
        <div className="py-6 border-b-2 border-slate-900 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 uppercase tracking-tight">{t("pages.matches.title")}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {t("pages.matches.subtitle", { count: matches.length })}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder={t("pages.matches.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
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
                {sys === "all" ? t("pages.matches.filterAll") : sys}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <motion.div
          className="space-y-3 pb-12"
          initial={motionEnabled ? "hidden" : false}
          animate={motionEnabled ? "show" : undefined}
          variants={containerVariants}
        >
          {filtered.map((match, idx) => (
            <motion.div key={match.universityId} variants={itemVariants}>
            <Card className="hover:border-indigo-200 hover:shadow-sm transition-all">
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
                        {t("pages.matches.gpaLabel")} {match.gpaRangeMin.toFixed(1)}–{match.gpaRangeRecommended.toFixed(1)}
                      </span>
                      <span>{t("pages.matches.costLabel")} {COST_KEYS[match.costCategory] ? t(COST_KEYS[match.costCategory]) : match.costCategory}</span>
                      <span>{t("pages.matches.transferFriendliness")} {match.transferFriendliness}/100</span>
                    </div>

                    {match.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic">{match.notes}</p>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {match.majors.slice(0, 4).map(m => (
                        <span key={m} className="text-xs bg-indigo-50 text-slate-900 px-2 py-0.5 rounded-full">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Official link */}
                  <a
                    href={match.officialTransferUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                    title={t("pages.matches.officialTransfer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <DeepDivePanel universityId={match.universityId} universityName={match.name} profileId={pid} />
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer + CTA */}
        <div className="border-t border-slate-200 py-8 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>{t("pages.matches.disclaimerTitle")}</strong> {t("pages.matches.disclaimerBody")}
          </div>
          <div className="text-right">
            <Button onClick={() => navigate(`/pathways/${pid}`)} className="bg-slate-900 hover:bg-slate-700 border-2 border-slate-900 rounded-none">
              {t("pages.matches.generatePathways")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
