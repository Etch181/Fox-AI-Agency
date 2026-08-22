const fs = require("fs");
let content = fs.readFileSync("server.ts", "utf8");

content = content.replace(
  "function hasUsedTrialBefore(chatId, phone, email) {",
  "function hasUsedTrialBefore(chatId: string, phone?: string, email?: string): boolean {"
);

fs.writeFileSync("server.ts", content);
console.log("Patched server.ts typing");
