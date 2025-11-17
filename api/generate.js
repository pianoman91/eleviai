// API serverless su Vercel: genera un microcorso usando OpenAI

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Solo richieste POST sono permesse" });
    return;
  }

  try {
    // Il body viene passato come JSON { keywords: "..." }
    const { keywords } = req.body || {};

    if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
      res.status(400).json({ error: "keywords mancanti o non valide" });
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "OPENAI_API_KEY non configurata sul server" });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",   // modello leggero ed economico
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      res.status(500).json({
        error: data?.error?.message || "Errore dalla API di OpenAI"
      });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      res.status(500).json({ error: "Nessun contenuto restituito dall'AI" });
      return;
    }

    res.status(200).json({ content: text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
}
