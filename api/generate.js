// API per generare un microcorso usando OpenRouter

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { keywords } = req.body || {};
  if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
    res.status(400).json({ error: "Missing keywords" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing env var: OPENROUTER_API_KEY" });
    return;
  }

  const prompt = `
Sei EleviAI. Genera un microcorso breve e chiaro basato su queste parole chiave: ${keywords}.
Struttura richiesta:
- Titolo del microcorso
- Durata stimata (minuti)
- Obiettivi del corso
- Lezione (max 5 paragrafi)
- 5 Quiz con risposte corrette.
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        // opzionale ma consigliato da OpenRouter per attribution
        "HTTP-Referer": "https://eleviai.vercel.app",
        "X-Title": "EleviAI MVP"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // modello OpenAI via OpenRouter :contentReference[oaicite:2]{index=2}
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(500).json({
        error: data?.error?.message || `API error (status ${response.status})`
      });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      res.status(500).json({ error: "No content returned from AI" });
      return;
    }

    res.status(200).json({ content: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
