import { t } from "@/lib/copy";
import { GRADUATION_UNITS, graduationProgressPercent } from "@/lib/course-progress";

interface PathHeroCardProps {
  targetSchool: string;
  intendedMajor?: string | null;
  communityCollege?: string | null;
  transferTerm: string;
  totalUnits: number;
}

export function PathHeroCard({ targetSchool, intendedMajor, communityCollege, transferTerm, totalUnits }: PathHeroCardProps) {
  return (
    <div className="col-span-12 p-5 md:p-6 rounded-xl" style={{ background: "rgba(13,26,46,0.85)", border: "1px solid rgba(78,204,163,0.25)" }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-1 pwc-font-mono" style={{ color: "#4ECCA3" }}>YOUR DASHBOARD</p>
      <h2 className="text-xl md:text-2xl font-bold leading-snug" style={{ color: "#f8fafc" }}>
        Your path to{" "}
        <span style={{ color: "#4ECCA3" }}>{targetSchool}</span>
      </h2>
      {(intendedMajor || transferTerm) && (
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          {[intendedMajor, `Transfer ${transferTerm}`].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <div className="flex-1 p-3 rounded-lg" style={{ background: "rgba(78,204,163,0.06)", border: "1px solid rgba(78,204,163,0.12)" }}>
          <p className="text-[10px] pwc-font-mono uppercase tracking-wider mb-1" style={{ color: "#475569" }}>Current College</p>
          <p className="font-bold text-sm" style={{ color: "#cbd5e1" }}>{communityCollege ?? "—"}</p>
        </div>
        <div className="flex-1 p-3 rounded-lg" style={{ background: "rgba(78,204,163,0.06)", border: "1px solid rgba(78,204,163,0.12)" }}>
          <p className="text-[10px] pwc-font-mono uppercase tracking-wider mb-1" style={{ color: "#475569" }}>Completed Units</p>
          <p className="font-bold text-sm" style={{ color: "#cbd5e1" }}>{totalUnits} units</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="pwc-font-mono uppercase tracking-wider" style={{ color: "#475569" }}>Current Progress</span>
          <span className="pwc-font-mono" style={{ color: "#4ECCA3" }}>
            {totalUnits} / {GRADUATION_UNITS} units
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(78,204,163,0.1)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            background: "linear-gradient(90deg, #4ECCA3, #38b2ac)",
            width: `${graduationProgressPercent(totalUnits)}%`,
          }} />
        </div>
      </div>
    </div>
  );
}
