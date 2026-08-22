const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /4\. ESCALATION & COMPLAINTS: \$\{[\s\S]*?\}/;
const replace = `4. ESCALATION & COMPLAINTS & REVIEWS: \${
      config.autoComplaintEscalation
        ? "If a customer expresses dissatisfaction or files a complaint, express sincere empathy, record their issue details, and assure them a senior manager will contact them shortly. If a customer leaves a positive review, thank them gracefully."
        : "Direct customer complaints to our official support line. Thank customers for any positive reviews."
    }`;

code = code.replace(regex, replace);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched reviews");
