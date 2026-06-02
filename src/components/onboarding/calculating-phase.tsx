import { KALEON_LOGO_SRC } from "@/lib/brand";

export function CalculatingPhase() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#070d1a" }}>
      <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "contain" }} />
      <div className="mt-8 mb-2" style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(78,204,163,0.2)", borderTopColor: "#4ECCA3", animation: "spin 0.9s linear infinite" }} />
      <h1 className="mt-4 text-2xl font-bold text-white text-center">Calculating your transfer path...</h1>
      <p className="mt-2 text-sm text-center max-w-xs" style={{ color: "#64748b" }}>This usually takes a few seconds, feel free to leave the page and come back in a bit!</p>
      <div className="mt-8 w-full max-w-sm rounded-2xl p-6" style={{ background: "rgba(13,26,46,0.9)", border: "1px solid rgba(78,204,163,0.2)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ fontFamily: "JetBrains Mono, monospace", color: "#4ECCA3" }}>Loved by Transfer Students</p>
        <p className="text-3xl mb-1" style={{ color: "#4ECCA3", fontFamily: "Georgia, serif", lineHeight: 1 }}>"</p>
        <p className="font-bold -mt-1 text-white">"Took me 2 minutes to get a plan that would've taken me 3 appointments to figure out."</p>
        <div className="flex items-center gap-3 mt-5">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(78,204,163,0.15)", color: "#4ECCA3" }}>M</div>
          <div>
            <p className="text-sm font-bold text-white">Maria Hernandez</p>
            <p className="text-xs" style={{ color: "#64748b" }}>Student @ East Los Angeles College</p>
          </div>
        </div>
      </div>
    </div>
  );
}
