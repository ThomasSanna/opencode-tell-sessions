import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("the module exports the V1 plugin function", () => {
    expect(typeof named).toBe("function");
  });
  test("the default export is the V2 plugin (id + setup)", () => {
    expect(plugin).toBeDefined();
    expect(typeof plugin.id).toBe("string");
    expect(typeof plugin.setup).toBe("function");
  });
  test("V1 and V2 plugins are distinct exports", () => {
    expect(plugin).not.toBe(named);
  });
});
