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
  test("liste lisible avec id, titre et date", () => {
    const out = describeCandidates([session("a", "frontend build", 100)]);
    expect(out).toContain("a");
    expect(out).toContain("frontend build");
    expect(out).toContain("1970-01-01T00:00:00.100Z");
  });
  test("vide → message dédié", () => {
    expect(describeCandidates([])).toBe("Aucune session ne correspond.");
  });
});

describe("listRecentHint", () => {
  test("top 5 avec titre et id", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => session(`s${i}`, `t${i}`, i));
    const out = listRecentHint(sessions);
    expect(out).toContain("s5");
    expect(out).toContain("s1");
    expect(out).not.toContain("s0");
  });
});
