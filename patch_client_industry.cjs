const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientIndustryModule.tsx', 'utf8');

const importRegex = /import \{ ClientClinicModule \} from "\.\/ClientClinicModule";/;
code = code.replace(importRegex, 'import { ClientClinicModule } from "./ClientClinicModule";\nimport { ClientCourseModule } from "./ClientCourseModule";\nimport { BookOpen } from "lucide-react";');

const headerRegex = /\{industry === "Pharmacy" && <Pill className="h-6 w-6 text-emerald-500" \/>\}/;
code = code.replace(headerRegex, '{industry === "Pharmacy" && <Pill className="h-6 w-6 text-emerald-500" />}\n            {industry === "Course Center" && <BookOpen className="h-6 w-6 text-indigo-500" />}');

const componentRegex = /\{industry === "Clinic" && <ClientClinicModule \/>\}/;
code = code.replace(componentRegex, '{industry === "Clinic" && <ClientClinicModule />}\n      {industry === "Course Center" && <ClientCourseModule />}');

fs.writeFileSync('src/components/client/ClientIndustryModule.tsx', code);
console.log("Patched ClientIndustryModule");
