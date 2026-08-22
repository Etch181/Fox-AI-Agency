const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

// Add import
const importRegex = /import \{ checkAvailability, bookAppointmentInSheet \} from "\.\/googleSheetsService";/;
code = code.replace(importRegex, 'import { checkAvailability, bookAppointmentInSheet } from "./googleSheetsService";\nimport { triggerExternalCRM } from "./crmService";');

// Add recordSale tool
const toolsRegex = /              name: "bookAppointment"[\s\S]*?required: \["date", "time", "name", "phone"\]\n              \}\n            \}/;
const newTools = `              name: "bookAppointment",
              description: "Book an appointment for a customer.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "The date of the appointment (e.g. 2026-07-30)" },
                  time: { type: Type.STRING, description: "The time of the appointment (e.g. 10:00 AM)" },
                  name: { type: Type.STRING, description: "The name of the customer" },
                  phone: { type: Type.STRING, description: "The phone number of the customer" }
                },
                required: ["date", "time", "name", "phone"]
              }
            },
            {
              name: "recordSale",
              description: "Record a successful sale or order.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING, description: "The name of the item or package sold" },
                  price: { type: Type.NUMBER, description: "The total price" },
                  customerName: { type: Type.STRING, description: "The name of the customer" },
                  customerPhone: { type: Type.STRING, description: "The phone number of the customer" }
                },
                required: ["itemName", "price", "customerName", "customerPhone"]
              }
            }`;
code = code.replace(toolsRegex, newTools);

// Handle recordSale and triggers
const tryCatchRegex = /                  await bookAppointmentInSheet\(workspace\.googleSheetsAccessToken!, workspace\.crmSpreadsheetId!, date, time, name, phone\);\n                   functionResult = \{ success: true, message: "Appointment booked successfully in CRM\." \};\n                \}/;
const newTryCatch = `                  await bookAppointmentInSheet(workspace.googleSheetsAccessToken!, workspace.crmSpreadsheetId!, date, time, name, phone);
                   triggerExternalCRM(workspace.id!, "booking", { date, time, name, phone }, workspace.externalCrmWebhookUrl);
                   functionResult = { success: true, message: "Appointment booked successfully in CRM." };
                }
              } else if (call.name === "recordSale") {
                const { itemName, price, customerName, customerPhone } = call.args;
                // Log the sale to external CRM or Webhook if provided
                triggerExternalCRM(workspace.id!, "sale", { itemName, price, customerName, customerPhone }, workspace.externalCrmWebhookUrl);
                functionResult = { success: true, message: "Sale recorded successfully." };
              }`;
code = code.replace(tryCatchRegex, newTryCatch);

fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched successfully");
