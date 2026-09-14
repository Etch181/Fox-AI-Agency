export const createCRMSpreadsheet = async (accessToken: string, workspaceName: string) => {
  // Create spreadsheet
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `CRM - ${workspaceName}` },
      sheets: [
        { properties: { title: 'Reservations' } },
        { properties: { title: 'Complaints' } },
        { properties: { title: 'Food Menu' } },
        { properties: { title: 'Medications' } }
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
        {
          range: 'Reservations!A1:E1',
          values: [['Date', 'Time', 'Name', 'Phone', 'Status']]
        },
        {
          range: 'Complaints!A1:D1',
          values: [['Date', 'Customer Name', 'Phone', 'Issue']]
        }
      ]
    })
  });

  return spreadsheetId;
};

export const checkAvailability = async (accessToken: string, spreadsheetId: string, date: string, time: string): Promise<boolean> => {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Reservations!A:B`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return true; // Default to available if error
  const data = await res.json();
  const rows = data.values || [];
  
  for (const row of rows) {
    if (row[0] === date && row[1] === time) {
      return false; // Conflict found
    }
  }
  return true; // Available
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
