import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("follows the OS when set to system", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
  });

  it("keeps explicit palettes", () => {
    expect(resolveTheme("sky", true)).toBe("sky");
    expect(resolveTheme("autumn", false)).toBe("autumn");
  });
});
