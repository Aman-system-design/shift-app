export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const { type, databaseId, log, shift, callsign, pageId } = req.body;

  try {
    // ==========================================
    // TYPE A: SYNC OPERATIONS LOGS
    // ==========================================
    if (type === 'log') {
      if (!databaseId || !log) {
        return res.status(400).json({ error: 'Missing databaseId or log payload.' });
      }

      const durationMin = Math.round((log.duration || 0) / 60000);
      const notionProperties = {
        'Shift Name': {
          title: [{ text: { content: log.shiftName || 'Unnamed Shift' } }]
        },
        'Date': {
          date: { start: log.date }
        },
        'Callsign': {
          rich_text: [{ text: { content: callsign || 'Operator' } }]
        },
        'Category': {
          select: { name: log.category || 'Custom' }
        },
        'Clock In': {
          rich_text: [{ text: { content: log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' } }]
        },
        'Clock Out': {
          rich_text: [{ text: { content: log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' } }]
        },
        'Duration (Min)': {
          number: durationMin
        },
        'Rating': {
          number: log.rating || 0
        },
        'Status': {
          select: { name: log.status || 'completed' }
        },
        'Notes': {
          rich_text: [{ text: { content: log.notes || '' } }]
        },
        'NotionLogId': {
          rich_text: [{ text: { content: log.id } }]
        }
      };

      let endpoint = 'https://api.notion.com/v1/pages';
      let method = 'POST';
      let bodyContent = {
        parent: { database_id: databaseId },
        properties: notionProperties
      };

      // If pageId exists, update the existing page instead of creating a new one
      if (pageId) {
        endpoint = `https://api.notion.com/v1/pages/${pageId}`;
        method = 'PATCH';
        bodyContent = {
          properties: notionProperties
        };
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyContent)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to sync log record.' });
      }

      return res.status(200).json({ success: true, pageId: data.id });
    }

    // ==========================================
    // TYPE B: SYNC SCHEDULE TEMPLATES / TARGETS
    // ==========================================
    if (type === 'shift') {
      if (!databaseId || !shift) {
        return res.status(400).json({ error: 'Missing databaseId or shift payload.' });
      }

      // Format days list
      const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const daysStr = (shift.days || []).map(d => DAYS_SHORT[d]).join(', ') || 'NONE';

      // Check if page already exists for this LocalShiftId in Notion database
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'LocalShiftId',
            rich_text: {
              equals: shift.id
            }
          }
        })
      });

      const queryData = await queryResponse.json();
      const existingPage = queryData.results && queryData.results[0];

      const shiftProperties = {
        'Shift Name': {
          title: [{ text: { content: shift.name || 'Unnamed Target' } }]
        },
        'Category': {
          select: { name: shift.category || 'Custom' }
        },
        'Start Time': {
          rich_text: [{ text: { content: shift.startTime || '00:00' } }]
        },
        'End Time': {
          rich_text: [{ text: { content: shift.endTime || '00:00' } }]
        },
        'Days Active': {
          rich_text: [{ text: { content: daysStr } }]
        },
        'LocalShiftId': {
          rich_text: [{ text: { content: shift.id } }]
        }
      };

      let response;
      if (existingPage) {
        // Update existing shift template page
        response = await fetch(`https://api.notion.com/v1/pages/${existingPage.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: shiftProperties
          })
        });
      } else {
        // Create new shift template page
        response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: shiftProperties
          })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to sync shift target template.' });
      }

      return res.status(200).json({ success: true, pageId: data.id });
    }

    // ==========================================
    // TYPE C: DELETE SCHEDULE TARGETS / TEMPLATES
    // ==========================================
    if (type === 'delete-shift') {
      if (!databaseId || !shift) {
        return res.status(400).json({ error: 'Missing databaseId or shift info.' });
      }

      let existingPageId = null;

      // 1. Try querying Notion to see if there is a page with this LocalShiftId
      const queryResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'LocalShiftId',
            rich_text: { equals: shift.id }
          }
        })
      });

      const queryData = await queryResponse.json();
      const existingPage = queryData.results && queryData.results[0];

      if (existingPage) {
        existingPageId = existingPage.id;
      } else {
        // 2. Fallback: If no LocalShiftId matches, the shift.id itself is likely the Notion page ID (created directly on Notion)
        existingPageId = shift.id;
      }

      if (existingPageId) {
        // Archive/Delete page in Notion
        const deleteResponse = await fetch(`https://api.notion.com/v1/pages/${existingPageId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            archived: true
          })
        });

        if (!deleteResponse.ok) {
          const deleteData = await deleteResponse.json();
          // If direct page archive returns 404/error, ignore (already deleted or invalid ID)
          if (deleteResponse.status !== 404) {
            return res.status(deleteResponse.status).json({ error: deleteData.message || 'Failed to delete shift page.' });
          }
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid sync type specified.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
