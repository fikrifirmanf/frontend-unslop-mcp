# frontend-unslop-mcp

> Stop AI-generated React, Next.js and Tailwind UI from shipping as generic slop: skill + MCP verifier.

[![npm](https://img.shields.io/npm/v/frontend-unslop-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/frontend-unslop-mcp)
[![license](https://img.shields.io/npm/l/frontend-unslop-mcp)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-blue)](https://modelcontextprotocol.io)

An **agent skill** plus an **MCP server** in one package. The skill tells your coding agent what Frontend slop to avoid; the MCP tools then *deterministically verify* the result, so the agent can't just claim it's done.

Works with **Claude Code**, **Claude Desktop**, **Codex** and **Antigravity**.

## What it catches

| Rule | Severity | Catches |
| --- | --- | --- |
| `NO_TYPE_ESCAPE` | ERROR | `: any`, `as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable` |
| `NO_SILENT_CATCH` | ERROR | empty or `console.log`-only `catch` blocks |
| `NO_AI_PURPLE_GRADIENT` | ERROR | the default indigo → purple → pink Tailwind gradient |
| `NO_PLACEHOLDER` | ERROR | `Lorem ipsum`, `via.placeholder.com`, `// TODO` |
| `NO_GUESSED_UNSPLASH_ID` | ERROR | remembered `images.unsplash.com/photo-…` IDs (wrong subject or 404) |
| `NO_AMBIENT_BLUR_BLOB` | ERROR | `blur-2xl` / `blur-3xl` corner blobs |
| `FROZEN_COUNTER_STATE` | ERROR | count-up state initialised at `useState(0)` (renders "23%" in SSR/screenshots) |
| `HYDRATION_TRAP` | ERROR | `new Date()`, `Date.now()`, `Math.random()` rendered in JSX |
| `INVISIBLE_INITIAL_OPACITY` | WARN | `initial={{ opacity: 0 }}` reveals that leave sections invisible |
| `HEADING_WITHOUT_TEXT_BALANCE` | WARN | `h1`-`h3` without `text-balance` (dangling last word) |
| `NO_HARDCODED_HEX_CLASS` | WARN | `bg-[#fff]`-style arbitrary hex instead of semantic tokens |
| `DERIVED_STATE_USEEFFECT` | WARN | `setState` straight inside `useEffect` (derive during render instead) |

The skill additionally steers the agent away from symmetric 3-column icon cards and requires Loading / Empty / Error states on data-driven components.

Rules marked **ERROR** make the audit return `status: "FAIL"`; **WARN** is reported but does not fail.

## Quick start

### 1. Add the MCP server

```bash
# Claude Code
claude mcp add frontend-unslop -s user -- npx -y frontend-unslop-mcp

# Codex
codex mcp add frontend-unslop -- npx -y frontend-unslop-mcp
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`) and **Antigravity** (`~/.gemini/antigravity/mcp_config.json`):

```json
{
  "mcpServers": {
    "frontend-unslop": {
      "command": "npx",
      "args": ["-y", "frontend-unslop-mcp"]
    }
  }
}
```

Restart the app afterwards.

### 2. Install the bundled skill

```bash
npx -y frontend-unslop-mcp install-skills
```

Copies `frontend-unslop` into:

| Client | Location |
| --- | --- |
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Antigravity | `~/.gemini/antigravity/skills/` |

Claude Desktop has no skills folder, so it receives the rules through the MCP prompt and the `load_*_rules` tool described below. Or install straight from this repo's `skills/` directory.

## Real images, not hallucinated ones

LLMs guess Unsplash photo IDs, which gives wrong subjects or broken images. Give the server a key and it returns real, relevant photos:

```json
{ "mcpServers": { "frontend-unslop": {
  "command": "npx", "args": ["-y", "frontend-unslop-mcp"],
  "env": { "UNSPLASH_ACCESS_KEY": "your-key" }
} } }
```

`PEXELS_API_KEY` works too. Without a key the tool returns deterministic SVG placeholders rather than guessing.

## One-shot prompts: styles that actually load

Generating a whole page in one prompt used to produce markup that rendered unstyled: tokens like `bg-background` were used but never defined, or the stylesheet was never imported. The skill now requires the agent to wire the stylesheet, define every token and create the Tailwind/PostCSS config in the same response, and `verify_styles_wired` checks it:

| Issue | Meaning |
| --- | --- |
| `NO_TAILWIND_ENTRY` | Tailwind installed, but no `@import "tailwindcss"` / `@tailwind` entry CSS |
| `STYLESHEET_NOT_IMPORTED` | Entry CSS exists but nothing imports it |
| `UNDEFINED_TOKEN` | `bg-primary`, `text-foreground`, … used with no `--color-*` / config mapping |
| `HTML_WITHOUT_STYLES` | Plain HTML page with no stylesheet, `<style>` or Tailwind script |

## MCP surface

| Kind | Name | Purpose |
| --- | --- | --- |
| Prompt | `frontend-unslop` | The full skill text, for GUI clients |
| Tool | `load_frontend_unslop_rules` | Returns the skill text (for clients without prompt support) |
| Tool | `get_verified_images` | Real image URLs + alt/credit via Unsplash or Pexels API; deterministic SVG placeholders when no key is set |
| Tool | `verify_styles_wired` | Checks the CSS actually loads: Tailwind entry stylesheet exists and is imported, and every semantic token class (`bg-background`, …) is defined |
| Tool | `audit_frontend_slop` | Scans `files: string[]` and returns `PASS`/`FAIL` with file, line, rule and snippet |
| Tool | `verify_typescript_compile` | Runs `tsc --noEmit` (needs `typescript` in the workspace) |

Audit output:

```json
{
  "status": "FAIL",
  "totalViolations": 1,
  "findings": [
    { "file": "src/a.ts", "line": 12, "rule": "NO_TYPE_ESCAPE", "severity": "ERROR", "message": "…", "snippet": "…" }
  ],
  "instruction": "Refactor every ERROR finding and re-run the audit before completing the task."
}
```

File paths are resolved against the server's working directory and cannot escape it.

## How it works

1. The agent loads the skill and writes code under its constraints.
2. Before finishing, the skill requires a call to `audit_frontend_slop` and `verify_typescript_compile`.
3. On `FAIL`, the agent fixes every finding and re-runs until `PASS`.

The checks are regex based: fast, offline and predictable, but heuristic. Expect the occasional false positive and treat them as a safety net, not a substitute for review.

## Pairs well with

- [`backend-unslop-mcp`](https://github.com/fikrifirmanf/backend-unslop-mcp): the same idea for APIs and SQL.

## Development

```bash
git clone https://github.com/fikrifirmanf/frontend-unslop-mcp
cd frontend-unslop-mcp && npm install
node src/server.mjs        # speaks MCP over stdio
```

## License

MIT © Fikri Firman Fadilah
