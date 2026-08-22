const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /export interface AiAgentConfig \{[\s\S]*?marketingAgentPrompt\?: string;\n\}/;
const replacement = `export interface AiAgentConfig {
  agentName?: string;
  customPrompt?: string;
  tone?: "Friendly" | "Professional" | "Empathetic" | "Formal" | "Direct";
  languageMode?: "auto" | "arabic" | "english";
  autoBookingEnabled?: boolean;
  autoComplaintEscalation?: boolean;
  strictCatalogOnly?: boolean;
  currency?: string;
  fallbackMessage?: string;
  workingHours?: string;
  supportAgentName?: string;
  supportAgentPrompt?: string;
  salesAgentName?: string;
  salesAgentPrompt?: string;
  marketingAgentName?: string;
  marketingAgentPrompt?: string;
  routerPrompt?: string;
  salesKeywords?: string;
  supportKeywords?: string;
  marketingKeywords?: string;
}`;
code = code.replace(regex, replacement);

const configRegex = /const config: AiAgentConfig = \{[\s\S]*?\.\.\.overrideConfig,\n    \};/;
const configReplacement = `const config: AiAgentConfig = {
      agentName: workspace.aiSettings?.agentName || \`\${workspace.name || "Business"} AI Assistant\`,
      customPrompt: workspace.aiSettings?.customPrompt || "",
      tone: workspace.aiSettings?.tone || "Friendly",
      languageMode: workspace.aiSettings?.languageMode || "auto",
      autoBookingEnabled: workspace.aiSettings?.autoBookingEnabled ?? true,
      autoComplaintEscalation: workspace.aiSettings?.autoComplaintEscalation ?? true,
      strictCatalogOnly: true,
      currency: "EGP",
      supportAgentName: workspace.aiSettings?.supportAgentName,
      supportAgentPrompt: workspace.aiSettings?.supportAgentPrompt,
      salesAgentName: workspace.aiSettings?.salesAgentName,
      salesAgentPrompt: workspace.aiSettings?.salesAgentPrompt,
      marketingAgentName: workspace.aiSettings?.marketingAgentName,
      marketingAgentPrompt: workspace.aiSettings?.marketingAgentPrompt,
      routerPrompt: workspace.aiSettings?.routerPrompt,
      salesKeywords: workspace.aiSettings?.salesKeywords,
      supportKeywords: workspace.aiSettings?.supportKeywords,
      marketingKeywords: workspace.aiSettings?.marketingKeywords,
      ...overrideConfig,
    };`;
code = code.replace(configRegex, configReplacement);

// We should also update the prompt to include the router instruction if provided
const instructionRegex = /1\. الوكيل الموجه \(Router Agent - خفي\): يقرأ رسالة العميل وسياق المحادثة أولاً، ويحدد نية العميل \(Intent\)، ثم يسلم المهمة فوراً للوكيل المختص دون أن يظهر للعميل\./;
const newInstruction = `1. الوكيل الموجه (Router Agent - خفي): يقرأ رسالة العميل وسياق المحادثة أولاً، ويحدد نية العميل (Intent)، ثم يسلم المهمة فوراً للوكيل المختص دون أن يظهر للعميل.
   \${config.routerPrompt ? "- تعليمات التوجيه المخصصة: " + config.routerPrompt : ""}
   - الكلمات الدلالية للمبيعات: \${config.salesKeywords || 'سعر، شراء، حجز، بكام'}
   - الكلمات الدلالية للدعم: \${config.supportKeywords || 'شكوى، مشكلة، موعد عمل، استفسار'}
   - الكلمات الدلالية للتسويق: \${config.marketingKeywords || 'عروض، خصم، جديد'}`;
code = code.replace(instructionRegex, newInstruction);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched config and prompt");
