const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  /export type IndustryType = 'Clinic' \| 'Pharmacy' \| 'Restaurant' \| 'Retail' \| 'Small Business';/,
  "export type IndustryType = 'Clinic' | 'Pharmacy' | 'Restaurant' | 'Retail' | 'Small Business' | 'Course Center';"
);

fs.writeFileSync('src/types.ts', code);
console.log("Patched types.ts");
