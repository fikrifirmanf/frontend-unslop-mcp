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
- **Token discipline:** use semantic tokens (`bg-background`, `text-foreground`, `border-border`), not arbitrary hex.

## 2. React & TypeScript (HARD BANS)
- **No `useEffect` for derived state:** compute during render or with `useMemo`.
- **No type escapes:** `: any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`.
- **No silent error swallowing:** no empty `catch {}` or `catch (e) { console.log(e) }`.
- **No placeholder artifacts:** no `// TODO`, `Lorem ipsum`, `via.placeholder.com`.

## 3. Mandatory verification loop
Before claiming a frontend task is complete:
1. Call MCP tool `audit_frontend_slop` with every modified file path.
2. Call MCP tool `verify_typescript_compile`.
3. On `status: "FAIL"`, fix every reported violation and re-run until `PASS`.
