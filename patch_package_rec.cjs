const fs = require('fs');
let code = fs.readFileSync('src/components/client/PackageRecommendation.tsx', 'utf8');

code = code.replace(/const \{ currentWorkspace, language, subscriptionPlans \} = useApp\(\);/, `const { currentWorkspace, language } = useApp();\n  const { plans } = require('../../data/mockData');`);
code = code.replace(/subscriptionPlans\.find/g, 'plans.find');

fs.writeFileSync('src/components/client/PackageRecommendation.tsx', code);
console.log("Patched PackageRecommendation for plans");
