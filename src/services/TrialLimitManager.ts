import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export class TrialLimitManager {
  /**
   * Checks if a user has already used the free trial by Phone, Email, or Chat ID.
   * @param phone The user's phone number
   * @param email The user's email address
   * @param chatId The user's Telegram Chat ID
   * @returns {Promise<boolean>} True if the trial was already used, false if eligible.
   */
  static async hasUsedTrial(phone?: string, email?: string, chatId?: string): Promise<boolean> {
    try {
      if (!phone && !email && !chatId) return false;

      const trialRef = collection(db, 'trial_usages');

      // Check by phone
      if (phone) {
        const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, "");
        if (cleanPhone) {
          const qPhone = query(trialRef, where("value", "==", cleanPhone), where("type", "==", "phone"));
          const snapPhone = await getDocs(qPhone);
          if (!snapPhone.empty) return true;
        }
      }

      // Check by email
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail) {
          const qEmail = query(trialRef, where("value", "==", cleanEmail), where("type", "==", "email"));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) return true;
        }
      }

      // Check by Chat ID
      if (chatId) {
        const qChat = query(trialRef, where("value", "==", chatId), where("type", "==", "chatId"));
        const snapChat = await getDocs(qChat);
        if (!snapChat.empty) return true;
      }

      // Also check existing workspaces just in case (fallback check)
      const workspacesRef = collection(db, 'workspaces');
      const qWs = query(workspacesRef, where("planId", "==", "starter"));
      const snapWs = await getDocs(qWs);
      
      const checkPhone = phone ? phone.replace(/[\s\-\+\(\)]/g, "") : null;
      const checkEmail = email ? email.trim().toLowerCase() : null;

      for (const w of snapWs.docs) {
        const wData = w.data();
        if (checkPhone) {
          const wPhone = (wData.phone || "").replace(/[\s\-\+\(\)]/g, "");
          if (wPhone === checkPhone) return true;
        }
        if (checkEmail) {
          const wEmail = (wData.ownerEmail || "").trim().toLowerCase();
          if (wEmail === checkEmail) return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking trial limit in Firestore:", error);
      return false;
    }
  }

  /**
   * Records a new trial usage in Firestore to prevent future reuse.
   */
  static async recordTrialUsage(phone?: string, email?: string, chatId?: string): Promise<void> {
    try {
      const trialRef = collection(db, 'trial_usages');
      const batch = [];

      if (phone) {
        const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, "");
        if (cleanPhone) {
          const id = `phone_${cleanPhone}`;
          batch.push(setDoc(doc(trialRef, id), {
            type: 'phone',
            value: cleanPhone,
            createdAt: new Date().toISOString()
          }, { merge: true }));
        }
      }

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail) {
          const id = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          batch.push(setDoc(doc(trialRef, id), {
            type: 'email',
            value: cleanEmail,
            createdAt: new Date().toISOString()
          }, { merge: true }));
        }
      }

      if (chatId) {
        const id = `chat_${chatId}`;
        batch.push(setDoc(doc(trialRef, id), {
          type: 'chatId',
          value: chatId,
          createdAt: new Date().toISOString()
        }, { merge: true }));
      }

      await Promise.all(batch);
      console.log("Trial usage recorded successfully in Firestore.");
    } catch (error) {
      console.error("Error recording trial usage in Firestore:", error);
    }
  }

  /**
   * Returns standard error messages for trial reuse.
   */
  static getErrorMessage(isAr: boolean): string {
    return isAr 
      ? "عفواً، لقد استفدت بالفعل من الباقة التجريبية المجانية مسبقاً. تُتاح الباقة مرة واحدة فقط لكل حساب لمنع التكرار."
      : "Sorry, you have already used the free trial. It is only available once per account.";
  }
}
