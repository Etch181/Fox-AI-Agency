const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /knowledgeBase\?: string\[\];/;
const replace = `knowledgeBase?: string[];
  googleSheetsAccessToken?: string;
  crmSpreadsheetId?: string;
  externalCrmWebhookUrl?: string;`;

code = code.replace(regex, replace);
fs.writeFileSync('src/services/aiAgentService.ts', code);
