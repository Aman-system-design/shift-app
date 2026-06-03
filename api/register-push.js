export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured.' });
  }

  const { databaseId, subscription, deviceName, callsign } = req.body;
  if (!databaseId || !subscription) {
    return res.status(400).json({ error: 'Missing databaseId or subscription payload.' });
  }

  try {
    const subscriptionString = JSON.stringify(subscription);

    // Check if subscription already exists in database to avoid duplicate rows
    const queryResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          property: 'Subscription JSON',
          rich_text: {
            equals: subscriptionString
          }
        }
      })
    });

    const queryData = await queryResponse.json();
    const exists = queryData.results && queryData.results.length > 0;

    if (exists) {
      return res.status(200).json({ success: true, message: 'Device subscription already registered.' });
    }

    // Insert new subscription record
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
          'Device Name': {
            title: [
              {
                text: {
                  content: deviceName || 'Browser PWA Session'
                }
              }
            ]
          },
          'Subscription JSON': {
            rich_text: [
              {
                text: {
                  content: subscriptionString
                }
              }
            ]
          },
          'Callsign': {
            rich_text: [
              {
                text: {
                  content: callsign || 'Operator'
                }
              }
            ]
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to save subscription details.' });
    }

    return res.status(200).json({ success: true, pageId: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
