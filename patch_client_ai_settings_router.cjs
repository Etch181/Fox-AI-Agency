const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const importRegex = /import \{ useApp \} from "\.\.\/\.\.\/context\/AppContext";/;
code = code.replace(importRegex, 'import { useApp } from "../../context/AppContext";\nimport { AgentRouterConfiguration } from "./AgentRouterConfiguration";');

const uiRegex = /\{"\/\* Language Strategy & Tone \*\/"\}/;
// Actually the comment is `{/* Language Strategy & Tone */}`
code = code.replace(/            \{\/\* Language Strategy & Tone \*\/\}/, `            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">\n              <AgentRouterConfiguration />\n            </div>\n\n            {/* Language Strategy & Tone */}`);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched ClientAISettings.tsx");
