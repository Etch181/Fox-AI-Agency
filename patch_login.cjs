const fs = require('fs');

['src/components/LoginModal.tsx', 'src/components/public/PublicLandingPage.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  const replaceStr = '<option value="Small Business">{isAr ? "نشاط تجاري" : "Small Business"}</option>\n                  <option value="Course Center">{isAr ? "مركز تدريب / كورسات" : "Course Center"}</option>';
  code = code.replace(/<option value="Small Business">\{isAr \? "نشاط تجاري" : "Small Business"\}<\/option>/, replaceStr);
  fs.writeFileSync(file, code);
});
console.log("Patched industry dropdowns");
