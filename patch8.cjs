const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientDashboard.tsx', 'utf8');

const importRegex = /import \{ useApp \} from "\.\.\/\.\.\/context\/AppContext";/;
code = code.replace(importRegex, 'import { useApp } from "../../context/AppContext";\nimport { ClientAnalyticsDashboard } from "./ClientAnalyticsDashboard";');

const oldChartSection = /        \{\/\* Analytics Chart \*\/\}[\s\S]*?        \{\/\* Unanswered FAQs Extraction \*\/\}/;
code = code.replace(oldChartSection, '        {/* Unanswered FAQs Extraction */}');

const insertPoint = /      \{\/\* Advanced Analytics & Insights \*\/\}/;
code = code.replace(insertPoint, `      {/* Advanced Analytics & Insights */}\n      <ClientAnalyticsDashboard />\n`);

fs.writeFileSync('src/components/client/ClientDashboard.tsx', code);
console.log("Patched successfully");
