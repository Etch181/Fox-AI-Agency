const fs = require('fs');

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if (!sidebar.includes('BookOpen,')) {
    sidebar = sidebar.replace(/import \{\n/, 'import {\n  BookOpen,\n');
    fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
}

let agent = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');
agent = agent.replace(/workspaceCtx/g, 'workspace');
agent = agent.replace(/workspace\.id!/g, 'workspace.id');
fs.writeFileSync('src/services/aiAgentService.ts', agent);

