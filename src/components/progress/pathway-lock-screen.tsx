import { Link } from "wouter";
import { Lock, Target, ArrowRight, GraduationCap, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/copy";
import { Button } from "@/components/ui/button";

export function PathwayLockScreen({ profileId }: { profileId: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mb-5">
        <Lock className="h-9 w-9 text-slate-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t("pages.progress.selectPathwayFirst")}</h2>
      <p className="text-slate-600 max-w-md leading-relaxed mb-2">
        {t("pages.progress.pathwayLockBody")}
      </p>
      <p className="text-sm text-slate-600 mb-8">{t("pages.progress.goToPathway")}</p>
      <Link href={`/pathways/${profileId}`}>
        <Button className="bg-slate-900 hover:bg-slate-700 text-white border-2 border-slate-900 rounded-none gap-2">
          <Target className="h-4 w-4" />
          {t("pages.progress.goToMyPathway")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm text-center">
        {[
          { icon: GraduationCap, labelKey: "pages.progress.lockFeat_admission", color: "text-indigo-500" },
          { icon: BookOpen,      labelKey: "pages.progress.lockFeat_guidebook", color: "text-violet-500" },
          { icon: TrendingUp,    labelKey: "pages.progress.lockFeat_trajectory", color: "text-emerald-500" },
        ].map(({ icon: Icon, labelKey, color }) => (
          <div key={labelKey} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <Icon className={cn("h-5 w-5 mx-auto mb-1.5", color)} />
            <p className="text-xs text-slate-600 font-medium">{t(labelKey)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
