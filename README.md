# frontend-unslop-mcp

> Stop AI-generated React/Next.js/Tailwind from shipping as slop: skill + MCP verifier for type escapes, broken styles, guessed images, hydration traps and template-looking UI.

[![npm](https://img.shields.io/npm/v/frontend-unslop-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/frontend-unslop-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-blue)](https://modelcontextprotocol.io)

An **agent skill** plus an **MCP server** in one package. The skill tells your coding agent what slop to avoid; the MCP tools then *deterministically verify* the result, so the agent can't just claim it's done.

Works with **Claude Code**, **Claude Desktop**, **Codex** and **Antigravity**.

## What it catches

| Rule | Severity | Catches |
| --- | --- | --- |
| `NO_TYPE_ESCAPE` | ERROR | Type escape (': any', 'as any', 'as unknown as'). Define explicit types and fix the root cause. |
| `NO_CHECKER_SUPPRESSION` | ERROR | Type-checker/linter suppression. Fix the underlying error. |
| `NO_SILENT_CATCH` | ERROR | Silent or console-only catch. Surface an error state the user can see and retry. |
| `NO_AI_PURPLE_GRADIENT` | ERROR | Default 'AI SaaS purple' gradient. Use the project's design tokens. |
| `NO_PLACEHOLDER` | ERROR | Placeholder content, stock filler or TODO left in the UI. Use real copy, real data or get_verified_images. |
| `NO_GUESSED_UNSPLASH_ID` | ERROR | Unsplash photo URL not from get_verified_images (guessed IDs show wrong or broken photos). Call get_verified_images or use its placeholders. |
| `NO_AMBIENT_BLUR_BLOB` | ERROR | Ambient blurred corner blob. Use flat, full-bleed contrast bands instead. |
| `DYNAMIC_TAILWIND_CLASS` | ERROR | Interpolated Tailwind class (e.g. `bg-${color}-500`) is never generated. Map values to complete literal class strings. |
| `FROZEN_COUNTER_STATE` | ERROR | Count-up state initialised at 0 renders partial nonsense (e.g. '23%') in SSR/screenshots. Render the final value and animate with CSS, or initialise with the target. |
| `HYDRATION_TRAP` | ERROR | Non-deterministic value rendered in JSX causes a hydration mismatch. Compute it in an effect or pass it from the server. |
| `INDEX_AS_KEY` | ERROR | Array index used as React key: reordering/filtering reuses the wrong component state. Use a stable id. |
| `DEAD_LINK` | ERROR | Dead link (href="#"/empty/javascript:). Link to a real route, or use a <button> for actions. |
| `INVISIBLE_INITIAL_OPACITY` | WARN | initial opacity 0 leaves sections invisible in SSR/full-page captures. Keep content visible by default; animate a small y-translate. |
| `HEADING_WITHOUT_TEXT_BALANCE` | WARN | Heading lacks text-balance; single words will dangle on the last line. Add `text-balance` (and `text-pretty` on paragraphs). |
| `NO_HARDCODED_HEX_CLASS` | WARN | Arbitrary hex in a Tailwind class. Prefer semantic tokens (bg-background, text-foreground). |
| `DERIVED_STATE_USEEFFECT` | WARN | setState directly inside useEffect. Compute derived state during render or with useMemo. |
| `EFFECT_FETCH_WITHOUT_ABORT` | WARN | fetch inside useEffect without AbortController/ignore flag races on fast re-renders. Abort in the cleanup, or use the framework's data loader. |
| `DANGEROUS_HTML` | WARN | Raw HTML injection. Sanitize with DOMPurify (or render structured content) to avoid XSS. |

`get_verified_images` uses `UNSPLASH_ACCESS_KEY` or `PEXELS_API_KEY` from the MCP server environment when set, and otherwise returns safe SVG placeholders, never guessed photo IDs.

Rules marked **ERROR** make the audit return `status: "FAIL"`; **WARN** is reported but does not fail.

## Quick start

### 1. Add the MCP server

```bash
# Claude Code
claude mcp add frontend-unslop -s user -- npx -y frontend-unslop-mcp

# Codex
codex mcp add frontend-unslop -- npx -y frontend-unslop-mcp
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`) and **Antigravity** (`~/.gemini/config/mcp_config.json`):

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
npx -y frontend-unslop-mcp install-skills        # clients that are installed
npx -y frontend-unslop-mcp install-skills --all  # every location
```

| Client | Location |
| --- | --- |
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Antigravity | `~/.gemini/config/skills/` (and `~/.gemini/antigravity/skills/` if present) |

Claude Desktop has no skills folder, so it receives the rules through the MCP prompt and the `load_*_rules` tool.

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
| Tool | `load_frontend_unslop_rules` | Returns the full frontend-unslop ruleset. Call before writing code if the frontend-unslop skill is not already loaded. |
| Tool | `audit_frontend_slop` | Deterministically scans React/Next.js/Tailwind files for frontend slop: type escapes, silent catches, AI-purple gradients, placeholder content, guessed image URLs, dynamic Tailwind classes, index keys, dead links, hydration traps, frozen counters and derived-state effects. Accepts files or directories; with no files it audits the git working-tree changes. Suppress a verified false positive with a `unslop-ignore RULE_ID -- reason` comment on or above the line. |
| Tool | `get_verified_images` | Returns real, working image URLs (+alt text, credit) for a topic via the Unsplash/Pexels API, or safe SVG placeholders if no API key is configured. ALWAYS use this instead of writing remembered Unsplash photo IDs. |
| Tool | `verify_styles_wired` | Verifies CSS actually loads: Tailwind entry stylesheet exists and is imported, and every semantic token class (bg-background, text-foreground, ...) used in the given files is defined. Run after generating UI, especially one-shot pages. |
| Tool | `verify_typescript_compile` | Runs the project's local `tsc --noEmit` to verify zero type errors. Reports SKIPPED if TypeScript is not installed. |

File paths resolve against the server's working directory and cannot escape it. Directories honour `.gitignore` and skip `node_modules`, build output and minified files.

## CLI and CI

The same audit runs without an agent. It exits `1` on any ERROR, so it works as a pre-commit hook or CI step:

```bash
npx -y frontend-unslop-mcp audit              # git working-tree changes
npx -y frontend-unslop-mcp audit src app      # files or directories
npx -y frontend-unslop-mcp audit src --json   # machine-readable
npx -y frontend-unslop-mcp rules              # list every rule
```

## Suppressing a false positive

The checks are regex and structure based: fast, offline and predictable, but heuristic. For a verified false positive, add a comment on the line or the line above, **with a reason**:

```js
// unslop-ignore NO_TYPE_ESCAPE -- why this is safe here
```

Suppressions without a reason are reported as `SUPPRESSION_WITHOUT_REASON` errors, and every honoured suppression is listed in the audit output so reviewers can see it.

## How it works

1. The agent loads the skill and writes code under its constraints.
2. Before finishing, the skill requires the audit and verification tools.
3. On `FAIL`, the agent fixes every finding and re-runs until `PASS`. Missing toolchains are reported as `SKIPPED`, never as passing.

## The unslop family

- [`backend-unslop-mcp`](https://github.com/fikrifirmanf/backend-unslop-mcp)
- [`ui-unslop-mcp`](https://github.com/fikrifirmanf/ui-unslop-mcp)
- [`mobile-unslop-mcp`](https://github.com/fikrifirmanf/mobile-unslop-mcp)
- [`copy-unslop-mcp`](https://github.com/fikrifirmanf/copy-unslop-mcp)
- [`test-unslop-mcp`](https://github.com/fikrifirmanf/test-unslop-mcp)

All share the engine in [`unslop-core`](https://github.com/fikrifirmanf/unslop-core).

## Development

```bash
git clone https://github.com/fikrifirmanf/frontend-unslop-mcp
cd frontend-unslop-mcp && npm install
npm test                   # every rule is checked against its good/bad examples
node src/server.mjs        # speaks MCP over stdio
```

## License

MIT © Fikri Firman Fadilah
