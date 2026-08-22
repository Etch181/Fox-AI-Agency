const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Add import
const importRegex = /CourseItem,/;
code = code.replace(importRegex, 'CourseItem,\n  CourseReview,');

// Add to AppContextType
const contextTypeRegex = /courses: CourseItem\[\];/;
const contextTypeReplace = `courses: CourseItem[];
  courseReviews: CourseReview[];
  addCourseReview: (review: Omit<CourseReview, "id" | "workspaceId" | "date">) => void;
  updateCourseReview: (id: string, updates: Partial<CourseReview>) => void;
  deleteCourseReview: (id: string) => void;`;
code = code.replace(contextTypeRegex, contextTypeReplace);

// Add to state
const stateRegex = /const \[courses, setCourses\] = useState<CourseItem\[\]>\(\[\]\);/;
const stateReplace = `const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseReviews, setCourseReviews] = useState<CourseReview[]>([
    {
      id: "rev-1",
      workspaceId: "ws-1",
      studentName: "أحمد محمود",
      courseName: "دبلومة المحادثة الشاملة",
      rating: 5,
      comment: "كورس ممتاز جداً واستفدت منه كتير في تطوير لغتي",
      date: new Date().toISOString(),
      status: "published",
      reply: "شكراً لك يا أحمد، نتمنى لك التوفيق دائماً!"
    },
    {
      id: "rev-2",
      workspaceId: "ws-1",
      studentName: "سارة حسن",
      courseName: "كورس التسويق الرقمي",
      rating: 4,
      comment: "المحتوى رائع بس ياريت لو فيه أمثلة عملية أكتر",
      date: new Date(Date.now() - 86400000).toISOString(),
      status: "published"
    }
  ]);`;
code = code.replace(stateRegex, stateReplace);

// Add methods
const methodsRegex = /const deleteCourse = \(id: string\) => \{\n\s*setCourses\(\(prev\) => prev.filter\(\(c\) => c.id !== id\)\);\n\s*\};/;
const methodsReplace = `const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const addCourseReview = (review: Omit<CourseReview, "id" | "workspaceId" | "date">) => {
    if (!currentWorkspaceId) return;
    const newReview: CourseReview = {
      ...review,
      id: "rev-" + Math.random().toString(36).substring(2, 9),
      workspaceId: currentWorkspaceId,
      date: new Date().toISOString()
    };
    setCourseReviews((prev) => [newReview, ...prev]);
  };

  const updateCourseReview = (id: string, updates: Partial<CourseReview>) => {
    setCourseReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteCourseReview = (id: string) => {
    setCourseReviews((prev) => prev.filter((r) => r.id !== id));
  };`;
code = code.replace(methodsRegex, methodsReplace);

// Add to return
const returnRegex = /courses,/;
code = code.replace(returnRegex, 'courses,\n        courseReviews,\n        addCourseReview,\n        updateCourseReview,\n        deleteCourseReview,');

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Patched AppContext with Reviews");
