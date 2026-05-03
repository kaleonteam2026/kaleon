function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonLd(s: string): string {
  return s
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const CSS = `
  *{box-sizing:border-box}
  body{margin:0;font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f4f4f5;color:#0f172a;line-height:1.55}
  a{color:#0f172a}
  .dyp-header{position:sticky;top:0;background:#fff;border-bottom:2px solid #0f172a;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;z-index:10}
  .dyp-logo{font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:18px}
  .dyp-logo span.mono{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#64748b;margin-left:8px;letter-spacing:.1em;text-transform:uppercase}
  .dyp-signin{border:2px solid #0f172a;background:#0f172a;color:#fff;padding:8px 16px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
  main{max-width:780px;margin:0 auto;padding:48px 24px 80px}
  .dyp-breadcrumbs{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px}
  .dyp-breadcrumbs a{color:#64748b;text-decoration:none;margin-right:6px}
  .dyp-breadcrumbs a:hover{color:#0f172a}
  h1{font-size:40px;line-height:1.05;letter-spacing:-.02em;font-weight:800;margin:0 0 12px}
  .dyp-summary{background:#fff;border:2px solid #0f172a;box-shadow:4px 4px 0 #0f172a;padding:20px;margin:24px 0 32px}
  .dyp-summary dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}
  .dyp-summary dt{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;align-self:center}
  .dyp-summary dd{margin:0;font-weight:600}
  h2{font-size:22px;font-weight:800;margin:32px 0 8px;letter-spacing:-.01em}
  p{margin:0 0 14px}
  .dyp-cta{background:#0f172a;color:#fff;border:2px solid #0f172a;padding:24px;margin:48px 0 0}
  .dyp-cta h2{color:#fff;margin-top:0}
  .dyp-cta-btn{display:inline-block;background:#fff;color:#0f172a;padding:12px 20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border:2px solid #fff;margin-top:8px}
  .dyp-related{margin-top:48px;padding-top:24px;border-top:2px solid #0f172a}
  .dyp-related h2{margin-top:0}
  .dyp-related ul{padding-left:20px;margin:0}
  .dyp-related li{margin-bottom:6px}
  .dyp-disclaimer{margin-top:48px;padding:16px;background:#fef3c7;border:2px solid #b45309;font-size:13px;color:#78350f}
  footer{padding:32px 24px;text-align:center;color:#64748b;font-size:12px}
  footer .mono{font-family:'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:6px}
  .dyp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:24px}
  .dyp-card{background:#fff;border:2px solid #0f172a;box-shadow:3px 3px 0 #0f172a;padding:16px;text-decoration:none;color:#0f172a;display:block}
  .dyp-card h3{margin:0 0 6px;font-size:15px;font-weight:800}
  .dyp-card p{margin:0;font-size:13px;color:#475569}
`;

export interface SsrPageOptions {
  title: string;
  description: string;
  canonical: string;
  origin: string;
  schemaJsons: string[];
  bodyHtml: string;
  ogType?: string;
}

export function ssrShell(opts: SsrPageOptions): string {
  const { title, description, canonical, origin, schemaJsons, bodyHtml, ogType = "article" } = opts;
  const homeUrl = origin || "/";
  const signinUrl = `${homeUrl}/?utm_source=seo&utm_medium=organic&utm_campaign=header-signin`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:type" content="${escapeHtml(ogType)}" />
<meta property="og:site_name" content="DYP — Do Your Path" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="theme-color" content="#0f172a" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500;700&display=swap" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@500;700&display=swap" /></noscript>
<style>${CSS}</style>
${schemaJsons.map((s) => `<script type="application/ld+json">${escapeJsonLd(s)}</script>`).join("\n")}
</head>
<body>
<header class="dyp-header">
  <a href="${escapeHtml(homeUrl)}/" class="dyp-logo" style="text-decoration:none;color:#0f172a">DYP <span class="mono">// DO YOUR PATH</span></a>
  <a class="dyp-signin" href="${escapeHtml(signinUrl)}">Sign In</a>
</header>
<main>
${bodyHtml}
</main>
<footer>
  <span class="mono">// DYP — DO YOUR PATH</span>
  <div>Not affiliated with UC, CSU, ASSIST.org, or any California institution. Content shown is AI-assisted and should be verified with your community college counselor.</div>
  <div style="margin-top:8px"><a href="${escapeHtml(homeUrl)}/transfer" style="color:#475569">All transfer guides</a></div>
</footer>
</body>
</html>`;
}

export { escapeHtml };
