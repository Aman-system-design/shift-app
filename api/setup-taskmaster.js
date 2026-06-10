export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured.' });
  }

  const { databaseId } = req.body;
  if (!databaseId) {
    return res.status(400).json({ error: 'Missing databaseId.' });
  }

  try {
    // Add 3 new properties to the existing Taskmaster database:
    // 1. Slot (Select: Morning, Afternoon, Evening, Night)
    // 2. Parent Task (Self-relation to same database)
    // 3. Days Missed (Number for AI escalation tracking)
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          'Slot': {
            select: {
              options: [
                { name: 'Morning', color: 'yellow' },
                { name: 'Afternoon', color: 'orange' },
                { name: 'Evening', color: 'purple' },
                { name: 'Night', color: 'blue' }
              ]
            }
          },
          'Parent Task': {
            relation: {
              database_id: databaseId,
              type: 'single_property',
              single_property: {}
            }
          },
          'Days Missed': {
            number: {
              format: 'number'
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Failed to update Taskmaster database properties.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Added Slot, Parent Task, and Days Missed properties to Taskmaster database.',
      databaseUrl: data.url
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
