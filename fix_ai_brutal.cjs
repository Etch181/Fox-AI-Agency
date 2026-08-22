const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const regex = /else if \(industry === "Retail"[\s\S]*?let reviewsContext = "";/;

code = code.replace(regex, `else if (industry === "Retail" && workspace.products) {
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
    }

    let reviewsContext = "";`);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Fixed aiAgentService brutally");
