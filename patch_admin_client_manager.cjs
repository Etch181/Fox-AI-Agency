const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminClientManager.tsx', 'utf8');

// Add Coins icon
const iconRegex = /CheckCircle2,/;
code = code.replace(iconRegex, 'CheckCircle2,\n  Coins,');

// Add state for credits modal
const stateRegex = /const \[industryFilter, setIndustryFilter\] = useState\("all"\);/;
code = code.replace(stateRegex, `const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedWorkspaceForCredits, setSelectedWorkspaceForCredits] = useState<any>(null);
  const [creditAmountToAdd, setCreditAmountToAdd] = useState("");`);

// Add updateWorkspaceCredits to AppContext usage
const appCtxRegex = /updateWorkspacePlan,\n    deleteWorkspace,/;
code = code.replace(appCtxRegex, `updateWorkspacePlan,\n    deleteWorkspace,\n    updateWorkspaceField,`);

// Update usage column to show credit balance
const usageColRegex = /<div className="text-xs font-bold text-slate-700 dark:text-slate-300">\n\s*\{ws\.aiConversationsUsed\}\n\s*<\/div>/;
code = code.replace(usageColRegex, `<div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {ws.creditBalance ?? 0} {isAr ? "رصيد" : "Credits"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isAr ? "مستخدم:" : "Used:"} {ws.aiConversationsUsed}
                      </div>`);

// Add "Manage Credits" button to Actions column
const actionsColRegex = /<select\n\s*className="rounded-lg border border-slate-200/;
code = code.replace(actionsColRegex, `<button
                        onClick={() => setSelectedWorkspaceForCredits(ws)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 transition-colors"
                        title={isAr ? "إدارة الرصيد" : "Manage Credits"}
                      >
                        <Coins className="h-4 w-4" />
                      </button>\n                      <select\n                        className="rounded-lg border border-slate-200`);

// Add the modal at the end of the component
const endRegex = /<\/div>\n\s*<\/div>\n\s*\);\n\};\n$/;
const modalCode = `
      {selectedWorkspaceForCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {isAr ? "إدارة رصيد العميل" : "Manage Client Credits"}
            </h3>
            
            <div className="mb-6 space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{isAr ? "الرصيد الحالي" : "Current Balance"}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {selectedWorkspaceForCredits.creditBalance ?? 0}
                  </p>
                </div>
                <button
                  onClick={() => {
                    updateWorkspaceField(selectedWorkspaceForCredits.id, { creditBalance: 0 });
                    setSelectedWorkspaceForCredits({...selectedWorkspaceForCredits, creditBalance: 0});
                  }}
                  className="px-3 py-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                >
                  {isAr ? "تصفير الرصيد" : "Reset to Zero"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {isAr ? "إضافة رصيد إضافي" : "Add Extra Credits"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={creditAmountToAdd}
                    onChange={(e) => setCreditAmountToAdd(e.target.value)}
                    placeholder="e.g. 500"
                    className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => {
                      const toAdd = parseInt(creditAmountToAdd);
                      if (!isNaN(toAdd) && toAdd > 0) {
                        const newBalance = (selectedWorkspaceForCredits.creditBalance ?? 0) + toAdd;
                        updateWorkspaceField(selectedWorkspaceForCredits.id, { creditBalance: newBalance });
                        setSelectedWorkspaceForCredits({...selectedWorkspaceForCredits, creditBalance: newBalance});
                        setCreditAmountToAdd("");
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                  >
                    {isAr ? "إضافة" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedWorkspaceForCredits(null);
                  setCreditAmountToAdd("");
                }}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`;
code = code.replace(endRegex, modalCode);

fs.writeFileSync('src/components/admin/AdminClientManager.tsx', code);
console.log("Patched AdminClientManager.tsx for credits");
