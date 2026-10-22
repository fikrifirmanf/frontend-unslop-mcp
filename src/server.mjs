#!/usr/bin/env node
import { run, byExt, projectDir, typescriptCheck, summarizeChecks } from "unslop-core";
import { rules } from "./rules.mjs";
import { verifyStylesWired } from "./styles.mjs";
import { getVerifiedImages } from "./images.mjs";

await run({
  packageUrl: new URL("../package.json", import.meta.url),
  skill: "frontend-unslop",
  description: "Frontend anti-slop rules (React, Next.js, TypeScript, Tailwind, UI craft).",
  auditTool: "audit_frontend_slop",
  auditDescription:
    "Deterministically scans React/Next.js/Tailwind files for frontend slop: type escapes, silent catches, AI-purple gradients, placeholder content, guessed image URLs, dynamic Tailwind classes, index keys, dead links, hydration traps, frozen counters and derived-state effects.",
  rules,
  accept: byExt(".tsx", ".jsx", ".ts", ".js", ".mjs", ".vue", ".svelte", ".astro", ".html", ".mdx"),
  tools: [
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
    {
      name: "verify_typescript_compile",
      description: "Runs the project's local `tsc --noEmit` to verify zero type errors. Reports SKIPPED if TypeScript is not installed.",
      inputSchema: { type: "object", properties: { projectRoot: { type: "string", description: "Relative dir containing tsconfig.json (default '.')" } } },
      handler: async (args, root) => {
        const cwd = projectDir(root, args.projectRoot);
        if (!cwd) return { status: "FAIL", message: "projectRoot is outside the workspace.", _failed: true };
        return summarizeChecks([await typescriptCheck(cwd, root)]);
      },
    },
  ],
});
