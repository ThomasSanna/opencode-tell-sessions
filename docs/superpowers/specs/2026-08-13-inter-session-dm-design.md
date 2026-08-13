# Design: OpenCode plugin for inter-session messaging (DM)

**Date**: 2026-08-13
**Status**: Validated (brainstorming), pending spec review
**Target runtime**: OpenCode v1 (1.18.x), plugin loaded from `.opencode/plugin/`

---

## 1. Problem

In Claude Code, named sessions can send each other direct messages (DMs): the
agent of session A can notify the agent of session B of a contract change (API,
DB schema, column names), without human intervention.

OpenCode v1 does not have this capability. Sessions share a common server and
expose an SDK client able to inject messages into any session: the building
block exists, the mechanism is missing.

**Goal**: a plugin that lets the agent of one session send a message to another
session (by ambiguous title, date, or transcript content), injected into the
target transcript with an `@source` prefix, waking up the target agent.

## 2. Design decisions (validated)

| Question | Decision |
|---|---|
| Runtime | **v1 first** (works on the installed OpenCode 1.18.18). v2 entry point (Plugin.define) is out of scope for this iteration. |
| Session identity | **By title** (OpenCode built-in, changeable via /title) + search by date + search in transcript content (cropped). No alias registry. |
| Guardrails | **Standard OpenCode permissions** (approve/deny/allow on tools). No systematic DM confirmation. |
| Approach | **Tools only**: 2 tools (`session_send`, `session_search`), zero persistent state, everything through the SDK client. |

## 3. Architecture

A single file: `.opencode/plugin/dm.ts`, a v1 module (`server: Plugin` export).
Types provided by `@opencode-ai/plugin` (1.18.16, already installed in `.opencode/package.json`).

```
┌─────────────────────┐        ┌─────────────────────┐
│ Session A (agent)   │        │ Session B (agent)   │
│  "tell B that ..."  │        │                     │
│        │            │        │        ▲            │
│        ▼            │        │        │            │
│  tool session_send  │        │ user message        │
│  tool session_search│        │ "@A | content"      │
│        │            │        │        │            │
│        └── client.session.prompt(id=B, parts=[text]) ──┘
│                     │
│  ── same OpenCode server ──
```

All sessions on the same server see the same tools → bidirectional by
construction.

### 3.1 The `session_search` tool

Semantic discovery. The agent uses it when the user describes a session
ambiguously ("the last session where we implemented a front-end feature").

- **Args (zod)**: `query: string`, `limit?: number` (default 10)
- **Logic (deterministic, no heuristics)**:
  1. `client.session.list()` → all sessions on the server
  2. **Title match**: case-insensitive substring on `title` → candidates
  3. **Content match**: in all cases, take the `limit` most recent sessions
     (`time.updated` descending) and search for `query` in their transcript
     via `client.session.messages()` → candidates with excerpt
  4. Merge both lists (dedupe by sessionID), title matches first, sorted by
     recency
  5. **Crop**: each text excerpt ≤ ~300 characters, total output capped
     (~6 KB) to protect the calling agent's context
- **Return**: `[{ sessionID, title, created, updated, directory, excerpt? }]`
  sorted by recency. The agent assesses and chooses.

### 3.2 The `session_send` tool

Sends a DM.

- **Args (zod)**: `target: string` (title or sessionID), `message: string`
- **Logic**:
  1. If `target` is a UUID → direct resolution
  2. Otherwise → exact title → unique substring → if several candidates:
     **return the candidate list** (no arbitrary choice)
  3. Sender title resolution: `ToolContext.sessionID` →
     `client.session.list()` → title (fallback: raw sessionID)
  4. **Fire-and-forget send**: `client.session.prompt({ path: { id }, body: {
     parts: [{ type: "text", text }] } })` — the tool **does not wait** for the
     target session's response. The promise is fired in the background with a
     `.catch()` that logs any failure (no unhandled rejection).
  5. Immediate return: `DM sent to "<title>" (<id>) at <time>`
- **Anti-loop guardrail**: refuses `target === current sessionID`
  ("You are already in this session")

## 4. Injected message format

```
@user-profiles | users.name → users.display_name
```

- `@source-title` → clearly identifies an inter-session DM ("Visible"
  requirement)
- `|` separates sender from content: a stable, readable format
- The message is a real user message: it enters the transcript, becomes
  context, and **wakes up the agent** of the target session (exact behavior of
  the Claude Code example)

## 5. Agent instructions (tool descriptions)

- `session_search`: "Search for an OpenCode session by title, date, or
  conversation content. Use it when the user mentions another session
  ambiguously (e.g. 'the last session that talks about frontend')."
- `session_send`: "Send a direct message (DM) to another OpenCode session.
  Use it when the user asks to talk to another session (e.g. 'ask the
  frontend session to...', 'tell weekly-digest ...'). Only send a DM if the
  user asks for it or if another agent has explicitly asked you to reply. Do
  not automatically reply to a received DM unless the message contains a
  question or a request for you."

## 6. Error handling

| Case | Behavior |
|---|---|
| Target session missing | Clear error: "Session not found. Use session_search." + list of the 5 most recent sessions |
| Ambiguous title (2+ sessions) | Returns the candidate list (title, id, last-updated date): the agent narrows it down |
| Search with no results | Empty array + "no session matches" |
| Target session busy | Standard server behavior: the DM is added to the transcript and will be processed |
| Network failure / server down | Error returned to the tool → the agent can retry |

## 7. Test & verification

1. **Build**: `tsc --noEmit` (or LSP) on `dm.ts`: clean types, zero `any`
2. **Manual test**:
   - Open 2 sessions in the project, rename via `/title` (`user-profiles`, `weekly-digest`)
   - Session A: "ask the weekly-digest session to update the SQL of weeklyDigest.ts: users.name → users.display_name"
   - Verify: A calls `session_search` then `session_send`; the message appears
     in B with the `@user-profiles` prefix; B reacts and modifies the file
   - Verify the cases: ambiguous title, session not found
3. **Loading**: `.opencode/plugin/dm.ts` auto-loaded by OpenCode 1.18.18

## 8. Out of scope (future)

- v2 entry point (`Plugin.define` + `ctx.session`): docs ahead of published types
- Stable alias registry
- `/tell` slash command
- Incoming DM logging (observability)
- Sessions on different servers (multi-project)
