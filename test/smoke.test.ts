import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("the module exports the plugin (named + default)", () => {
    expect(typeof named).toBe("function");
    expect(plugin).toBe(named);
  });
});
