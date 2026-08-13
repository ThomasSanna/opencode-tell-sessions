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
} from "../src/helpers";

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
  test("@source prefix", () => {
    expect(formatDM("user-profiles", "users.name → display_name")).toBe(
      "@user-profiles | users.name → display_name",
    );
  });
  test("source title longer than 60 chars is truncated", () => {
    const long = "x".repeat(80);
    expect(formatDM(long, "hi")).toBe(`@${"x".repeat(60)}… | hi`);
  });
  test("title of exactly 60 chars → no truncation", () => {
    const exact = "x".repeat(60);
    expect(formatDM(exact, "hi")).toBe(`@${exact} | hi`);
  });
  test("title of 61 chars → truncated to 60 + ellipsis", () => {
    const long = "x".repeat(61);
    expect(formatDM(long, "hi")).toBe(`@${"x".repeat(60)}… | hi`);
  });
  test("empty or blank source title → message without prefix", () => {
    expect(formatDM("", "hi")).toBe("hi");
    expect(formatDM("   ", "hi")).toBe("hi");
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
