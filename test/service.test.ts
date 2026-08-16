import { describe, expect, test } from "bun:test";
import type { SessionView } from "../src/model";
import type { SessionRuntime } from "../src/runtime";
import { runSearch, runSend } from "../src/service";

const session = (id: string, title: string, updated: number): SessionView => ({
  id,
  directory: "/proj",
  title,
  updated,
});

function makeRuntime(overrides?: Partial<SessionRuntime>): SessionRuntime & {
  sent: Array<{ sessionID: string; text: string }>;
} {
  const sent: Array<{ sessionID: string; text: string }> = [];
  return {
    listSessions: () => Promise.resolve([]),
    messageTexts: () => Promise.resolve([]),
    send: (sessionID, text) => {
      sent.push({ sessionID, text });
      return Promise.resolve();
    },
    ...overrides,
    sent,
  };
}

describe("runSearch", () => {
  const sessions = [
    session("a", "frontend build", 100),
    session("b", "backend api", 200),
  ];

  test("finds by title and shows a recent session without match as a hit", async () => {
    const runtime = makeRuntime({
      listSessions: () => Promise.resolve(sessions),
      messageTexts: () => Promise.resolve(["the backend handles auth"]),
    });
    const out = await runSearch(runtime, { query: "backend" }, "self");
    expect(out).toContain("backend api");
    expect(out).toContain("b");
  });

  test("includes an excerpt when the query appears in content", async () => {
    const runtime = makeRuntime({
      listSessions: () => Promise.resolve(sessions),
      messageTexts: (id) =>
        Promise.resolve([id === "b" ? "we use backend auth tokens" : ""]),
    });
    const out = await runSearch(runtime, { query: "auth" }, "self");
    expect(out).toContain("excerpt");
  });
});

describe("runSend", () => {
  test("resolves target by title and injects a DM", async () => {
    const runtime = makeRuntime({
      listSessions: () =>
        Promise.resolve([session("self", "sender", 0), session("b", "receiver", 1)]),
      messageTexts: () => Promise.resolve([]),
    });
    const out = await runSend(runtime, { target: "receiver", message: "salut" }, "self");
    expect(out).toContain("DM sent");
    expect(out).toContain("receiver");
    expect(runtime.sent).toHaveLength(1);
    expect(runtime.sent[0].sessionID).toBe("b");
    expect(runtime.sent[0].text).toContain("@sender | salut");
  });

  test("refuses to send to itself", async () => {
    const runtime = makeRuntime({
      listSessions: () => Promise.resolve([session("a", "me", 0)]),
    });
    const out = await runSend(runtime, { target: "me", message: "hi" }, "a");
    expect(out).toContain("already in this session");
    expect(runtime.sent).toHaveLength(0);
  });

  test("reports an ambiguous match", async () => {
    const runtime = makeRuntime({
      listSessions: () =>
        Promise.resolve([
          session("a", "frontend build", 0),
          session("c", "frontend auth", 1),
        ]),
    });
    const out = await runSend(runtime, { target: "frontend", message: "hi" }, "self");
    expect(out).toContain("Multiple sessions match");
    expect(runtime.sent).toHaveLength(0);
  });

  test("loop guard blocks past the DM exchange limit", async () => {
    const runtime = makeRuntime({
      listSessions: () =>
        Promise.resolve([session("self", "sender", 0), session("b", "receiver", 1)]),
      messageTexts: (id) =>
        Promise.resolve([
          id === "b"
            ? 'Direct message from session "sender" (id: self). Reply using the session_send tool with target "self".'
            : 'Direct message from session "receiver" (id: b). Reply using the session_send tool with target "b".',
        ].concat(
          Array.from({ length: 9 }, () => "repeated marker line (id: self)"),
        )),
    });
    const out = await runSend(runtime, { target: "receiver", message: "hi" }, "self");
    expect(out).toContain("Loop protection");
    expect(runtime.sent).toHaveLength(0);
  });
});

describe("runSearch limit", () => {
  test("clamps an oversized limit to the tool cap", async () => {
    const sessions = Array.from({ length: 25 }, (_, i) => session(`s${i}`, `t${i}`, i));
    let calls = 0;
    const runtime = makeRuntime({
      listSessions: () => Promise.resolve(sessions),
      messageTexts: () => {
        calls += 1;
        return Promise.resolve([]);
      },
    });
    const out = await runSearch(runtime, { query: "zzz", limit: 999 }, "self");
    expect(calls).toBe(20);
    expect(out.split("\n")).toHaveLength(20);
    expect(out).toContain("[s24] t24");
    expect(out).not.toContain("[s4] t4");
  });

  test("clamps a non-positive limit to 1", async () => {
    const sessions = Array.from({ length: 5 }, (_, i) => session(`s${i}`, `t${i}`, i));
    let calls = 0;
    const runtime = makeRuntime({
      listSessions: () => Promise.resolve(sessions),
      messageTexts: () => {
        calls += 1;
        return Promise.resolve([]);
      },
    });
    const out = await runSearch(runtime, { query: "zzz", limit: -5 }, "self");
    expect(calls).toBe(1);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toContain("[s4] t4");
  });
});
