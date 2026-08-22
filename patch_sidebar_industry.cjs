const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const labelRegex = /case "Retail":\n\s*return "Products Catalog";/;
const labelReplace = `case "Retail":
        return "Products Catalog";
      case "Course Center":
        return "Courses & Training";`;
code = code.replace(labelRegex, labelReplace);

const labelArRegex = /case "Retail":\n\s*return "كتالوج المنتجات";/;
const labelArReplace = `case "Retail":
          return "كتالوج المنتجات";
        case "Course Center":
          return "الدورات والكورسات";`;
code = code.replace(labelArRegex, labelArReplace);

const iconRegex = /case "Retail":\n\s*return <ShoppingBag className="h-4 w-4" \/>;/;
const iconReplace = `case "Retail":
        return <ShoppingBag className="h-4 w-4" />;
      case "Course Center":
        return <BookOpen className="h-4 w-4" />;`;
code = code.replace(iconRegex, iconReplace);

if (!code.includes('BookOpen')) {
  const iconImportRegex = /import \{\n([\s\S]*?)LayoutDashboard,/;
  code = code.replace(iconImportRegex, 'import {\n  BookOpen,\n$1LayoutDashboard,');
}

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log("Patched Sidebar for Course Center");
