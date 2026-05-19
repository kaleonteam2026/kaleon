export function Dashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070d1a",
        fontFamily: "'Inter', sans-serif",
        color: "#e2e8f0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(78,204,163,0.12); border-radius: 14px; transition: all 0.3s ease; }
        .card:hover { border-color: rgba(78,204,163,0.35); box-shadow: 0 0 24px rgba(78,204,163,0.08); }
        .stat-card { background: rgba(78,204,163,0.06); border: 1px solid rgba(78,204,163,0.2); border-radius: 12px; }
        .nav-item { padding: 9px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748b; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .nav-item:hover { background: rgba(78,204,163,0.08); color: #4ECCA3; }
        .nav-item.active { background: rgba(78,204,163,0.12); color: #4ECCA3; border: 1px solid rgba(78,204,163,0.25); }
        .progress-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #4ECCA3, #38b2ac); }
        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .pill.green { background: rgba(78,204,163,0.12); color: #4ECCA3; border: 1px solid rgba(78,204,163,0.3); }
        .pill.blue { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.25); }
        .action-btn { background: linear-gradient(135deg, #4ECCA3, #38b2ac); border: none; border-radius: 8px; color: #050c18; font-weight: 700; font-size: 13px; cursor: pointer; padding: 10px 18px; transition: all 0.2s; }
        .action-btn:hover { box-shadow: 0 0 20px rgba(78,204,163,0.4); transform: translateY(-1px); }
        .readiness-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; }
      `}</style>

      {/* Top Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 28px", borderBottom: "1px solid rgba(78,204,163,0.1)", backdropFilter: "blur(10px)", background: "rgba(7,13,26,0.95)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, color: "#050c18" }}>P</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Pathwise<span style={{ color: "#4ECCA3" }}>CC</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(78,204,163,0.1)", border: "1px solid rgba(78,204,163,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>🔔</div>
            <div style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: "#4ECCA3", border: "2px solid #070d1a" }} />
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #4ECCA3, #38b2ac)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#050c18", cursor: "pointer" }}>A</div>
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: 200, borderRight: "1px solid rgba(78,204,163,0.08)", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          {[
            { icon: "⚡", label: "Dashboard", active: true },
            { icon: "🎯", label: "Matches" },
            { icon: "🗺️", label: "Pathways" },
            { icon: "📚", label: "Courses" },
            { icon: "📅", label: "Deadlines" },
            { icon: "🏆", label: "Scholarships" },
            { icon: "💼", label: "Internships" },
            { icon: "📄", label: "Exports" },
            { icon: "⚙️", label: "Profile" },
          ].map(({ icon, label, active }) => (
            <div key={label} className={`nav-item${active ? " active" : ""}`}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: "#4ECCA3", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Welcome back</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.5px", marginBottom: 4 }}>Alex's Transfer Dashboard</h1>
            <p style={{ fontSize: 13, color: "#64748b" }}>De Anza College → UC Davis · Computer Science</p>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Transfer Readiness", value: "74%", sub: "+5% this month", color: "#4ECCA3" },
              { label: "GPA", value: "3.72", sub: "Estimated", color: "#60a5fa" },
              { label: "Units Completed", value: "42", sub: "of 60 required", color: "#a78bfa" },
              { label: "Top Match", value: "UCLA", sub: "Score: 89", color: "#fb923c" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Readiness breakdown */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Transfer Readiness</div>
                <span className="pill green">On Track</span>
              </div>
              {[
                { label: "Profile", pct: 90 },
                { label: "GPA", pct: 80 },
                { label: "Units", pct: 70 },
                { label: "Pathway", pct: 60 },
                { label: "Guidebook", pct: 50 },
              ].map(({ label, pct }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>
                    <span>{label}</span><span style={{ color: "#4ECCA3" }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Next actions */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", marginBottom: 16 }}>Next Actions</div>
              {[
                { text: "Complete your IGETC plan", urgency: "High", icon: "🔥" },
                { text: "Apply for TAG by Oct 1", urgency: "Due soon", icon: "📅" },
                { text: "Request LORs from 2 professors", urgency: "This week", icon: "📝" },
                { text: "Add 3 more courses", urgency: "Ongoing", icon: "📚" },
              ].map(({ text, urgency, icon }) => (
                <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 2 }}>{text}</div>
                    <div style={{ fontSize: 11, color: urgency === "High" ? "#f87171" : "#64748b" }}>{urgency}</div>
                  </div>
                </div>
              ))}
              <button className="action-btn" style={{ width: "100%", marginTop: 14, textAlign: "center" }}>Generate AI Pathway →</button>
            </div>
          </div>

          {/* University matches */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Top University Matches</div>
              <span style={{ fontSize: 12, color: "#4ECCA3", cursor: "pointer" }}>View all →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { name: "UCLA", score: 89, tag: "Reach", color: "#f87171" },
                { name: "UC Davis", score: 94, tag: "Match", color: "#4ECCA3" },
                { name: "UC Santa Cruz", score: 97, tag: "Safety", color: "#60a5fa" },
              ].map(({ name, score, tag, color }) => (
                <div key={name} style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${color}22`, cursor: "pointer" }}>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{score}%</div>
                  <div className="pill" style={{ marginTop: 6, background: `${color}15`, color, border: `1px solid ${color}35`, padding: "3px 8px", fontSize: 10 }}>{tag}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
