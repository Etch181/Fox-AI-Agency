const fs = require('fs');

let ctx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
ctx = ctx.replace(/setCurrentWorkspace\(docSnap.data\(\) as Workspace\);/g, 'setCurrentWorkspace(docSnap.data() as Workspace);'); 
// wait, the error was "Cannot find name 'setCurrentWorkspace'" in AppContext
// let's just see where it is
