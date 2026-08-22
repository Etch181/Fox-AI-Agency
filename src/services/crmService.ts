export const triggerExternalCRM = async (
  workspaceId: string,
  actionType: "booking" | "sale" | "lead",
  payload: any,
  webhookUrl?: string
) => {
  // If a webhook URL is provided by the workspace, send the payload to it
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          actionType,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`Successfully triggered external CRM webhook for ${actionType}`);
    } catch (err) {
      console.error(`Failed to trigger external CRM webhook:`, err);
    }
  }

  // Future integrations (e.g., Salesforce, Hubspot) can be added here
};
