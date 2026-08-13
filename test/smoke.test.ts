import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("le module exporte le plugin (named + default)", () => {
    expect(typeof named).toBe("function");
    expect(plugin).toBe(named);
  });
});
