export default async function handler(req, res) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const databaseId = req.query.databaseId || req.body.databaseId || '9947e240b2314435a22271cee0c575c4';

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
          goalId: page.properties.Goal?.relation?.[0]?.id || null,
          doDate: page.properties['Do Date']?.date?.start || null,
          dueDate: page.properties['Due Date']?.date?.start || null,
          priority: page.properties['Priority']?.status?.name || null,
          status: page.properties['Status']?.status?.name || null,
          description: page.properties['Description']?.rich_text?.[0]?.plain_text || null
        };
      });

      return res.status(200).json({ success: true, tasks });
    }

    // ==========================================
    // CREATE TASK
    // ==========================================
    if (req.method === 'POST' && req.body.type === 'create') {
      const { name, slot, parentTaskId, goalId, doDate, dueDate, priority, status, description } = req.body;
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
      if (doDate) {
        properties['Do Date'] = { date: { start: doDate } };
      }
      if (dueDate) {
        properties['Due Date'] = { date: { start: dueDate } };
      }
      if (priority) {
        properties['Priority'] = { status: { name: priority } };
      }
      if (status) {
        properties['Status'] = { status: { name: status } };
      }
      if (description) {
        properties['Description'] = { rich_text: [{ text: { content: description } }] };
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
          goalId: goalId || null,
          doDate: doDate || null,
          dueDate: dueDate || null,
          priority: priority || null,
          status: status || null,
          description: description || null
        }
      });
    }

    // ==========================================
    // UPDATE TASK
    // ==========================================
    if (req.method === 'POST' && req.body.type === 'update') {
      const { id, completed, name, slot, parentTaskId, goalId, archived, doDate, dueDate, priority, status, description } = req.body;
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
      if (doDate !== undefined) {
        properties['Do Date'] = doDate ? { date: { start: doDate } } : { date: null };
      }
      if (dueDate !== undefined) {
        properties['Due Date'] = dueDate ? { date: { start: dueDate } } : { date: null };
      }
      if (priority !== undefined) {
        properties['Priority'] = priority ? { status: { name: priority } } : { status: null };
      }
      if (status !== undefined) {
        properties['Status'] = status ? { status: { name: status } } : { status: null };
      }
      if (description !== undefined) {
        properties['Description'] = description ? { rich_text: [{ text: { content: description } }] } : { rich_text: [] };
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
