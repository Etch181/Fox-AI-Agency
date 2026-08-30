import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatDateKeyInTimeZone,
  formatLocalDateKey,
  isValidDateOnlyKey,
} from "../src/utils/dateOnly.ts";

const calendarSource = readFileSync(
  new URL(
    "../src/components/client/clinic/BookingCalendar.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("local calendar dates retain Aug 30 and Aug 31 without UTC conversion", () => {
  assert.equal(
    formatLocalDateKey(new Date(2026, 7, 30, 23, 30, 0)),
    "2026-08-30",
  );
  assert.equal(
    formatLocalDateKey(new Date(2026, 7, 31, 0, 30, 0)),
    "2026-08-31",
  );
});

test("date-only keys are validated without constructing UTC Date values", () => {
  assert.equal(isValidDateOnlyKey("2026-08-30"), true);
  assert.equal(isValidDateOnlyKey("2026-08-31"), true);
  assert.equal(isValidDateOnlyKey("2026-02-30"), false);
  assert.equal(isValidDateOnlyKey("2026-8-30"), false);
});

test("server business-day comparisons use the configured Cairo calendar day", () => {
  const boundary = new Date("2026-08-29T22:30:00.000Z");
  assert.equal(
    formatDateKeyInTimeZone(boundary, "Africa/Cairo"),
    "2026-08-30",
  );
  assert.equal(
    formatDateKeyInTimeZone(boundary, "America/Los_Angeles"),
    "2026-08-29",
  );
});

test("BookingCalendar compares persisted appointment dates to local date-only keys", () => {
  assert.match(calendarSource, /formatLocalDateKey/);
  assert.match(calendarSource, /a\.date === selectedDateKey/);
  assert.doesNotMatch(
    calendarSource,
    /selectedDate\.toISOString\(\)/,
  );
  assert.doesNotMatch(
    calendarSource,
    /new Date\(\s*(?:appointment|apt|a)\.date\s*\)/,
  );
});
