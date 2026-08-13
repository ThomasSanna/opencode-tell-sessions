# AGENTS.md — opencode-tell-sessions

`opencode-tell-sessions` is a small OpenCode plugin that lets agents in
different sessions on the same server message each other in real time.
It exposes two tools: `session_search` (find a session by title, date, or
content) and `session_send` (fire-and-forget DM into a target session).

## Layout

| Path | Purpose |
|---|---|
| `src/index.ts` | Plugin entry. Exports ONLY `plugin` and `export default plugin` — the OpenCode v1 loader iterates every exported function as a candidate plugin. No other export allowed here. |
| `src/helpers.ts` | Pure helpers, unit-tested (`toHit`, `formatSessionLine`, `buildSearchResult`, `resolveTarget`, `formatDM`, ...). |
| `test/` | Bun unit tests: `smoke`, `helpers`, `search`, `send`. |
| `.opencode/skills/` | Skills shipped with the project. |
| `.opencode/command/` | Slash commands shipped with the project. |
| `docs/` | Internal design specs and plans. |

## Commands

```bash
bun install        # install dependencies
bun test           # run the unit test suite
bun run typecheck  # strict TypeScript check (must exit 0)
```

## Conventions

- **Strict TypeScript.** No `as any`, no `@ts-ignore`, no `@ts-expect-error`.
- **English only.** All code, comments, commits, issues, and docs in English.
- **Every behavior change ships with a test.** The CI gate runs `bun test` +
  `bun run typecheck` on every push/PR.
- **Bugfix rule.** Fix minimally; never refactor while fixing.
- **Commit style.** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `i18n:`.

## Rules

- If a change alters a user-facing string (tool description, message format),
  update the corresponding test assertions in the same commit — the tests
  assert the exact strings.
- Do NOT add exports to `src/index.ts` beyond `plugin` and the default.
- Do NOT modify `bun.lock` by hand; use `bun install` / `bun add`.
- The `zod` dependency is pinned EXACTLY (`4.1.8`, no caret) — do not loosen
  it; a dual-copy mismatch breaks the plugin at runtime.
