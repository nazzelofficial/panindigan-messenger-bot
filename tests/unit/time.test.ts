import { describe, expect, it } from "vitest";
import { zonedDateTimeToEpoch, formatDateTime, formatDuration } from "../../src/utils/time.js";
import { isValidTimeZone, parseCron, cronMatches } from "../../src/utils/timezone.js";

describe("time utilities", () => {
  it("validates IANA timezones", () => {
    expect(isValidTimeZone("Asia/Manila")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it("converts Asia/Manila wall time to the correct UTC instant", () => {
    const epoch = zonedDateTimeToEpoch("2026-12-01", "22:00", "Asia/Manila");
    expect(new Date(epoch).toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });

  it("supports schedules crossing midnight", () => {
    const start = zonedDateTimeToEpoch("2026-12-01", "22:00", "Asia/Manila");
    const end = zonedDateTimeToEpoch("2026-12-02", "01:00", "Asia/Manila");
    expect(end - start).toBe(3 * 60 * 60 * 1000);
    expect(formatDateTime(end, "Asia/Manila")).toContain("December 2, 2026");
  });

  it("rejects invalid calendar dates and times", () => {
    expect(() => zonedDateTimeToEpoch("2026-02-30", "10:00")).toThrow();
    expect(() => zonedDateTimeToEpoch("2026-12-01", "25:00")).toThrow();
  });

  it("formats durations", () => {
    expect(formatDuration(5 * 60 * 60 * 1000)).toBe("5 hours");
    expect(formatDuration(90 * 60 * 1000)).toBe("1 hour 30 minutes");
  });

  it("matches a five-field cron expression", () => {
    const schedule = parseCron("0 22 * * *");
    expect(
      cronMatches(
        schedule,
        zonedDateTimeToEpoch("2026-12-01", "22:00", "Asia/Manila"),
        "Asia/Manila",
      ),
    ).toBe(true);
    expect(
      cronMatches(
        schedule,
        zonedDateTimeToEpoch("2026-12-01", "21:00", "Asia/Manila"),
        "Asia/Manila",
      ),
    ).toBe(false);
  });
});
