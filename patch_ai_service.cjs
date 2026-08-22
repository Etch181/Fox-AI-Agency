const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const retailRegex = /else if \(industry === "Retail" && workspace.products\) \{[\s\S]*?\}/;
const retailReplace = `else if (industry === "Retail" && workspace.products) {
      industryContext +=
        "STORE PRODUCTS & STOCK:\\n" +
        workspace.products
          .map((p) => \`- \${p.name}: \${p.price} \${config.currency} - Stock: \${p.stock || 10} units.\`)
          .join("\\n");
    } else if (industry === "Course Center" && workspace.courses) {
      industryContext +=
        "AVAILABLE TRAINING COURSES:\\n" +
        workspace.courses
          .map((c) => \`- \${c.name}: \${c.price} \${config.currency} (Duration: \${c.duration}, Instructor: \${c.instructor || 'TBD'}) - \${c.description || ''}\`)
          .join("\\n");
    }`;

code = code.replace(retailRegex, retailReplace);

// We need to add courseReviews to WorkspaceContext interface and prompt
const interfaceRegex = /courses\?: \{ name: string; price: number; duration: string; description\?: string \}\[\];/;
const interfaceReplace = `courses?: { name: string; price: number; duration: string; description?: string; instructor?: string }[];
  courseReviews?: { studentName: string; courseName: string; rating: number; comment: string; reply?: string }[];`;
code = code.replace(interfaceRegex, interfaceReplace);

const approvedRegex = /const approvedKnowledge = \(workspace.knowledgeBase \|\| \[\]\)/;
const approvedReplace = `
    let reviewsContext = "";
    if (industry === "Course Center" && workspace.courseReviews) {
      reviewsContext = "\\n\\nSTUDENT REVIEWS (Use these to build trust and show social proof if asked about quality):\\n" +
        workspace.courseReviews
          .map((r) => \`- \${r.studentName} rated \${r.courseName} \${r.rating}/5: "\${r.comment}" \${r.reply ? \`(Center Reply: \${r.reply})\` : ''}\`)
          .join("\\n");
    }

    const approvedKnowledge = (workspace.knowledgeBase || [])`;
code = code.replace(approvedRegex, approvedReplace);

const knowledgeBaseRegex = /IF THE USER ASKS ABOUT KNOWLEDGE BASE FACTS OR FAQ:\\n\$\{approvedKnowledge\}/;
const knowledgeBaseReplace = `IF THE USER ASKS ABOUT KNOWLEDGE BASE FACTS OR FAQ:\\n\${approvedKnowledge}\${reviewsContext}`;
code = code.replace(knowledgeBaseRegex, knowledgeBaseReplace);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched aiAgentService.ts with Course Reviews");
