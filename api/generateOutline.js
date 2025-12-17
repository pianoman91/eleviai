// API per generare SOLO l'indice del corso usando OpenRouter

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { keywords, language } = req.body || {};

  if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
    res.status(400).json({ error: "Missing keywords" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing env var: OPENROUTER_API_KEY" });
    return;
  }

  const courseLanguage =
    (language && typeof language === "string" && language.trim()) ||
    "Italiano";

  const prompt = `
Sei EleviAI, un sistema che crea corsi tecnici per professionisti.

Lingua del corso: ${courseLanguage}.
Parole chiave: ${keywords}.

Genera SOLO l'indice di un corso completo, con struttura in capitoli.

Requisiti:
- Scrivi tra 4 e 8 capitoli.
- Ogni capitolo in una riga separata.
- Formato numerato, ad esempio:
  1. Titolo del capitolo 1
  2. Titolo del capitolo 2
  3. ...

- NON aggiungere alcun testo prima o dopo la lista.
- Nessuna introduzione, nessun seminario, nessun quiz: solo la lista dei capitoli.
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600
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

    res.status(200).json({ outline: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
