const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const newStates = `
  const [supportAgentName, setSupportAgentName] = useState(
    currentWorkspace.aiSettings?.supportAgentName || "خدمة العملاء"
  );
  const [supportAgentPrompt, setSupportAgentPrompt] = useState(
    currentWorkspace.aiSettings?.supportAgentPrompt || "الرد على الاستفسارات، المواعيد، الأسئلة الشائعة، وتلقي الشكاوى وتهدئة العملاء."
  );
  const [salesAgentName, setSalesAgentName] = useState(
    currentWorkspace.aiSettings?.salesAgentName || "المبيعات"
  );
  const [salesAgentPrompt, setSalesAgentPrompt] = useState(
    currentWorkspace.aiSettings?.salesAgentPrompt || "الإقناع بالشراء، اقتراح باقات أو منتجات إضافية، والرد على اعتراضات السعر. إتمام عمليات البيع."
  );
  const [marketingAgentName, setMarketingAgentName] = useState(
    currentWorkspace.aiSettings?.marketingAgentName || "التسويق"
  );
  const [marketingAgentPrompt, setMarketingAgentPrompt] = useState(
    currentWorkspace.aiSettings?.marketingAgentPrompt || "جمع التقييمات، إبلاغ العملاء بالعروض الجديدة، وعمل استبيانات."
  );
  const [strictCatalogOnly, setStrictCatalogOnly] = useState(true);
`;
code = code.replace("  const [strictCatalogOnly, setStrictCatalogOnly] = useState(true);", newStates);

const newPayload = `
      aiSettings: {
        agentName,
        customPrompt,
        tone,
        languageMode: langPreference,
        workingHours,
        autoBookingEnabled: autoBooking,
        autoComplaintEscalation,
        fallbackMessage: fallbackMsg,
        supportAgentName,
        supportAgentPrompt,
        salesAgentName,
        salesAgentPrompt,
        marketingAgentName,
        marketingAgentPrompt,
      },
`;

code = code.replace(/      aiSettings: \{[\s\S]*?fallbackMessage: fallbackMsg,\n      \},/, newPayload);

const saveSettingsStr = `
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
`;

code = code.replace(/    updateAISettings\(currentWorkspace\.id, \{[\s\S]*?fallbackMessage: fallbackMsg,\n    \}\);/, saveSettingsStr);

const agentForms = `
            {/* Agent Team Settings */}
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isAr ? "إعدادات فريق الوكلاء المتخصصين" : "Specialized Agents Team Settings"}
              </h3>
              
              {/* Support Agent */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل خدمة العملاء" : "Support Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={supportAgentName}
                      onChange={(e) => setSupportAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={supportAgentPrompt}
                      onChange={(e) => setSupportAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Sales Agent */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل المبيعات" : "Sales Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={salesAgentName}
                      onChange={(e) => setSalesAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={salesAgentPrompt}
                      onChange={(e) => setSalesAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Marketing Agent */}
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? "وكيل التسويق" : "Marketing Agent"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "اسم الوكيل" : "Agent Name"}
                    </label>
                    <input
                      type="text"
                      value={marketingAgentName}
                      onChange={(e) => setMarketingAgentName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {isAr ? "تعليمات مخصصة للدور" : "Custom Role Instructions"}
                    </label>
                    <input
                      type="text"
                      value={marketingAgentPrompt}
                      onChange={(e) => setMarketingAgentPrompt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
`;

code = code.replace("{/* Language Strategy & Tone */}", agentForms + "\\n            {/* Language Strategy & Tone */}");
fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
