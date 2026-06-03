export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const parentPageId = '35b9e7a8adf3800db91cff6345dbdaa4';

  try {
    // 1. Create SHIFT Operations Logs database
    const logDbResponse = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ type: 'text', text: { content: 'SHIFT Operations Logs' } }],
        properties: {
          'Shift Name': { title: {} },
          'Date': { date: {} },
          'Callsign': { rich_text: {} },
          'Category': {
            select: {
              options: [
                { name: 'CAT Prep', color: 'green' },
                { name: 'Fitness', color: 'orange' },
                { name: 'Coding', color: 'blue' },
                { name: 'Reading', color: 'purple' },
                { name: 'Deep Work', color: 'pink' },
                { name: 'Custom', color: 'default' }
              ]
            }
          },
          'Clock In': { rich_text: {} },
          'Clock Out': { rich_text: {} },
          'Duration (Min)': { number: { format: 'number' } },
          'Rating': { number: { format: 'number' } },
          'Status': {
            select: {
              options: [
                { name: 'completed', color: 'green' },
                { name: 'missed', color: 'red' },
                { name: 'in-progress', color: 'blue' } // Support in-progress clocks
              ]
            }
          },
          'Notes': { rich_text: {} },
          'NotionLogId': { rich_text: {} } // For referencing page IDs to edit them later
        }
      })
    });

    const logDbData = await logDbResponse.json();
    if (!logDbResponse.ok) {
      return res.status(logDbResponse.status).json({ error: logDbData.message || 'Failed to create Logs database' });
    }

    // 2. Create SHIFT Targets (Schedule Definition) database
    const shiftDbResponse = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ type: 'text', text: { content: 'SHIFT Targets (Schedule)' } }],
        properties: {
          'Shift Name': { title: {} },
          'Category': {
            select: {
              options: [
                { name: 'CAT Prep', color: 'green' },
                { name: 'Fitness', color: 'orange' },
                { name: 'Coding', color: 'blue' },
                { name: 'Reading', color: 'purple' },
                { name: 'Deep Work', color: 'pink' },
                { name: 'Custom', color: 'default' }
              ]
            }
          },
          'Start Time': { rich_text: {} },
          'End Time': { rich_text: {} },
          'Days Active': { rich_text: {} }, // e.g. "MON, TUE, WED"
          'LocalShiftId': { rich_text: {} } // Links local localStorage shift.id
        }
      })
    });

    const shiftDbData = await shiftDbResponse.json();
    if (!shiftDbResponse.ok) {
      return res.status(shiftDbResponse.status).json({ error: shiftDbData.message || 'Failed to create Shifts database' });
    }

    return res.status(200).json({
      success: true,
      logsDatabaseId: logDbData.id,
      logsDatabaseUrl: logDbData.url,
      shiftsDatabaseId: shiftDbData.id,
      shiftsDatabaseUrl: shiftDbData.url
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
