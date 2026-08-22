const fs = require('fs');
let code = fs.readFileSync('src/components/client/ClientAISettings.tsx', 'utf8');

const sandboxCallRegex = /        body: JSON\.stringify\(\{\n          workspace: prepareWorkspaceContextPayload\(\),\n          customerMessage: input,\n          channel: "sandbox_test",\n        \}\),/;

const newSandboxCall = `        body: JSON.stringify({
          workspace: prepareWorkspaceContextPayload(),
          customerMessage: input,
          channel: "sandbox_test",
          sessionId: "sandbox_" + currentWorkspace.id,
        }),`;

code = code.replace(sandboxCallRegex, newSandboxCall);

const resetTestChatRegex = /        <div className="flex items-center justify-between pb-4">[\s\S]*?\{\/\* Live Test Chat \*\/\}/;

code = code.replace(/<button\n                    onClick=\{\(\) => setTestChatLog\(\[\]\)\}\n                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"/, `<button
                    onClick={async () => {
                      setTestChatLog([]);
                      // Reset shared memory in backend
                      await fetch("/api/ai/reset-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ workspaceId: currentWorkspace.id, sessionId: "sandbox_" + currentWorkspace.id })
                      });
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"`);

fs.writeFileSync('src/components/client/ClientAISettings.tsx', code);
console.log("Patched sandbox call in ClientAISettings.tsx");
