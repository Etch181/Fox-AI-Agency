import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appContextSource = readFileSync(
  new URL("../src/context/AppContext.tsx", import.meta.url),
  "utf8",
);
const crmSource = readFileSync(
  new URL("../src/components/client/ClientCRM.tsx", import.meta.url),
  "utf8",
);
const calendarSource = readFileSync(
  new URL(
    "../src/components/client/clinic/BookingCalendar.tsx",
    import.meta.url,
  ),
  "utf8",
);
const appointmentTableSource = readFileSync(
  new URL(
    "../src/components/client/ClientAppointments.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("AppContext hydrates CRM and appointments only from selected workspace nested collections", () => {
  assert.match(
    appContextSource,
    /"workspaces",\s*currentWorkspace\.id,\s*"crmLeads"/,
  );
  assert.match(
    appContextSource,
    /"workspaces",\s*currentWorkspace\.id,\s*"appointments"/,
  );
  assert.doesNotMatch(
    appContextSource,
    /useCollectionSync\("crmLeads"/,
  );
  assert.doesNotMatch(
    appContextSource,
    /useCollectionSync\("appointments"/,
  );
  assert.doesNotMatch(
    appContextSource,
    /localStorage\.getItem\("fox_(?:leads|apts)"\)/,
  );
  assert.match(appContextSource, /crmLeadsLoading/);
  assert.match(appContextSource, /\.\.\.snapshotDoc\.data\(\),\s*id: snapshotDoc\.id/);
  assert.match(appContextSource, /appointmentsLoading/);
  assert.match(
    appContextSource,
    /where\("workspaceId",\s*"==",\s*currentWorkspace\.id\)/,
  );
  assert.doesNotMatch(appContextSource, /INITIAL_CRM_LEADS/);
  assert.doesNotMatch(appContextSource, /INITIAL_APPOINTMENTS/);
});

test("ClientCRM waits for workspace hydration, uses nested scope without composite-index dependency, and exposes errors", () => {
  assert.match(crmSource, /workspacesLoading/);
  assert.match(crmSource, /crmSubscriptionError/);
  assert.match(crmSource, /"workspaces",\s*currentWorkspace\.id,\s*"crmLeads"/);
  assert.doesNotMatch(crmSource, /orderBy\("lastInteraction"/);
  assert.doesNotMatch(
    crmSource,
    /useState<CustomerLead\[\]>\(\[\]\)/,
  );
  assert.match(crmSource, /CRM data could not be loaded/);
});

test("clinic calendar renders appointment loading separately from a genuine empty day", () => {
  assert.match(calendarSource, /appointmentsLoading/);
  assert.match(calendarSource, /Loading appointments/);
  assert.match(
    calendarSource,
    /!appointmentsLoading && !appointmentsError && selectedDayApts\.length === 0/,
  );
});

test("AppContext writes nested tenant CRM and appointments before compatibility mirrors", () => {
  const actions = appContextSource.slice(
    appContextSource.indexOf("const addCustomerLead"),
    appContextSource.indexOf("const addMenuItem"),
  );

  const nestedLead = actions.search(
    /"workspaces",\s*targetWsId,\s*"crmLeads",\s*newLead\.id/,
  );
  const rootLead = actions.indexOf(
    'doc(db, "crmLeads", newLead.id)',
  );
  const nestedAppointment = actions.search(
    /"workspaces",\s*targetWsId,\s*"appointments",\s*newApt\.id/,
  );
  const rootAppointment = actions.indexOf(
    'doc(db, "appointments", newApt.id)',
  );

  assert.ok(nestedLead >= 0 && nestedLead < rootLead);
  assert.ok(
    nestedAppointment >= 0 && nestedAppointment < rootAppointment,
  );
  assert.match(actions, /compatibility-only/);
  assert.match(actions, /const addCustomerLead = async/);
  assert.match(actions, /const addAppointment = async/);
  assert.match(actions, /await setDoc\([\s\S]*?"crmLeads"/);
  assert.match(actions, /await setDoc\([\s\S]*?"appointments"/);
  assert.doesNotMatch(
    actions,
    /setCrmLeads\(\(prev\) => \[newLead, \.\.\.prev\]\)/,
  );
  assert.doesNotMatch(
    actions,
    /setAppointments\(\(prev\) => \[newApt, \.\.\.prev\]\)/,
  );
});

test("appointment table distinguishes hydration, errors, and genuine empty results", () => {
  assert.match(appointmentTableSource, /appointmentsLoading/);
  assert.match(appointmentTableSource, /appointmentsError/);
  assert.match(appointmentTableSource, /Loading appointments/);
  assert.match(appointmentTableSource, /No appointments yet/);
  assert.match(
    appointmentTableSource,
    /!appointmentsLoading && !appointmentsError && workspaceApts\.length === 0/,
  );
});

test("CRM local interaction state is reset by remounting on workspace changes", () => {
  assert.match(
    crmSource,
    /<HydratedClientCRM key=\{currentWorkspace\.id\}/,
  );
});

test("appointment form awaits authoritative persistence before clearing", () => {
  assert.match(appointmentTableSource, /const success = await addAppointment/);
  assert.match(appointmentTableSource, /if \(!success\) return/);
});

test("workspace switching synchronously enters CRM and appointment loading states", () => {
  const start = appContextSource.indexOf("const setCurrentWorkspaceId =");
  const end = appContextSource.indexOf("useEffect(() =>", start);
  const transition = appContextSource.slice(start, end);
  const selectIndex = transition.indexOf("setCurrentWorkspaceIdState(id)");

  assert.ok(transition.indexOf("setCrmLeadsLoading(true)") >= 0);
  assert.ok(transition.indexOf("setAppointmentsLoading(true)") >= 0);
  assert.ok(transition.indexOf("setCrmLeads([])") < selectIndex);
  assert.ok(transition.indexOf("setAppointments([])") < selectIndex);
  assert.ok(transition.indexOf("setCrmLeadsLoading(true)") < selectIndex);
  assert.ok(transition.indexOf("setAppointmentsLoading(true)") < selectIndex);
});

test("reselecting the current workspace preserves live hydration instead of clearing it", () => {
  const start = appContextSource.indexOf("const setCurrentWorkspaceId = (id: string)");
  const end = appContextSource.indexOf("useEffect(() =>", start);
  const setter = appContextSource.slice(start, end);
  assert.match(setter, /if \(id === currentWorkspaceId\) return;/);
});
