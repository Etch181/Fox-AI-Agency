const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

// Add import
const importRegex = /import \{ triggerExternalCRM \} from "\.\/crmService";/;
code = code.replace(importRegex, 'import { triggerExternalCRM } from "./crmService";\nimport { sharedMemoryService } from "./sharedMemoryService";');

// Update GenerateChatParams
const paramsRegex = /  chatHistory\?: \{ role\?: string; sender\?: string; text\?: string; parts\?: any\[\] \}\[\];/;
code = code.replace(paramsRegex, '  chatHistory?: { role?: string; sender?: string; text?: string; parts?: any[] }[];\n  sessionId?: string;');

// Inside generateChatResponse
const generateChatBodyRegex = /    const formattedContents: any\[\] = \[\];\n      for \(const h of chatHistory\) \{/;

const newGenerateChatBody = `    const formattedContents: any[] = [];
      let finalChatHistory = chatHistory;
      
      // Use SharedMemoryContext if sessionId and workspaceId are provided
      if (params.sessionId && workspace.id) {
        const sharedCtx = await sharedMemoryService.getContext(workspace.id, params.sessionId);
        if (sharedCtx.messages.length > 0) {
          finalChatHistory = sharedCtx.messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text,
          }));
        }
        // Append current user message to shared memory
        await sharedMemoryService.appendMessage(workspace.id, params.sessionId, {
          sender: "user",
          text: message,
          time: new Date().toISOString()
        });
      }

      for (const h of finalChatHistory) {`;

code = code.replace(generateChatBodyRegex, newGenerateChatBody);

// After successful response generation
const successRegex = /          usedModel = model;\n          break; \/\/ success/;
const newSuccess = `          usedModel = model;
          
          // Append AI response to shared memory
          if (params.sessionId && workspace.id) {
            await sharedMemoryService.appendMessage(workspace.id, params.sessionId, {
              sender: "bot",
              text: response.text || "...",
              time: new Date().toISOString(),
              agentRole: "Unknown" // Can be enhanced to parse actual agent
            });
          }
          
          break; // success`;
code = code.replace(successRegex, newSuccess);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched AiAgentService with SharedMemoryService successfully");
