const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const importRegex = /import \{ AgentRouterConfiguration \} from "\.\/AgentRouterConfiguration";/;
code = code.replace(importRegex, 'import { AgentRouterConfiguration } from "./AgentRouterConfiguration";\nimport { ClientKnowledgeBuilder } from "./ClientKnowledgeBuilder";');

const knowledgeFactsRegex = /\{\/\* Approved Facts Grid \*\/\}/;
code = code.replace(knowledgeFactsRegex, `
          <div className="mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <ClientKnowledgeBuilder />
          </div>
          {/* Approved Facts Grid */}`);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched ClientAISettings.tsx with Knowledge Builder");
