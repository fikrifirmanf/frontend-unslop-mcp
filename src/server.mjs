#!/usr/bin/env node
import { run } from "./core.mjs";

if (process.argv[2] === "install-skills") {
  const { installSkills } = await import("./install-skills.mjs");
  await installSkills();
  process.exit(0);
}

const SILENT_CATCH = /catch\s*(\([^)]*\))?\s*\{\s*(console\.(log|error|warn)\([^)]*\);?\s*)?\}/;

await run({
  name: "frontend-unslop-mcp",
  version: "1.0.0",
  skill: "frontend-unslop",
  description: "Frontend anti-slop rules (React, Next.js, TypeScript, Tailwind, UI craft).",
  auditTool: "audit_frontend_slop",
  auditDescription:
    "Deterministically scans React/Next.js/Tailwind files for frontend slop: type escapes, silent catch blocks, AI-purple gradients, derived-state useEffect, placeholder content.",
  rules: [
    { id: "NO_TYPE_ESCAPE", severity: "ERROR", regex: /:\s*any\b|\bas\s+any\b|\bas\s+unknown\s+as\b|@ts-ignore|@ts-expect-error|eslint-disable/, message: "Banned type/lint escape. Define explicit types and fix the root cause." },
    { id: "NO_SILENT_CATCH", severity: "ERROR", regex: SILENT_CATCH, message: "Silent or console-only catch block. Surface the error state to the UI." },
    { id: "NO_AI_PURPLE_GRADIENT", severity: "ERROR", regex: /from-(indigo|purple|violet)-[3-6]00[\s\S]{0,60}?to-(purple|pink|indigo|fuchsia)-[3-6]00/, message: "Default 'AI SaaS purple' gradient. Use project design tokens." },
    { id: "NO_PLACEHOLDER", severity: "ERROR", regex: /via\.placeholder\.com|placehold\.co|Lorem ipsum|\/\/\s*TODO\b/i, message: "Placeholder content or TODO left in component." },
    { id: "NO_HARDCODED_HEX_CLASS", severity: "WARN", regex: /\b(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/, message: "Arbitrary hex in Tailwind class. Prefer semantic tokens (bg-background, text-foreground)." },
    { id: "DERIVED_STATE_USEEFFECT", severity: "WARN", regex: /useEffect\(\s*\(\)\s*=>\s*\{\s*set[A-Z]\w*\(/, message: "setState directly inside useEffect. Compute derived state during render / useMemo." },
  ],
});
