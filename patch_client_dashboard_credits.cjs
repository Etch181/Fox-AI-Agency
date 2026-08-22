const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientDashboard.tsx', 'utf8');

const importRegex = /import \{ useApp \} from "\.\.\/\.\.\/context\/AppContext";/;
code = code.replace(importRegex, 'import { useApp } from "../../context/AppContext";\nimport { PackageRecommendation } from "./PackageRecommendation";');

// Render package recommendation in the client dashboard
const widgetRegex = /\{"\/\* Knowledge Base Setup \*\/"\}/;
code = code.replace(/\{"\/\* Knowledge Base Setup \*\/"\}/, '');

code = code.replace(/\{\/\* Knowledge Base Setup \*\/\}/, `
        {/* Package Recommendation Widget */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <PackageRecommendation />
        </div>

        {/* Knowledge Base Setup */}`);

// Fix usage stats to show credit balance
const usageStatsRegex = /const used = currentWorkspace\.aiConversationsUsed \|\| 0;/;
code = code.replace(usageStatsRegex, `const used = currentWorkspace.aiConversationsUsed || 0;
  const creditBalance = currentWorkspace.creditBalance ?? 0;
  const isOutOfCredits = creditBalance <= 0;`);

// Replace the Usage progress card with Credit Balance
const progressRegex = /<div className="flex items-center justify-between">[\s\S]*?<div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">[\s\S]*?<\/div>\n\s*<\/div>/;
const newProgress = `<div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "الرصيد المتبقي" : "Remaining Credit"}
                </span>
                <span className={\`text-sm font-bold \${isOutOfCredits ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}\`}>
                  {creditBalance}
                </span>
              </div>
              {isOutOfCredits && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                  {isAr ? "نفد الرصيد بالكامل. الوكيل الذكي متوقف عن العمل حالياً." : "Credit exhausted. The AI agent is currently stopped."}
                </div>
              )}`;
code = code.replace(progressRegex, newProgress);

fs.writeFileSync('src/components/client/ClientDashboard.tsx', code);
console.log("Patched ClientDashboard.tsx for credits");
