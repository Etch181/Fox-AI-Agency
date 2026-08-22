const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /agentType: "Support",\n\s*escalation: false/;
const replace = `aiResponse: workspace.aiSettings?.languageMode === 'english' ? "Service temporarily unavailable" : "الخدمة غير متاحة حالياً",
        detectedLanguage: workspace.aiSettings?.languageMode === 'english' ? "en" : "ar",
        source: "system",
        suggestedActions: []`;

code = code.replace(regex, replace);
fs.writeFileSync('src/services/aiAgentService.ts', code);
