export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  const { keywords } = req.body || {};
  if (!keywords) {
    res.status(400).json({ error: "Missing keywords" });
    return;
  }

  // LEGGIAMO LE VARIABILI
  const apiKey = process.env.OPENAI_API_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;
  const orgId = process.env.OPENAI_ORG_ID;

  // ✅ NUOVO: SPECIFICHIAMO QUALI MANCANO
  const missing = [];
  if (!apiKey) missing.push("OPENAI_API_KEY");
  if (!projectId) missing.push("OPENAI_PROJECT_ID");
  if (!orgId) missing.push("OPENAI_ORG_ID");

  if (missing.length > 0) {
    res
      .status(500)
      .json({ error: "Missing env vars: " + missing.join(", ") });
    return;
  }

  const prompt = `
Genera un microcorso breve e chiaro basato su queste parole chiave: ${keywords}.
Struttura richiesta:
- Titolo del microcorso
- Durata stimata (minuti)
- Obiettivi del corso
- Lezione (max 5 paragrafi)
- 5 Quiz con risposte corrette.
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId,
        "OpenAI-Organization": orgId
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res
        .status(500)
        .json({ error: data?.error?.message || "API error" });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      res.status(500).json({ error: "No content from AI" });
      return;
    }

    res.status(200).json({ content: text });
  } catch (err) {
    res.status(500).json({ error: "Network error" });
  }
}
