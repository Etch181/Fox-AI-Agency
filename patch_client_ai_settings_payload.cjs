const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const regex = /id: currentWorkspace\.id,\n\s*name: currentWorkspace\.name,\n\s*industry: currentWorkspace\.industry,/;
code = code.replace(regex, `id: currentWorkspace.id,
      name: currentWorkspace.name,
      industry: currentWorkspace.industry,
      creditBalance: currentWorkspace.creditBalance,`);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched ClientAISettings.tsx payload");
