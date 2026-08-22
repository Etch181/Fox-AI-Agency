const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const webhookStateStr = `
  const [marketingAgentPrompt, setMarketingAgentPrompt] = useState(
    currentWorkspace.aiSettings?.marketingAgentPrompt || "جمع التقييمات، إبلاغ العملاء بالعروض الجديدة، وعمل استبيانات."
  );
  const [externalCrmWebhookUrl, setExternalCrmWebhookUrl] = useState(
    currentWorkspace.externalCrmWebhookUrl || ""
  );
  const [strictCatalogOnly, setStrictCatalogOnly] = useState(true);
`;
code = code.replace(/  const \[marketingAgentPrompt, setMarketingAgentPrompt\] = useState\([\s\S]*?\);\n  const \[strictCatalogOnly, setStrictCatalogOnly\] = useState\(true\);/, webhookStateStr);

const updateCallStr = `
    updateAISettings(currentWorkspace.id, {
      agentName,
      tone,
      customPrompt,
      autoBookingEnabled: autoBooking,
      autoComplaintEscalation,
      languageMode: langPreference,
      fallbackMessage: fallbackMsg,
      supportAgentName,
      supportAgentPrompt,
      salesAgentName,
      salesAgentPrompt,
      marketingAgentName,
      marketingAgentPrompt,
    });
    
    // Also update the workspace directly for the webhook URL
    if (externalCrmWebhookUrl !== currentWorkspace.externalCrmWebhookUrl) {
       updateWorkspaceField(currentWorkspace.id, { externalCrmWebhookUrl });
    }
`;
code = code.replace(/    updateAISettings\(currentWorkspace\.id, \{[\s\S]*?marketingAgentPrompt,\n    \}\);/, updateCallStr);

const uiStr = `
              {/* External CRM Integration */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {isAr ? "ربط CRM خارجي (Webhook)" : "External CRM Integration (Webhook)"}
                </h3>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? "رابط الـ Webhook للإشعارات" : "Webhook URL for Notifications"}
                      </label>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                        {isAr 
                          ? "سيتم إرسال إشعارات (POST) إلى هذا الرابط فور إتمام العميل لحجز جديد أو عملية شراء." 
                          : "POST requests will be sent to this URL whenever a customer completes a booking or sale."}
                      </p>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="https://your-crm.com/api/webhook"
                    value={externalCrmWebhookUrl}
                    onChange={(e) => setExternalCrmWebhookUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

            <div className="flex items-center justify-end pt-4">
`;
code = code.replace(/            <div className="flex items-center justify-end pt-4">/, uiStr);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched successfully");
