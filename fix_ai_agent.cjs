const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /const \{ workspace \} = params;\n\s*\/\/ Check if credit is exhausted\n\s*if \(workspace && typeof workspace\.creditBalance === 'number' && workspace\.creditBalance <= 0\) \{\n\s*return \{\n\s*response: workspace\.aiSettings\?\.languageMode === 'english' \n\s*\? "Service temporarily unavailable \\(Credit Exhausted\\)\. Please contact the business\."\n\s*: "الخدمة غير متاحة حالياً \\(نفاذ الرصيد\\)\. يرجى التواصل مع النشاط التجاري\.",\n\s*agentType: "Support",\n\s*escalation: false\n\s*\};\n\s*\}/;

const destRegex = /const \{ workspace = \{\}, message, channel = "telegram", chatHistory = \[\], overrideConfig, sessionId \} = params;/;
code = code.replace(destRegex, `const { message, channel = "telegram", chatHistory = [], overrideConfig, sessionId } = params;
    const workspaceCtx = params.workspace || {};`);

code = code.replace(/workspace\.id/g, 'workspaceCtx.id');
code = code.replace(/workspace\.name/g, 'workspaceCtx.name');
code = code.replace(/workspace\.industry/g, 'workspaceCtx.industry');
code = code.replace(/workspace\.aiSettings/g, 'workspaceCtx.aiSettings');
code = code.replace(/workspace\.knowledgeBase/g, 'workspaceCtx.knowledgeBase');
code = code.replace(/workspace\.doctors/g, 'workspaceCtx.doctors');
code = code.replace(/workspace\.menu/g, 'workspaceCtx.menu');
code = code.replace(/workspace\.medicines/g, 'workspaceCtx.medicines');
code = code.replace(/workspace\.clinicServices/g, 'workspaceCtx.clinicServices');

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Fixed duplicate workspace in aiAgentService");
