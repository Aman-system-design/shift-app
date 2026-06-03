export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const { databaseId, log, callsign } = req.body;
  if (!databaseId || !log) {
    return res.status(400).json({ error: 'Missing databaseId or log payload.' });
  }

  // Format times nicely
  const formatDateForNotion = (isoStr) => {
    if (!isoStr) return '';
    try {
      // Return ISO string without milliseconds/Z if notion doesn't want it or keep it simple
      return isoStr;
    } catch (e) {
      return '';
    }
  };

  const durationMin = Math.round((log.duration || 0) / 60000);

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: {
          'Shift Name': {
            title: [
              {
                text: {
                  content: log.shiftName || 'Unnamed Shift'
                }
              }
            ]
          },
          'Date': {
            date: {
              start: log.date // Format: YYYY-MM-DD
            }
          },
          'Callsign': {
            rich_text: [
              {
                text: {
                  content: callsign || 'Operator'
                }
              }
            ]
          },
          'Category': {
            select: {
              name: log.category || 'Custom'
            }
          },
          'Clock In': {
            rich_text: [
              {
                text: {
                  content: new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              }
            ]
          },
          'Clock Out': {
            rich_text: [
              {
                text: {
                  content: log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
                }
              }
            ]
          },
          'Duration (Min)': {
            number: durationMin
          },
          'Rating': {
            number: log.rating || 0
          },
          'Status': {
            select: {
              name: log.status || 'completed'
            }
          },
          'Notes': {
            rich_text: [
              {
                text: {
                  content: log.notes || ''
                }
              }
            ]
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to sync to Notion database' });
    }

    return res.status(200).json({ success: true, pageId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
