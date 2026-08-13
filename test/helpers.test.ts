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

  test("UUID direct", () => {
    const r = resolveTarget(sessions, "b");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("titre exact", () => {
    const r = resolveTarget(sessions, "backend api");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("sous-chaîne unique insensible à la casse", () => {
    const r = resolveTarget(sessions, "BACKEND");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") expect(r.session.id).toBe("b");
  });

  test("sous-chaîne ambiguë → candidats", () => {
    const r = resolveTarget(sessions, "frontend");
    expect(r.kind).toBe("ambiguous");
    if (r.kind === "ambiguous") expect(r.candidates.map((s) => s.id).sort()).toEqual(["a", "c"]);
  });

  test("aucun match", () => {
    const r = resolveTarget(sessions, "nope");
    expect(r.kind).toBe("not-found");
  });

  test("target vide ou blanc → not-found", () => {
    expect(resolveTarget(sessions, "  ").kind).toBe("not-found");
    expect(resolveTarget(sessions, "").kind).toBe("not-found");
  });

  test("cible = expéditeur → self", () => {
    const r = resolveTarget(sessions, "backend api", "b");
    expect(r.kind).toBe("self");
  });
});

describe("formatDM", () => {
  test("préfixe @source", () => {
    expect(formatDM("user-profiles", "users.name → display_name")).toBe(
      "@user-profiles | users.name → display_name",
    );
  });
  test("titre source trop long tronqué à 60 chars", () => {
    const long = "x".repeat(80);
    expect(formatDM(long, "hi")).toBe(`@${"x".repeat(60)}… | hi`);
  });
});

describe("cropExcerpt", () => {
  test("extrait autour de la query avec ellipsis", () => {
    const text = "a".repeat(50) + "frontend" + "b".repeat(50);
    const ex = cropExcerpt(text, "frontend", 30);
    expect(ex).toContain("frontend");
    expect(ex!.length).toBeLessThanOrEqual(30);
    expect(ex!.startsWith("…")).toBe(true);
    expect(ex!.endsWith("…")).toBe(true);
  });
  test("pas de match → undefined", () => {
    expect(cropExcerpt("hello world", "zzz")).toBeUndefined();
  });
  test("texte plus court que maxChars → texte entier sans ellipsis", () => {
    expect(cropExcerpt("frontend ici", "frontend", 300)).toBe("frontend ici");
  });
});

describe("collectText", () => {
  test("concatène les parts text non-synthetic", () => {
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
  test("top N par updated desc, exclusion optionnelle", () => {
    expect(recentSessions(sessions, 2).map((s) => s.id)).toEqual(["c", "b"]);
    expect(recentSessions(sessions, 2, "c").map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("searchByTitle", () => {
  const sessions = [
    session("a", "Frontend build", 100),
    session("b", "Backend api", 200),
  ];
  test("sous-chaîne insensible à la casse", () => {
    expect(searchByTitle(sessions, "frontend").map((s) => s.id)).toEqual(["a"]);
    expect(searchByTitle(sessions, "zzz")).toEqual([]);
  });
});

describe("fmtTime", () => {
  test("timestamp → ISO court", () => {
    expect(fmtTime(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
