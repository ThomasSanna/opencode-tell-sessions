# Inter-Session DM Plugin: Implementation Plan (canonical OSS layout)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An OpenCode v1 plugin (`src/index.ts`) that lets the agent of one session send a direct message (DM) to another session on the same server, and discover sessions by ambiguous title / date / transcript content.

**Architecture:** v1 plugin = function `(input) => Promise<Hooks>` receiving the full SDK client. Two tools registered via `Hooks.tool`: `session_search` (discovery: title match + content match with crop) and `session_send` (fire-and-forget send via `client.session.promptAsync`, `@source | message` prefix). Pure logic (target resolution, formatting, crop, sorting) exported from `src/index.ts` and unit-tested via `bun test`. Zero persistent state. Canonical OSS repo layout (zero-build TS, like `opencode-command-inject` / `opencode-wakatime`): source in `src/`, no build, OpenCode loads the TS directly via Bun.

**Tech Stack:** Strict TypeScript, `@opencode-ai/plugin@1.18.16`, `@opencode-ai/sdk@1.18.16`, `zod@4`, Bun 1.3.14 (tests + typecheck), git (repo initialized in Task 0).

## Global Constraints

- **Repo: `E:\programmes\apps\opencode-plugins`** — the root IS the plugin package. Canonical OSS layout:
  ```
  src/index.ts            ← plugin entry point (export const plugin + export default)
  test/*.test.ts          ← bun tests (import from ../src/index)
  package.json            ← name: opencode-inter-session-dm, zero-build TS
  tsconfig.json           ← strict, noEmit, moduleResolution bundler
  opencode.json           ← local dev: "plugin": ["./src/index.ts"]
  README.md, LICENSE, .gitignore
  docs/superpowers/       ← spec + plan (committed)
  ```
- **Git REQUIRED**: the repo is initialized in Task 0. Each task ends with a commit (`git add` + `git commit`). No repo = no completed task.
- Root `.gitignore`: `node_modules/`, `dist/`, `*.log`, `.DS_Store`, `.opencode/`, `.omo/`, `.codegraph/`; the old `.opencode/` scaffold (package.json + node_modules from the old layout) is **deleted** in Task 0.
- OSS export convention (wakatime): `export const plugin: Plugin = async (input) => {...}; export default plugin;` — NOT `export const Plugin`.
- Target runtime: OpenCode v1 1.18.18, loaded via `opencode.json` → `"plugin": ["./src/index.ts"]`. v2 API out of scope.
- Zero persistent state: no registry, no config file, no on-disk cache.
- Zero `any`, zero `@ts-ignore`/`@ts-expect-error`, `strict: true`.
- All client calls pass `{ throwOnError: true }` (rejects on HTTP error); the code catches errors and converts them into messages for the agent.
- **Documented spec deviation**: the spec says `client.session.prompt(...)` + `.catch()`. The SDK exposes `client.session.promptAsync` ("create and send a new message... return immediately", HTTP 204): the native fire-and-forget, cleaner. The plan uses it.
- The user validated (brainstorming): identity by title/date/content, standard OpenCode permissions, tools-only approach, canonical OSS layout.

---

### Task 0: Repo setup: git init + canonical OSS scaffold

**Files:**
- Create: `.gitignore`
- Create: `LICENSE` (MIT)
- Create: `README.md`
- Create: `opencode.json` (local dev)
- Create: `package.json` (canonical, zero-build)
- Delete: `.opencode/` (old scaffold: package.json, package-lock.json, node_modules, plugin/), replaced by the root
- Commit: everything + `docs/superpowers/` (spec + plan already written)

**Interfaces:**
- Consumes: nothing.
- Produces: initialized git repo (`main` branch), initial commit with scaffold + spec + plan. `HEAD` base for all subsequent tasks.

- [ ] **Step 1: Delete the old `.opencode/` scaffold**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
Remove-Item -Recurse -Force .opencode
```
Expected: the `.opencode/` folder (package.json 1.18.16, node_modules, empty plugin/) disappears. It is replaced by the canonical layout at the root.

- [ ] **Step 2: Initialize the git repo**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
git init -b main
```
Expected: `Initialized empty Git repository`. Verify: `git branch --show-current` → `main`.

- [ ] **Step 3: Create `.gitignore`**

Create `.gitignore`:

```
node_modules/
dist/
*.log
.DS_Store
.opencode/
.omo/
.codegraph/
```

- [ ] **Step 4: Create `LICENSE` (MIT)**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 Thomas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Note: the author is a placeholder; the user will replace it before publishing.

- [ ] **Step 5: Create `package.json` (canonical, zero-build TS)**

Create `package.json`:

```json
{
  "name": "opencode-inter-session-dm",
  "version": "0.1.0",
  "description": "Inter-session direct messaging (DM) for OpenCode: agents in different sessions can message each other",
  "type": "module",
  "main": "./src/index.ts",
  "module": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  },
  "keywords": ["opencode", "opencode-plugin"],
  "license": "MIT",
  "dependencies": {
    "@opencode-ai/sdk": "1.18.16",
    "zod": "^4.1.8"
  },
  "peerDependencies": {
    "@opencode-ai/plugin": ">=1.0.0"
  },
  "devDependencies": {
    "@opencode-ai/plugin": "1.18.16",
    "typescript": "^5.8.2"
  }
}
```

Note: zero-build: `main`/`exports` point directly at the TS (OpenCode loads it with Bun, like `opencode-command-inject`). `@opencode-ai/sdk` and `zod` are explicit dependencies (imported directly by the plugin). `@opencode-ai/plugin` is peer (wakatime/openspec convention) + dev for typecheck.

- [ ] **Step 6: Install dependencies**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun install`
Expected: install ok; `node_modules/@opencode-ai/plugin`, `node_modules/zod`, `node_modules/@opencode-ai/sdk`, `node_modules/typescript` exist. `bun.lock` created.

- [ ] **Step 7: Create `opencode.json` (local dev)**

Create `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./src/index.ts"]
}
```

Note: this is this repo's DEVELOPMENT config. Consumers of the published plugin will put `"plugin": ["opencode-inter-session-dm"]` in THEIR config (documented in the README). If the loader rejects `"./src/index.ts"` (see Task 5), try `"plugin": ["./"]` (resolution via package.json `main`).

- [ ] **Step 8: Create `README.md`**

Create `README.md`:

```markdown
# opencode-inter-session-dm

Inter-session direct messaging (DM) for OpenCode: agents in different sessions
on the same server can talk to each other in real time, without human
intervention.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-inter-session-dm"]
}
```

## Usage

From any session, ask the agent to talk to another session, by title, date, or
conversation content:

- "ask the frontend session to update the endpoint"
- "tell weekly-digest we renamed users.name to display_name"
- "find the latest session that talks about weeklyDigest and send it this message"

The agent uses `session_search` to find the right session, then
`session_send` to send it a message. The message appears in the
target session with the `@source-title` prefix.

## Development

```bash
bun install
bun test        # unit tests
bun run typecheck
```

## License

MIT
```

- [ ] **Step 9: Initial commit**

Run (workdir `E:\programmes\apps\opencode-plugins`):
```
git add -A
git commit -m "chore: init opencode-inter-session-dm plugin (canonical OSS layout)"
```
Expected: commit created with .gitignore, LICENSE, README.md, opencode.json, package.json, bun.lock, docs/superpowers/. Verify: `git log --oneline` → 1 commit. `git status` clean.

---

### Task 1: Scaffold: tsconfig + typecheck + plugin skeleton

**Files:**
- Create: `tsconfig.json`
- Create: `src/index.ts` (compilable skeleton)
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: git repo + package.json (Task 0).
- Produces: `src/index.ts` exports `plugin` (type `Plugin` from `@opencode-ai/plugin`) + `export default plugin`. Subsequent tasks add exports to the same file.

- [ ] **Step 1: Write the failing test**

Create `test/smoke.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("the module exports the plugin (named + default)", () => {
    expect(typeof named).toBe("function");
    expect(plugin).toBe(named);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/smoke.test.ts`
Expected: FAIL — "Cannot find module '../src/index'".

- [ ] **Step 3: Create the tsconfig**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src/index.ts"]
}
```

Note: `skipLibCheck: true` avoids errors in `@opencode-ai/sdk`'s generated .d.ts files. `types: []` avoids the `@types/node` dependency. Tests are excluded from typecheck (verified by running them under bun).

- [ ] **Step 4: Create the plugin skeleton**

Create `src/index.ts`:

```ts
import { type Plugin } from "@opencode-ai/plugin";

export const plugin: Plugin = async () => {
  return {
    tool: {},
  };
};

export default plugin;
```

- [ ] **Step 5: Run it to see it pass**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/smoke.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Verify the typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 7: Commit**

```bash
git add tsconfig.json src/index.ts test/smoke.test.ts
git commit -m "chore: scaffold plugin with typecheck and smoke test"
```

---

### Task 2: Pure helpers: target resolution, DM format, crop

**Files:**
- Modify: `src/index.ts` (add pure exports)
- Test: `test/helpers.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions, `Session` type-only).
- Produces (named exports from `src/index.ts`, used by Tasks 3 & 4 and by the tests):
  - `type ResolveResult = { kind: "ok"; session: Session } | { kind: "ambiguous"; candidates: Session[] } | { kind: "self" } | { kind: "not-found" }`
  - `resolveTarget(sessions: Session[], target: string, senderID?: string): ResolveResult`
  - `formatDM(senderTitle: string, message: string): string`
  - `cropExcerpt(text: string, query: string, maxChars?: number): string | undefined`
  - `collectText(parts: readonly { type?: string; text?: string; synthetic?: boolean }[]): string`
  - `recentSessions(sessions: Session[], limit: number, excludeID?: string): Session[]`
  - `searchByTitle(sessions: Session[], query: string): Session[]`
  - `fmtTime(ts: number): string`
  - `export type { Session }` (re-export for test fixtures)

- [ ] **Step 1: Write the failing tests**

Create `test/helpers.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  collectText,
  cropExcerpt,
  formatDM,
  recentSessions,
  resolveTarget,
  searchByTitle,
  fmtTime,
  type Session,
} from "../src/index";

const session = (id: string, title: string, updated: number): Session => ({
  id,
  projectID: "p1",
  directory: "/proj",
  title,
  version: "1",
  time: { created: 0, updated },
});

describe("resolveTarget", () => {
  const sessions = [
    session("a", "frontend build", 100),
    session("b", "backend api", 200),
    session("c", "frontend auth", 300),
  ];

  test("direct UUID", () => {
    const r = resolveTarget(sessions, "b");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("exact title", () => {
    const r = resolveTarget(sessions, "backend api");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("unique case-insensitive substring", () => {
    const r = resolveTarget(sessions, "BACKEND");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("ambiguous substring → candidates", () => {
    const r = resolveTarget(sessions, "frontend");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.candidates.map((s) => s.id).sort()).toEqual(["a", "c"]);
  });

  test("no match", () => {
    const r = resolveTarget(sessions, "nope");
    expect(r.kind).toBe("not-found");
  });

  test("target = sender → self", () => {
    const r = resolveTarget(sessions, "backend api", "b");
    expect(r.kind).toBe("self");
  });
});

describe("formatDM", () => {
  test("@source prefix", () => {
    expect(formatDM("user-profiles", "users.name → display_name")).toBe(
      "@user-profiles | users.name → display_name",
    );
  });
  test("source title too long, truncated to 60 chars", () => {
    const long = "x".repeat(80);
    expect(formatDM(long, "hi")).toBe(`@${"x".repeat(60)}… | hi`);
  });
});

describe("cropExcerpt", () => {
  test("excerpt around the query with ellipsis", () => {
    const text = "a".repeat(50) + "frontend" + "b".repeat(50);
    const ex = cropExcerpt(text, "frontend", 30);
    expect(ex).toContain("frontend");
    expect(ex!.length).toBeLessThanOrEqual(30);
    expect(ex!.startsWith("…")).toBe(true);
    expect(ex!.endsWith("…")).toBe(true);
  });
  test("no match → undefined", () => {
    expect(cropExcerpt("hello world", "zzz")).toBeUndefined();
  });
  test("text shorter than maxChars → full text without ellipsis", () => {
    expect(cropExcerpt("frontend here", "frontend", 300)).toBe("frontend here");
  });
});

describe("collectText", () => {
  test("concatenates non-synthetic text parts", () => {
    const parts = [
      { type: "text", text: "a" },
      { type: "text", text: " b", synthetic: true },
      { type: "tool", text: "ignored" },
    ];
    expect(collectText(parts)).toBe("a");
  });
});

describe("recentSessions", () => {
  const sessions = [
    session("a", "old", 100),
    session("b", "mid", 200),
    session("c", "new", 300),
  ];
  test("top N by updated desc, optional exclusion", () => {
    expect(recentSessions(sessions, 2).map((s) => s.id)).toEqual(["c", "b"]);
    expect(recentSessions(sessions, 2, "c").map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("searchByTitle", () => {
  const sessions = [
    session("a", "Frontend build", 100),
    session("b", "Backend api", 200),
  ];
  test("case-insensitive substring", () => {
    expect(searchByTitle(sessions, "frontend").map((s) => s.id)).toEqual(["a"]);
    expect(searchByTitle(sessions, "zzz")).toEqual([]);
  });
});

describe("fmtTime", () => {
  test("timestamp → short ISO", () => {
    expect(fmtTime(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/helpers.test.ts`
Expected: FAIL — "does not provide an export named" errors for all imports from `../src/index`.

- [ ] **Step 3: Implement the helpers**

Add at the top of `src/index.ts` (before the `export const plugin`):

```ts
import type { Session } from "@opencode-ai/sdk";

// Re-exported so tests can type their fixtures:
export type { Session };

export type ResolveResult =
  | { kind: "ok"; session: Session }
  | { kind: "ambiguous"; candidates: Session[] }
  | { kind: "self" }
  | { kind: "not-found" };

export function resolveTarget(
  sessions: Session[],
  target: string,
  senderID?: string,
): ResolveResult {
  const t = target.trim();
  if (senderID && t === senderID) return { kind: "self" };
  const exact = sessions.find((s) => s.title === t);
  if (exact) return { kind: "ok", session: exact };
  const direct = sessions.find((s) => s.id === t);
  if (direct) return { kind: "ok", session: direct };
  const lower = t.toLowerCase();
  const matches = sessions.filter((s) => s.title.toLowerCase().includes(lower));
  if (matches.length === 1) return { kind: "ok", session: matches[0] };
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  return { kind: "not-found" };
}

export function formatDM(senderTitle: string, message: string): string {
  const source = senderTitle.length > 60 ? `${senderTitle.slice(0, 60)}…` : senderTitle;
  return `@${source} | ${message}`;
}

export function cropExcerpt(
  text: string,
  query: string,
  maxChars = 300,
): string | undefined {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return undefined;
  if (text.length <= maxChars) return text;
  const half = Math.max(
    0,
    Math.floor((maxChars - query.length - 2) / 2),
  );
  const start = Math.max(0, idx - half);
  const end = Math.min(text.length, idx + query.length + half);
  return `…${text.slice(start, end)}…`;
}

export function collectText(
  parts: readonly { type?: string; text?: string; synthetic?: boolean }[],
): string {
  return parts
    .filter((p) => p.type === "text" && !p.synthetic && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("\n");
}

export function recentSessions(
  sessions: Session[],
  limit: number,
  excludeID?: string,
): Session[] {
  return [...sessions]
    .filter((s) => s.id !== excludeID)
    .sort((a, b) => b.time.updated - a.time.updated)
    .slice(0, limit);
}

export function searchByTitle(sessions: Session[], query: string): Session[] {
  const q = query.toLowerCase();
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}

export function fmtTime(ts: number): string {
  return new Date(ts).toISOString();
}
```

- [ ] **Step 4: Run it to see it pass**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/helpers.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts test/helpers.test.ts
git commit -m "feat: pure dm helpers (resolve, format, crop, search)"
```

---

### Task 3: The `session_search` tool: session discovery

**Files:**
- Modify: `src/index.ts` (implement `buildSearchResult` + register the tool)
- Test: `test/search.test.ts`

**Interfaces:**
- Consumes: Task 2 helpers (`searchByTitle`, `recentSessions`, `collectText`, `cropExcerpt`, `fmtTime`), `Session`/`Part` types from the SDK, `tool` from `@opencode-ai/plugin/tool`, `ToolContext`.
- Produces: named export `buildSearchResult(hits: SearchHit[]): string` where `SearchHit = { sessionID: string; title: string; created: number; updated: number; directory?: string; excerpt?: string }`. Used by the tool and tested. The `session_search` tool is registered in `Hooks.tool`.

- [ ] **Step 1: Write the failing tests**

Create `test/search.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { buildSearchResult } from "../src/index";

describe("buildSearchResult", () => {
  test("readable list with optional excerpt", () => {
    const out = buildSearchResult([
      {
        sessionID: "a",
        title: "frontend build",
        created: 0,
        updated: 100,
        directory: "/proj",
        excerpt: "…frontend…",
      },
    ]);
    expect(out).toContain("frontend build");
    expect(out).toContain("a");
    expect(out).toContain("…frontend…");
    expect(out).toContain("1970-01-01T00:00:00.100Z");
  });

  test("truncation at 6000 chars", () => {
    const hits = Array.from({ length: 50 }, (_, i) => ({
      sessionID: `s${i}`,
      title: `title ${i}` + "x".repeat(200),
      created: 0,
      updated: i,
    }));
    expect(buildSearchResult(hits).length).toBeLessThanOrEqual(6000);
  });

  test("empty result", () => {
    expect(buildSearchResult([])).toBe("No session matches.");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/search.test.ts`
Expected: FAIL — "does not provide an export named buildSearchResult".

- [ ] **Step 3: Implement `buildSearchResult` + register the tool**

Add in `src/index.ts`:

```ts
import { tool } from "@opencode-ai/plugin/tool";
import { z } from "zod";

export type SearchHit = {
  sessionID: string;
  title: string;
  created: number;
  updated: number;
  directory?: string;
  excerpt?: string;
};

export function buildSearchResult(hits: SearchHit[]): string {
  if (hits.length === 0) return "No session matches.";
  const lines: string[] = [];
  for (const h of hits) {
    const dir = h.directory ? ` (${h.directory})` : "";
    const ex = h.excerpt ? `\n    excerpt: ${h.excerpt}` : "";
    lines.push(
      `- [${h.sessionID}] ${h.title} — updated ${fmtTime(h.updated)}${dir}${ex}`,
    );
  }
  const out = lines.join("\n");
  const cap = 6000;
  const suffix = "\n… (truncated)";
  return out.length <= cap ? out : `${out.slice(0, cap - suffix.length)}${suffix}`;
}
```

Then replace the body of the `plugin` to register `session_search` (full implementation — Task 4 will add `session_send` to the same `tool` object):

```ts
export const plugin: Plugin = async (input) => {
  const client = input.client;

  return {
    tool: {
      session_search: tool({
        description:
          "Search for an OpenCode session by title, date, or conversation content. " +
          "Use it when the user mentions another session ambiguously " +
          "(e.g. 'the last session that talks about frontend', 'the backend session'). " +
          "Returns candidate sessions sorted by recency, with their title, id, last-updated date and an excerpt.",
        args: {
          query: z.string().describe("Text to search for: title, content keyword, or description"),
          limit: z.number().int().positive().max(20).optional().describe("Max number of sessions (default 10)"),
        },
        async execute(args, ctx) {
          const limit = args.limit ?? 10;
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const titleHits = searchByTitle(all, args.query);
            const hits: SearchHit[] = titleHits.map((s) => ({
              sessionID: s.id,
              title: s.title,
              created: s.time.created,
              updated: s.time.updated,
              directory: s.directory,
            }));
            const seen = new Set(hits.map((h) => h.sessionID));
            for (const s of recentSessions(all, limit, ctx.sessionID)) {
              if (seen.has(s.id)) continue;
              let excerpt: string | undefined;
              try {
                const { data: msgs } = await client.session.messages({
                  path: { id: s.id },
                  query: { limit: 10 },
                  throwOnError: true,
                });
                const text = (msgs ?? [])
                  .map((m) => collectText(m.parts))
                  .join("\n");
                excerpt = cropExcerpt(text, args.query, 300);
              } catch {
                excerpt = undefined;
              }
              hits.push({
                sessionID: s.id,
                title: s.title,
                created: s.time.created,
                updated: s.time.updated,
                directory: s.directory,
                excerpt,
              });
              seen.add(s.id);
            }
            hits.sort((a, b) => b.updated - a.updated);
            return { title: "Sessions found", output: buildSearchResult(hits) };
          } catch (err) {
            return {
              title: "session_search error",
              output: `Could not list sessions: ${String(err)}`,
            };
          }
        },
      }),
    },
  };
};
```

Note: `ToolContext.sessionID` comes from `@opencode-ai/plugin/tool` (type inferred by `tool()`). `m.parts` is typed `Part[]`, compatible with `collectText`'s `readonly { type?; text?; synthetic? }[]` parameter (the SDK `Part`s are a union with `type: string`).

- [ ] **Step 4: Run it to see it pass**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/search.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts test/search.test.ts
git commit -m "feat: session_search tool (title + cropped content)"
```

---

### Task 4: The `session_send` tool: sending DMs

**Files:**
- Modify: `src/index.ts` (register the `session_send` tool)
- Test: `test/send.test.ts`

**Interfaces:**
- Consumes: `resolveTarget`, `formatDM`, `recentSessions`, `fmtTime`, `buildSearchResult`, `type SearchHit` (Tasks 2 & 3), `ToolContext`.
- Produces: the `session_send` tool in `Hooks.tool` (used by the agent). Tested exports: `describeCandidates(candidates: Session[]): string` and `listRecentHint(sessions: Session[]): string`.

- [ ] **Step 1: Write the failing tests**

Create `test/send.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  describeCandidates,
  listRecentHint,
  type Session,
} from "../src/index";

const session = (id: string, title: string, updated: number): Session => ({
  id,
  projectID: "p1",
  directory: "/proj",
  title,
  version: "1",
  time: { created: 0, updated },
});

describe("describeCandidates", () => {
  test("readable list with id, title and date", () => {
    const out = describeCandidates([session("a", "frontend build", 100)]);
    expect(out).toContain("a");
    expect(out).toContain("frontend build");
    expect(out).toContain("1970-01-01T00:00:00.100Z");
  });
  test("empty → dedicated message", () => {
    expect(describeCandidates([])).toBe("No session matches.");
  });
});

describe("listRecentHint", () => {
  test("top 5 with title and id", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => session(`s${i}`, `t${i}`, i));
    const out = listRecentHint(sessions);
    expect(out).toContain("s5");
    expect(out).toContain("s1");
    expect(out).not.toContain("s0");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/send.test.ts`
Expected: FAIL — missing exports.

- [ ] **Step 3: Implement `describeCandidates` + `listRecentHint`**

Add in `src/index.ts`:

```ts
export function describeCandidates(candidates: Session[]): string {
  if (candidates.length === 0) return "No session matches.";
  return candidates
    .map(
      (s) =>
        `- [${s.id}] ${s.title} — updated ${fmtTime(s.time.updated)}`,
    )
    .join("\n");
}

export function listRecentHint(sessions: Session[]): string {
  return recentSessions(sessions, 5)
    .map((s) => `- [${s.id}] ${s.title} — updated ${fmtTime(s.time.updated)}`)
    .join("\n");
}
```

- [ ] **Step 4: Run it to see it pass**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/send.test.ts`
Expected: PASS.

- [ ] **Step 5: Register the `session_send` tool**

In `src/index.ts`, add `session_send` to the `tool` object (after `session_search`):

```ts
      session_send: tool({
        description:
          "Sends a direct message (DM) to another OpenCode session on the same server. " +
          "Use it when the user asks to talk to another session " +
          "(e.g. 'ask the frontend session to...', 'tell weekly-digest ...'). " +
          "The message is injected into the target session with the @source-title prefix. " +
          "Only send a DM if the user asks for it or if another agent has explicitly asked you to reply. " +
          "Do not automatically reply to a received DM unless the message contains a question or a request for you.",
        args: {
          target: z.string().describe("Title of the target session (or its id)"),
          message: z.string().describe("Content of the message to send"),
        },
        async execute(args, ctx) {
          try {
            const { data: sessions } = await client.session.list({ throwOnError: true });
            const all = sessions ?? [];
            const resolved = resolveTarget(all, args.target, ctx.sessionID);
            if (resolved.kind === "self") {
              return {
                title: "session_send refused",
                output: "You are already in this session. Choose another target session.",
              };
            }
            if (resolved.kind === "not-found") {
              const hint = listRecentHint(all);
              return {
                title: "Session not found",
                output:
                  `Session "${args.target}" not found. Use session_search to find the right session.\n` +
                  `Recent sessions on the server:\n${hint}`,
              };
            }
            if (resolved.kind === "ambiguous") {
              return {
                title: "Ambiguous session",
                output:
                  `Multiple sessions match "${args.target}". Narrow it down with a more exact id or title:\n` +
                  describeCandidates(resolved.candidates),
              };
            }
            const targetSession = resolved.session;
            const sender =
              all.find((s) => s.id === ctx.sessionID)?.title ?? ctx.sessionID;
            const text = formatDM(sender, args.message);
            await client.session.promptAsync({
              path: { id: targetSession.id },
              body: { parts: [{ type: "text", text }] },
              throwOnError: true,
            });
            return {
              title: "DM sent",
              output:
                `DM sent to "${targetSession.title}" (${targetSession.id}) at ${fmtTime(Date.now())}.`,
            };
          } catch (err) {
            return {
              title: "session_send error",
              output: `Could not send the DM: ${String(err)}`,
            };
          }
        },
      }),
```

- [ ] **Step 6: Run all tests**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bun test test/`
Expected: PASS (smoke + helpers + search + send).

- [ ] **Step 7: Typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/index.ts test/send.test.ts
git commit -m "feat: session_send tool (fire-and-forget via promptAsync)"
```

---

### Task 5: Manual E2E verification (real scenario)

**Files:**
- None (manual test in OpenCode).

**Interfaces:**
- Consumes: the complete plugin (Tasks 0-4) + `opencode.json` (Task 0).

- [ ] **Step 1: Verify plugin loading**

Launch `opencode` at the repo root (workdir `E:\programmes\apps\opencode-plugins`). Verify:
- No plugin loading errors in the logs/session.
- If the loader rejects `"./src/index.ts"`: edit `opencode.json` → `"plugin": ["./"]` (resolution via package.json `main`), relaunch, verify loading. Commit the change if needed.

- [ ] **Step 2: Verify the tools are visible**

In the session, ask: *"which tools do you have available?"* or check via the UI that `session_search` and `session_send` appear in the tool list.

- [ ] **Step 3: Prepare two named sessions**

1. Session A (this one): `/title user-profiles`
2. New session B (another tab, same project): `/title weekly-digest`
3. Give B a meaningful content: *"I'm working on a weekly job that uses users.name in src/jobs/weeklyDigest.ts"*

- [ ] **Step 4: Send the DM from A**

In session A, ask:
*"ask the weekly-digest session to update its SQL: users.name → users.display_name"*

Verify:
- Agent A calls `session_search` (or directly `session_send` with the title).
- The tool output confirms "DM sent to ... (id)".

- [ ] **Step 5: Verify reception in B**

In session B:
- A user message `@user-profiles | users.name → users.display_name` appears in the transcript (@ prefix visible).
- Agent B reacts and proposes/performs the modification of `src/jobs/weeklyDigest.ts`.

- [ ] **Step 6: Verify the edge cases**

1. **Ambiguous**: create a 3rd session `/title user-profiles-2` (or a title containing "user-profiles"), ask again for a DM to "user-profiles" from A → the tool returns the candidate list, the agent asks to narrow it down.
2. **Not found**: ask for a DM to "nonexistent-session" → the tool returns "Session not found" + the list of the 5 most recent sessions.
3. **Self-send**: ask the agent to send a DM to itself (its own title) → refusal "You are already in this session".
4. **Content search**: in A, ask *"find the latest session that talks about weeklyDigest"* → `session_search` returns session B with an excerpt of the transcript.

- [ ] **Step 7: Final typecheck**

Run (workdir `E:\programmes\apps\opencode-plugins`): `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Final commit if files were modified**

```bash
git add -A
git commit -m "docs: E2E verified (loading, DM A→B, edge cases)"
```
Skip if nothing changed (no file modifications during the manual test).

---

## Self-Review (run after writing the plan)

1. **Spec coverage**: every spec section (see `docs/superpowers/specs/2026-08-13-inter-session-dm-design.md`) must map to a task.
2. **Placeholder scan**: no "TBD"/"TODO"/"implement later" in the plan.
3. **Type consistency**: consistent names across tasks (`resolveTarget`, `formatDM`, `cropExcerpt`, `collectText`, `recentSessions`, `searchByTitle`, `fmtTime`, `buildSearchResult`, `describeCandidates`, `listRecentHint`, `SearchHit`, `ResolveResult`).
