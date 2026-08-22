const fs = require("fs");
let content = fs.readFileSync("server.ts", "utf8");

if (!content.includes('TrialLimitManager')) {
  content = content.replace(
    'import { emailService } from "./src/services/emailService";',
    'import { emailService } from "./src/services/emailService";\nimport { TrialLimitManager } from "./src/services/TrialLimitManager";'
  );
}

const newTrialLogic = `async function hasUsedTrialBefore(chatId: string, phone?: string, email?: string): Promise<boolean> {
  // Check memory store (fast track & offline resilient)
  if (chatId && usedTrialChatIds.has(chatId)) return true;
  
  const cleanPhone = phone ? phone.replace(/[\\s\\-\\+\\(\\)]/g, "") : null;
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  if (cleanPhone && usedTrialPhones.has(cleanPhone)) return true;
  if (cleanEmail && usedTrialEmails.has(cleanEmail)) return true;

  // Check against persistent store (synced from Firebase)
  for (const w of registeredWorkspacesStore) {
    if (w.planId === "starter") {
      const wPhone = (w.phone || "").replace(/[\\s\\-\\+\\(\\)]/g, "");
      const wEmail = (w.ownerEmail || "").trim().toLowerCase();
      if (cleanPhone && cleanPhone === wPhone) return true;
      if (cleanEmail && cleanEmail === wEmail) return true;
    }
  }

  // Final check: Firestore Database (via TrialLimitManager component)
  try {
    const isUsedInDb = await TrialLimitManager.hasUsedTrial(phone, email, chatId);
    if (isUsedInDb) {
      if (chatId) usedTrialChatIds.add(chatId);
      if (cleanPhone) usedTrialPhones.add(cleanPhone);
      if (cleanEmail) usedTrialEmails.add(cleanEmail);
      return true;
    }
  } catch (err) {
    console.warn("TrialLimitManager check failed:", err);
  }

  return false;
}`;

content = content.replace(
  /async function hasUsedTrialBefore\([\s\S]*?return false;\n}/,
  newTrialLogic
);

// We should also make sure registerTrialConsumption uses TrialLimitManager
const newRecordLogic = `function registerTrialConsumption(chatId: string, phone?: string, email?: string) {
  if (chatId) usedTrialChatIds.add(chatId);
  if (phone) {
    const cleanPhone = phone.replace(/[\\s\\-\\+\\(\\)]/g, "");
    if (cleanPhone) usedTrialPhones.add(cleanPhone);
  }
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail) usedTrialEmails.add(cleanEmail);
  }
  // Record in Firestore Database for cross-session persistence
  TrialLimitManager.recordTrialUsage(phone, email, chatId).catch(console.error);
}`;

content = content.replace(
  /function registerTrialConsumption\([\s\S]*?if \(cleanEmail\) usedTrialEmails\.add\(cleanEmail\);\n  }\n}/,
  newRecordLogic
);

fs.writeFileSync("server.ts", content);
console.log("Patched server.ts with TrialLimitManager");
