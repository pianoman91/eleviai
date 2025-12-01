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

  // Importante: questi due devi metterli in Vercel come ENV
  const apiKey = process.env.OPENAI_API_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;
  const orgId = process.env.OPENAI_ORG_ID;

  if (!apiKey || !projectId || !orgId) {
    res.status(500).json({ error: "Missing API credentials" });
    return;
  }

  const prompt = `
Genera un microcorso chiaro e breve basato su queste parole chiave: ${keywords}.
Struttura:
- Titolo
- Durata
- Obiettivi
- Lezione (max 5 paragrafi)
- 5 Quiz con risposte.
`;

  try {
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": projectId,     // <-- NECESSARIO con sk-proj
        "OpenAI-Organization": orgId     // <-- NECESSARIO in molti account
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(500).json({ error: data?.error?.message || "API error" });
      return;
    }

    res.status(200).json({ content: data.choices[0].message.content });

  } catch (error) {
    res.status(500).json({ error: "Network error" });
  }
}
