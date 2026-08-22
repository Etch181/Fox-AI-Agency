const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routeRegex = /const \{ workspace, customerMessage, userMessage, channel = "telegram", chatHistory = \[\], overrideConfig \} = req\.body;/;
const newRoute = `const { workspace, customerMessage, userMessage, channel = "telegram", chatHistory = [], overrideConfig, sessionId } = req.body;`;

code = code.replace(routeRegex, newRoute);

const generateChatCallRegex = /    const result = await aiAgentService\.generateChatResponse\(\{[\s\S]*?overrideConfig,\n    \}\);/;
const newGenerateChatCall = `    const result = await aiAgentService.generateChatResponse({
      workspace,
      message,
      channel,
      chatHistory,
      overrideConfig,
      sessionId,
    });`;

code = code.replace(generateChatCallRegex, newGenerateChatCall);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts successfully");
