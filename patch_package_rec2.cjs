const fs = require('fs');
let code = fs.readFileSync('src/components/client/PackageRecommendation.tsx', 'utf8');

code = code.replace(/const \{ plans \} = require\('\.\.\/\.\.\/data\/mockData'\);/, '');
code = code.replace(/import \{ Sparkles, TrendingUp, AlertCircle, ShoppingCart \} from "lucide-react";/, `import { Sparkles, TrendingUp, AlertCircle, ShoppingCart } from "lucide-react";\nimport { plans } from "../../data/mockData";`);

fs.writeFileSync('src/components/client/PackageRecommendation.tsx', code);
console.log("Patched PackageRecommendation for plans properly");
