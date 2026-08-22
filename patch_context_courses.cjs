const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Add to context type
code = code.replace(/clinicServices: ClinicService\[\];/, `clinicServices: ClinicService[];\n  courses: CourseItem[];\n  addCourse: (course: Omit<CourseItem, "id" | "workspaceId">) => void;\n  updateCourse: (id: string, updates: Partial<CourseItem>) => void;\n  deleteCourse: (id: string) => void;`);

// Add to useState
code = code.replace(/const \[clinicServices, setClinicServices\] = useState<ClinicService\[\]>\(\[\]\);/, `const [clinicServices, setClinicServices] = useState<ClinicService[]>([]);\n  const [courses, setCourses] = useState<CourseItem[]>([]);`);

// Add memoized value
code = code.replace(/const scopedClinicServices = useMemo\(\(\) => \{[\s\S]*?\}, \[clinicServices, currentWorkspace\?.id, isSuperAdmin\]\);/, `const scopedClinicServices = useMemo(() => {
    if (isSuperAdmin) return clinicServices;
    return clinicServices.filter((s) => s.workspaceId === currentWorkspace?.id);
  }, [clinicServices, currentWorkspace?.id, isSuperAdmin]);
  const scopedCourses = useMemo(() => {
    if (isSuperAdmin) return courses;
    return courses.filter((s) => s.workspaceId === currentWorkspace?.id);
  }, [courses, currentWorkspace?.id, isSuperAdmin]);`);

// Add functions
const functions = `
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
code = code.replace(/const addClinicService = \(service: Omit<ClinicService, "id" \| "workspaceId">\)/, functions + '\n  const addClinicService = (service: Omit<ClinicService, "id" | "workspaceId">)');

// Export in context
code = code.replace(/clinicServices: scopedClinicServices,/, `clinicServices: scopedClinicServices,\n        courses: scopedCourses,\n        addCourse,\n        updateCourse,\n        deleteCourse,`);

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Patched AppContext with courses");
