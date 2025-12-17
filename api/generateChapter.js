// API per generare il contenuto di UN singolo capitolo del corso

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { keywords, language, outline, chapterNumber } = req.body || {};

  if (!keywords || !outline || !chapterNumber) {
    res.status(400).json({ error: "Missing keywords, outline or chapterNumber" });
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

Questo è l'indice completo del corso:

${outline}

Devi GENERARE SOLO il contenuto del capitolo numero ${chapterNumber}.
Assumi che il capitolo ${chapterNumber} corrisponda a una delle righe numerate dell'indice.

Requisiti per il capitolo:
- Scrivi il contenuto solo di questo capitolo (nessun altro).
- Non riscrivere l'indice.
- Non scrivere il quiz.
- Struttura il capitolo con sezioni e sottosezioni chiare (introduzione, parti principali, conclusioni).
- Per ogni sezione:
  - spiega in modo dettagliato (livello avanzato ma chiaro),
  - inserisci esempi pratici,
  - evidenzia errori comuni,
  - suggerisci best practice.

Lunghezza:
- Pensato per almeno 10–15 minuti di lettura,
- quindi testo esteso, non riassuntivo.

Non aggiungere nessun altro capitolo, nessun riepilogo dell'intero corso, nessun quiz.
Solo il testo del capitolo ${chapterNumber}.
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
        max_tokens: 2500
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

    res.status(200).json({ chapterContent: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
