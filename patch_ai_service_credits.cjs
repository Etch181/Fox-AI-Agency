const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

// Add creditBalance to WorkspaceContext interface
const ctxRegex = /export interface WorkspaceContext \{[\s\S]*?products\?: \{ name: string; price: number; stock\?: number \}\[\];/;
code = code.replace(ctxRegex, `export interface WorkspaceContext {
  id?: string;
  name?: string;
  industry?: string;
  creditBalance?: number;
  aiSettings?: AiAgentConfig;
  knowledgeBase?: { question: string; answer: string; approved?: boolean }[];
  doctors?: { name: string; specialty: string; slots?: string[]; consultationFeeEGP?: number }[];
  menu?: { name: string; category: string; price: number; description?: string; available?: boolean }[];
  medicines?: { name: string; category: string; price: number; requiresPrescription?: boolean; available?: boolean }[];
  products?: { name: string; price: number; stock?: number }[];`);

// In generateChatResponse, check credit limit before processing
const genRegex = /public async generateChatResponse\(params: GenerateChatParams\): Promise<ChatResponse> \{/;
code = code.replace(genRegex, `public async generateChatResponse(params: GenerateChatParams): Promise<ChatResponse> {
    const { workspace } = params;
    
    // Check if credit is exhausted
    if (workspace && typeof workspace.creditBalance === 'number' && workspace.creditBalance <= 0) {
      return {
        response: workspace.aiSettings?.languageMode === 'english' 
          ? "Service temporarily unavailable (Credit Exhausted). Please contact the business."
          : "الخدمة غير متاحة حالياً (نفاذ الرصيد). يرجى التواصل مع النشاط التجاري.",
        agentType: "Support",
        escalation: false
      };
    }
`);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched aiAgentService.ts with credits");
