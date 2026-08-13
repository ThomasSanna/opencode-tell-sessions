import { describe, expect, test } from "bun:test";
import { buildSearchResult } from "../src/helpers";

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

  test("truncation at 6000 chars with suffix", () => {
    const hits = Array.from({ length: 50 }, (_, i) => ({
      sessionID: `s${i}`,
      title: `titre ${i}` + "x".repeat(200),
      created: 0,
      updated: i,
    }));
    const out = buildSearchResult(hits);
    expect(out.length).toBeLessThanOrEqual(6000);
    expect(out.endsWith("… (truncated)")).toBe(true);
  });

  test("empty result", () => {
    expect(buildSearchResult([])).toBe("No session matches.");
  });
});
