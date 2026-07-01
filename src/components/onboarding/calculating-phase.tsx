import { KALEON_LOGO_SRC } from "@/lib/brand";
import { KaleonLoader } from "@/components/ui/kaleon-loader";

export function CalculatingPhase() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "#070d1a" }}>
      <img src={KALEON_LOGO_SRC} alt="Kaleon" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "contain" }} />
      <div className="mt-8 mb-2">
        <KaleonLoader />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-white text-center">Calculating your transfer path...</h1>
      <p className="mt-2 text-sm text-center max-w-xs" style={{ color: "#64748b" }}>This usually takes a few seconds, feel free to leave the page and come back in a bit!</p>
    </div>
  );
}
