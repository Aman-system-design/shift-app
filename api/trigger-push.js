import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const publicVapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateVapid = process.env.VAPID_PRIVATE_KEY;

  if (!token || !publicVapid || !privateVapid) {
    return res.status(500).json({ error: 'System VAPID environment variables not set.' });
  }

  const { subDatabaseId, title, body } = req.body;
  if (!subDatabaseId || !title || !body) {
    return res.status(400).json({ error: 'Missing databaseId, title or body content.' });
  }

  // Configure VAPID identifiers
  webpush.setVapidDetails(
    'mailto:shift-admin@github.com',
    publicVapid,
    privateVapid
  );

  try {
    // 1. Query all subscriptions from Notion Devices database
    const queryResponse = await fetch(`https://api.notion.com/v1/databases/${subDatabaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    const queryData = await queryResponse.json();
    if (!queryResponse.ok) {
      return res.status(queryResponse.status).json({ error: queryData.message || 'Failed to pull device subscriptions.' });
    }

    const subscriptions = queryData.results.map(page => {
      const subStr = page.properties['Subscription JSON']?.rich_text?.[0]?.plain_text || '';
      try {
        return {
          id: page.id,
          subscription: JSON.parse(subStr)
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    if (subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No registered devices to push to.' });
    }

    // 2. Loop and trigger push notifications asynchronously
    const results = await Promise.allSettled(
      subscriptions.map(async ({ id, subscription }) => {
        try {
          await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
          return { success: true };
        } catch (error) {
          // If browser has expired or unsubscribed, delete row in Notion database
          if (error.statusCode === 404 || error.statusCode === 410) {
            await fetch(`https://api.notion.com/v1/pages/${id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ archived: true })
            });
            return { success: false, reason: 'Device unsubscribed, removed subscription.' };
          }
          throw error;
        }
      })
    );

    return res.status(200).json({ success: true, sent: results.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
