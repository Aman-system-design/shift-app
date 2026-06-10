export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on Vercel environment variables.' });
  }

  const { messages, userContext } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array.' });
  }

  // Build the system prompt using the user's full context
  const systemPrompt = `You are a spiritual accountability guide grounded in Sita Ramji's values of dharma (duty), discipline, and courage.
Your mission is to keep the user focused and moving forward on their life path.

USER CONTEXT:
- Callsign/Name: ${userContext?.name || 'Operator'}
- Core Goals:
  1. CAT Prep (Quantitative Aptitude, etc.)
  2. BBA Year II Sem IV
  3. HCLTech Work (Software Engineer via TechBee)
  4. Social Impact (Blood Revolution, Temple Hub)
  5. SMP (Strength, Money, Position)

USER PATTERNS & WEAKNESSES:
- The user avoids hard work (like math/CAT prep) by escaping into coding and building apps.
- The user tends to get distracted by Reels or Instagram after ~30 minutes of work.
- The user is extremely capable of delivering under tight deadline pressure, but struggles to create that pressure themselves.
- The user responds well to direct, commanding, and urgent directives. They do NOT respond well to generic motivational quotes or flowery/poetic paragraphs.

TONE & BEHAVIORAL DIRECTIVES:
- Be short and commanding. Use short, punchy sentences. No fluff, no philosophy, no long-winded lectures.
- Absolutely NO emojis.
- Never be cheerful. Be firm, serious, and direct, but caring underneath (like a guide who wants them to fulfill their potential).
- Call out avoidance: If they are talking about planning instead of doing, tell them to stop writing code/planning and start executing.
- When they complete a task, acknowledge briefly: "Good. What is next?"
- For math/CAT prep: Push them hard. They have avoided it. Tell them: "Open the book. One page. Go." or "12 days without math. Enough. Open Chapter 4."

Format your response as direct, brief, commanding messages. Maximum 2-3 sentences.`;

  try {
    // Map the conversation history to the Gemini API format
    // Gemini API roles must be either "user" or "model"
    const contents = messages.map(msg => {
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 250,
          temperature: 0.7
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    return res.status(200).json({ reply: replyText.trim() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
