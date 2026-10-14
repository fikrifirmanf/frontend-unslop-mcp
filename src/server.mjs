#!/usr/bin/env node
import { run } from "./core.mjs";
import { verifyStylesWired } from "./styles.mjs";
import { getVerifiedImages } from "./images.mjs";

if (process.argv[2] === "install-skills") {
  const { installSkills } = await import("./install-skills.mjs");
  await installSkills();
  process.exit(0);
}

const SILENT_CATCH = /catch\s*(\([^)]*\))?\s*\{\s*(console\.(log|error|warn)\([^)]*\);?\s*)?\}/;

await run({
  name: "frontend-unslop-mcp",
  version: "1.2.0",
  skill: "frontend-unslop",
  description: "Frontend anti-slop rules (React, Next.js, TypeScript, Tailwind, UI craft).",
  extraTools: [
    {
      name: "get_verified_images",
      description:
        "Returns real, working image URLs (+alt text, credit) for a topic via the Unsplash/Pexels API, or safe SVG placeholders if no API key is configured. ALWAYS use this instead of writing remembered Unsplash photo IDs.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Subject of the image, e.g. 'clean water village', 'fintech dashboard', 'chef plating food'" },
          count: { type: "number", description: "How many images (1-12, default 4)" },
          orientation: { type: "string", enum: ["landscape", "portrait", "squarish"] },
        },
        required: ["query"],
      },
      handler: getVerifiedImages,
    },
    {
      name: "verify_styles_wired",
      description:
        "Verifies CSS actually loads: Tailwind entry stylesheet exists and is imported, and every semantic token class (bg-background, text-foreground, ...) used in the given files is defined. Run after generating UI, especially one-shot pages.",
      inputSchema: {
        type: "object",
        properties: {
          files: { type: "array", items: { type: "string" }, description: "Modified UI files whose classes should be checked" },
          projectRoot: { type: "string", description: "Relative project dir (default '.')" },
        },
      },
      handler: verifyStylesWired,
    },
  ],
  auditTool: "audit_frontend_slop",
  auditDescription:
    "Deterministically scans React/Next.js/Tailwind files for frontend slop: type escapes, silent catch blocks, AI-purple gradients, derived-state useEffect, placeholder content.",
  rules: [
    { id: "NO_TYPE_ESCAPE", severity: "ERROR", regex: /:\s*any\b|\bas\s+any\b|\bas\s+unknown\s+as\b|@ts-ignore|@ts-expect-error|eslint-disable/, message: "Banned type/lint escape. Define explicit types and fix the root cause." },
    { id: "NO_SILENT_CATCH", severity: "ERROR", regex: SILENT_CATCH, message: "Silent or console-only catch block. Surface the error state to the UI." },
    { id: "NO_AI_PURPLE_GRADIENT", severity: "ERROR", regex: /from-(indigo|purple|violet)-[3-6]00[\s\S]{0,60}?to-(purple|pink|indigo|fuchsia)-[3-6]00/, message: "Default 'AI SaaS purple' gradient. Use project design tokens." },
    { id: "NO_PLACEHOLDER", severity: "ERROR", regex: /via\.placeholder\.com|placehold\.co|Lorem ipsum|\/\/\s*TODO\b/i, message: "Placeholder content or TODO left in component." },
    { id: "NO_GUESSED_UNSPLASH_ID", severity: "ERROR", regex: /images\.unsplash\.com\/photo-[\w-]+(?![\w-]*\?[^"'`\s]*ixid=)(?![\w-]*\?[^"'`\s]*ixlib=)/, message: "Unsplash photo URL not from get_verified_images (guessed IDs show wrong or broken photos). Call get_verified_images or use a placeholder." },
    { id: "NO_AMBIENT_BLUR_BLOB", severity: "ERROR", regex: /\bblur-(2xl|3xl)\b/, message: "Ambient blurred corner blob (blur-2xl/3xl). Use flat, full-bleed contrast bands instead." },
    { id: "FROZEN_COUNTER_STATE", severity: "ERROR", regex: /const\s*\[\s*\w*(?:count|animated|displayed?|progress|current)\w*\s*,\s*set\w+\s*\]\s*=\s*useState\(\s*0\s*\)/i, message: "Count-up state initialised at 0 renders partial nonsense (e.g. '23%') in SSR/screenshots. Render the final value and animate with CSS, or initialise with the target." },
    { id: "INVISIBLE_INITIAL_OPACITY", severity: "WARN", regex: /initial=\{\{\s*opacity:\s*0\b/, message: "initial opacity 0 leaves sections invisible in SSR/full-page captures. Use a small y-translate with visible default, or CSS keyframes." },
    { id: "HYDRATION_TRAP", severity: "ERROR", regex: /\{\s*(?:new\s+Date\([^)]*\)\.to\w+\(|Date\.now\(\)|Math\.random\(\))/, message: "Non-deterministic value rendered in JSX causes Next.js hydration mismatch (red '1 Issue' badge). Compute in useEffect/useState or pass from the server." },
    { id: "HEADING_WITHOUT_TEXT_BALANCE", severity: "WARN", regex: /<h[1-3]\b[^>]*className=(?:"(?![^"]*text-balance)[^"]*"|\{`(?![^`]*text-balance)[^`]*`\})/, message: "Heading lacks text-balance; single words will dangle on the last line. Add `text-balance` (and `text-pretty` on paragraphs)." },
    { id: "NO_HARDCODED_HEX_CLASS", severity: "WARN", regex: /\b(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/, message: "Arbitrary hex in Tailwind class. Prefer semantic tokens (bg-background, text-foreground)." },
    { id: "DERIVED_STATE_USEEFFECT", severity: "WARN", regex: /useEffect\(\s*\(\)\s*=>\s*\{\s*set[A-Z]\w*\(/, message: "setState directly inside useEffect. Compute derived state during render / useMemo." },
  ],
});
