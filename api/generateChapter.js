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
You are an expert professor and practitioner writing a chapter for a professional Masterclass.

Language: ${courseLanguage}.
Topic keywords: ${keywords}.

IMPORTANT: Write ALL content including structural titles in "${courseLanguage}". Never mix languages.

Full Masterclass outline for context:
${outline}

Write ONLY the content of chapter ${chapterRef}.

WRITING STYLE — MANDATORY:
- Write for intelligent professionals. Do NOT oversimplify. Use precise technical language.
- Be dense and direct. No padding, no repetitive summaries, no restating what was just said.
- Each sentence must add new information. Cut any sentence that merely echoes the previous one.
- Target length: 550–700 words total. Quality over quantity.
- NO Markdown. NO symbols like #, *, -, •. Plain text only.
- Subtitles: short lines (max 70 chars), no trailing punctuation.
- First line: chapter title in ALL CAPS using the correct word for "chapter" in ${courseLanguage} (e.g. CHAPTER / CAPITOLO / CHAPITRE / CAPÍTULO / KAPITEL).

REQUIRED STRUCTURE FOR EACH SECTION:
1. Core concept — explained at expert level, with nuance and depth
2. Real-world example — specific, named, concrete (company, case study, historical event, data point)
3. Practical exercise — one actionable task the reader can do immediately
4. Key reference — cite a relevant book, paper, framework or standard (e.g. "See Kahneman's Thinking Fast and Slow", "ISO 9001:2015 §8.5", "HBR, March 2019")

WHAT TO AVOID:
- Do not write "In this chapter we will see…" or "As we discussed…" type phrases
- Do not rewrite the outline
- Do not add a quiz or summary of the entire Masterclass
- Do not use bullet points or numbered lists
- Do not end with generic motivational phrases

Write only the text of chapter ${chapterRef}.
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
        max_tokens: 1800
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
