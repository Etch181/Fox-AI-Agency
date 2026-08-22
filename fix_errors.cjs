const fs = require('fs');
let code1 = fs.readFileSync('src/components/client/ClientKnowledgeBuilder.tsx', 'utf8');
code1 = code1.replace(/\\\`Q: \\\$\{fact.question\}\\\\nA: \\\$\{fact.answer\}\\\`/g, '`Q: ${fact.question}\\nA: ${fact.answer}`');
code1 = code1.replace(/\\\`تم إضافة \\\$\{selected.length\} معلومة بنجاح\\\`/g, '`تم إضافة ${selected.length} معلومة بنجاح`');
code1 = code1.replace(/\\\`Successfully added \\\$\{selected.length\} facts\\\`/g, '`Successfully added ${selected.length} facts`');
fs.writeFileSync('src/components/client/ClientKnowledgeBuilder.tsx', code1);

let code2 = fs.readFileSync('src/components/client/PackageRecommendation.tsx', 'utf8');
code2 = code2.replace(/\\\{/g, '{').replace(/\\\}/g, '}').replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('src/components/client/PackageRecommendation.tsx', code2);
