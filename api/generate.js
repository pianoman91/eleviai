// API per generare microcorso completo (indice + seminario + quiz) usando OpenRouter

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
Scrivi TUTTO il contenuto nella lingua indicata, senza cambiare lingua a metà.

Parole chiave fornite: ${keywords}.

Genera un corso completo in TRE SEZIONI, con esattamente queste intestazioni a livello di Markdown:

### INDICE DEL CORSO
[qui inserisci solo un indice strutturato: moduli, sezioni e sottosezioni, in forma di elenco puntato]

### SEMINARIO DETTAGLIATO
[qui sviluppi il contenuto vero e proprio del seminario, seguendo l'indice punto per punto, in forma discorsiva, con spiegazioni chiare ed esempi]

### QUIZ FINALE
[qui scrivi 10 domande a scelta multipla con 3 opzioni (A, B, C) e alla fine di ogni domanda indica chiaramente la risposta corretta, ad esempio:
Domanda...
A) ...
B) ...
C) ...
Risposta corretta: B)]

Requisiti:
- Target: professionista tecnico / ingegnere che vuole approfondire
- Stile: chiaro, pratico, con esempi applicativi
- Nessun testo al di fuori di queste tre sezioni.
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
        max_tokens: 2000
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
