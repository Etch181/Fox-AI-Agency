const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const wsContextRegex = /medicines\?: \{ name: string; category: string; price: number; requiresPrescription\?: boolean; available\?: boolean \}\[\];/;
code = code.replace(wsContextRegex, `medicines?: { name: string; category: string; price: number; requiresPrescription?: boolean; available?: boolean }[];\n  courses?: { name: string; price: number; duration: string; description?: string }[];`);

// Add handling in buildSystemInstruction
const industryRegex = /const isPharmacy = workspace\.industry === "Pharmacy";/;
code = code.replace(industryRegex, `const isPharmacy = workspace.industry === "Pharmacy";
    const isCourseCenter = workspace.industry === "Course Center";`);

const basePromptRegex = /if \(isPharmacy\) \{[\s\S]*?\}\n\s*if \(isRetail\)/;
const replacement = `if (isPharmacy) {
      basePrompt += \`- You are an assistant for a Pharmacy.\\n\`;
    }
    if (isCourseCenter) {
      basePrompt += \`- You are an assistant for a Course & Training Center.\\n\`;
      basePrompt += \`- Your main goal is to provide course information, assist with registration, answer inquiries, and manage bookings.\\n\`;
    }
    if (isRetail)`;
code = code.replace(basePromptRegex, replacement);

const dataRegex = /if \(workspace\.clinicServices && workspace\.clinicServices\.length > 0\) \{[\s\S]*?\}\n\s*if \(workspace\.menu/;
const dataReplacement = `if (workspace.clinicServices && workspace.clinicServices.length > 0) {
      basePrompt += \`\\n--- CLINIC SERVICES ---\\n\`;
      basePrompt += JSON.stringify(workspace.clinicServices, null, 2) + "\\n";
    }

    if (workspace.courses && workspace.courses.length > 0) {
      basePrompt += \`\\n--- COURSES AVAILABLE ---\\n\`;
      basePrompt += JSON.stringify(workspace.courses, null, 2) + "\\n";
    }

    if (workspace.menu`;
code = code.replace(dataRegex, dataReplacement);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched aiAgentService.ts for Course Center");
