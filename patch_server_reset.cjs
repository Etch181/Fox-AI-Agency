const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importRegex = /import \{ aiAgentService \} from "\.\/src\/services\/aiAgentService";/;
const newImport = `import { aiAgentService } from "./src/services/aiAgentService";\nimport { sharedMemoryService } from "./src/services/sharedMemoryService";`;
code = code.replace(importRegex, newImport);

const resetRoute = `
app.post("/api/ai/reset-session", async (req, res) => {
  try {
    const { workspaceId, sessionId } = req.body;
    if (workspaceId && sessionId) {
      await sharedMemoryService.resetContext(workspaceId, sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset session" });
  }
});
`;

code = code.replace(/app\.post\("\/api\/ai\/chat"/, resetRoute + '\napp.post("/api/ai/chat"');
fs.writeFileSync('server.ts', code);
console.log("Patched server reset route");
