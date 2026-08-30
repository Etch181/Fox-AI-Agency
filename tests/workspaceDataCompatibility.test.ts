import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/services/workspaceDataService.ts", import.meta.url),
  "utf8",
);

test("every CRM lead create or update path mirrors the tenant record to the root UI compatibility collection", () => {
  assert.match(source, /async function syncRootCrmLeadCompatibility/);
  const upsertStart = source.indexOf("async upsertLead(");
  const upsertEnd = source.indexOf("async getCustomerAppointments", upsertStart);
  assert.notEqual(upsertStart, -1);
  assert.notEqual(upsertEnd, -1);
  const upsert = source.slice(upsertStart, upsertEnd);
  const calls = upsert.match(/syncRootCrmLeadCompatibility\(/g) || [];
  assert.equal(calls.length, 4, "canonical, normalized-phone, legacy-phone, and new-lead paths must all sync");
});

test("legacy root compatibility failures never fail an authoritative nested CRM or appointment operation", () => {
  assert.match(
    source,
    /async function syncRootCrmLeadCompatibility[\s\S]*?try \{[\s\S]*?catch \(error\)/,
  );
  assert.match(
    source,
    /async function syncRootAppointmentCompatibility[\s\S]*?try \{[\s\S]*?catch \(error\)/,
  );
  assert.doesNotMatch(
    source,
    /Compatibility collection used by the current dashboard\.[\s\S]*?await updateDoc\(\s*doc\(\s*"appointments"/,
  );
});

test("appointment creation atomically rechecks and claims the tenant slot", () => {
  const createStart = source.indexOf("async createAppointment(");
  const createEnd = source.indexOf("async getClinicServices", createStart);
  const createAppointment = source.slice(createStart, createEnd);

  assert.match(createAppointment, /adminDb\.runTransaction/);
  assert.match(createAppointment, /transaction\.get\(slotQuery\)/);
  assert.match(createAppointment, /status !== "Cancelled"/);
  assert.match(createAppointment, /FOX_APPOINTMENT_SLOT_UNAVAILABLE/);
  assert.match(createAppointment, /transaction\.set\(appointmentRef/);
});
