// api/generateOutline.js
import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email) {
  const raw = process.env.ADMIN_EMAILS || "";
  const admins = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return admins.includes((email || "").toLowerCase());
}

async function getUserFromToken(token) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, supabaseAdmin };
  return { user: data.user, supabaseAdmin };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST method is allowed" });
    return;
  }

  // 1) Auth: richiede token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { user, supabaseAdmin } = await getUserFromToken(token);

  if (!user) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }

  // 2) Email confermata (tranne admin)
  const admin = isAdminEmail(user.email);
  const confirmed = !!user.email_confirmed_at;

  if (!admin && !confirmed) {
    res.status(403).json({ error: "Email not confirmed" });
    return;
  }

  // 3) Trial gating: solo 1 volta (tranne admin)
  if (!admin) {
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("trial_used")
      .eq("id", user.id)
      .single();

    if (pErr) {
      res.status(500).json({ error: "Profile read error: " + pErr.message });
      return;
    }

    if (profile?.trial_used) {
      res.status(402).json({
        error: "Free trial already used. Please purchase a course or subscribe."
      });
      return;
    }

    // marca trial come usato ORA (così non lo riusa)
    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ trial_used: true })
      .eq("id", user.id);

    if (uErr) {
      res.status(500).json({ error: "Profile update error: " + uErr.message });
      return;
    }
  }

  // 4) Generazione outline (OpenRouter)
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
    (language && typeof language === "string" && language.trim()) || "Italiano";

  const prompt = `
Sei EleviAI, un sistema che crea corsi tecnici per professionisti.

Lingua del corso: ${courseLanguage}.
Parole chiave: ${keywords}.

Genera SOLO l'indice di un corso completo, con struttura in capitoli.

Requisiti:
- Scrivi tra 4 e 8 capitoli.
- Ogni capitolo in una riga separata.
- Formato numerato, ad esempio:
  1. Titolo del capitolo 1
  2. Titolo del capitolo 2
  3. ...

- NON aggiungere alcun testo prima o dopo la lista.
- Nessuna introduzione, nessun seminario, nessun quiz: solo la lista dei capitoli.
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
        max_tokens: 700
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

    res.status(200).json({ outline: text });
  } catch (err) {
    console.error("Network/Server error:", err);
    res.status(500).json({ error: "Network error or server error" });
  }
}
