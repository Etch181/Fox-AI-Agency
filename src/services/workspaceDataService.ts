import { adminDb } from "./firebaseAdmin";
import {
  formatDateKeyInTimeZone,
  isBusinessDateTimeInPast,
} from "../utils/dateOnly";

function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as T;
  }

  if (
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    const result: Record<string, any> = {};

    for (const [key, item] of Object.entries(value as any)) {
      if (item !== undefined) {
        result[key] = sanitizeForFirestore(item);
      }
    }

    return result as T;
  }

  return value;
}



const collection = (...segments: string[]) => {
  let ref: any = adminDb;

  for (let i = 0; i < segments.length; i++) {
    ref =
      i % 2 === 0
        ? ref.collection(segments[i])
        : ref.doc(segments[i]);
  }

  return ref;
};

const doc = (...segments: string[]) => {
  let ref: any = adminDb;

  for (let i = 0; i < segments.length; i++) {
    ref =
      i % 2 === 0
        ? ref.collection(segments[i])
        : ref.doc(segments[i]);
  }

  return ref;
};

const where = (
  field: string,
  operator: FirebaseFirestore.WhereFilterOp,
  value: any
) => ({
  field,
  operator,
  value,
});

const query = (
  ref: FirebaseFirestore.CollectionReference,
  ...conditions: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: any;
  }>
) => {
  let q: FirebaseFirestore.Query = ref;

  for (const condition of conditions) {
    q = q.where(
      condition.field,
      condition.operator,
      condition.value
    );
  }

  return q;
};

const getDoc = async (
  ref: FirebaseFirestore.DocumentReference
) => ref.get();

const getDocs = async (
  ref: FirebaseFirestore.Query
) => ref.get();

const setDoc = async (
  ref: FirebaseFirestore.DocumentReference,
  data: any,
  options?: { merge?: boolean }
) => {
  if (options?.merge) {
    return ref.set(data, { merge: true });
  }

  return ref.set(data);
};

async function syncRootCrmLeadCompatibility(
  leadId: string,
  lead: Record<string, any>
) {
  try {
    const incomingWorkspaceId = String(lead.workspaceId || "").trim();
    if (!incomingWorkspaceId) return;

    const rootRef = adminDb.collection("crmLeads").doc(leadId);
    const mirrored = await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(rootRef);
      const existingWorkspaceId = String(
        existing.data()?.workspaceId || ""
      ).trim();

      if (
        existing.exists &&
        existingWorkspaceId !== incomingWorkspaceId
      ) {
        return false;
      }

      transaction.set(
        rootRef,
        sanitizeForFirestore(lead),
        { merge: true }
      );
      return true;
    });

    if (!mirrored) {
      console.warn(
        `[FOX CRM] Root compatibility collision skipped for lead ${leadId}`
      );
    }
  } catch (error) {
    console.warn(
      `[FOX CRM] Root compatibility sync failed for lead ${leadId}:`,
      error
    );
  }
}

const updateDoc = async (
  ref: FirebaseFirestore.DocumentReference,
  data: any
) => ref.update(data);

async function syncRootAppointmentCompatibility(
  appointmentId: string,
  data: Record<string, any>,
  operation: "set" | "update"
) {
  try {
    if (operation === "set") {
      await setDoc(
        doc("appointments", appointmentId),
        sanitizeForFirestore(data)
      );
    } else {
      await updateDoc(
        doc("appointments", appointmentId),
        sanitizeForFirestore(data)
      );
    }
  } catch (error) {
    console.warn(
      `[FOX Appointments] Root compatibility sync failed for appointment ${appointmentId}:`,
      error
    );
  }
}


const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const normalizePhone = (phone: string) => {
  let digits = String(phone || "").replace(/\D/g, "");

  // Egypt: +20 11xxxxxxxx -> 011xxxxxxxx
  if (digits.startsWith("20") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  }

  return digits;
};

export const workspaceDataService = {
  async createAppointment(
    workspaceId: string,
    data: {
      customerName: string;
      phone: string;
      date: string;
      time: string;
      channel?: string;
      sessionId?: string;

      // Optional clinic/service identity
      doctorId?: string;
      doctorName?: string;
      specialty?: string;
      serviceId?: string;
      serviceName?: string;

      // Financial snapshot at booking time
      originalAmount?: number;
      couponCode?: string;
      discountAmount?: number;
      finalAmount?: number;
      couponRedemptionId?: string;
    }
  ) {
    const todayISO = formatDateKeyInTimeZone(new Date());

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
      data.date < todayISO ||
      isBusinessDateTimeInPast(data.date, data.time)
    ) {
      throw new Error(
        `Cannot create appointment in the past. Requested=${data.date}, Today=${todayISO}`
      );
    }

    const id = makeId("apt");

    const appointment = sanitizeForFirestore({
      id,
      workspaceId,
      customerName: data.customerName,
      phone: data.phone,
      phoneNormalized: normalizePhone(data.phone),
      date: data.date,
      time: data.time,

      // Dashboard-compatible fields
      patientName: data.customerName,
      patientPhone: data.phone,
      timeSlot: data.time,
      doctorName: data.doctorName || "AI Booking",
      specialty: data.specialty || "General",
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      serviceName: data.serviceName,

      // Immutable financial snapshot for reporting / CRM.
      originalAmount:
        data.originalAmount !== undefined
          ? Number(data.originalAmount)
          : undefined,
      couponCode: data.couponCode,
      discountAmount:
        data.discountAmount !== undefined
          ? Number(data.discountAmount)
          : undefined,
      finalAmount:
        data.finalAmount !== undefined
          ? Number(data.finalAmount)
          : undefined,
      couponRedemptionId: data.couponRedemptionId,

      channel: data.channel || "telegram",
      sessionId: data.sessionId,
      status: "Scheduled",
      source: "ai_agent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const appointmentRef = adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("appointments")
      .doc(id);
    const slotQuery = adminDb
      .collection("workspaces")
      .doc(workspaceId)
      .collection("appointments")
      .where("date", "==", data.date)
      .where("time", "==", data.time);

    // The earlier availability check is advisory. This transaction is the
    // authoritative slot claim and closes the concurrent/delivered-twice race.
    await adminDb.runTransaction(async (transaction) => {
      const slotSnapshot = await transaction.get(slotQuery);
      const activeSlotExists = slotSnapshot.docs.some(
        (snapshotDoc) => snapshotDoc.data()?.status !== "Cancelled"
      );
      if (activeSlotExists) {
        throw new Error("FOX_APPOINTMENT_SLOT_UNAVAILABLE");
      }
      transaction.set(appointmentRef, appointment);
    });

    // Legacy root mirror is compatibility-only. The nested transaction above is
    // authoritative and must remain successful if this mirror is unavailable.
    await syncRootAppointmentCompatibility(id, appointment, "set");

    return appointment;
  },

  async getClinicServices(
    workspaceId: string
  ) {
    const q = query(
      collection( "clinicServices"),
      where("workspaceId", "==", workspaceId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getKnowledgeFacts(
    workspaceId: string
  ) {
    const q = query(
      collection("knowledgeFacts"),
      where("workspaceId", "==", workspaceId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getCoupons(
    workspaceId: string
  ) {
    const q = query(
      collection("coupons"),
      where("workspaceId", "==", workspaceId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getMenuItems(workspaceId: string) {
    const snapshot = await getDocs(query(
      collection("menuItems"),
      where("workspaceId", "==", workspaceId)
    ));
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getMedicines(workspaceId: string) {
    const snapshot = await getDocs(query(
      collection("medicines"),
      where("workspaceId", "==", workspaceId)
    ));
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getProducts(workspaceId: string) {
    const snapshot = await getDocs(query(
      collection("products"),
      where("workspaceId", "==", workspaceId)
    ));
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getCourses(workspaceId: string) {
    const snapshot = await getDocs(query(
      collection("courses"),
      where("workspaceId", "==", workspaceId)
    ));
    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async getDoctors(
    workspaceId: string
  ) {
    const q = query(
      collection( "doctors"),
      where("workspaceId", "==", workspaceId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    })) as any[];
  },

  async updateAppointmentFinancials(
    workspaceId: string,
    appointmentId: string,
    data: {
      originalAmount?: number;
      couponCode?: string;
      discountAmount?: number;
      finalAmount?: number;
      couponRedemptionId?: string;
      serviceId?: string;
      serviceName?: string;
    }
  ) {
    const payload = sanitizeForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(
      doc(
        "workspaces",
        workspaceId,
        "appointments",
        appointmentId
      ),
      payload
    );

    // Legacy root mirror is compatibility-only and cannot fail the nested
    // financial update (for example after a successful coupon redemption).
    await syncRootAppointmentCompatibility(
      appointmentId,
      payload,
      "update"
    );

    return payload;
  },

  async isAppointmentAvailable(
    workspaceId: string,
    date: string,
    time: string
  ) {
    const todayISO = formatDateKeyInTimeZone(new Date());

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date < todayISO ||
      isBusinessDateTimeInPast(date, time)
    ) {
      return false;
    }

    const ref = collection(
      "workspaces",
      workspaceId,
      "appointments"
    );

    const q = query(
      ref,
      where("date", "==", date),
      where("time", "==", time)
    );

    const snapshot = await getDocs(q);

    // A slot is available when there are no ACTIVE bookings.
    // Cancelled appointments must not keep the slot blocked.
    const activeAppointments = snapshot.docs.filter(
      (d) => d.data()?.status !== "Cancelled"
    );

    return activeAppointments.length === 0;
  },

  async upsertLead(
    workspaceId: string,
    data: {
      name: string;
      phone: string;
      channel?: string;
      sessionId?: string;

      // Canonical external identity.
      // Telegram example:
      // externalCustomerId = Telegram chat/user id.
      externalCustomerId?: string;
    }
  ) {
    const ref = collection(
      "workspaces",
      workspaceId,
      "crmLeads"
    );

    const channel =
      String(data.channel || "telegram")
        .trim()
        .toLowerCase();

    const externalCustomerId =
      String(data.externalCustomerId || "")
        .trim();

    const normalizedPhone =
      normalizePhone(data.phone);

    // -------------------------------------------------------
    // 1) Prefer canonical channel identity.
    //
    // Telegram CRM already uses:
    // telegram_<chatId>
    //
    // Reuse that exact customer instead of creating lead_xxx.
    // -------------------------------------------------------
    if (externalCustomerId) {
      const canonicalId =
        `${channel}_${externalCustomerId}`;

      const canonicalRef = doc(
        "workspaces",
        workspaceId,
        "crmLeads",
        canonicalId
      );

      const canonicalSnap =
        await getDoc(canonicalRef);

      if (canonicalSnap.exists) {
        const existingLead: any =
          canonicalSnap.data();

        const updates =
          sanitizeForFirestore({
            name:
              data.name ||
              existingLead.name,
            phone:
              data.phone ||
              existingLead.phone,
            phoneNormalized:
              normalizedPhone ||
              existingLead.phoneNormalized,
            channel,
            sessionId:
              data.sessionId ||
              existingLead.sessionId,
            externalCustomerId,
            updatedAt:
              new Date().toISOString(),
          });

        await setDoc(
          canonicalRef,
          updates,
          { merge: true }
        );

        await syncRootCrmLeadCompatibility(
          canonicalId,
          {
            ...existingLead,
            ...updates,
            id: canonicalId,
            workspaceId,
          }
        );

        return {
          ...existingLead,
          ...updates,
          id: canonicalId,
          workspaceId,
        };
      }
    }

    // -------------------------------------------------------
    // 2) Phone fallback.
    // Search normalized phone first.
    // -------------------------------------------------------
    if (normalizedPhone) {
      const normalizedQuery = query(
        ref,
        where(
          "phoneNormalized",
          "==",
          normalizedPhone
        )
      );

      const normalizedExisting =
        await getDocs(normalizedQuery);

      if (!normalizedExisting.empty) {
        const existingDoc =
          normalizedExisting.docs[0];

        const existingLead: any =
          existingDoc.data();

        const updates =
          sanitizeForFirestore({
            name:
              data.name ||
              existingLead.name,
            phone:
              data.phone ||
              existingLead.phone,
            phoneNormalized:
              normalizedPhone,
            channel:
              channel ||
              existingLead.channel,
            sessionId:
              data.sessionId ||
              existingLead.sessionId,
            externalCustomerId:
              externalCustomerId ||
              existingLead.externalCustomerId,
            updatedAt:
              new Date().toISOString(),
          });

        await setDoc(
          existingDoc.ref,
          updates,
          { merge: true }
        );

        await syncRootCrmLeadCompatibility(
          existingDoc.id,
          {
            ...existingLead,
            ...updates,
            id: existingDoc.id,
            workspaceId,
          }
        );

        return {
          ...existingLead,
          ...updates,
          id: existingDoc.id,
          workspaceId,
        };
      }
    }

    // Compatibility with older leads that only have phone.
    if (data.phone) {
      const legacyQuery = query(
        ref,
        where("phone", "==", data.phone)
      );

      const legacyExisting =
        await getDocs(legacyQuery);

      if (!legacyExisting.empty) {
        const existingDoc =
          legacyExisting.docs[0];

        const existingLead: any =
          existingDoc.data();

        const updates =
          sanitizeForFirestore({
            name:
              data.name ||
              existingLead.name,
            phone: data.phone,
            phoneNormalized:
              normalizedPhone,
            channel,
            sessionId:
              data.sessionId ||
              existingLead.sessionId,
            externalCustomerId:
              externalCustomerId ||
              existingLead.externalCustomerId,
            updatedAt:
              new Date().toISOString(),
          });

        await setDoc(
          existingDoc.ref,
          updates,
          { merge: true }
        );

        await syncRootCrmLeadCompatibility(
          existingDoc.id,
          {
            ...existingLead,
            ...updates,
            id: existingDoc.id,
            workspaceId,
          }
        );

        return {
          ...existingLead,
          ...updates,
          id: existingDoc.id,
          workspaceId,
        };
      }
    }

    // -------------------------------------------------------
    // 3) New customer.
    //
    // If channel identity is known, create the canonical ID
    // immediately. Otherwise use legacy lead_xxx fallback.
    // -------------------------------------------------------
    const id =
      externalCustomerId
        ? `${channel}_${externalCustomerId}`
        : makeId("lead");

    const lead =
      sanitizeForFirestore({
        id,
        workspaceId,
        name: data.name,
        phone: data.phone,
        phoneNormalized:
          normalizedPhone,
        channel,
        sessionId:
          data.sessionId,
        externalCustomerId:
          externalCustomerId ||
          undefined,
        status: "New",
        source: "ai_agent",
        createdAt:
          new Date().toISOString(),
        updatedAt:
          new Date().toISOString(),
      });

    await setDoc(
      doc(
        "workspaces",
        workspaceId,
        "crmLeads",
        id
      ),
      lead
    );

    // Root compatibility used by the current dashboard.
    await syncRootCrmLeadCompatibility(id, lead);

    return lead;
  },

  async getCustomerAppointments(
    workspaceId: string,
    phone: string
  ) {
    const ref = collection(
      "workspaces",
      workspaceId,
      "appointments"
    );

    const normalizedPhone = normalizePhone(phone);

    // New records use phoneNormalized.
    let snapshot = await getDocs(
      query(
        ref,
        where("phoneNormalized", "==", normalizedPhone)
      )
    );

    // Compatibility with older records created before normalization.
    if (snapshot.empty) {
      snapshot = await getDocs(
        query(
          ref,
          where("phone", "==", phone)
        )
      );
    }

    const todayISO = formatDateKeyInTimeZone(new Date());

    return snapshot.docs
      .map((d) => d.data())
      .filter(
        (apt: any) =>
          apt.status !== "Cancelled" &&
          String(apt.date || "") >= todayISO
      )
      .sort((a: any, b: any) =>
        String(a.date || "").localeCompare(
          String(b.date || "")
        )
      );
  },

  async updateAppointment(
    workspaceId: string,
    appointmentId: string,
    updates: {
      date?: string;
      time?: string;
      customerName?: string;
      phone?: string;
      status?: string;
    }
  ) {
    const payload = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    // Tenant source of truth
    await updateDoc(
      doc(
        "workspaces",
        workspaceId,
        "appointments",
        appointmentId
      ),
      payload
    );

    // Compatibility with current dashboard root collection
    try {
      await updateDoc(
        doc( "appointments", appointmentId),
        payload
      );
    } catch (err) {
      console.warn(
        "[FOX CRM] Legacy appointment update sync failed:",
        err
      );
    }

    return {
      success: true,
      appointmentId,
      ...payload,
    };
  },

  async cancelAppointment(
    workspaceId: string,
    appointmentId: string
  ) {
    const updates = sanitizeForFirestore({
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(
      doc( "workspaces", workspaceId, "appointments", appointmentId),
      updates
    );

    // Keep current dashboard root collection synchronized.
    try {
      await updateDoc(
        doc( "appointments", appointmentId),
        updates
      );
    } catch (err) {
      console.warn(
        "[FOX CRM] Legacy appointment cancellation sync failed:",
        err
      );
    }

    return {
      success: true,
      appointmentId,
      status: "Cancelled",
    };
  },

  async getAppointmentsForDate(
    workspaceId: string,
    date: string
  ) {
    const ref = collection(
      "workspaces",
      workspaceId,
      "appointments"
    );

    const q = query(
      ref,
      where("date", "==", date)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((d) => d.data())
      .filter((apt: any) =>
        apt.status !== "Cancelled"
      )
      .sort((a: any, b: any) =>
        String(a.time || "").localeCompare(
          String(b.time || "")
        )
      );
  },

  async saveConversationEvent(
    workspaceId: string,
    sessionId: string,
    data: {
      sender: "user" | "bot";
      text: string;
      channel?: string;
      agentRole?: string;
    }
  ) {
    const id = makeId("msg");

    const event = sanitizeForFirestore({
      id,
      workspaceId,
      sessionId,
      sender: data.sender,
      text: data.text,
      channel: data.channel || "telegram",
      agentRole: data.agentRole,
      createdAt: new Date().toISOString(),
    });

    await setDoc(
      doc( "workspaces", workspaceId, "conversations", id),
      event
    );

    return event;
  },
};
