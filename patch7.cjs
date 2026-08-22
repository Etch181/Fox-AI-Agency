const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientDashboard.tsx', 'utf8');

const importRegex = /import \{ useApp \} from "\.\.\/\.\.\/context\/AppContext";/;
code = code.replace(importRegex, 'import { useApp } from "../../context/AppContext";\nimport { ClientAnalyticsDashboard } from "./ClientAnalyticsDashboard";');

const insertPoint = /\{\/\* Quick Actions Grid \*\/\}/;
code = code.replace(insertPoint, `<div className="mb-6"><ClientAnalyticsDashboard /></div>\n      {/* Quick Actions Grid */}`);

fs.writeFileSync('src/components/client/ClientDashboard.tsx', code);
console.log("Patched successfully");
