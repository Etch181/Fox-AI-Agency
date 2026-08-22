const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove polling
const pollingRegex = /\/\/ Background Polling Worker for Telegram Messages[\s\S]*?setInterval\(\(\) => \{\n\s*pollTelegramUpdates\(\);\n\}, 3500\);/g;
code = code.replace(pollingRegex, '');

// Add webhook setting to /api/telegram/status
const statusRegex = /app\.get\("\/api\/telegram\/status", async \(req, res\) => \{\n\s*const data = await callTelegramApi\("getMe"\);\n\s*if \(data && data\.ok\) \{/;
const statusReplace = `app.get("/api/telegram/status", async (req, res) => {
  const data = await callTelegramApi("getMe");
  if (data && data.ok) {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    if (host) {
       const webhookUrl = \`\${protocol}://\${host}/api/telegram/webhook\`;
       await callTelegramApi("setWebhook", { url: webhookUrl }).catch(() => {});
    }`;
code = code.replace(statusRegex, statusReplace);

// Add webhook setting to /api/telegram/set-token
const setTokenRegex = /app\.post\("\/api\/telegram\/set-token", async \(req, res\) => \{[\s\S]*?if \(data && data\.ok\) \{/;
const setTokenReplace = `app.post("/api/telegram/set-token", async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  activeTelegramToken = token.trim();
  const data = await callTelegramApi("getMe");

  if (data && data.ok) {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    if (host) {
       const webhookUrl = \`\${protocol}://\${host}/api/telegram/webhook\`;
       await callTelegramApi("setWebhook", { url: webhookUrl }).catch(() => {});
    }`;
code = code.replace(setTokenRegex, setTokenReplace);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts for telegram webhook");
