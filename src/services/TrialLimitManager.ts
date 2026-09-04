import { adminDb } from "./firebaseAdmin.ts";

export class TrialLimitManager {
  /**
   * Checks if a user has already used the free trial by
   * Phone, Email, or Chat ID.
   *
   * @returns True if the trial was already used.
   */
  static async hasUsedTrial(
    phone?: string,
    email?: string,
    chatId?: string
  ): Promise<boolean> {
    try {
      if (!phone && !email && !chatId) {
        return false;
      }

      const trialRef =
        adminDb.collection("trial_usages");

      // --------------------------------------------------
      // Check by phone
      // --------------------------------------------------

      if (phone) {
        const cleanPhone =
          phone.replace(/[\s\-\+\(\)]/g, "");

        if (cleanPhone) {
          const snapPhone =
            await trialRef
              .where("value", "==", cleanPhone)
              .where("type", "==", "phone")
              .get();

          if (!snapPhone.empty) {
            return true;
          }
        }
      }

      // --------------------------------------------------
      // Check by email
      // --------------------------------------------------

      if (email) {
        const cleanEmail =
          email.trim().toLowerCase();

        if (cleanEmail) {
          const snapEmail =
            await trialRef
              .where("value", "==", cleanEmail)
              .where("type", "==", "email")
              .get();

          if (!snapEmail.empty) {
            return true;
          }
        }
      }

      // --------------------------------------------------
      // Check by Telegram Chat ID
      // --------------------------------------------------

      if (chatId) {
        const snapChat =
          await trialRef
            .where("value", "==", chatId)
            .where("type", "==", "chatId")
            .get();

        if (!snapChat.empty) {
          return true;
        }
      }

      // --------------------------------------------------
      // Fallback:
      // Existing starter workspaces may predate trial_usages.
      // --------------------------------------------------

      const snapWs =
        await adminDb
          .collection("workspaces")
          .where("planId", "==", "starter")
          .get();

      const checkPhone =
        phone
          ? phone.replace(/[\s\-\+\(\)]/g, "")
          : null;

      const checkEmail =
        email
          ? email.trim().toLowerCase()
          : null;

      for (const workspaceDoc of snapWs.docs) {
        const workspace =
          workspaceDoc.data();

        if (checkPhone) {
          const workspacePhone =
            String(workspace.phone || "")
              .replace(/[\s\-\+\(\)]/g, "");

          if (workspacePhone === checkPhone) {
            return true;
          }
        }

        if (checkEmail) {
          const workspaceEmail =
            String(workspace.ownerEmail || "")
              .trim()
              .toLowerCase();

          if (workspaceEmail === checkEmail) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error(
        "Error checking trial limit in Firestore:",
        error
      );

      return false;
    }
  }

  /**
   * Records a new trial usage in Firestore to prevent
   * future reuse.
   */
  static async recordTrialUsage(
    phone?: string,
    email?: string,
    chatId?: string
  ): Promise<void> {
    try {
      const trialRef =
        adminDb.collection("trial_usages");

      const writes: Promise<unknown>[] = [];

      // --------------------------------------------------
      // Phone
      // --------------------------------------------------

      if (phone) {
        const cleanPhone =
          phone.replace(/[\s\-\+\(\)]/g, "");

        if (cleanPhone) {
          const id =
            `phone_${cleanPhone}`;

          writes.push(
            trialRef
              .doc(id)
              .set(
                {
                  type: "phone",
                  value: cleanPhone,
                  createdAt:
                    new Date().toISOString(),
                },
                {
                  merge: true,
                }
              )
          );
        }
      }

      // --------------------------------------------------
      // Email
      // --------------------------------------------------

      if (email) {
        const cleanEmail =
          email.trim().toLowerCase();

        if (cleanEmail) {
          const id =
            `email_${cleanEmail.replace(
              /[^a-zA-Z0-9]/g,
              "_"
            )}`;

          writes.push(
            trialRef
              .doc(id)
              .set(
                {
                  type: "email",
                  value: cleanEmail,
                  createdAt:
                    new Date().toISOString(),
                },
                {
                  merge: true,
                }
              )
          );
        }
      }

      // --------------------------------------------------
      // Telegram Chat ID
      // --------------------------------------------------

      if (chatId) {
        const id =
          `chat_${chatId}`;

        writes.push(
          trialRef
            .doc(id)
            .set(
              {
                type: "chatId",
                value: chatId,
                createdAt:
                  new Date().toISOString(),
              },
              {
                merge: true,
              }
            )
        );
      }

      await Promise.all(writes);

      console.log(
        "Trial usage recorded successfully in Firestore."
      );
    } catch (error) {
      console.error(
        "Error recording trial usage in Firestore:",
        error
      );
    }
  }

  /**
   * Returns standard error messages for trial reuse.
   */
  static getErrorMessage(
    isAr: boolean
  ): string {
    return isAr
      ? "عفواً، لقد استفدت بالفعل من الباقة التجريبية المجانية مسبقاً. تُتاح الباقة مرة واحدة فقط لكل حساب لمنع التكرار."
      : "Sorry, you have already used the free trial. It is only available once per account.";
  }
}
