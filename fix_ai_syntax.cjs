const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

code = code.replace(/\}: \$\{p\.price\} \$\{config\.currency\} - Stock: \$\{p\.stock \|\| 10\} units\.`\)\n\s*\.join\("\\n"\);\n\s*\}/, '');

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Fixed aiAgentService syntax");
