import { describe, expect, it } from "vitest";
import {
  newPasswordError,
  PASSWORD_MIN_LENGTH,
} from "../src/lib/password-policy";

describe("new single-factor password policy", () => {
  it("requires fifteen characters without arbitrary composition rules", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(15);
    expect(newPasswordError("a".repeat(14))).toContain("at least 15");
    expect(newPasswordError("a".repeat(15))).toBeNull();
    expect(newPasswordError("a long passphrase with spaces")).toBeNull();
    expect(newPasswordError("  a long passphrase  ")).toBeNull();
  });
  it("counts Unicode code points and never truncates passwords", () => {
    expect(newPasswordError("🚚".repeat(14))).toContain("at least 15");
    expect(newPasswordError("🚚".repeat(15))).toBeNull();
    expect(newPasswordError("x".repeat(128))).toBeNull();
    expect(newPasswordError("x".repeat(129))).toContain("no more than 128");
  });
});
