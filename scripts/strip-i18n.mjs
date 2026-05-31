import fs from "fs";
import path from "path";

const src = path.resolve("src");

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === "i18n" || name === "copy") continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
  return files;
}

for (const file of walk(src)) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes("react-i18next") && !s.includes("@/i18n")) continue;

  s = s.replace(
    /import\s*\{[^}]*\}\s*from\s*["']react-i18next["'];?\n?/g,
    "",
  );
  s = s.replace(
    /import\s*\{[^}]*\}\s*from\s*["']@\/i18n\/config["'];?\n?/g,
    "",
  );
  s = s.replace(/\s*const\s*\{\s*t\s*,\s*i18n\s*\}\s*=\s*useTranslation\(\);?\n?/g, "\n");
  s = s.replace(/\s*const\s*\{\s*i18n\s*\}\s*=\s*useTranslation\(\);?\n?/g, "\n");
  s = s.replace(/\s*const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\);?\n?/g, "\n");
  s = s.replace(/i18n\.language/g, "'en-US'");
  s = s.replace(/i18n\.dir\(\)\s*===\s*["']rtl["']/g, "false");
  s = s.replace(/<Trans\b/g, "<CopyTrans");
  s = s.replace(/<\/Trans>/g, "</CopyTrans>");

  if (s.includes("CopyTrans") && !s.includes('from "@/components/copy-trans"')) {
    const importLine = 'import { CopyTrans } from "@/components/copy-trans";\n';
    const lastImport = [...s.matchAll(/^import .+$/gm)].pop();
    if (lastImport) {
      const idx = lastImport.index + lastImport[0].length + 1;
      s = s.slice(0, idx) + importLine + s.slice(idx);
    }
  }

  if (/\bt\(/.test(s) && !s.includes('from "@/lib/copy"')) {
    const importLine = 'import { t } from "@/lib/copy";\n';
    const lastImport = [...s.matchAll(/^import .+$/gm)].pop();
    if (lastImport) {
      const idx = lastImport.index + lastImport[0].length + 1;
      s = s.slice(0, idx) + importLine + s.slice(idx);
    }
  }

  fs.writeFileSync(file, s);
}

console.log("strip-i18n done");
