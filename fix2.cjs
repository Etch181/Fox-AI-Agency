const fs = require('fs');
let code1 = fs.readFileSync('src/components/client/ClientKnowledgeBuilder.tsx', 'utf8');
code1 = code1.replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/components/client/ClientKnowledgeBuilder.tsx', code1);
