const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientCourseModule.tsx', 'utf8');

code = code.replace(/<\/div>\n\s*\}\)\}\n\s*<\/div>\n\s*\)\}\n\s*<\/>/g, '</div>\n              ))}\n            </div>\n          )}\n        </div>\n        </>');

fs.writeFileSync('src/components/client/ClientCourseModule.tsx', code);
console.log("Fixed p-6 div");
