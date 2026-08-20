# AGENTS.md — opencode-tell-sessions

`opencode-tell-sessions` is a small OpenCode plugin that lets agents in
different sessions on the same server message each other in real time.
It exposes two tools: `session_search` (find a session by title, date, or
content) and `session_send` (fire-and-forget DM into a target session).

The plugin targets **OpenCode 1.x (V1)**. `src/index.ts` exports the V1
`plugin` function (named and default), registered via the legacy `tool()`
helper from `@opencode-ai/plugin`. The V2 adapter was removed because the
1.18.x plugin API has no tool registration; a future 2.0-beta port would
need to target the `0.0.0-next-*` line (`/v1` subpath + `ctx.tool.transform`).

## Layout

| Path | Purpose |
|---|---|
| `src/index.ts` | V1 entry. Exports ONLY `plugin` (named) and the same `plugin` as default. No other export allowed here. |
| `src/adapters/v1.ts` | V1 adapter: registers both tools with the legacy `tool()` helper from `@opencode-ai/plugin` (zod args, `{ title, output }` results), returned as an object keyed by tool name. |
| `src/runtime.ts` | `SessionRuntime` interface (`listSessions`, `messageTexts`, `send`) that decouples tool logic from the SDK. |
| `src/runtime/v1.ts` | V1 runtime adapter over the legacy `@opencode-ai/sdk` client. |
| `src/service.ts` | Version-agnostic `runSearch` / `runSend` implementations over `SessionRuntime`. |
| `src/model.ts` | `SessionView` / `SearchHit` — the normalized, runtime-agnostic session model. |
| `src/helpers.ts` | Pure, unit-tested helpers operating on `SessionView` (`resolveTarget`, `formatDM`, `cropExcerpt`, `buildSearchResult`, ...). |
| `src/text.ts` | Shared, user-facing tool text (tool descriptions, error rendering) used by both adapters to prevent drift. |
| `test/` | Bun unit tests: `smoke`, `helpers`, `search`, `send`, `service`. |
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
- The `zod`, `effect`, and `@opencode-ai/plugin` versions are pinned EXACTLY —
  do not loosen them; a version mismatch (especially dual V1/V2 SDK copies)
  breaks the plugin at runtime.
