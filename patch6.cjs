const fs = require('fs');
let code = fs.readFileSync('src/services/aiAgentService.ts', 'utf8');

const buggyStr = `                } else {
                   await bookAppointmentInSheet(workspace.googleSheetsAccessToken!, workspace.crmSpreadsheetId!, date, time, name, phone);
                   triggerExternalCRM(workspace.id!, "booking", { date, time, name, phone }, workspace.externalCrmWebhookUrl);
                   functionResult = { success: true, message: "Appointment booked successfully in CRM." };
                }
              } else if (call.name === "recordSale") {
                const { itemName, price, customerName, customerPhone } = call.args;
                // Log the sale to external CRM or Webhook if provided
                triggerExternalCRM(workspace.id!, "sale", { itemName, price, customerName, customerPhone }, workspace.externalCrmWebhookUrl);
                functionResult = { success: true, message: "Sale recorded successfully." };
              }
              }
            } catch (err: any) {`;

const fixStr = `                } else {
                   await bookAppointmentInSheet(workspace.googleSheetsAccessToken!, workspace.crmSpreadsheetId!, date, time, name, phone);
                   triggerExternalCRM(workspace.id!, "booking", { date, time, name, phone }, workspace.externalCrmWebhookUrl);
                   functionResult = { success: true, message: "Appointment booked successfully in CRM." };
                }
              } else if (call.name === "recordSale") {
                const { itemName, price, customerName, customerPhone } = call.args as any;
                // Log the sale to external CRM or Webhook if provided
                triggerExternalCRM(workspace.id!, "sale", { itemName, price, customerName, customerPhone }, workspace.externalCrmWebhookUrl);
                functionResult = { success: true, message: "Sale recorded successfully." };
              }
            } catch (err: any) {`;

code = code.replace(buggyStr, fixStr);
fs.writeFileSync('src/services/aiAgentService.ts', code);
console.log("Patched successfully");
