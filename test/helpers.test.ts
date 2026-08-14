import { describe, expect, test } from "bun:test";
import {
  collectText,
  countInboundDMs,
  cropExcerpt,
  DM_EXCHANGE_LIMIT,
  formatDM,
  recentSessions,
  resolveTarget,
  searchByTitle,
  fmtTime,
  type SessionView,
} from "../src/helpers";

const session = (id: string, title: string, updated: number): SessionView => ({
  id,
  directory: "/proj",
  title,
  updated,
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

  test("empty or blank target → not-found", () => {
    expect(resolveTarget(sessions, "  ").kind).toBe("not-found");
    expect(resolveTarget(sessions, "").kind).toBe("not-found");
  });

  test("target = sender → self", () => {
    const r = resolveTarget(sessions, "backend api", "b");
    expect(r.kind).toBe("self");
  });
});

describe("formatDM", () => {
  const block = (title: string, id: string) =>
    `Direct message from session "${title}" (id: ${id}). ` +
    `Reply to the sender using the session_send tool with target "${id}" ` +
    `(or title "${title}") and your answer as the message. ` +
    `Reply only when needed — if either side has already gotten what it wanted ` +
    `from the exchange, let the conversation end there. ` +
    `If you are replying, do not answer this message normally in this session.`;

  test("@source prefix + reply instructions", () => {
    expect(formatDM("user-profiles", "users.name → display_name", "s1")).toBe(
      `@user-profiles | users.name → display_name\n\n---\n\n${block("user-profiles", "s1")}`,
    );
  });
  test("source title longer than 60 chars → truncated prefix, full title kept in the block", () => {
    const long = "x".repeat(80);
    expect(formatDM(long, "hi", "s1")).toBe(
      `@${"x".repeat(60)}… | hi\n\n---\n\n${block(long, "s1")}`,
    );
  });
  test("title of exactly 60 chars → no truncation", () => {
    const exact = "x".repeat(60);
    expect(formatDM(exact, "hi", "s1")).toBe(
      `@${exact} | hi\n\n---\n\n${block(exact, "s1")}`,
    );
  });
  test("title of 61 chars → truncated to 60 + ellipsis in the prefix", () => {
    const long = "x".repeat(61);
    expect(formatDM(long, "hi", "s1")).toBe(
      `@${"x".repeat(60)}… | hi\n\n---\n\n${block(long, "s1")}`,
    );
  });
  test("empty or blank source title → message without prefix, block uses the sender id", () => {
    expect(formatDM("", "hi", "s1")).toBe(`hi\n\n---\n\n${block("s1", "s1")}`);
    expect(formatDM("   ", "hi", "s2")).toContain('session "s2" (id: s2)');
  });
  test("empty or blank sender id → prefix only, no instructions", () => {
    expect(formatDM("user-profiles", "hi", "")).toBe("@user-profiles | hi");
    expect(formatDM("user-profiles", "hi", "   ")).toBe("@user-profiles | hi");
    expect(formatDM("", "hi", "")).toBe("hi");
  });
});

describe("countInboundDMs", () => {
  const dm = (id: string) =>
    `Direct message from session "X" (id: ${id}). Reply to the sender using the session_send tool with target "${id}".`;

  test("counts texts carrying the sender marker", () => {
    const texts = [dm("ses_a"), dm("ses_b"), "plain user message"];
    expect(countInboundDMs(texts, "ses_a")).toBe(1);
    expect(countInboundDMs(texts, "ses_b")).toBe(1);
    expect(countInboundDMs(texts, "ses_c")).toBe(0);
  });

  test("empty or missing entries → 0", () => {
    expect(countInboundDMs([], "ses_a")).toBe(0);
    expect(countInboundDMs(["", "plain"], "ses_a")).toBe(0);
  });

  test("DM_EXCHANGE_LIMIT is a positive cap", () => {
    expect(DM_EXCHANGE_LIMIT).toBeGreaterThan(0);
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
    expect(cropExcerpt("frontend ici", "frontend", 300)).toBe("frontend ici");
  });
  test("query at the start of the text → excerpt from the start", () => {
    const text = "frontend" + "b".repeat(50);
    const ex = cropExcerpt(text, "frontend", 30);
    expect(ex).toContain("frontend");
    expect(ex!.length).toBeLessThanOrEqual(30);
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
  test("text part without text field → ignored", () => {
    const parts = [
      { type: "text" },
      { type: "text", text: "ok" },
    ];
    expect(collectText(parts)).toBe("ok");
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
