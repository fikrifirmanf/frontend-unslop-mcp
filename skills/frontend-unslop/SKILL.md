---
name: frontend-unslop
description: Enforces high-craft frontend engineering and eliminates AI UI/React slop. Trigger whenever creating, refactoring, or styling React, Next.js, TypeScript, or Tailwind CSS components.
---

# Frontend Anti-Slop Protocol

Never output generic first-draft UI or unverified React boilerplate.

## 1. Visual & Tailwind (HARD BANS)
- **No "AI SaaS purple" gradients:** never default to `from-indigo-500 via-purple-500 to-pink-500` or neon glow backdrops unless defined in design tokens.
- **No generic 3-column icon cards:** no symmetric 3-card grids with an icon in a tinted circle unless requested. Use layouts that fit the data: bento, tables, dense lists.
- **No happy-path-only components:** every data-driven component implements `Loading` (skeleton matching layout geometry), `Empty` (actionable), and `Error` (retryable inline) states.
- **Token discipline:** prefer semantic tokens (`bg-background`, `text-foreground`, `border-border`) over arbitrary hex, **but only tokens that are defined** (see section 2).

## 2. Styles MUST load (HARD REQUIREMENT, especially one-shot prompts)
A page with unstyled markup is a failure. In a fresh or one-shot build, nothing is set up for you, so:
- **Wire the stylesheet:** ensure an entry CSS exists and is imported by the root (`import "./globals.css"` in the Next.js `app/layout.tsx`, or in `main.tsx`; `<link>`/`<style>` for plain HTML). Tailwind v4: `@import "tailwindcss";`. Tailwind v3: `@tailwind base; @tailwind components; @tailwind utilities;` plus `content` globs covering every source dir.
- **Define every token you use:** `bg-background`, `text-foreground`, `border-border`, `bg-primary`, etc. do not exist by default. Declare the CSS variables and register them (v4: `@theme inline { --color-background: var(--background); ... }`; v3: map in `tailwind.config`). If you will not define tokens, use real Tailwind colors (`bg-zinc-950`, `text-zinc-100`).
- **Never invent utilities or `@apply` undefined classes.** Dynamic class names (`bg-${color}-500`) are not generated; use complete literal class strings.
- **Create the config the stack needs** (`postcss.config.mjs` with `@tailwindcss/postcss` for v4; `tailwind.config` for v3) and install the packages in the same change.
- Include the stylesheet, config and layout edits in the same response as the components, never as a follow-up.

## 3. React & TypeScript (HARD BANS)
- **No `useEffect` for derived state:** compute during render or with `useMemo`.
- **No type escapes:** `: any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`.
- **No silent error swallowing:** no empty `catch {}` or `catch (e) { console.log(e) }`.
- **No placeholder artifacts:** no `// TODO`, `Lorem ipsum`, `via.placeholder.com`.

## 4. Mandatory verification loop
Before claiming a frontend task is complete:
1. Call MCP tool `audit_frontend_slop` with every modified file path.
2. Call MCP tool `verify_styles_wired` with the modified files. It confirms the stylesheet exists and is imported, and that every semantic token class is defined.
3. Call MCP tool `verify_typescript_compile`.
4. On `status: "FAIL"`, fix every reported violation and re-run until `PASS`.
