# AGENTS.md — opencode-tell-sessions

`opencode-tell-sessions` is a small OpenCode plugin that lets agents in
different sessions on the same server message each other in real time.
It exposes two tools: `session_search` (find a session by title, date, or
content) and `session_send` (fire-and-forget DM into a target session).

The plugin is **dual-compatible** (OpenCode V1 and V2). `src/index.ts`
exports both a V1 `plugin` function and a V2 default export (`Plugin.define`),
so each loader picks up the export it understands from the same module.

## Layout

| Path | Purpose |
|---|---|
| `src/index.ts` | Dual-compat entry. Exports ONLY `plugin` (V1 adapter fn) and the default V2 `Plugin.define` — V1 iterates exported functions, V2 reads the default export. No other export allowed here. |
| `src/adapters/v1.ts` | V1 adapter: registers both tools with the legacy `tool()` helper from `@opencode-ai/plugin/v1` (zod args, `{ title, output }` results). |
| `src/adapters/v2.ts` | V2 adapter: `Plugin.define` registers both tools via `ctx.tool.transform(tools.add(...))` with Effect `Schema` inputs and `{ content }` results. |
| `src/runtime.ts` | `SessionRuntime` interface (`listSessions`, `messageTexts`, `send`) that decouples tool logic from the SDK. |
| `src/runtime/v1.ts` | V1 runtime adapter over the legacy `@opencode-ai/sdk` client. |
| `src/runtime/v2.ts` | V2 runtime adapter: `send` via `ctx.session.prompt`; list/messages via a lazily-created full client (`@opencode-ai/client/service`). |
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
