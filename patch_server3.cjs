const fs = require("fs");
let content = fs.readFileSync("server.ts", "utf8");

content = content.replace(
  "function hasUsedTrialBefore(chatId: string, phone?: string, email?: string): boolean {",
  "async function hasUsedTrialBefore(chatId: string, phone?: string, email?: string): Promise<boolean> {"
);

content = content.replace(
  /if \(session\.selectedPlan === "starter" && hasUsedTrialBefore\(/g,
  "if (session.selectedPlan === \"starter\" && await hasUsedTrialBefore("
);

content = content.replace(
  /if \(detectedPlan === "starter" && hasUsedTrialBefore\(/g,
  "if (detectedPlan === \"starter\" && await hasUsedTrialBefore("
);

content = content.replace(
  /if \(hasUsedTrialBefore\(/g,
  "if (await hasUsedTrialBefore("
);

fs.writeFileSync("server.ts", content);
console.log("Patched server.ts async hasUsedTrialBefore");
