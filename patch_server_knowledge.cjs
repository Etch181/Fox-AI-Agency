const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
app.post("/api/ai/extract-knowledge", async (req, res) => {
  try {
    const { type, content, url, mimeType } = req.body;
    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }
    const result = await aiAgentService.extractKnowledge({ type, content, url, mimeType });
    res.json(result);
  } catch (error) {
    console.error("Extract Knowledge Error:", error);
    res.status(500).json({ error: error.message || "Failed to extract knowledge" });
  }
});
`;

code = code.replace(/app\.post\("\/api\/ai\/chat"/, route + '\napp.post("/api/ai/chat"');
fs.writeFileSync('server.ts', code);
console.log("Patched server.ts with extract-knowledge");
