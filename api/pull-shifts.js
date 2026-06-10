export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not configured on Vercel environment variables.' });
  }

  const { databaseId } = req.body;
  if (!databaseId) {
    return res.status(400).json({ error: 'Missing databaseId parameter.' });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to query Notion database.' });
    }

    const DAYS_MAP = {
      'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
    };

    // Format Notion entries to match local app shift models
    const shifts = data.results.map(page => {
      const props = page.properties;
      
      // Check if it's HCL shifts layout
      const isHclLayout = ('Visual Schedule' in props) || ('Shift Type' in props);
      
      if (isHclLayout) {
        const name = props['Name']?.title?.[0]?.plain_text || 'HCL Shift';
        const category = props['Shift Type']?.select?.name || 'Custom';
        const date = props['Date']?.date?.start || null;
        
        let startTime = '00:00';
        let endTime = '00:00';
        const visualSchedule = props['Visual Schedule']?.formula?.string || '';
        const timeMatch = visualSchedule.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        if (timeMatch) {
          startTime = timeMatch[1];
          endTime = timeMatch[2];
        }
        
        return {
          id: page.id,
          name,
          category,
          startTime,
          endTime,
          date,
          days: date ? [new Date(date).getDay()] : []
        };
      } else {
        // Standard template layout
        const name = props['Shift Name']?.title?.[0]?.plain_text || 'Unnamed Target';
        const category = props['Category']?.select?.name || 'Custom';
        const startTime = props['Start Time']?.rich_text?.[0]?.plain_text || '00:00';
        const endTime = props['End Time']?.rich_text?.[0]?.plain_text || '00:00';
        
        const daysText = props['Days Active']?.rich_text?.[0]?.plain_text || '';
        const days = daysText.split(',')
          .map(d => d.trim().toUpperCase())
          .filter(d => d in DAYS_MAP)
          .map(d => DAYS_MAP[d]);
        
        const id = props['LocalShiftId']?.rich_text?.[0]?.plain_text || page.id;
        
        return {
          id,
          name,
          category,
          startTime,
          endTime,
          days
        };
      }
    });

    return res.status(200).json({ success: true, shifts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
