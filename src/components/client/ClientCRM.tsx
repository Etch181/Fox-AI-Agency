import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext";
import { CustomerLead } from "../../types";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";

import { signInWithGoogleSheets } from "../../services/googleAuthService";
import { createCRMSpreadsheet } from "../../services/googleSheetsService";
import {
  Users,
  Search,
  Plus,
  Filter,
  MessageSquare,
  Phone,
  Mail,
  Download,
  CheckCircle2,
  Clock,
  Send,
  X,
  FileSpreadsheet,
  Brain,
  Target,
  CalendarCheck,
  ExternalLink,
  Activity,
  AlertTriangle,
  Star,
  TicketPercent,
  BadgeCheck,
} from "lucide-react";

type CustomerTimelineItem = {
  id: string;
  type:
    | "customer_message"
    | "ai_message"
    | "human_message"
    | "system_message"
    | "appointment"
    | "complaint"
    | "rating"
    | "coupon";
  title: string;
  description: string;
  createdAt: string;
  sender?: string;
  agentRole?: string;
  status?: string;
};

export const ClientCRM: React.FC = () => {
  const {
    currentWorkspace,
    addToast,
    updateWorkspaceField,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<CustomerLead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Lead state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"WhatsApp" | "Telegram">("WhatsApp");
  const [status, setStatus] = useState<CustomerLead["status"]>("Lead");
  const [notes, setNotes] = useState("");
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [crmLeads, setCrmLeads] = useState<CustomerLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [customerTimeline, setCustomerTimeline] =
    useState<CustomerTimelineItem[]>([]);

  const [timelineLoading, setTimelineLoading] =
    useState(false);

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setCrmLeads([]);
      setLoadingLeads(false);
      return;
    }

    setLoadingLeads(true);

    const ref = collection(
      db,
      "workspaces",
      currentWorkspace.id,
      "crmLeads"
    );

    const q = query(
      ref,
      orderBy("lastInteraction", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((snap) => ({
          id: snap.id,
          ...snap.data(),
        })) as CustomerLead[];

        setCrmLeads(rows);
        setLoadingLeads(false);
      },
      (error) => {
        console.error(
          "[FOX CRM] Live tenant CRM subscription failed:",
          error
        );
        setLoadingLeads(false);
      }
    );

    return unsubscribe;
  }, [currentWorkspace?.id]);

  if (!currentWorkspace) return null;

  const leads = crmLeads.filter(
    (l) => l.workspaceId === currentWorkspace.id
  );

  const filtered = leads.filter((l) => {
    const leadName = l.name || (l as any).customerName || "";
    const leadPhone = l.phone || "";
    const leadEmail = l.email || "";
    const matchesSearch =
      leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leadPhone.includes(searchTerm) ||
      leadEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConnectSheets = async () => {
    try {
      setIsSyncingSheets(true);
      const { accessToken } = await signInWithGoogleSheets();
      const spreadsheetId = await createCRMSpreadsheet(accessToken, currentWorkspace.name);
      
      updateWorkspaceField(currentWorkspace.id, {
        googleSheetsAccessToken: accessToken,
        crmSpreadsheetId: spreadsheetId
      });
      addToast("Successfully connected Google Sheets CRM! ID: " + spreadsheetId, "success");
    } catch (err: any) {
      addToast("Failed to connect Sheets: " + err.message, "error");
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      return;
    }

    const now = new Date().toISOString();

    const id =
      `manual_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

    const lead: CustomerLead = {
      id,
      workspaceId: currentWorkspace.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      channel,
      status,
      tags: [],
      notes: notes.trim(),
      totalSpentEGP: 0,
      createdAt: now,
      lastInteraction: now,
    };

    try {
      await setDoc(
        doc(
          db,
          "workspaces",
          currentWorkspace.id,
          "crmLeads",
          id
        ),
        lead
      );

      addToast(
        "CRM Record created",
        "success"
      );

      setIsAddModalOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");

    } catch (error: any) {
      console.error(
        "[FOX CRM] Manual lead create failed:",
        error
      );

      addToast(
        error?.message ||
          "Failed to create CRM record",
        "error"
      );
    }
  };

  const handleUpdateLeadStatus = async (
    leadId: string,
    nextStatus: CustomerLead["status"]
  ) => {
    try {
      await updateDoc(
        doc(
          db,
          "workspaces",
          currentWorkspace.id,
          "crmLeads",
          leadId
        ),
        {
          status: nextStatus,
          lastInteraction:
            new Date().toISOString(),
        }
      );

      addToast(
        `Lead status set to ${nextStatus}`,
        "info"
      );

    } catch (error: any) {
      console.error(
        "[FOX CRM] Status update failed:",
        error
      );

      addToast(
        error?.message ||
          "Failed to update lead status",
        "error"
      );
    }
  };

  useEffect(() => {
    if (!selectedLead || !currentWorkspace?.id) {
      setCustomerTimeline([]);
      setTimelineLoading(false);
      return;
    }

    const workspaceId = String(currentWorkspace.id);

    const conversationId = String(
      (selectedLead as any).conversationId || ""
    );

    const leadPhone = String(
      selectedLead.phone || ""
    ).replace(/\D/g, "");

    const leadSessionId = String(
      (selectedLead as any).sessionId || ""
    );

    setTimelineLoading(true);

    let messageItems: CustomerTimelineItem[] = [];
    let appointmentItems: CustomerTimelineItem[] = [];
    let complaintItems: CustomerTimelineItem[] = [];
    let ratingItems: CustomerTimelineItem[] = [];
    let couponItems: CustomerTimelineItem[] = [];

    // CRM operational lifecycle events.
    let crmEventItems: CustomerTimelineItem[] = [];

    const publishTimeline = () => {
      const merged = [
        ...messageItems,
        ...appointmentItems,
        ...complaintItems,
        ...ratingItems,
        ...couponItems,
        ...crmEventItems,
      ].sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });

      setCustomerTimeline(merged);
      setTimelineLoading(false);
    };

    const unsubscribers: Array<() => void> = [];

    if (conversationId) {
      const messagesQuery = query(
        collection(
          db,
          "workspaces",
          workspaceId,
          "conversations",
          conversationId,
          "messages"
        ),
        orderBy("createdAt", "asc")
      );

      const unsubscribeMessages = onSnapshot(
        messagesQuery,
        (snapshot) => {
          messageItems = snapshot.docs.map((snapshotDoc) => {
            const data: any = snapshotDoc.data();

            const sender = String(
              data.sender || "system"
            );

            let type: CustomerTimelineItem["type"] =
              "system_message";

            let title = "System Event";

            if (sender === "customer") {
              type = "customer_message";
              title = "Customer Message";
            } else if (sender === "ai") {
              type = "ai_message";
              title = data.agentRole
                ? `FOX AI • ${data.agentRole}`
                : "FOX AI Reply";
            } else if (sender === "human") {
              type = "human_message";
              title = "Human Agent Reply";
            }

            return {
              id: `msg_${snapshotDoc.id}`,
              type,
              title,
              description: String(data.text || ""),
              createdAt: String(data.createdAt || ""),
              sender,
              agentRole: data.agentRole
                ? String(data.agentRole)
                : undefined,
            };
          });

          publishTimeline();
        },
        (error) => {
          console.error(
            "[FOX CRM Timeline] Messages error:",
            error
          );
          publishTimeline();
        }
      );

      unsubscribers.push(unsubscribeMessages);
    }

    const unsubscribeAppointments = onSnapshot(
      collection(
        db,
        "workspaces",
        workspaceId,
        "appointments"
      ),
      (snapshot) => {
        appointmentItems = snapshot.docs
          .map((snapshotDoc) => {
            const data: any = snapshotDoc.data();

            const appointmentPhone = String(
              data.phone ||
              data.patientPhone ||
              ""
            ).replace(/\D/g, "");

            const samePhone =
              Boolean(leadPhone) &&
              Boolean(appointmentPhone) &&
              leadPhone === appointmentPhone;

            const sameSession =
              Boolean(leadSessionId) &&
              Boolean(data.sessionId) &&
              leadSessionId === String(data.sessionId);

            if (!samePhone && !sameSession) {
              return null;
            }

            const date = String(data.date || "");

            const time = String(
              data.time ||
              data.timeSlot ||
              ""
            );

            return {
              id: `appointment_${snapshotDoc.id}`,
              type: "appointment" as const,
              title: "Appointment",
              description: `${date} • ${time}`,
              createdAt: String(
                data.createdAt ||
                data.updatedAt ||
                `${date}T00:00:00`
              ),
              status: String(
                data.status || "Scheduled"
              ),
            };
          })
          .filter(Boolean) as CustomerTimelineItem[];

        publishTimeline();
      },
      (error) => {
        console.error(
          "[FOX CRM Timeline] Appointments error:",
          error
        );
        publishTimeline();
      }
    );

    unsubscribers.push(unsubscribeAppointments);

    // --------------------------------------------------------
    // CUSTOMER COMPLAINTS
    // --------------------------------------------------------
    const complaintsRef = collection(db, "complaints");

    const complaintsQuery = query(
      complaintsRef,
      where("workspaceId", "==", currentWorkspace.id)
    );

    const unsubscribeComplaints = onSnapshot(
      complaintsQuery,
      (snapshot) => {
        const selectedPhone = String(selectedLead.phone || "")
          .replace(/\D/g, "");

        complaintItems = snapshot.docs
          .map((snap) => {
            const data: any = snap.data();

            const complaintPhone = String(
              data.customerPhone ||
              data.phone ||
              ""
            ).replace(/\D/g, "");

            const samePhone =
              selectedPhone &&
              complaintPhone &&
              (
                selectedPhone === complaintPhone ||
                selectedPhone.endsWith(complaintPhone) ||
                complaintPhone.endsWith(selectedPhone)
              );

            const sameSession =
              (selectedLead as any).sessionId &&
              data.sessionId === (selectedLead as any).sessionId;

            const sameLead =
              data.leadId === selectedLead.id ||
              data.customerId === selectedLead.id;

            if (!samePhone && !sameSession && !sameLead) {
              return null;
            }

            return {
              id: `complaint_${snap.id}`,
              type: "complaint" as const,
              title: "Customer Complaint",
              description:
                data.message ||
                data.complaint ||
                data.description ||
                data.text ||
                "Customer complaint received.",
              createdAt:
                data.createdAt ||
                data.updatedAt ||
                new Date(0).toISOString(),
              sender:
                data.customerName ||
                selectedLead.name ||
                "Customer",
              status:
                data.status ||
                data.priority ||
                "Open",
            };
          })
          .filter(Boolean) as CustomerTimelineItem[];

        publishTimeline();
      },
      (error) => {
        console.error(
          "[FOX CRM Timeline] Complaints error:",
          error
        );
        complaintItems = [];
        publishTimeline();
      }
    );

    unsubscribers.push(unsubscribeComplaints);

    // --------------------------------------------------------
    // FOX CRM LIFECYCLE EVENTS
    //
    // Source:
    // workspaces/{workspaceId}/crmLeads/{leadId}/events
    //
    // Intent changes, human takeover, return to AI,
    // CRM conversion and future operational events.
    // --------------------------------------------------------

    const crmEventsRef = collection(
      db,
      "workspaces",
      workspaceId,
      "crmLeads",
      selectedLead.id,
      "events"
    );

    const crmEventsQuery = query(
      crmEventsRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribeCrmEvents = onSnapshot(
      crmEventsQuery,
      (snapshot) => {
        crmEventItems = snapshot.docs.map((snap) => {
          const data: any = snap.data();

          const eventType = String(
            data.type || "system"
          );

          const defaultTitles: Record<string, string> = {
            intent_changed: "Customer Intent Changed",
            human_takeover: "Human Takeover",
            returned_to_ai: "Returned To FOX AI",
            crm_conversion: "CRM Conversion",
            appointment_booked: "Appointment Booked",
            complaint_created: "Complaint Created",
            coupon_redeemed: "Coupon Redeemed",
            rating_submitted: "Service Rating Submitted",
            status_changed: "CRM Status Changed",
            system: "CRM Event",
          };

          const fromValue = String(
            data.fromValue || ""
          );

          const toValue = String(
            data.toValue || ""
          );

          let description = String(
            data.description || ""
          );

          if (
            !description &&
            (fromValue || toValue)
          ) {
            description =
              fromValue && toValue
                ? `${fromValue} → ${toValue}`
                : fromValue || toValue;
          }

          return {
            id: `crm_event_${snap.id}`,
            type: "system_message" as const,

            title:
              String(data.title || "") ||
              defaultTitles[eventType] ||
              "CRM Event",

            description,

            createdAt:
              String(
                data.createdAt ||
                new Date(0).toISOString()
              ),

            sender:
              eventType === "human_takeover"
                ? "human"
                : eventType === "returned_to_ai"
                  ? "ai"
                  : "system",

            status:
              toValue ||
              eventType,

            agentRole:
              eventType === "returned_to_ai"
                ? "FOX AI"
                : undefined,
          };
        });

        publishTimeline();
      },
      (error) => {
        console.error(
          "[FOX CRM Timeline] CRM lifecycle events error:",
          error
        );

        crmEventItems = [];
        publishTimeline();
      }
    );

    // Existing effect already cleans every listener
    // stored inside this array.
    unsubscribers.push(unsubscribeCrmEvents);

    // --------------------------------------------------------
    // SERVICE RATINGS
    // --------------------------------------------------------
    const ratingsRef = collection(db, "serviceRatings");

    const ratingsQuery = query(
      ratingsRef,
      where("workspaceId", "==", currentWorkspace.id)
    );

    const unsubscribeRatings = onSnapshot(
      ratingsQuery,
      (snapshot) => {
        const selectedPhone = String(selectedLead.phone || "")
          .replace(/\D/g, "");

        ratingItems = snapshot.docs
          .map((snap) => {
            const data: any = snap.data();

            const ratingPhone = String(
              data.customerPhone ||
              data.phone ||
              ""
            ).replace(/\D/g, "");

            const samePhone =
              selectedPhone &&
              ratingPhone &&
              (
                selectedPhone === ratingPhone ||
                selectedPhone.endsWith(ratingPhone) ||
                ratingPhone.endsWith(selectedPhone)
              );

            const sameSession =
              (selectedLead as any).sessionId &&
              data.sessionId === (selectedLead as any).sessionId;

            const sameLead =
              data.leadId === selectedLead.id ||
              data.customerId === selectedLead.id;

            if (!samePhone && !sameSession && !sameLead) {
              return null;
            }

            const rating =
              Number(
                data.rating ??
                data.score ??
                data.stars ??
                0
              ) || 0;

            return {
              id: `rating_${snap.id}`,
              type: "rating" as const,
              title: `Service Rating ${rating ? `${rating}/5` : ""}`,
              description:
                data.comment ||
                data.feedback ||
                data.review ||
                `Customer submitted a ${rating}/5 service rating.`,
              createdAt:
                data.createdAt ||
                data.updatedAt ||
                new Date(0).toISOString(),
              sender:
                data.customerName ||
                selectedLead.name ||
                "Customer",
              status:
                rating ? `${rating}/5` : "Rated",
            };
          })
          .filter(Boolean) as CustomerTimelineItem[];

        publishTimeline();
      },
      (error) => {
        console.error(
          "[FOX CRM Timeline] Ratings error:",
          error
        );
        ratingItems = [];
        publishTimeline();
      }
    );

    unsubscribers.push(unsubscribeRatings);

    // --------------------------------------------------------
    // COUPON REDEMPTIONS
    // Tenant-scoped collection created by couponService.
    // --------------------------------------------------------
    const redemptionsRef = collection(
      db,
      "workspaces",
      currentWorkspace.id,
      "couponRedemptions"
    );

    const unsubscribeRedemptions = onSnapshot(
      redemptionsRef,
      (snapshot) => {
        const selectedPhone = String(selectedLead.phone || "")
          .replace(/\D/g, "");

        couponItems = snapshot.docs
          .map((snap) => {
            const data: any = snap.data();

            const redemptionPhone = String(
              data.customerPhone ||
              data.phone ||
              ""
            ).replace(/\D/g, "");

            const samePhone =
              selectedPhone &&
              redemptionPhone &&
              (
                selectedPhone === redemptionPhone ||
                selectedPhone.endsWith(redemptionPhone) ||
                redemptionPhone.endsWith(selectedPhone)
              );

            const sameSession =
              (selectedLead as any).sessionId &&
              data.sessionId === (selectedLead as any).sessionId;

            if (!samePhone && !sameSession) {
              return null;
            }

            const originalAmount =
              Number(data.originalAmount || 0);

            const discountAmount =
              Number(data.discountAmount || 0);

            const finalAmount =
              Number(data.finalAmount || 0);

            return {
              id: `coupon_${snap.id}`,
              type: "coupon" as const,
              title: `Coupon ${data.code || ""} Redeemed`,
              description:
                `Original: ${originalAmount} EGP • ` +
                `Discount: ${discountAmount} EGP • ` +
                `Final: ${finalAmount} EGP`,
              createdAt:
                data.redeemedAt ||
                data.createdAt ||
                new Date(0).toISOString(),
              sender:
                data.customerName ||
                selectedLead.name ||
                "Customer",
              status:
                data.code ||
                "Redeemed",
            };
          })
          .filter(Boolean) as CustomerTimelineItem[];

        publishTimeline();
      },
      (error) => {
        console.error(
          "[FOX CRM Timeline] Coupon redemptions error:",
          error
        );
        couponItems = [];
        publishTimeline();
      }
    );

    unsubscribers.push(unsubscribeRedemptions);

    return () => {
      unsubscribers.forEach((unsubscribe) =>
        unsubscribe()
      );
    };
  }, [
    selectedLead,
    currentWorkspace?.id,
  ]);

  const openLeadConversation = (lead: CustomerLead) => {
    const conversationId = (lead as any).conversationId;

    if (!conversationId) {
      addToast(
        "No linked conversation found for this customer.",
        "info"
      );
      return;
    }

    sessionStorage.setItem(
      "fox_open_conversation_id",
      String(conversationId)
    );

    window.dispatchEvent(
      new CustomEvent("fox:navigate", {
        detail: {
          tab: "client_unified_inbox",
          conversationId,
        },
      })
    );
  };

  const handleExportCSV = () => {
    const headers = "Name,Phone,Email,Channel,Status,Last Interaction,Notes\n";
    const rows = leads
      .map(
        (l) =>
          `"${l.name}","${l.phone}","${l.email || ""}","${l.channel}","${l.status}","${l.lastInteraction}","${l.notes || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentWorkspace.name}_CRM_Leads.csv`;
    a.click();
    addToast("Exported CRM records to CSV!", "success");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
            <Users className="h-6 w-6 text-orange-500" />
            CRM & Customer Lead Records
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customers created automatically by WhatsApp & Telegram AI Agents or added manually.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentWorkspace.crmSpreadsheetId ? (
            <a
              href={`https://docs.google.com/spreadsheets/d/${currentWorkspace.crmSpreadsheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              Open CRM Sheet
            </a>
          ) : (
            <button
              onClick={handleConnectSheets}
              disabled={isSyncingSheets}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              {isSyncingSheets ? 'Connecting...' : 'Connect & Sync with Google Sheets CRM'}
            </button>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition"
          >
            <Plus className="h-4 w-4" />
            Add Customer Lead
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium bg-transparent text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Lead Stages</option>
            <option value="Lead">Lead</option>
            <option value="Prospect">Prospect</option>
            <option value="Customer">Customer</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>

      {/* CRM Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">CRM Stage</th>
                <th className="py-3 px-4">Last Interaction</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingLeads && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    Loading CRM customers...
                  </td>
                </tr>
              )}

              {!loadingLeads && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-xs text-slate-400"
                  >
                    No CRM customers yet.
                  </td>
                </tr>
              )}

              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {lead.name}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-mono text-slate-700 dark:text-slate-300">{lead.phone}</p>
                    {lead.email && <p className="text-[11px] text-slate-400">{lead.email}</p>}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        lead.channel === "WhatsApp"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {lead.channel}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <select
                      value={lead.status}
                      onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as CustomerLead["status"])}
                      className="rounded-lg border border-slate-200 bg-slate-50 py-1 px-2 text-[11px] font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Prospect">Prospect</option>
                      <option value="Customer">Customer</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {lead.lastInteraction}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-500 hover:text-white transition dark:text-orange-400"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Detail Drawer */}
      {selectedLead &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedLead(null);
              }
            }}
          >
            <div className="flex min-h-full items-start justify-center px-4 pb-10 pt-20 sm:px-6">
              <div
                className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7"
                onMouseDown={(e) => e.stopPropagation()}
              >

            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                    <Users className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {selectedLead.name || "Customer"}
                    </h3>

                    <p className="text-[11px] text-slate-400">
                      FOX Customer 360°
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Phone className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase">
                    Phone
                  </span>
                </div>

                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                  {selectedLead.phone || "Not captured"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase">
                    Channel
                  </span>
                </div>

                <p className="text-xs font-extrabold text-emerald-500">
                  {selectedLead.channel || "Unknown"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <Target className="h-4 w-4" />
                  <span className="text-[10px] font-bold uppercase">
                    CRM Stage
                  </span>
                </div>

                <p className="text-xs font-extrabold text-orange-500">
                  {selectedLead.status}
                </p>
              </div>

            </div>

            {/* AI Intelligence */}
            <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />

                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    FOX AI Customer Intelligence
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Automatically generated from customer interactions
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Last Intent
                  </span>

                  <p className="mt-1 text-xs font-extrabold text-purple-500">
                    {(selectedLead as any).lastIntent || "general"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Last Interaction
                  </span>

                  <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {selectedLead.lastInteraction || "—"}
                  </p>
                </div>

              </div>

              <div className="mt-4">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Last Customer Message
                </span>

                <div className="mt-2 rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                  {(selectedLead as any).lastMessage ||
                    "No customer message captured yet."}
                </div>
              </div>
            </div>

            {/* Conversion */}
            {(selectedLead as any).conversionType && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-500" />

                  <div>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      Customer Converted
                    </p>

                    <p className="text-[10px] text-slate-400">
                      FOX detected a successful business conversion
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Type
                    </span>

                    <p className="mt-1 text-xs font-bold text-slate-800 dark:text-white">
                      {(selectedLead as any).conversionType}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Conversion ID
                    </span>

                    <p className="mt-1 break-all font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {(selectedLead as any).lastConversionId || "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Converted At
                    </span>

                    <p className="mt-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                      {(selectedLead as any).convertedAt || "—"}
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />

                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Notes
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {selectedLead.notes || "No notes recorded."}
              </p>
            </div>

            {/* Customer Timeline */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />

                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      FOX Customer Timeline
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Messages and appointments from Firestore
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-900">
                  {customerTimeline.length} events
                </span>
              </div>

              {timelineLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Loading timeline...
                </div>
              ) : customerTimeline.length === 0 ? (
                <div className="rounded-xl bg-white px-4 py-6 text-center text-xs text-slate-400 dark:bg-slate-900">
                  No customer activity found yet.
                </div>
              ) : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {customerTimeline.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-800 dark:text-white">
                            {item.title}
                          </p>

                          {item.status && (
                            <span className="mt-1 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
                              {item.status}
                            </span>
                          )}
                        </div>

                        <span className="shrink-0 font-mono text-[9px] text-slate-400">
                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleString()
                            : "—"}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>

                      {item.agentRole && (
                        <span className="mt-2 inline-block rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-500">
                          {item.agentRole}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">

              {(selectedLead as any).conversationId && (
                <button
                  type="button"
                  onClick={() => openLeadConversation(selectedLead)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-orange-600"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open Conversation
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>

            </div>

              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add New Customer Lead
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mahmoud Ali"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+2010..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telegram">Telegram</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes or inquiry details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition"
              >
                Save CRM Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
