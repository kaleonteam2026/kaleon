export function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050c18 0%, #0a1628 50%, #061020 100%)",
        fontFamily: "'Inter', sans-serif",
        color: "#e2e8f0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .glow-teal { box-shadow: 0 0 20px rgba(78,204,163,0.3), 0 0 60px rgba(78,204,163,0.1); }
        .glow-teal-text { text-shadow: 0 0 30px rgba(78,204,163,0.5); }
        .card-hover { transition: all 0.3s ease; border: 1px solid rgba(78,204,163,0.15); }
        .card-hover:hover { border-color: rgba(78,204,163,0.5); box-shadow: 0 0 30px rgba(78,204,163,0.15); transform: translateY(-2px); }
        .btn-primary { background: linear-gradient(135deg, #4ECCA3, #38b2ac); transition: all 0.3s ease; }
        .btn-primary:hover { box-shadow: 0 0 30px rgba(78,204,163,0.5); transform: translateY(-1px); }
        .orbit { animation: orbit 8s linear infinite; }
        .orbit2 { animation: orbit 12s linear infinite reverse; }
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
        }
        .particle { animation: float 4s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.5; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
        .badge { border: 1px solid rgba(78,204,163,0.4); background: rgba(78,204,163,0.08); }
        .feature-icon { background: rgba(78,204,163,0.1); border: 1px solid rgba(78,204,163,0.3); }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: #4ECCA3; opacity: 0.6; }
      `}</style>

      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", top: "-10%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(78,204,163,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,178,172,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid rgba(78,204,163,0.1)", backdropFilter: "blur(10px)", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#050c18" }}>P</div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Pathwise<span style={{ color: "#4ECCA3" }}>CC</span></span>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 14, color: "#94a3b8" }}>
          <span style={{ cursor: "pointer" }}>Features</span>
          <span style={{ cursor: "pointer" }}>About</span>
          <span style={{ cursor: "pointer" }}>Support</span>
        </div>
        <button className="btn-primary" style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#050c18", letterSpacing: "0.2px" }}>
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <div style={{ display: "flex", alignItems: "center", padding: "80px 48px 60px", gap: 60, position: "relative", zIndex: 5 }}>
        <div style={{ flex: 1, maxWidth: 560 }}>
          <div className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4ECCA3", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ECCA3", display: "inline-block" }} />
            California Transfer Planning
          </div>

          <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 20, color: "#fff" }}>
            Your path to{" "}
            <span className="glow-teal-text" style={{ color: "#4ECCA3" }}>UC & CSU</span>
            <br />transfer, mapped.
          </h1>

          <p style={{ fontSize: 17, lineHeight: 1.7, color: "#94a3b8", marginBottom: 36, maxWidth: 460 }}>
            AI-powered guidance for California community college students. Track deadlines, match universities, and build your transfer roadmap — all in one place.
          </p>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn-primary" style={{ padding: "14px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#050c18", display: "flex", alignItems: "center", gap: 8 }}>
              Start for free →
            </button>
            <button style={{ padding: "14px 24px", borderRadius: 10, border: "1px solid rgba(78,204,163,0.3)", background: "transparent", cursor: "pointer", fontWeight: 500, fontSize: 14, color: "#cbd5e1" }}>
              See how it works
            </button>
          </div>

          <div style={{ display: "flex", gap: 28, marginTop: 40 }}>
            {[["10k+", "Students"], ["95%", "Success Rate"], ["200+", "Colleges"]].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#4ECCA3" }}>{n}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Orbital illustration */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: 380 }}>
          <div style={{ position: "relative", width: 280, height: 280 }}>
            {/* Orbit rings */}
            {[120, 180, 240].map((size, i) => (
              <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: size, height: size, marginTop: -size/2, marginLeft: -size/2, borderRadius: "50%", border: `1px solid rgba(78,204,163,${0.12 - i * 0.03})` }} />
            ))}
            {/* Center core */}
            <div className="glow-teal" style={{ position: "absolute", top: "50%", left: "50%", width: 64, height: 64, marginTop: -32, marginLeft: -32, borderRadius: "50%", background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#050c18" }}>
              P
            </div>
            {/* Orbiting dots */}
            {[
              { size: 120, color: "#4ECCA3", delay: "0s" },
              { size: 180, color: "#38b2ac", delay: "-4s" },
              { size: 240, color: "#4ECCA3", delay: "-2s" },
            ].map(({ size, color, delay }, i) => (
              <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: size, height: size, marginTop: -size/2, marginLeft: -size/2, animation: `orbit ${8 + i * 4}s linear infinite${i % 2 ? " reverse" : ""}`, animationDelay: delay }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}`, marginTop: -5 }} />
              </div>
            ))}
            {/* Floating particles */}
            {[[-80, -60], [90, -40], [-70, 80], [80, 90]].map(([x, y], i) => (
              <div key={i} className="particle" style={{ position: "absolute", top: "50%", left: "50%", width: 4, height: 4, borderRadius: "50%", background: "#4ECCA3", opacity: 0.4, marginLeft: x, marginTop: y, animationDelay: `${i * 1}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: "20px 48px 60px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, position: "relative", zIndex: 5 }}>
        {[
          { icon: "🎯", title: "Smart Matching", desc: "AI ranks UC & CSU schools by your GPA, major, and goals" },
          { icon: "📅", title: "Deadline Tracker", desc: "Never miss a TAG, application, or financial aid deadline" },
          { icon: "🗺️", title: "Transfer Roadmap", desc: "Step-by-step IGETC and major prep built for your college" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card-hover" style={{ padding: "24px", borderRadius: 14, background: "rgba(255,255,255,0.03)", cursor: "pointer" }}>
            <div className="feature-icon" style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "#f1f5f9" }}>{title}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
