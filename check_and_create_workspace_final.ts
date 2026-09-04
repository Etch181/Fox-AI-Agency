
import { adminDb } from "/opt/data/fox-ai-agency/src/services/firebaseAdmin";

async function main() {
  const workspaceId = "ws_fox_ai_agency";
  const docRef = adminDb.collection("workspaces").doc(workspaceId);
  const snap = await docRef.get();
  console.log("BEFORE_EXISTS:", snap.exists);
  if (!snap.exists) {
    await docRef.set({
      id: workspaceId,
      name: "FOX AI Agency",
      metaPageId: "1303288339529348",
      planId: "enterprise",
      status: "active",
      industry: "Small Business",
      ownerName: "Hesham M. (Agency Owner)",
      ownerEmail: "info.hesham.m@gmail.com",
      phone: "+201000000000",
      subscriptionExpiresAt: "2030-12-31",
      aiConversationsUsed: 0,
      creditBalance: 0,
      totalCustomers: 0,
      totalAppointments: 0,
      totalComplaints: 0,
      createdAt: "2026-09-02T00:00:00Z",
      instagramBusinessAccountId: "",
      instagramBotStatus: "pending",
      instagramConnectedAt: "",
      registrationSource: "agency_official",
    });
    console.log("CREATED: true");
  }
  const after = await docRef.get();
  console.log("AFTER_EXISTS:", after.exists);
  console.log("AFTER_META_PAGE_ID:", after.data()?.metaPageId);
  console.log("AFTER_NAME:", after.data()?.name);
  console.log("AFTER_PLAN:", after.data()?.planId);
  console.log("AFTER_STATUS:", after.data()?.status);
}
main();
