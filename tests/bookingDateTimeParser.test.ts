import assert from "node:assert/strict";
import test from "node:test";

import {
  hasBookingDateSignal,
  hasBookingTimeSignal,
  parseBookingDateTime,
  parseBookingIdentity,
} from "../src/services/bookingDateTimeParser.ts";

const NOW = new Date("2026-08-29T12:00:00.000Z");

test("parses Arabic tomorrow with clinic-default bare 1-7 time as PM", () => {
  assert.deepEqual(
    parseBookingDateTime("عاوز أحجز كشف بكرة الساعة 5", NOW),
    { date: "2026-08-30", time: "05:00 PM" },
  );
});

test("parses alternate Arabic tomorrow spelling with explicit morning", () => {
  assert.deepEqual(
    parseBookingDateTime("احجزلي بكره الساعة 10 صباحا", NOW),
    { date: "2026-08-30", time: "10:00 AM" },
  );
});

test("parses Arabic calendar date with explicit evening", () => {
  assert.deepEqual(
    parseBookingDateTime("عاوز احجز 30 أغسطس الساعة 3 مساء", NOW),
    { date: "2026-08-30", time: "03:00 PM" },
  );
});

test("parses English tomorrow with explicit PM", () => {
  assert.deepEqual(
    parseBookingDateTime("Book appointment tomorrow at 5 PM", NOW),
    { date: "2026-08-30", time: "05:00 PM" },
  );
});

test("parses explicit ISO date and minute-bearing PM time", () => {
  assert.deepEqual(
    parseBookingDateTime("2026-09-02 at 5:30 PM", NOW),
    { date: "2026-09-02", time: "05:30 PM" },
  );
});

test("clinic default maps Arabic bare 8-12 to AM without overriding explicit periods", () => {
  assert.equal(parseBookingDateTime("غداً الساعة 8", NOW).time, "08:00 AM");
  assert.equal(parseBookingDateTime("غدا الساعة 1 صباحا", NOW).time, "01:00 AM");
  assert.equal(parseBookingDateTime("غدا الساعة 10 مساء", NOW).time, "10:00 PM");
  assert.equal(parseBookingDateTime("غدا الساعة 5:30 مساء", NOW).time, "05:30 PM");
});

test("date and time signal guards recognize all supported forms", () => {
  for (const value of ["بكرة", "بكره", "غدا", "غداً", "2026-09-02", "30 أغسطس", "tomorrow"]) {
    assert.equal(hasBookingDateSignal(value), true, value);
  }
  for (const value of ["الساعة 5", "الساعة 5 مساء", "الساعة 10 صباحا", "5 PM", "5:30 PM", "at 5 PM"]) {
    assert.equal(hasBookingTimeSignal(value), true, value);
  }
});

test("parses follow-up customer name and phone from one message", () => {
  assert.deepEqual(parseBookingIdentity("hesham 01555193491"), {
    name: "hesham",
    phone: "01555193491",
  });
});
