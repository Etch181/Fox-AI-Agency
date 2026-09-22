const CRM_SHEET_HEADERS: Record<string, string[]> = {
  Customers: ["Updated At", "Name", "Phone", "Email", "Channel", "Status"],
  Leads: ["Updated At", "Lead ID", "Name", "Phone", "Email", "Status", "Intent", "Source"],
  Reservations: ["Created At", "Appointment ID", "Date", "Time", "Name", "Phone", "Channel", "Status"],
  Complaints: ["Created At", "Complaint ID", "Customer Name", "Phone", "Channel", "Issue", "Status", "Priority"],
  Conversations: ["Created At", "Conversation ID", "Channel", "Customer", "Sender", "Agent", "Message"],
  Orders: ["Created At", "Order ID", "Customer", "Phone", "Items", "Total", "Status"],
  Marketing: ["Created At", "Post ID", "Platform", "Topic", "Content", "Scheduled At", "Status"],
  "Agent Activity": ["Created At", "Agent", "Action", "Channel", "Status", "Details"],
  "Food Menu": ["Updated At", "Item ID", "Name", "Category", "Price", "Available"],
  Medications: ["Updated At", "Item ID", "Name", "Category", "Price", "Available"],
  Products: ["Updated At", "Item ID", "Name", "Category", "Price", "Available"],
};

export const ensureCRMSpreadsheetStructure = async (
  accessToken: string,
  spreadsheetId: string,
): Promise<{ createdSheets: string[]; headerSheets: string[] }> => {
  const detailsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!detailsResponse.ok) {
    const error = await detailsResponse.json().catch(() => null);
    throw new Error(error?.error?.message || "Failed to inspect Google spreadsheet");
  }

  const details = await detailsResponse.json();
  const existing = new Set<string>(
    Array.isArray(details?.sheets)
      ? details.sheets.map((sheet: any) => String(sheet?.properties?.title || "")).filter(Boolean)
      : [],
  );

  const missing = Object.keys(CRM_SHEET_HEADERS).filter((name) => !existing.has(name));

  if (missing.length > 0) {
    const addResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
        }),
      },
    );
    if (!addResponse.ok) {
      const error = await addResponse.json().catch(() => null);
      throw new Error(error?.error?.message || "Failed to add Google CRM sheets");
    }
  }

  const headerResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: Object.entries(CRM_SHEET_HEADERS).map(([sheet, headers]) => ({
          range: `${sheet}!A1:Z1`,
          values: [headers],
        })),
      }),
    },
  );
  if (!headerResponse.ok) {
    const error = await headerResponse.json().catch(() => null);
    throw new Error(error?.error?.message || "Failed to initialize Google CRM headers");
  }

  return { createdSheets: missing, headerSheets: Object.keys(CRM_SHEET_HEADERS) };
};

export const createCRMSpreadsheet = async (accessToken: string, workspaceName: string) => {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `FOX CRM - ${workspaceName}` },
      sheets: [
        { properties: { title: 'Customers' } },
        { properties: { title: 'Leads' } },
        { properties: { title: 'Reservations' } },
        { properties: { title: 'Complaints' } },
        { properties: { title: 'Conversations' } },
        { properties: { title: 'Orders' } },
        { properties: { title: 'Marketing' } },
        { properties: { title: 'Agent Activity' } },
        { properties: { title: 'Food Menu' } },
        { properties: { title: 'Medications' } },
        { properties: { title: 'Products' } }
      ]
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to create spreadsheet');
  }
  const data = await res.json();
  
  // Add headers
  const spreadsheetId = data.spreadsheetId;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Customers!A1:F1', values: [['Updated At', 'Name', 'Phone', 'Email', 'Channel', 'Status']] },
        { range: 'Leads!A1:H1', values: [['Updated At', 'Lead ID', 'Name', 'Phone', 'Email', 'Status', 'Intent', 'Source']] },
        { range: 'Reservations!A1:H1', values: [['Created At', 'Appointment ID', 'Date', 'Time', 'Name', 'Phone', 'Channel', 'Status']] },
        { range: 'Complaints!A1:F1', values: [['Created At', 'Complaint ID', 'Customer Name', 'Phone', 'Channel', 'Issue']] },
        { range: 'Conversations!A1:G1', values: [['Created At', 'Conversation ID', 'Channel', 'Customer', 'Sender', 'Agent', 'Message']] },
        { range: 'Orders!A1:G1', values: [['Created At', 'Order ID', 'Customer', 'Phone', 'Items', 'Total', 'Status']] },
        { range: 'Marketing!A1:G1', values: [['Created At', 'Post ID', 'Platform', 'Topic', 'Content', 'Scheduled At', 'Status']] },
        { range: 'Agent Activity!A1:F1', values: [['Created At', 'Agent', 'Action', 'Channel', 'Status', 'Details']] },
        { range: 'Food Menu!A1:F1', values: [['Updated At', 'Item ID', 'Name', 'Category', 'Price', 'Available']] },
        { range: 'Medications!A1:F1', values: [['Updated At', 'Item ID', 'Name', 'Category', 'Price', 'Available']] },
        { range: 'Products!A1:F1', values: [['Updated At', 'Item ID', 'Name', 'Category', 'Price', 'Available']] },
      ]
    })
  });

  return spreadsheetId;
};

export const checkAvailability = async (accessToken: string, spreadsheetId: string, date: string, time: string): Promise<boolean> => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Reservations!A:B`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return false; // Fail closed when the tenant sheet cannot be verified
  const data = await res.json();
  const rows = data.values || [];
  
  for (const row of rows) {
    if (row[0] === date && row[1] === time) {
      return false; // Conflict found
    }
  }
  return true; // Available
};

export const appendWorkspaceSheetEvent = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: unknown[],
) => {
  const range = encodeURIComponent(`${sheetName}!A:Z`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values.map((value) => value ?? '')] }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error?.message || 'Google Sheets append failed');
  }
  return await res.json();
};

export const bookAppointmentInSheet = async (accessToken: string, spreadsheetId: string, date: string, time: string, name: string, phone: string) => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Reservations!A:E:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[date, time, name, phone, 'Confirmed']]
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to book appointment');
  }
  return await res.json();
};
