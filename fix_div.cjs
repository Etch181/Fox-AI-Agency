const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminClientManager.tsx', 'utf8');

code = code.replace(/    <\/div>\n  \);\n\};\n$/, '      </div>\n    </div>\n  );\n};\n');

fs.writeFileSync('src/components/admin/AdminClientManager.tsx', code);
console.log("Fixed divs");
