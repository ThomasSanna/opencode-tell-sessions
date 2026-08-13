---
name: test-plugin
description: Run the opencode-tell-sessions test suite and verify the plugin loads correctly in a local OpenCode instance. Use when working on this repo and you need to validate changes, add a test, or check the plugin entry point exports.
---

# Test the plugin

This skill covers how to verify changes to the `opencode-tell-sessions` plugin.

## Prerequisites

- [Bun](https://bun.sh) installed
- Dependencies installed: `bun install`

## Run the test suite

```bash
bun test
```

All tests must pass. There are 4 test files under `test/`:

- `test/smoke.test.ts` — the plugin entry exports exactly `plugin` + default
- `test/helpers.test.ts` — pure helper functions
- `test/search.test.ts` — `session_search` formatting and guard behavior
- `test/send.test.ts` — `session_send` DM formatting

## Run the typechecker

```bash
bun run typecheck
```

Must exit 0. The codebase is strict TypeScript: no `as any`, no `@ts-ignore`,
no `@ts-expect-error`.

## Verify the plugin entry (critical rule)

The OpenCode v1 loader iterates **every exported function** in the entry file
as a candidate plugin. `src/index.ts` MUST therefore export ONLY:

```ts
export const plugin = { ... };
export default plugin;
```

If the loader crashes with `error="{} is not iterable"`, some helper was
exported from `src/index.ts` — move it to `src/helpers.ts` instead.

## Local smoke test against a real OpenCode instance

1. Add the plugin to your `opencode.json`:

   ```json
   {
     "plugin": ["./src/index.ts"]
   }
   ```

2. Start a session A and a session B on the same OpenCode server.
3. In session A, ask: "send a DM to the session titled <title of session B>".
4. Verify the message arrives in session B with the `@<title-of-session-A>`
   prefix, followed by the message body.

## When tests fail

- A string assertion mismatch → the implementation and the test disagree on
  the exact output format. Decide which one is the intended behavior, then
  update the other. Keep both in sync.
- A boundary test fails (e.g. `formatDM` at 60/61 chars) → check the truncation
  logic in `src/helpers.ts` (`formatDM`, `cropExcerpt`).
