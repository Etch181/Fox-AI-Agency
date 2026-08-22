const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

code = code.replace(/\}: \$\{p\.price\}[\s\S]*?join\("\\n"\);\n    \}/, '');

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Fixed aiAgentService tail");
