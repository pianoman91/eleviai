import { createClient } from "@supabase/supabase-js";

function isAdminEmail(email) {
  const raw = process.env.ADMIN_EMAILS || "";
  const admins = raw
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes((email || "").toLowerCase());
}

function isNoRowsError(err) {
  if (!err) return false;
  // PostgREST tipicamente: PGRST116 = "The result contains 0 rows"
  return err.code === "PGRST116" || (typeof err.message === "string" && err.message.toLowerCase().includes("0 rows"));
}

async function ensureProfileRow(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("trial_used")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Se la tabella esiste ma la query fallisce, blocchiamo: è un errore reale
    throw new Error("Profile read error: " + error.message);
  }

  // Nessuna riga: creiamola
  if (!data) {
    const { error: insErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, trial_used: false }, { onConflict: "id" });

    if (insErr) {
      throw new Error("Profile create error: " + insErr.message);
    }

    return { trial_used: false };
  }

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST method is allowed" });
    }

    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!process.env.OPENROUTER_API_KEY) missing.push("OPENROUTER_API_KEY");
    if (missing.length) {
      return res.status(500).json({ error: "Missing env vars: " + missing.join(", ") });
    }

    const { keywords, language } = req.body || {};
    if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
      return res.status(400).json({ error: "Missing keywords" });
    }

    // 1) Auth: richiede token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
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
      const profile = await ensureProfileRow(supabaseAdmin, user.id);

      if (profile?.trial_used) {
        return res.status(402).json({ error: "Free trial already used." });
      }

      // Marca trial usato con upsert (robusto anche se la riga non esiste o è stata creata ora)
      const { error: markErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: user.id, trial_used: true }, { onConflict: "id" });

      if (markErr) {
        return res.status(500).json({ error: "Profile update error: " + markErr.message });
      }
    }

    const prompt = `
Sei un docente universitario e instructional designer.
Devi creare un OUTLINE (indice dettagliato) di un micro-corso basato su queste parole chiave: ${keywords}.
Lingua: ${language || "Italiano"}.

Regole:
- Struttura in capitoli numerati (1, 2, 3...)
- Ogni capitolo con 3-6 punti sottosezione
- Niente testo lungo, solo outline
- Niente quiz
- Niente introduzioni tipo "Ecco l'indice:", vai diretto con l'elenco
`;

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200
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
    console.error("generateOutline fatal:", e);
    return res.status(500).json({ error: "Server crash: " + (e?.message || String(e)) });
  }
}
