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
Sei EleviAI, un sistema che crea corsi tecnici per professionisti.

Genera un corso ESTESO e ben strutturato basato su queste parole chiave: ${keywords}.

Requisiti:
- Lingua: italiano
- Stile: chiaro, professionale, ma accessibile
- Lunghezza: circa 1.500–2.000 parole
- Target: professionista che conosce le basi ma vuole approfondire

Usa ESATTAMENTE questa struttura (mantieni le intestazioni):

Titolo del corso:
Durata stimata:
Obiettivi di apprendimento:

Modulo 1 – Fondamenta:
[spiega i concetti chiave di base]

Modulo 2 – Strumenti e metodi:
[descrivi strumenti, workflow, approcci tipici]

Modulo 3 – Applicazioni pratiche:
[fornisci esempi concreti, casi d'uso reali]

Modulo 4 – Approfondimenti avanzati:
[introduci concetti più evoluti, limiti, errori comuni]

Esempio pratico guidato:
[guidare il lettore passo passo in un mini-esercizio]

Mini-progetto finale:
[proponi un piccolo progetto applicativo con obiettivi chiari]

Quiz finale (10 domande a scelta multipla con risposta corretta evidenziata):
[scrivi 10 domande, per ciascuna 3 opzioni A/B/C e indica chiaramente la risposta corretta]

Badge di completamento (testo):
[una frase breve (2–3 righe) che descrive le competenze acquisite e che può essere usata come testo per un badge/certificato]

Non aggiungere testo al di fuori di questa struttura.`;

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

    res.status(200).json({ content: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
