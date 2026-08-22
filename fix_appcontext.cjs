const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(/const \[courses,[\s\S]*?deleteCourseReview, setCourses\] = useState<CourseItem\[\]>\(\[\]\);/, 'const [courses, setCourses] = useState<CourseItem[]>([]);');

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Fixed AppContext");
