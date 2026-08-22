const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const courseItemRegex = /export interface CourseItem \{[\s\S]*?\}/;
const reviewInterface = `
export interface CourseReview {
  id: string;
  workspaceId: string;
  studentName: string;
  courseName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  status: "published" | "hidden";
  reply?: string;
}`;

code = code.replace(courseItemRegex, match => match + "\n" + reviewInterface);
fs.writeFileSync('src/types.ts', code);
console.log("Added CourseReview to types.ts");
