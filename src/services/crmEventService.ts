import { adminDb } from "./firebaseAdmin";

export type CrmEventType =
  | "intent_changed"
  | "human_takeover"
  | "returned_to_ai"
  | "complaint_created"
  | "appointment_booked"
  | "coupon_redeemed"
  | "rating_submitted"
  | "crm_conversion"
  | "status_changed"
  | "system";

export interface CrmEventInput {
  workspaceId: string;
  leadId: string;
  type: CrmEventType;

  title?: string;
  description?: string;

  channel?: string;
  sessionId?: string;
  conversationId?: string;

  fromValue?: string;
  toValue?: string;

  source?: string;
  sourceId?: string;

  metadata?: Record<string, any>;
}

const clean = (value: any) =>
  String(value ?? "").trim();

const makeEventId = () =>
  `evt_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const removeUndefined = (value: any): any => {
  if (Array.isArray(value)) {
    return value
      .map(removeUndefined)
      .filter((item) => item !== undefined);
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [
          key,
          removeUndefined(item),
        ])
    );
  }

  return value;
};

export const crmEventService = {
  async createEvent(input: CrmEventInput) {
    const workspaceId = clean(input.workspaceId);
    const leadId = clean(input.leadId);

    if (!workspaceId) {
      throw new Error(
        "CRM event workspaceId is required"
      );
    }

    if (!leadId) {
      throw new Error(
        "CRM event leadId is required"
      );
    }

    if (!input.type) {
      throw new Error(
        "CRM event type is required"
      );
    }

    const eventId = makeEventId();
    const now = new Date().toISOString();

    const event = removeUndefined({
      id: eventId,
      workspaceId,
      leadId,

      type: input.type,

      title:
        clean(input.title) ||
        input.type,

      description:
        clean(input.description),

      channel:
        clean(input.channel),

      sessionId:
        clean(input.sessionId),

      conversationId:
        clean(input.conversationId),

      fromValue:
        clean(input.fromValue),

      toValue:
        clean(input.toValue),

      source:
        clean(input.source) ||
        "fox_crm",

      sourceId:
        clean(input.sourceId),

      metadata:
        input.metadata || {},

      createdAt: now,
    });

    await adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("crmLeads")
      .doc(leadId)
      .collection("events")
      .doc(eventId)
      .set(event);

    console.log(
      `🧭 [FOX CRM Event] Workspace=${workspaceId} | Lead=${leadId} | Type=${input.type} | Event=${eventId}`
    );

    return event;
  },

  async logIntentChange(input: {
    workspaceId: string;
    leadId: string;
    previousIntent?: string;
    newIntent: string;
    channel?: string;
    sessionId?: string;
    conversationId?: string;
  }) {
    const previousIntent =
      clean(input.previousIntent);

    const newIntent =
      clean(input.newIntent);

    if (!newIntent) {
      return null;
    }

    if (
      previousIntent &&
      previousIntent === newIntent
    ) {
      return null;
    }

    return this.createEvent({
      workspaceId: input.workspaceId,
      leadId: input.leadId,
      type: "intent_changed",

      title: "Customer Intent Changed",

      description: previousIntent
        ? `${previousIntent} → ${newIntent}`
        : `Intent detected: ${newIntent}`,

      fromValue: previousIntent,
      toValue: newIntent,

      channel: input.channel,
      sessionId: input.sessionId,
      conversationId:
        input.conversationId,

      source: "crm_intelligence",
    });
  },

  async logHumanTakeover(input: {
    workspaceId: string;
    leadId: string;
    channel?: string;
    sessionId?: string;
    conversationId?: string;
  }) {
    return this.createEvent({
      workspaceId: input.workspaceId,
      leadId: input.leadId,
      type: "human_takeover",

      title: "Human Takeover",

      description:
        "Conversation assigned to a human agent.",

      fromValue: "ai",
      toValue: "human",

      channel: input.channel,
      sessionId: input.sessionId,
      conversationId:
        input.conversationId,

      source: "conversation",
    });
  },

  async logReturnToAi(input: {
    workspaceId: string;
    leadId: string;
    channel?: string;
    sessionId?: string;
    conversationId?: string;
  }) {
    return this.createEvent({
      workspaceId: input.workspaceId,
      leadId: input.leadId,
      type: "returned_to_ai",

      title: "Returned To FOX AI",

      description:
        "Conversation returned from human handling to FOX AI.",

      fromValue: "human",
      toValue: "ai",

      channel: input.channel,
      sessionId: input.sessionId,
      conversationId:
        input.conversationId,

      source: "conversation",
    });
  },

  async logConversion(input: {
    workspaceId: string;
    leadId: string;
    conversionType: string;
    sourceId?: string;
    channel?: string;
    sessionId?: string;
    conversationId?: string;
    metadata?: Record<string, any>;
  }) {
    return this.createEvent({
      workspaceId: input.workspaceId,
      leadId: input.leadId,
      type: "crm_conversion",

      title: "CRM Conversion",

      description:
        `Customer converted via ${clean(
          input.conversionType
        ) || "conversion"}.`,

      fromValue: "Prospect",
      toValue: "Customer",

      channel: input.channel,
      sessionId: input.sessionId,
      conversationId:
        input.conversationId,

      source: input.conversionType,
      sourceId: input.sourceId,

      metadata: input.metadata,
    });
  },
};
