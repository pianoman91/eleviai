import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email) {
  const raw = process.env.ADMIN_EMAILS || "";
  const admins = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes((email || "").toLowerCase());
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST method is allowed" });
    }

    // ENV CHECK (così se manca qualcosa NON crasha)
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!process.env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
    if (missing.length) {
      return res.status(500).json({ error: "Missing env vars: " + missing.join(", ") });
    }

    // 1) Auth: richiede token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Not authenticated (missing Bearer token)" });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid session token" });
    }

    const user = userData.user;
    const admin = isAdminEmail(user.email);

    // 2) Email confermata (tranne admin)
    const confirmed = !!user.email_confirmed_at;
    if (!admin && !confirmed) {
      return res.status(403).json({ error: "Email not confirmed" });
    }

    // 3) Trial gating: solo 1 volta (tranne admin)
    if (!admin) {
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("trial_used")
        .eq("id", user.id)
        .single();

      if (pErr) {
        return res.status(500).json({ error: "Profile read error: " + pErr.message });
      }

      if (profile?.trial_used) {
        return res.status(402).json({ error: "Free trial already used." });
      }

      // marca trial usato subito
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ trial_used: true })
        .eq("id", user.id);

      if (uErr) {
        return res.status(500).json({ error: "Profile update error: " + uErr.message });
      }
    }

    // 4) Input
    const { keywords, language } = req.body || {};
    if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
      return res.status(400).json({ error: "Missing keywords" });
    }

    const courseLanguage =
      (language && typeof language === "string" && language.trim()) || "Italiano";

    const prompt = `
Sei EleviAI, un sistema che crea corsi per professionisti.

Lingua del corso: ${courseLanguage}.
Parole chiave: ${keywords}.

Genera SOLO l'indice di un corso completo.

Requisiti:
- 4–8 capitoli
- 1 riga per capitolo
- formato numerato: "1. ...", "2. ..."
- nessun testo prima/dopo la lista
`;

    // 5) OpenRouter
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700
      })
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      const msg = data?.error?.message || `OpenRouter error ${r.status}`;
      return res.status(500).json({ error: msg });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: "No content returned from AI" });
    }

    return res.status(200).json({ outline: text });

  } catch (e) {
    // Catch finale: mai più HTML/plain text, sempre JSON
    console.error("generateOutline fatal:", e);
    return res.status(500).json({ error: "Server crash: " + (e?.message || String(e)) });
  }
}
