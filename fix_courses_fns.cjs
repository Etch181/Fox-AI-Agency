const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(/addCourse: \(course: Omit< "id" \| "workspaceId">\)/g, 'addCourse: (course: Omit<CourseItem, "id" | "workspaceId">)');

const fns = `
  const addCourse = (course: Omit<CourseItem, "id" | "workspaceId">) => {
    if (!currentWorkspace) return;
    const newCourse: CourseItem = { ...course, id: Date.now().toString(), workspaceId: currentWorkspace.id };
    setCourses((prev) => [newCourse, ...prev]);
  };
  const updateCourse = (id: string, updates: Partial<CourseItem>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };
  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };
`;

code = code.replace(/const addClinicService =/g, fns + '\n  const addClinicService =');

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Fixed course functions");
