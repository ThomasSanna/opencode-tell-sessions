# Fix Plugin Load Under OpenCode 1.18.x — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the published `opencode-tell-sessions` plugin load and work under OpenCode 1.18.x (the actual runtime), by aligning the code with the 1.18.x plugin API and pinning exact dependency versions.

**Architecture:** Convert the plugin from dual-compat (targeting the `0.0.0-next-*` API line) to V1-only (targeting the 1.18.x API line). The V1 adapter is fixed to the 1.18.x shape (root `tool` import, object-keyed tool map). The V2 adapter and V2 runtime are deleted because 1.18.18's V2 API has no tool registration. Dependencies are pinned to exact versions known to work.

**Tech Stack:** TypeScript (strict), Bun, `@opencode-ai/plugin@1.18.18`, `@opencode-ai/sdk@1.18.16`, zod 4.1.8, effect 4.0.0-beta.101.

## Background — Investigation Review (what was said and what we found)

### The report (Discord, FrancescPS)
- Plugin "is not working" on the user's setup.
- DeepSeek fixed it by changing deps: `@opencode-ai/client` `^0.0.0-next-17430` → `0.0.0-next-17444`; `@opencode-ai/plugin` `^0.0.0-next-17430` → `1.18.18`; plus code changes.
- DeepSeek claimed the installed version was "a placeholder without dist or src folder" (user confirmed manually).
- User asked us to check the version FrancescPS sent in `C:\Users\thoma\Downloads\opencode-tell-sessions`.

### Evidence gathered (npm registry + local installs, verified 2026-08-20)

| Claim | Reality |
|---|---|
| `0.0.0-next-17430` was a placeholder | **FALSE** — complete package (83 files, 84 KB), HAS `/v1` subpath |
| Pinning to `1.18.18` fixed the `/v1` import | **IMPLAUSIBLE** — `1.18.18` has **no `/v1`**; exports are `.`, `./tool`, `./tui`, `./v2/*` |
| The real placeholder | `@opencode-ai/client@0.0.0` (the `latest` dist-tag) — empty shell, 2 files, no exports |
| Latest versions | plugin `latest = 1.18.19`; client `latest = 0.0.0` (placeholder); `next = 0.0.0-next-17444` |

### Corrected root cause
The current repo's dual-compat code was written against the `0.0.0-next-*` API line:
- `src/adapters/v1.ts` imports `tool` from `@opencode-ai/plugin/v1` — exists in `0.0.0-next-*`, **does not exist in 1.18.x**.
- `src/adapters/v2.ts` imports `Plugin` from `@opencode-ai/plugin` root — exists in `0.0.0-next-*` (namespace with `define`), **does not exist in 1.18.x** (root only re-exports `tool`).
- `src/adapters/v2.ts` uses `ctx.tool.transform(...)` and `ctx.session` — **1.18.18's V2 `PluginContext` has no `tool` and no `session`**; its V2 API is hooks-based (`agent`, `catalog`, `command`, `integration`, `plugin`, `reference`, `skill`) and has **no tool registration at all** (grep for `tool` across all `v2/promise/*.d.ts` returns nothing).

OpenCode 1.18.x provides the `1.18.x` plugin line at runtime. The published plugin (with caret `^0.0.0-next-17430`) therefore fails to load under real OpenCode. DeepSeek's fix worked because it rewrote the code to the 1.18.x API (V1-only, root `tool` import, object-keyed tool map) and pinned exact versions.

### Decision
Dual-compat for 1.18.x is **impossible as designed**: 1.18.18's V2 API has no tool registration, and the plugin's entire purpose is tools (`session_search`, `session_send`). The only viable fix that works under the actual runtime is **V1-only**, matching DeepSeek's proven fix. The V2 adapter/runtime are deleted (they cannot typecheck against 1.18.18: `import { Plugin }` from root fails, and `ctx.tool` does not exist). Git history preserves them for a future 2.0-beta port.

## Global Constraints

- Strict TypeScript: no `as any`, no `@ts-ignore`, no `@ts-expect-error`.
- English only in code, comments, commits, docs.
- Every behavior change ships with a test; CI gate runs `bun test` + `bun run typecheck`.
- Bugfix rule: fix minimally; never refactor while fixing.
- Commit style: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `i18n:`.
- If a change alters a user-facing string, update the corresponding test assertions in the same commit.
- Do NOT add exports to `src/index.ts` beyond `plugin` and the default.
- Do NOT modify `bun.lock` by hand; use `bun install` / `bun add`.
- `zod`, `effect`, and `@opencode-ai/plugin` versions are pinned EXACTLY.

---

### Task 1: Write the failing smoke test (TDD red)

**Files:**
- Modify: `test/smoke.test.ts`

**Interfaces:**
- Consumes: current `src/index.ts` (exports `plugin` named + `v2plugin` default).
- Produces: the new expected contract — default export is the same V1 plugin function as the named export.

- [ ] **Step 1: Replace the smoke test content**

Replace the entire contents of `test/smoke.test.ts` with:

```ts
import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("the module exports the V1 plugin function", () => {
    expect(typeof named).toBe("function");
  });
  test("the default export is the same V1 plugin function", () => {
    expect(plugin).toBe(named);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test test/smoke.test.ts`
Expected: FAIL — `expect(plugin).toBe(named)` fails because the current default export is `v2plugin` (a distinct object), not the `plugin` function.

- [ ] **Step 3: Commit the failing test**

```bash
git add test/smoke.test.ts
git commit -m "test: smoke asserts default export is the V1 plugin function"
```

---

### Task 2: Align the plugin code with the 1.18.x API (TDD green)

**Files:**
- Modify: `src/adapters/v1.ts`
- Modify: `src/index.ts`
- Delete: `src/adapters/v2.ts`, `src/runtime/v2.ts`
- Modify: `package.json`
- Regenerate: `bun.lock` (via `bun install`, never by hand)

**Interfaces:**
- Consumes: Task 1's smoke test (default export must equal named `plugin`).
- Produces: `src/index.ts` exports only `plugin` (named) + `plugin` (default). `src/adapters/v1.ts` exports `plugin` returning `{ tool: Record<string, ReturnType<typeof tool>> }` with tools keyed `session_search` / `session_send`. `@opencode-ai/plugin` pinned to `1.18.18`, `@opencode-ai/client` pinned to `0.0.0-next-17444`.

- [ ] **Step 1: Fix the V1 adapter import and return shape**

In `src/adapters/v1.ts`:

1. Line 1: change
   ```ts
   import { tool } from "@opencode-ai/plugin/v1";
   ```
   to
   ```ts
   import { tool } from "@opencode-ai/plugin";
   ```

2. Line 19: change the return type
   ```ts
   tool: ReturnType<typeof tool>[];
   ```
   to
   ```ts
   tool: Record<string, ReturnType<typeof tool>>;
   ```

3. Lines 24-69: change the tool registration from an array to an object keyed by tool name. The full new file body after the import block:

```ts
/**
 * OpenCode V1 plugin adapter.
 *
 * V1 loads a module by iterating its exported functions; the `plugin`
 * function is picked up by the V1 loader. Tools are registered with the
 * legacy `tool()` helper (zod args, `{ title, output }` results) and
 * returned as an object keyed by tool name.
 */
export const plugin = async (input: { client: V1Client }): Promise<{
  tool: Record<string, ReturnType<typeof tool>>;
}> => {
  const runtime = createV1Runtime(input.client);

  return {
    tool: {
      session_search: tool({
        description: SEARCH_TOOL_DESCRIPTION,
        args: {
          query: z
            .string()
            .describe("Text to search: title, content keyword, or description"),
          limit: z
            .number()
            .int()
            .positive()
            .max(20)
            .optional()
            .describe("Maximum number of sessions (default 10)"),
        },
        async execute(args, ctx) {
          try {
            const out = await runSearch(runtime, args, ctx.sessionID);
            return { title: "Sessions found", output: out };
          } catch (err) {
            return {
              title: "session_search error",
              output: `Failed to list sessions: ${errMsg(err)}`,
            };
          }
        },
      }),
      session_send: tool({
        description: SEND_TOOL_DESCRIPTION,
        args: {
          target: z.string().describe("Title of the target session (or its id)"),
          message: z.string().describe("Content of the message to send"),
        },
        async execute(args, ctx) {
          try {
            const out = await runSend(runtime, args, ctx.sessionID);
            return { title: "DM sent", output: out };
          } catch (err) {
            return {
              title: "session_send error",
              output: `Failed to send DM: ${errMsg(err)}`,
            };
          }
        },
      }),
    },
  };
};
```

- [ ] **Step 2: Make the entry point V1-only**

Replace the entire contents of `src/index.ts` with:

```ts
import { plugin } from "./adapters/v1.js";

/**
 * OpenCode V1 plugin entry point.
 *
 * The V1 loader iterates the module's exported functions and picks up the
 * `plugin` function (tools registered via the legacy `tool()` helper).
 */
export { plugin };
export default plugin;
```

- [ ] **Step 3: Delete the V2 adapter and V2 runtime**

Run:

```bash
git rm src/adapters/v2.ts src/runtime/v2.ts
```

These files cannot typecheck against `@opencode-ai/plugin@1.18.18` (`import { Plugin }` from root fails; `ctx.tool` / `ctx.session` do not exist in 1.18.18's V2 `PluginContext`). Nothing else imports them after Step 2.

- [ ] **Step 4: Pin the dependencies**

In `package.json`, change the `dependencies` block to:

```json
  "dependencies": {
    "@opencode-ai/client": "0.0.0-next-17444",
    "@opencode-ai/plugin": "1.18.18",
    "@opencode-ai/sdk": "1.18.16",
    "effect": "4.0.0-beta.101",
    "zod": "4.1.8"
  },
```

Notes:
- `@opencode-ai/plugin` pinned exactly to `1.18.18` (root exports `tool`; matches the proven-working config and the local `.opencode/package.json`).
- `@opencode-ai/client` pinned exactly to `0.0.0-next-17444` (real build with `/service`; avoids the `0.0.0` placeholder that the `latest` dist-tag points to). Kept even though the code no longer imports it, to match the proven-working Downloads config exactly.
- `@opencode-ai/sdk` stays `1.18.16` (proven-working; the V1 runtime only wraps the client passed in by the loader).

- [ ] **Step 5: Regenerate the lockfile**

Run: `bun install`
Expected: `bun.lock` now resolves `@opencode-ai/plugin@1.18.18` and `@opencode-ai/client@0.0.0-next-17444`; `node_modules/@opencode-ai/plugin` is replaced with 1.18.18.

- [ ] **Step 6: Run the full test suite**

Run: `bun test`
Expected: all pass, including the Task 1 smoke test (`default export is the same V1 plugin function`).

- [ ] **Step 7: Run the typechecker**

Run: `bun run typecheck`
Expected: exit 0 (strict, no `any`/`@ts-ignore`/`@ts-expect-error`).

- [ ] **Step 8: Commit**

```bash
git add src/adapters/v1.ts src/index.ts package.json bun.lock
git commit -m "fix: align plugin with OpenCode 1.18.x API and pin exact deps"
```

---

### Task 3: Update the repo documentation

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 2's final state (V1-only entry, v2 files deleted).
- Produces: `AGENTS.md` accurately describes the V1-only design.

- [ ] **Step 1: Update the intro paragraph**

In `AGENTS.md`, replace:

```markdown
The plugin is **dual-compatible** (OpenCode V1 and V2). `src/index.ts`
exports both a V1 `plugin` function and a V2 default export (`Plugin.define`),
so each loader picks up the export it understands from the same module.
```

with:

```markdown
The plugin targets **OpenCode 1.x (V1)**. `src/index.ts` exports the V1
`plugin` function (named and default), registered via the legacy `tool()`
helper from `@opencode-ai/plugin`. The V2 adapter was removed because the
1.18.x plugin API has no tool registration; a future 2.0-beta port would
need to target the `0.0.0-next-*` line (`/v1` subpath + `ctx.tool.transform`).
```

- [ ] **Step 2: Update the layout table**

In `AGENTS.md`, update the table rows:

```markdown
| `src/index.ts` | V1 entry. Exports ONLY `plugin` (named) and the same `plugin` as default. No other export allowed here. |
| `src/adapters/v1.ts` | V1 adapter: registers both tools with the legacy `tool()` helper from `@opencode-ai/plugin` (zod args, `{ title, output }` results), returned as an object keyed by tool name. |
| `src/runtime/v1.ts` | V1 runtime adapter over the legacy `@opencode-ai/sdk` client. |
```

Remove the rows for `src/adapters/v2.ts` and `src/runtime/v2.ts` (deleted in Task 2).

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: describe V1-only design for OpenCode 1.18.x"
```

---

### Task 4: Verify the plugin loads in a real OpenCode instance

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: Task 2's final state (V1-only code, deps pinned to 1.18.18).
- Produces: evidence that the plugin loads and its tools are registered under the real runtime.

- [ ] **Step 1: Verify import resolution against the installed deps**

Run a one-off script that imports the entry point and confirms it loads without throwing:

```bash
bun -e "import('./src/index.ts').then(m => { console.log('named:', typeof m.plugin); console.log('default:', typeof m.default); console.log('same:', m.default === m.plugin); })"
```

Expected output:
```
named: function
default: function
same: true
```

- [ ] **Step 2: Load the plugin in a real OpenCode instance**

`opencode.json` already loads `./src/index.ts`. Run a headless prompt that lists tools containing "session":

```bash
opencode run "List the tools whose names contain 'session'"
```

Expected: the output includes `session_search` and `session_send` (our plugin tools), proving the plugin loaded. If no model is available, fall back to checking the OpenCode log for `failed to load plugin` errors after the run (expect none).

- [ ] **Step 3: Functional DM check (optional, requires two sessions)**

Start session A and session B on the same OpenCode server. In session A, ask: "send a DM to the session titled <title of session B>". Verify the message arrives in session B with the `@<title-of-session-A>` prefix.

---

## Self-Review

**1. Spec coverage:** The user's request was to review everything said and fix the plugin so it works for users. The plan (a) documents the corrected root cause in the Background section, (b) fixes the code to the 1.18.x API (Task 2), (c) pins exact deps (Task 2 Step 4), (d) updates docs (Task 3), (e) verifies in a real instance (Task 4). No gaps.

**2. Placeholder scan:** No TBD/TODO. Every step has exact code or exact commands with expected output.

**3. Type consistency:** `v1.ts` returns `Record<string, ReturnType<typeof tool>>` with keys `session_search` / `session_send`; `index.ts` exports `plugin` named + default; smoke test asserts `default === named`; `package.json` pins `@opencode-ai/plugin@1.18.18` whose root exports `tool` (verified: `dist/index.js` = `export * from "./tool.js"`). Consistent.

**4. Risk note:** The `effect` version mismatch (`4.0.0-beta.101` pinned vs `4.0.0-beta.83` required by `@opencode-ai/plugin@1.18.18`) is pre-existing and was present in the proven-working Downloads config; left unchanged per the minimal-fix rule.