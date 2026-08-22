const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientLiveChat.tsx', 'utf8');

// Update useApp to extract modules
const useAppRegex = /const \{ currentWorkspace \} = useApp\(\);/;
const useAppReplace = `const { 
    currentWorkspace, 
    knowledgeBase, 
    menuItems, 
    medicines, 
    products, 
    clinicServices, 
    courses, 
    courseReviews 
  } = useApp();`;
code = code.replace(useAppRegex, useAppReplace);

// Update fetch body
const bodyRegex = /workspace: currentWorkspace,/;
const bodyReplace = `workspace: {
            ...currentWorkspace,
            knowledgeBase,
            menu: menuItems,
            medicines,
            products,
            clinicServices,
            courses,
            courseReviews
          },`;
code = code.replace(bodyRegex, bodyReplace);

fs.writeFileSync('src/components/client/ClientLiveChat.tsx', code);
console.log("Patched ClientLiveChat to send full workspace context");
