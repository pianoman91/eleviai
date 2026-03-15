// API per suggerire 3 titoli di corsi in base al profilo carriera
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  const { linkedin, firstName, lastName, jobTitle, language } = req.body || {};

  // Deve esserci O il link LinkedIn, O tutti i campi nome+cognome+job
  if (
    (!linkedin || !linkedin.trim()) &&
    !(firstName && lastName && jobTitle)
  ) {
    res.status(400).json({
      error:
        "Inserisci il link LinkedIn oppure Nome, Cognome e Job title."
    });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res
      .status(500)
      .json({ error: "Missing env var: OPENROUTER_API_KEY" });
    return;
  }

  // Costruzione descrizione profilo
  let profileDescription;
  if (linkedin && linkedin.trim()) {
    profileDescription = `Profilo LinkedIn (non analizzato automaticamente, solo contesto): ${linkedin.trim()}`;
  } else {
    profileDescription = `Nome: ${firstName} ${lastName}, ruolo attuale: ${jobTitle}`;
  }

  const outputLanguage = (language && typeof language === "string" && language.trim()) || "Italiano";

  const prompt = `
You are a career coach specialised in professional profiles (engineers, designers, data, tech, finance, HR, accounting).

Based on this profile:
${profileDescription}

Propose EXACTLY 3 micro-course titles (not generic courses), focused on skills that can help this person grow their career in the next 12 months.
Compare the profile against similar LinkedIn job titles and typical skill gaps at that seniority level.

Requirements:
- Output language: ${outputLanguage}
- Titles must be specific and actionable (not vague)
- Each title must be followed by a short description (1–2 sentences) of the career benefit

Output format (keep it exactly like this, no extra text before or after):

1) Course title 1
   Short description...

2) Course title 2
   Short description...

3) Course title 3
   Short description...
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        })
      }
    );

    const rawText = await response.text();
    let data;

    // Proviamo a fare il parse della risposta in JSON;
    // se non è JSON (es. HTML di errore), lo segnaliamo.
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      res.status(500).json({
        error:
          "Risposta non valida dall'AI (parse error): " +
          parseErr.message +
          " — Primo pezzo di risposta: " +
          rawText.slice(0, 200)
      });
      return;
    }

    if (!response.ok) {
      res.status(response.status).json({
        error:
          data?.error?.message ||
          `API error (status ${response.status})`
      });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      res
        .status(500)
        .json({ error: "No suggestions returned from AI" });
      return;
    }

    res.status(200).json({ suggestions: text });
  } catch (err) {
    console.error("Network/Server error (suggest):", err);
    res.status(500).json({
      error:
        "Errore di rete lato server: " +
        (err?.message || String(err))
    });
  }
}
