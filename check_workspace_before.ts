
import { adminDb } from "./src/services/firebaseAdmin";

async function checkWorkspace() {
  const docRef = adminDb.collection("workspaces").doc("ws_fox_ai_agency");
  const snap = await docRef.get();
  console.log("WORKSPACE_EXISTS_BEFORE:", snap.exists);
  if (snap.exists) {
    const data = snap.data() || {};
    console.log("META_PAGE_ID:", data.metaPageId);
    console.log("NAME:", data.name);
  } else {
    console.log("META_PAGE_ID: NONE");
    console.log("NAME: NONE");
  }

  // Check if metaPageId 1303288339529348 exists in any workspace
  const querySnap = await adminDb.collection("workspaces").where("metaPageId", "==", "1303288339529348").get();
  if (querySnap.empty) {
    console.log("PAGE_MAPPED: NO");
  } else {
    querySnap.forEach((d) => {
      console.log("PAGE_MAPPED: YES workspace=", d.id, "name=", d.data()?.name);
    });
  }
}

checkWorkspace();
