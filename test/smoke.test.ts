import { describe, expect, test } from "bun:test";
import plugin, { plugin as named } from "../src/index";

describe("smoke", () => {
  test("the module exports the V1 plugin function", () => {
    expect(typeof named).toBe("function");
  });
  test("the default export is the same V1 plugin function", () => {
    expect(plugin).toBe(named);
  });
});