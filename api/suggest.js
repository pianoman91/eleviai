// API per suggerire 3 titoli di corsi in base al profilo carriera
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { linkedin, firstName, lastName, jobTitle } = req.body || {};

  // Deve esserci O il link LinkedIn, O tutti i campi nome+cognome+job
  if (
    (!linkedin || !linkedin.trim()) &&
    !(firstName && lastName && jobTitle)
  ) {
    res.status(400).json({
      error: "Inserisci il link LinkedIn oppure Nome, Cognome e Job title."
    });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing env var: OPENROUTER_API_KEY" });
    return;
  }

  // Costruiamo una descrizione testuale del profilo
  let profileDescription;
  if (linkedin && linkedin.trim()) {
    profileDescription = `Profilo LinkedIn: ${linkedin.trim()}`;
  } else {
    profileDescription = `Nome: ${firstName} ${lastName}, ruolo attuale: ${jobTitle}`;
  }

  const prompt = `
Sei un career coach specializzato in profili tecnici (ingegneri, designer, data, tech).

In base a questo profilo:
${profileDescription}

Proponi ESATTAMENTE 3 titoli di micro-corsi (non di corsi generici), focalizzati su competenze che possono aiutare questa persona a far crescere la propria carriera nei prossimi 12 mesi.

Requisiti:
- Lingua: italiano
- I titoli devono essere specifici e "actionable" (non vaghi)
- Per ogni titolo aggiungi una breve descrizione (1–2 frasi) del beneficio per la carriera

Formato di output (mantienilo esattamente così):

1) Titolo corso 1
   Descrizione breve...

2) Titolo corso 2
   Descrizione breve...

3) Titolo corso 3
   Descrizione breve...
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://eleviai.vercel.app",
        "X-Title": "EleviAI – Career Suggestions"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 500
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
      res.status(500).json({ error: "No suggestions returned from AI" });
      return;
    }

    res.status(200).json({ suggestions: text });
  } catch (err) {
    console.error("Network/Server error (suggest):", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
