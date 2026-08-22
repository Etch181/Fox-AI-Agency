const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const extractKnowledgeMethod = `
  public async extractKnowledge(input: { type: 'url' | 'text' | 'file'; content?: string; url?: string; mimeType?: string }): Promise<{ question: string; answer: string }[]> {
    const ai = this.getGeminiClient();
    if (!ai) throw new Error("Gemini API key not configured");

    let prompt = "Extract key information from the following content and generate a list of Frequently Asked Questions (FAQs) in a strict JSON array format. Each object must have exactly two keys: 'question' and 'answer'. Both should be strings. Focus on business details, pricing, services, policies, and contact info.\\n\\n";
    let parts = [];

    if (input.type === 'url' && input.url) {
      // Very basic URL extraction, ideally we'd fetch the HTML and convert to text, or use Gemini's built-in search grounding. 
      // For now, let's just ask Gemini to analyze the URL directly (some models can browse or we can just fetch the content here).
      // Since we are in a Node environment, let's fetch the URL content text.
      try {
        const response = await fetch(input.url);
        const text = await response.text();
        // Take first 50000 characters to avoid exceeding token limits if it's huge
        const cleanText = text.replace(/<[^>]*>?/gm, ' ').replace(/\\s+/g, ' ').substring(0, 50000);
        prompt += \`Content from \${input.url}:\\n\\n\${cleanText}\`;
        parts = [{ text: prompt }];
      } catch (e) {
        throw new Error("Failed to fetch content from URL: " + e.message);
      }
    } else if (input.type === 'text' && input.content) {
      prompt += input.content;
      parts = [{ text: prompt }];
    } else if (input.type === 'file' && input.content && input.mimeType) {
      parts = [
        { text: prompt },
        {
          inlineData: {
            data: input.content,
            mimeType: input.mimeType
          }
        }
      ];
    } else {
      throw new Error("Invalid input for knowledge extraction");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert data extractor. You must respond ONLY with a valid JSON array of objects, each containing 'question' and 'answer' string properties. Do not include markdown formatting or any other text.",
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) return [];
    
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
         return parsed.map(item => ({
           question: item.question || item.Question || "",
           answer: item.answer || item.Answer || ""
         })).filter(item => item.question && item.answer);
      }
      return [];
    } catch (e) {
      console.error("Failed to parse knowledge extraction JSON", e, text);
      return [];
    }
  }
`;

// Insert the method just before generateChatResponse
const regex = /  public async generateChatResponse\(/;
code = code.replace(regex, extractKnowledgeMethod + '\n  public async generateChatResponse(');

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched aiAgentService.ts with extractKnowledge");
