const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const regex = /const data = await res\.json\(\);\n\s*setTestChatLog/;
const replacement = `const data = await res.json();
      
      // Deduct credit if response was generated and credit is > 0
      if (currentWorkspace.creditBalance && currentWorkspace.creditBalance > 0 && !data.error) {
         updateWorkspaceField(currentWorkspace.id, { 
           creditBalance: currentWorkspace.creditBalance - 1,
           aiConversationsUsed: (currentWorkspace.aiConversationsUsed || 0) + 1
         });
      }

      setTestChatLog`;
code = code.replace(regex, replacement);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched Sandbox for credit deduction");
