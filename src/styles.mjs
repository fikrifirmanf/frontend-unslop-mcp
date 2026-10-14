import fs from "node:fs/promises";
import path from "node:path";

const SKIP = new Set(["node_modules", ".next", "dist", "build", ".git", ".turbo", "out", "coverage"]);
const SRC_EXT = /\.(tsx|jsx|ts|js|mjs|html|vue|svelte|astro)$/;
const TOKENS = "background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring";
const TOKEN_CLASS = new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|placeholder|shadow|decoration)-(${TOKENS})(?:-foreground)?\\b`, "g");

async function walk(dir, depth = 0, out = []) {
  if (depth > 6) return out;
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, depth + 1, out);
    else out.push(p);
  }
  return out;
}

export async function verifyStylesWired(args, root) {
  const base = path.resolve(root, args.projectRoot || ".");
  if (path.relative(root, base).startsWith("..")) return [{ status: "FAIL", message: "projectRoot is outside the workspace." }, true];

  const all = await walk(base);
  const read = (f) => fs.readFile(f, "utf8").catch(() => "");
  const issues = [];

  const pkg = JSON.parse((await read(path.join(base, "package.json"))) || "{}");
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const usesTailwind = "tailwindcss" in deps || all.some((f) => /tailwind\.config\.[cm]?[jt]s$/.test(f));

  const cssFiles = all.filter((f) => /\.css$/.test(f));
  const cssText = {};
  for (const f of cssFiles) cssText[f] = await read(f);
  const allCss = Object.values(cssText).join("\n");
  const configText = (await Promise.all(all.filter((f) => /tailwind\.config\.[cm]?[jt]s$/.test(f)).map(read))).join("\n");

  const entries = cssFiles.filter((f) => /@import\s+["']tailwindcss|@tailwind\s+(base|utilities)/.test(cssText[f]));
  if (usesTailwind && entries.length === 0) {
    issues.push({ rule: "NO_TAILWIND_ENTRY", message: 'Tailwind is installed but no CSS file has `@import "tailwindcss";` (v4) or `@tailwind base/components/utilities;` (v3). No utility class will render.' });
  }

  const srcFiles = all.filter((f) => SRC_EXT.test(f));
  const srcText = (await Promise.all(srcFiles.map(read))).join("\n");
  for (const entry of entries) {
    const rel = path.relative(base, entry);
    const bn = path.basename(entry);
    const imported = srcText.includes(bn) || srcText.includes(rel);
    if (!imported) issues.push({ rule: "STYLESHEET_NOT_IMPORTED", file: rel, message: `${rel} is never imported (e.g. \`import "./${bn}"\` in the root layout / entry, or a <link>). Styles will not load.` });
  }

  if (!usesTailwind && cssFiles.length === 0) {
    const html = all.filter((f) => f.endsWith(".html"));
    for (const f of html) {
      const t = await read(f);
      if (!/<link[^>]+stylesheet|<style[\s>]|cdn\.tailwindcss\.com/.test(t)) {
        issues.push({ rule: "HTML_WITHOUT_STYLES", file: path.relative(base, f), message: "HTML page has no <link rel=stylesheet>, <style> or Tailwind script." });
      }
    }
  }

  const files = Array.isArray(args.files) && args.files.length ? args.files.map((f) => path.resolve(root, f)) : srcFiles;
  const used = new Map();
  for (const f of files) {
    for (const m of (await read(f)).matchAll(TOKEN_CLASS)) {
      const name = m[0].replace(/^[a-z]+-/, "");
      if (!used.has(name)) used.set(name, path.relative(base, f));
    }
  }
  for (const [name, file] of used) {
    const inTheme = new RegExp(`--color-${name}\\s*:`).test(allCss);
    const viaConfig = new RegExp(`--${name}\\s*:`).test(allCss) && new RegExp(`\\b${name}\\b`).test(configText);
    if (!inTheme && !viaConfig) {
      issues.push({ rule: "UNDEFINED_TOKEN", file, message: `Class token "${name}" is used but not defined. Add \`--color-${name}\` in an @theme block (Tailwind v4) or map it in tailwind.config (v3), or use a concrete Tailwind color.` });
    }
  }

  const failed = issues.length > 0;
  return [{
    status: failed ? "FAIL" : "PASS",
    tailwind: usesTailwind,
    entryStylesheets: entries.map((f) => path.relative(base, f)),
    tokensChecked: used.size,
    issues,
    instruction: failed ? "Fix every issue, then re-run verify_styles_wired." : "Styles are wired.",
  }, failed];
}
