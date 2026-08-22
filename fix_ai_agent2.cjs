const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const destRegex = /const \{ workspace = \{\}, message, channel = "telegram", chatHistory = \[\], overrideConfig \} = params;/;
code = code.replace(destRegex, `const { message, channel = "telegram", chatHistory = [], overrideConfig } = params;
    const workspaceCtx = params.workspace || {};`);

code = code.replace(/workspaceCtx\.aiSettings\?\.languageMode/g, "workspace.aiSettings?.languageMode");
code = code.replace(/this\.buildSystemInstruction\(workspace,/g, "this.buildSystemInstruction(workspaceCtx,");

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Fixed duplicate workspace in aiAgentService 2");
