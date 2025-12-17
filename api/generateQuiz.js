// API per generare SOLO il quiz finale (6 domande + soluzioni alla fine)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { keywords, language, outline } = req.body || {};

  if (!keywords || !outline) {
    res.status(400).json({ error: "Missing keywords or outline" });
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

Lingua del quiz: ${courseLanguage}.
Parole chiave: ${keywords}.

Questo è l'indice del corso che lo studente ha seguito:

${outline}

Genera un QUIZ FINALE con queste caratteristiche:

- ESATTAMENTE 6 domande.
- Ogni domanda a scelta multipla con 3 opzioni (A, B, C).
- Prima scrivi tutte le domande con le 3 opzioni, SENZA indicare subito la risposta corretta.
- Alla fine, in una sezione separata chiamata "Soluzioni del quiz", elenca le risposte corrette in questo formato:
  1) B
  2) A
  3) C
  4) ...
  5) ...
  6) ...

Non aggiungere testo extra fuori dal quiz e dalla sezione "Soluzioni del quiz".
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
        max_tokens: 1500
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

    res.status(200).json({ quiz: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
