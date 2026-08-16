import { describe, expect, test } from "bun:test";
import { errMsg } from "../src/text";

describe("errMsg", () => {
  test("Error → message", () => {
    expect(errMsg(new Error("boom"))).toBe("boom");
  });
  test("plain string → as-is", () => {
    expect(errMsg("nope")).toBe("nope");
  });
});