// API per generare corso completo (indice + seminario lungo + quiz) usando OpenRouter

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
Sei EleviAI, un sistema che crea corsi per professionisti.

Lingua del corso: ${courseLanguage}.
Scrivi TUTTO il contenuto nella lingua indicata, senza cambiare lingua a metà.

Parole chiave fornite: ${keywords}.

Genera un corso completo con esattamente queste intestazioni a livello di Markdown:

### INDICE DEL CORSO
[qui inserisci solo un indice strutturato: 5 capitoli e tre sottosezioni per ogni capitolo, in forma di elenco puntato]

### SEMINARIO DETTAGLIATO
[qui sviluppi il contenuto vero e proprio del seminario, seguendo l'indice punto per punto, in forma discorsiva, con spiegazioni chiare ed esempi, tempo di lettura 1 ora, minimo 10000 parole]

### QUIZ FINALE
[qui scrivi ESATTAMENTE 6 domande a scelta multipla con 4 opzioni (A, B, C, D). Prima elenca tutte le 6 domande con le opzioni, SENZA indicare subito la risposta. 
Alla fine, dopo le 6 domande, aggiungi una sottosezione intitolata "Soluzioni del quiz" e per ciascuna domanda indica chiaramente la risposta corretta, ad esempio:
1) B
2) A
3) C
4) D
...]

Requisiti per il SEMINARIO DETTAGLIATO:
- Lunghezza: pensato per una lettura di circa 60 minuti (testo lungo, con molti dettagli)
- Struttura: suddiviso in più moduli e sottosezioni, con titoli chiari
- Ogni sezione deve contenere descrizioni approfondite ed esempi applicativi
- Target: professionista tecnico / ingegnere che vuole approfondire

Requisiti per il QUIZ FINALE:
- Esattamente 6 domande
- Formato:
  Domanda 1...
  A) ...
  B) ...
  C) ...
  D) ...

  (ripeti formato per le 6 domande)
- Solo alla fine, in una sezione separata "Soluzioni del quiz", elenca le risposte corrette come indicato sopra.

Non aggiungere testo al di fuori di queste tre sezioni principali.`;

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
        max_tokens: 100000
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
