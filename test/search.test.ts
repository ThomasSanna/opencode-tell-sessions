import { describe, expect, test } from "bun:test";
import { buildSearchResult } from "../src/helpers";

describe("buildSearchResult", () => {
  test("liste lisible avec excerpt optionnel", () => {
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

  test("truncation à 6000 chars avec suffixe", () => {
    const hits = Array.from({ length: 50 }, (_, i) => ({
      sessionID: `s${i}`,
      title: `titre ${i}` + "x".repeat(200),
      created: 0,
      updated: i,
    }));
    const out = buildSearchResult(hits);
    expect(out.length).toBeLessThanOrEqual(6000);
    expect(out.endsWith("… (tronqué)")).toBe(true);
  });

  test("résultat vide", () => {
    expect(buildSearchResult([])).toBe("Aucune session ne correspond.");
  });
});
