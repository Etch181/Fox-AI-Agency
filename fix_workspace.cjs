const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');
code = code.replace(/const workspace = params.workspace \|\| \{\};/, '');
fs.writeFileSync('src/services/aiAgentService.ts', code);
