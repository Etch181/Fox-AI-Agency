const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminClientManager.tsx', 'utf8');

const regex = /:\s*ws\.industry === "Retail"\n\s*\?\s*"متجر"\n\s*:\s*"نشاط تجاري"/;
const replace = `: ws.industry === "Retail"
                          ? "متجر"
                          : ws.industry === "Course Center"
                          ? "مركز كورسات"
                          : "نشاط تجاري"`;

code = code.replace(regex, replace);

const selectRegex = /<option value="all">\{isAr \? "الكل" : "All Industries"\}<\/option>\n\s*<option value="Clinic">\{isAr \? "عيادة" : "Clinic"\}<\/option>/;
const selectReplace = `<option value="all">{isAr ? "الكل" : "All Industries"}</option>
              <option value="Clinic">{isAr ? "عيادة" : "Clinic"}</option>
              <option value="Course Center">{isAr ? "مركز كورسات" : "Course Center"}</option>`;
code = code.replace(selectRegex, selectReplace);

fs.writeFileSync('src/components/admin/AdminClientManager.tsx', code);
console.log("Patched AdminClientManager for Course Center");
