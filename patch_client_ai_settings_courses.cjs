const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const importRegex = /clinicServices,/g;
code = code.replace(importRegex, 'clinicServices, courses,');

const payloadRegex = /clinicServices: clinicServices\.map\(\(s\) => \(\{/g;
code = code.replace(payloadRegex, `courses: courses.map((c) => ({
        name: c.name,
        price: c.price,
        duration: c.duration,
        description: c.description
      })),
      clinicServices: clinicServices.map((s) => ({`);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched ClientAISettings.tsx for courses");
