import { describe, expect, it } from "vitest";
import { calendarDate, formatWeekday } from "./format";

describe("formatWeekday", () => {
  it("labels a date-only day as Today without UTC shifting to yesterday", () => {
    expect(formatWeekday("2026-09-18", "America/Detroit", "2026-09-18T15:00:00-04:00")).toBe(
      "Today",
    );
  });

  it("does not call a previous calendar day Today", () => {
    const label = formatWeekday("2026-09-17", "America/Detroit", "2026-09-18T08:00:00-04:00");
    expect(label).not.toBe("Today");
    expect(label).not.toBe("Tomorrow");
  });

  it("labels the next calendar day Tomorrow", () => {
    expect(formatWeekday("2026-09-19", "America/Detroit", "2026-09-18T22:00:00-04:00")).toBe(
      "Tomorrow",
    );
  });
});

describe("calendarDate", () => {
  it("keeps YYYY-MM-DD strings intact", () => {
    expect(calendarDate("2026-09-18", "America/Detroit")).toBe("2026-09-18");
  });
});
