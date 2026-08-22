import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { crmEventService } from "./crmEventService";

export type CrmChannel =
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "web"
  | string;

export interface WorkspaceCrmCustomerInput {
  channel: CrmChannel;
  externalCustomerId: string;
  name?: string;
  phone?: string;
  email?: string;
  sessionId?: string;
  conversationId?: string;
}

function clean(value: any): string {
  return String(value ?? "").trim();
}

function normalizePhone(value: string): string {
  return clean(value).replace(/[^\d+]/g, "");
}

function buildLeadId(
  channel: string,
  externalCustomerId: string
): string {
  const safeChannel =
    clean(channel).toLowerCase() || "unknown";

  const safeCustomer =
    clean(externalCustomerId)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 120);

  return `${safeChannel}_${safeCustomer}`;
}


function extractPhoneFromMessage(message: string): string {
  const text = clean(message);

  const matches =
    text.match(
      /(?:\+?20[\s-]?)?0?1[0125](?:[\s-]?\d){8}/g
    ) || [];

  if (!matches.length) {
    return "";
  }

  let phone = matches[0]
    .replace(/[\s-]/g, "")
    .trim();

  if (phone.startsWith("+20")) {
    phone = "0" + phone.slice(3);
  } else if (
    phone.startsWith("20") &&
    phone.length === 12
  ) {
    phone = "0" + phone.slice(2);
  }

  return phone;
}

function detectCustomerIntent(message: string): {
  intent: string;
  tag?: string;
  shouldPromoteToProspect: boolean;
} {
  const text = clean(message).toLowerCase();

  const bookingWords = [
    "حجز",
    "احجز",
    "أحجز",
    "ميعاد",
    "موعد",
    "appointment",
    "book",
    "booking",
  ];

  const priceWords = [
    "سعر",
    "الاسعار",
    "الأسعار",
    "بكام",
    "تكلفة",
    "price",
    "pricing",
    "cost",
  ];

  const orderWords = [
    "عاوز اشتري",
    "عايز اشتري",
    "شراء",
    "اطلب",
    "أطلب",
    "اوردر",
    "أوردر",
    "order",
    "buy",
  ];

  const complaintWords = [
    "شكوى",
    "مشكلة",
    "مش عاجبني",
    "سيء",
    "وحش",
    "complaint",
    "problem",
  ];

  if (
    bookingWords.some((word) =>
      text.includes(word)
    )
  ) {
    return {
      intent: "booking",
      tag: "booking_interest",
      shouldPromoteToProspect: true,
    };
  }

  if (
    orderWords.some((word) =>
      text.includes(word)
    )
  ) {
    return {
      intent: "purchase",
      tag: "purchase_interest",
      shouldPromoteToProspect: true,
    };
  }

  if (
    priceWords.some((word) =>
      text.includes(word)
    )
  ) {
    return {
      intent: "pricing",
      tag: "pricing_interest",
      shouldPromoteToProspect: true,
    };
  }

  if (
    complaintWords.some((word) =>
      text.includes(word)
    )
  ) {
    return {
      intent: "complaint",
      tag: "complaint",
      shouldPromoteToProspect: false,
    };
  }

  return {
    intent: "general",
    shouldPromoteToProspect: false,
  };
}

export const workspaceCrmService = {
  async upsertChannelCustomer(
    workspaceId: string,
    input: WorkspaceCrmCustomerInput
  ) {
    const cleanWorkspaceId = clean(workspaceId);
    const channel = clean(input.channel).toLowerCase();
    const externalCustomerId = clean(
      input.externalCustomerId
    );

    if (!cleanWorkspaceId) {
      throw new Error("workspaceId is required");
    }

    if (!channel) {
      throw new Error("CRM channel is required");
    }

    if (!externalCustomerId) {
      throw new Error(
        "CRM externalCustomerId is required"
      );
    }

    const leadId = buildLeadId(
      channel,
      externalCustomerId
    );

    const leadRef = adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("crmLeads")
      .doc(leadId);

    const snapshot = await leadRef.get();

    const now = new Date().toISOString();

    const name =
      clean(input.name) ||
      (channel === "telegram"
        ? "Telegram Customer"
        : channel === "whatsapp"
        ? "WhatsApp Customer"
        : "Customer");

    const phone = normalizePhone(
      input.phone || ""
    );

    if (snapshot.exists) {
      const existing: any =
        snapshot.data() || {};

      const updates: any = {
        workspaceId: cleanWorkspaceId,
        channel,
        externalCustomerId,
        lastInteraction: now,
        updatedAt: now,
      };

      if (
        name &&
        (
          !existing.name ||
          existing.name === "Telegram Customer" ||
          existing.name === "WhatsApp Customer" ||
          existing.name === "Customer"
        )
      ) {
        updates.name = name;
      }

      if (phone && !existing.phone) {
        updates.phone = phone;
        updates.phoneNormalized = phone;
      }

      if (
        clean(input.email) &&
        !existing.email
      ) {
        updates.email = clean(input.email);
      }

      if (clean(input.sessionId)) {
        updates.sessionId =
          clean(input.sessionId);
      }

      if (clean(input.conversationId)) {
        updates.conversationId =
          clean(input.conversationId);
      }

      await leadRef.set(
        updates,
        { merge: true }
      );

      const updated =
        await leadRef.get();

      return {
        created: false,
        lead: {
          id: leadId,
          ...(updated.data() || {}),
        },
      };
    }

    const lead = {
      id: leadId,
      workspaceId: cleanWorkspaceId,

      name,
      phone,
      email: clean(input.email),

      channel,
      externalCustomerId,

      sessionId:
        clean(input.sessionId) || null,

      conversationId:
        clean(input.conversationId) || null,

      status: "Lead",

      tags: [
        "ai_agent",
        channel,
      ],

      notes: "",

      totalSpentEGP: 0,

      source: "ai_agent",

      createdAt: now,
      updatedAt: now,
      lastInteraction: now,
    };

    await leadRef.set(lead);

    console.log(
      `👤 [FOX CRM] New customer | Workspace=${cleanWorkspaceId} | Lead=${leadId} | Channel=${channel}`
    );

    return {
      created: true,
      lead,
    };
  },

  async enrichLeadFromMessage(
    workspaceId: string,
    leadId: string,
    message: string
  ) {
    const cleanWorkspaceId =
      clean(workspaceId);

    const cleanLeadId =
      clean(leadId);

    const cleanMessage =
      clean(message);

    if (
      !cleanWorkspaceId ||
      !cleanLeadId ||
      !cleanMessage
    ) {
      return null;
    }

    const ref = adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("crmLeads")
      .doc(cleanLeadId);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return null;
    }

    const current: any =
      snapshot.data() || {};

    const detectedPhone =
      extractPhoneFromMessage(
        cleanMessage
      );

    const intent =
      detectCustomerIntent(
        cleanMessage
      );

    const now =
      new Date().toISOString();

    const updates: any = {
      lastInteraction: now,
      updatedAt: now,
      lastMessage: cleanMessage,
      lastIntent: intent.intent,
    };

    if (
      detectedPhone &&
      detectedPhone !== current.phone
    ) {
      updates.phone =
        detectedPhone;

      updates.phoneNormalized =
        normalizePhone(
          detectedPhone
        );

      updates.phoneCapturedAt =
        now;
    }

    if (intent.tag) {
      updates.tags =
        FieldValue.arrayUnion(
          intent.tag
        );
    }

    if (
      intent.shouldPromoteToProspect &&
      (
        !current.status ||
        current.status === "Lead"
      )
    ) {
      updates.status =
        "Prospect";
    }

    await ref.set(
      updates,
      { merge: true }
    );

    // -------------------------------------------------------
    // FOX CRM EVENT: INTENT CHANGED
    // Log only a real transition. Repeated messages with the
    // same intent must not create duplicate journey events.
    // -------------------------------------------------------
    const previousIntent =
      clean(current.lastIntent);

    const nextIntent =
      clean(intent.intent);

    if (
      nextIntent &&
      previousIntent !== nextIntent
    ) {
      try {
        await crmEventService.logIntentChange({
          workspaceId: cleanWorkspaceId,
          leadId: cleanLeadId,
          previousIntent:
            previousIntent || undefined,
          newIntent: nextIntent,
          channel:
            clean(current.channel) ||
            undefined,
          sessionId:
            clean(current.sessionId) ||
            undefined,
          conversationId:
            clean(current.conversationId) ||
            undefined,
        });
      } catch (eventError: any) {
        console.error(
          `❌ [FOX CRM Event Intent] Workspace=${cleanWorkspaceId} | Lead=${cleanLeadId}`,
          eventError?.message || eventError
        );
      }
    }

    console.log(
      `🧠 [FOX CRM Intelligence] Workspace=${cleanWorkspaceId} | Lead=${cleanLeadId} | Intent=${intent.intent} | PhoneCaptured=${Boolean(detectedPhone)}`
    );

    const updated =
      await ref.get();

    return {
      id: updated.id,
      ...updated.data(),
    };
  },

  async markCustomerConverted(
    workspaceId: string,
    leadId: string,
    data: {
      name?: string;
      phone?: string;
      conversionType:
        | "appointment"
        | "sale"
        | "order";
      conversionId?: string;
    }
  ) {
    const cleanWorkspaceId =
      clean(workspaceId);

    const cleanLeadId =
      clean(leadId);

    const ref = adminDb
      .collection("workspaces")
      .doc(cleanWorkspaceId)
      .collection("crmLeads")
      .doc(cleanLeadId);

    const snapshot =
      await ref.get();

    if (!snapshot.exists) {
      return null;
    }

    const now =
      new Date().toISOString();

    const updates: any = {
      status: "Customer",
      lastInteraction: now,
      updatedAt: now,
      convertedAt: now,
      conversionType:
        data.conversionType,
    };

    const customerName =
      clean(data.name);

    const customerPhone =
      normalizePhone(
        data.phone || ""
      );

    if (customerName) {
      updates.name =
        customerName;
    }

    if (customerPhone) {
      updates.phone =
        customerPhone;

      updates.phoneNormalized =
        customerPhone;
    }

    if (
      clean(data.conversionId)
    ) {
      updates.lastConversionId =
        clean(data.conversionId);
    }

    updates.tags =
      FieldValue.arrayUnion(
        "customer",
        `converted_${data.conversionType}`
      );

    await ref.set(
      updates,
      { merge: true }
    );

    console.log(
      `🎯 [FOX CRM Conversion] Workspace=${cleanWorkspaceId} | Lead=${cleanLeadId} | Type=${data.conversionType} | Status=Customer`
    );

    // -------------------------------------------------------
    // FOX CRM EVENT: CONVERSION
    // Only create the event when this conversion has not
    // already been recorded on the lead.
    // -------------------------------------------------------
    const previousConversionId =
      clean((snapshot.data() as any)?.lastConversionId);

    const newConversionId =
      clean(data.conversionId);

    const previousStatus =
      clean((snapshot.data() as any)?.status);

    const shouldLogConversion =
      previousStatus !== "Customer" ||
      (
        newConversionId &&
        previousConversionId !== newConversionId
      );

    if (shouldLogConversion) {
      try {
        await crmEventService.logConversion({
          workspaceId: cleanWorkspaceId,
          leadId: cleanLeadId,
          conversionType:
            data.conversionType,
          sourceId:
            newConversionId || undefined,
          channel:
            clean((snapshot.data() as any)?.channel) ||
            undefined,
          sessionId:
            clean((snapshot.data() as any)?.sessionId) ||
            undefined,
          conversationId:
            clean((snapshot.data() as any)?.conversationId) ||
            undefined,
          metadata: {
            customerName:
              customerName || undefined,
            customerPhone:
              customerPhone || undefined,
          },
        });
      } catch (eventError: any) {
        console.error(
          `❌ [FOX CRM Event Conversion] Workspace=${cleanWorkspaceId} | Lead=${cleanLeadId}`,
          eventError?.message || eventError
        );
      }
    }

    return {
      id: cleanLeadId,
      ...((
        await ref.get()
      ).data() || {}),
    };
  },

  async getLead(
    workspaceId: string,
    leadId: string
  ) {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(clean(workspaceId))
      .collection("crmLeads")
      .doc(clean(leadId))
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  },

  async listLeads(
    workspaceId: string
  ) {
    const snapshot = await adminDb
      .collection("workspaces")
      .doc(clean(workspaceId))
      .collection("crmLeads")
      .orderBy("lastInteraction", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async updateLeadStatus(
    workspaceId: string,
    leadId: string,
    status: "Lead" | "Prospect" | "Customer"
  ) {
    const ref = adminDb
      .collection("workspaces")
      .doc(clean(workspaceId))
      .collection("crmLeads")
      .doc(clean(leadId));

    const snapshot = await ref.get();

    if (!snapshot.exists) {
      throw new Error("CRM lead not found");
    }

    await ref.set(
      {
        status,
        updatedAt:
          new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      success: true,
      status,
    };
  },
};
