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
    const response = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: {
          type: 'page_id',
          page_id: parentPageId
        },
        title: [
          {
            type: 'text',
            text: {
              content: 'SHIFT Operations Logs'
            }
          }
        ],
        properties: {
          'Shift Name': {
            title: {}
          },
          'Date': {
            date: {}
          },
          'Callsign': {
            rich_text: {}
          },
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
          'Clock In': {
            rich_text: {}
          },
          'Clock Out': {
            rich_text: {}
          },
          'Duration (Min)': {
            number: {
              format: 'number'
            }
          },
          'Rating': {
            number: {
              format: 'number'
            }
          },
          'Status': {
            select: {
              options: [
                { name: 'completed', color: 'green' },
                { name: 'missed', color: 'red' }
              ]
            }
          },
          'Notes': {
            rich_text: {}
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to create database' });
    }

    return res.status(200).json({
      success: true,
      databaseId: data.id,
      url: data.url
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
