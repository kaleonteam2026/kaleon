interface SemesterComparisonProps {
  kaleonSemesters: number;
  typicalSemesters: number;
  semestersSaved: number;
  moneySaved: number;
}

export function SemesterComparison({ kaleonSemesters, typicalSemesters, semestersSaved, moneySaved }: SemesterComparisonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <div className="dash-stat-card">
        <div className="text-xs pwc-font-mono uppercase mb-1" style={{ color: "#475569" }}>With Kaleon</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>{kaleonSemesters}</span>
          <span className="text-sm" style={{ color: "#4ECCA3" }}>semesters</span>
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(78,204,163,0.08)" }}>
          <div className="text-[10px] pwc-font-mono uppercase tracking-wider mb-0.5" style={{ color: "#334155" }}>Typical Student</div>
          <div className="text-sm pwc-font-mono font-bold" style={{ color: "#475569" }}>{typicalSemesters}+ semesters</div>
        </div>
      </div>
      <div className="dash-stat-card">
        <div className="text-xs pwc-font-mono uppercase mb-1" style={{ color: "#475569" }}>Money Saved</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl pwc-font-mono font-bold" style={{ color: "#4ECCA3" }}>${moneySaved.toLocaleString()}</span>
        </div>
        <div className="text-xs mt-1" style={{ color: "#64748b" }}>Fewer semesters = less tuition</div>
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(78,204,163,0.08)" }}>
          <div className="text-[10px] pwc-font-mono uppercase tracking-wider mb-0.5" style={{ color: "#334155" }}>Time Saved</div>
          <div className="text-sm pwc-font-mono font-bold" style={{ color: "#475569" }}>{semestersSaved} fewer semesters</div>
        </div>
      </div>
    </div>
  );
}
