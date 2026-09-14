import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveAuthorizedWorkspaceSelection } from "../src/utils/workspaceHydration.ts";

const appContextSource = readFileSync(
  new URL("../src/context/AppContext.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const navbarSource = readFileSync(
  new URL("../src/components/Navbar.tsx", import.meta.url),
  "utf8",
);

test("Super Admin restores a valid preferred workspace only after authoritative hydration", () => {
  const workspaces = [{ id: "ws_a" }, { id: "ws_tg_924598" }];
  assert.equal(
    resolveAuthorizedWorkspaceSelection(workspaces, "ws_tg_924598", {
      isSuperAdmin: true,
    }),
    "ws_tg_924598",
  );
  assert.equal(
    resolveAuthorizedWorkspaceSelection(workspaces, "missing", {
      isSuperAdmin: true,
    }),
    "ws_a",
  );
  assert.equal(
    resolveAuthorizedWorkspaceSelection([], "ws_tg_924598", {
      isSuperAdmin: true,
    }),
    "",
  );
});

test("tenant workspace selection can never escape the authenticated profile binding", () => {
  const workspaces = [{ id: "ws_a" }, { id: "ws_b" }];
  assert.equal(
    resolveAuthorizedWorkspaceSelection(workspaces, "ws_b", {
      isSuperAdmin: false,
      userWorkspaceId: "ws_a",
    }),
    "ws_a",
  );
  assert.equal(
    resolveAuthorizedWorkspaceSelection(workspaces, "ws_b", {
      isSuperAdmin: false,
      userWorkspaceId: "missing",
    }),
    "",
  );
});

test("AppContext restores Firebase Auth before workspace hydration and persists selected workspace", () => {
  assert.match(appContextSource, /onAuthStateChanged/);
  assert.match(appContextSource, /authHydrated/);
  assert.match(appContextSource, /workspacesLoading/);
  assert.match(appContextSource, /workspaceDirectoryRefresh/);
  assert.match(appContextSource, /window\.addEventListener\("focus"/);
  assert.match(appContextSource, /fox_current_workspace/);
  assert.match(appContextSource, /resolveAuthorizedWorkspaceSelection/);
  assert.match(appContextSource, /resolveAuthoritativeUserRole/);
  assert.match(appContextSource, /AUTH_PROFILE_ROLE_INVALID/);
  assert.doesNotMatch(
    appContextSource,
    /useState<User \| null>\(\(\) => \{\s*const saved = localStorage\.getItem\("fox_user"\)/,
  );
  assert.doesNotMatch(
    appContextSource,
    /interface AppContextType[\s\S]*?setCurrentUser:/,
  );
  assert.doesNotMatch(appContextSource, /const loginAs\s*=/);
  assert.match(appContextSource, /waitForAuthHydration/);
  assert.match(appContextSource, /RegistrationCoordinator/);
  assert.match(appContextSource, /waitForAuthOperation/);
  assert.match(
    appContextSource,
    /while \(Date\.now\(\) < deadline\) \{\s*if \(!mountedRef\.current\) return null;/,
  );
  assert.doesNotMatch(appContextSource, /attempt < 40/);
  assert.match(
    appContextSource,
    /auth\.currentUser\?\.uid === uid/,
  );
  assert.match(
    appContextSource,
    /auth\.currentUser\?\.uid !== uid &&\s*result\.uid !== uid/,
  );
  assert.match(appContextSource, /deleteUser/);
  assert.match(appContextSource, /registrationBatchCommitted/);
  assert.match(appContextSource, /rollbackCreatedAuthIdentity/);
  assert.match(
    appContextSource,
    /auth\.currentUser\?\.uid === firebaseUser\.uid/,
  );
});

test("application and workspace selector expose hydration instead of transient empty UI", () => {
  assert.match(appSource, /authHydrated/);
  assert.match(appSource, /workspacesLoading/);
  assert.match(appSource, /Restoring secure session/);
  assert.match(appSource, /Loading authorized workspaces/);
  assert.match(navbarSource, /workspacesLoading/);
  assert.match(navbarSource, /Loading workspaces/);
  assert.match(appContextSource, /workspacesError/);
  assert.match(appSource, /resolveAuthorizedView/);
  assert.match(appSource, /fox_active_view/);
  assert.match(
    appSource,
    /default:[\s\S]*?currentUser\.role === "super_admin"[\s\S]*?<ClientDashboard/,
  );
});
