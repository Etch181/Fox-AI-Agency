const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

code = code.replace(/courses: scopedCourses,/, 'courses: scopedCourses,\n        courseReviews,\n        addCourseReview,\n        updateCourseReview,\n        deleteCourseReview,');

fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Exported reviews");
