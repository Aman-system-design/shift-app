export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const databaseId = '37b9e7a8-adf3-81cb-968a-e5da02b91bc1'; // Central Goals DB

  try {
    if (req.method === 'GET' || (req.method === 'POST' && req.body.type === 'pull')) {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            property: 'Status',
            select: {
              equals: 'Active'
            }
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to query Goals database.' });
      }

      const goals = data.results.map(page => {
        return {
          id: page.id,
          name: page.properties['Goal Name']?.title?.[0]?.plain_text || 'Unnamed Goal',
          status: page.properties['Status']?.select?.name || null,
          targetDate: page.properties['Target Date']?.date?.start || null
        };
      });

      return res.status(200).json({ success: true, goals });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
