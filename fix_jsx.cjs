const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientCourseModule.tsx', 'utf8');

code = code.replace(/<\/div>\n\s*<\/div>\n\s*<\/>/g, '</>');

fs.writeFileSync('src/components/client/ClientCourseModule.tsx', code);
console.log("Fixed JSX error");
