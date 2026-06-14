// API per generare il contenuto di UN singolo capitolo della Masterclass

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  // Auth: verifica Bearer token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase env vars" });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid session token" });
  }

  const { keywords, language, outline, chapterNumber, chapterTitle } = req.body || {};

  if (!keywords || !outline || !chapterNumber) {
    res.status(400).json({ error: "Missing keywords, outline or chapterNumber" });
    return;
  }

  const chapterNum = parseInt(chapterNumber, 10);
  if (!Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > 999) {
    res.status(400).json({ error: "Invalid chapterNumber" });
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

  const chapterRef = chapterTitle && typeof chapterTitle === "string" && chapterTitle.trim()
    ? `"${chapterTitle.trim()}"`
    : `numero ${chapterNum}`;

  const prompt = `
Sei PNL, un sistema che crea Masterclass tematiche per professionisti.

Lingua della Masterclass: ${courseLanguage}.
Parole chiave: ${keywords}.

IMPORTANTE: scrivi TUTTO il contenuto, inclusi i titoli strutturali, nella lingua "${courseLanguage}". Non usare mai parole di un'altra lingua.

Questo è l'indice completo della Masterclass:

${outline}

Devi GENERARE SOLO il contenuto del capitolo ${chapterRef}.
Questo capitolo corrisponde esattamente alla riga dell'indice che riporta il titolo ${chapterRef}.

REGOLE DI FORMATO (OBBLIGATORIE):
- NON usare Markdown.
- NON usare simboli come #, ##, *, -, • o elenchi puntati.
- Scrivi solo testo normale.

STRUTTURA DEL TESTO:
- La prima riga deve essere il titolo del capitolo in MAIUSCOLO, usando la parola corretta per "capitolo" nella lingua "${courseLanguage}" (es. CHAPTER in inglese, CAPITOLO in italiano, CHAPITRE in francese, CAPÍTULO in spagnolo, KAPITEL in tedesco).
- I sottotitoli devono essere scritti su righe brevi (max 70 caratteri), senza punteggiatura finale.

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
- Pensato per almeno 10–15 minuti di lettura, almeno 800 parole.
- Testo esteso e discorsivo, non riassuntivo o schematico.

Non aggiungere nessun altro capitolo, nessun riepilogo dell'intera Masterclass, nessun quiz.
Solo il testo del capitolo ${chapterRef}.
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
