export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const databaseId = '9947e240b2314435a22271cee0c575c4';

  try {
    // ==========================================
    // GET / PULL ACTIVE INCOMPLETE TASKS
    // ==========================================
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
            property: ' Complete',
            checkbox: {
              equals: false
            }
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to query Tasks database.' });
      }

      const tasks = data.results.map(page => {
        return {
          id: page.id,
          name: page.properties.Name?.title?.[0]?.plain_text || 'Unnamed Task',
          completed: page.properties[' Complete']?.checkbox || false,
          slot: page.properties.Slot?.select?.name || null,
          parentTaskId: page.properties['Parent Task']?.relation?.[0]?.id || null,
          goalId: page.properties.Goal?.relation?.[0]?.id || null
        };
      });

      return res.status(200).json({ success: true, tasks });
    }

    // ==========================================
    // CREATE TASK
    // ==========================================
    if (req.method === 'POST' && req.body.type === 'create') {
      const { name, slot, parentTaskId, goalId } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Missing task name.' });
      }

      const properties = {
        'Name': {
          title: [{ text: { content: name } }]
        },
        ' Complete': {
          checkbox: false
        }
      };

      if (slot) {
        properties['Slot'] = { select: { name: slot } };
      }
      if (parentTaskId) {
        properties['Parent Task'] = { relation: [{ id: parentTaskId }] };
      }
      if (goalId) {
        properties['Goal'] = { relation: [{ id: goalId }] };
      }

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to create task page.' });
      }

      return res.status(200).json({
        success: true,
        task: {
          id: data.id,
          name: name,
          completed: false,
          slot: slot || null,
          parentTaskId: parentTaskId || null,
          goalId: goalId || null
        }
      });
    }

    // ==========================================
    // UPDATE TASK
    // ==========================================
    if (req.method === 'POST' && req.body.type === 'update') {
      const { id, completed, name, slot, parentTaskId, goalId, archived } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Missing task page ID.' });
      }

      const properties = {};

      if (completed !== undefined) {
        properties[' Complete'] = { checkbox: completed };
      }
      if (name !== undefined) {
        properties['Name'] = { title: [{ text: { content: name } }] };
      }
      if (slot !== undefined) {
        properties['Slot'] = slot ? { select: { name: slot } } : { select: null };
      }
      if (parentTaskId !== undefined) {
        properties['Parent Task'] = parentTaskId ? { relation: [{ id: parentTaskId }] } : { relation: [] };
      }
      if (goalId !== undefined) {
        properties['Goal'] = goalId ? { relation: [{ id: goalId }] } : { relation: [] };
      }

      const requestBody = { properties };
      if (archived !== undefined) {
        requestBody.archived = archived;
      }

      const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || 'Failed to update task page.' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
