// ⚠️ SOLO PER TEST – NON LASCIARE QUESTA CHIAVE IN UN REPO PUBBLICO
const API_KEY = "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";

const btn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");

// Verifica base che il file sia caricato
if (!btn || !output || !textarea) {
  alert("ai.js è caricato, ma non trova gli elementi nella pagina.");
}

btn.addEventListener("click", async () => {
  const kw = textarea.value.trim();

  if (!kw) {
    output.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  output.innerHTML = "<p>Generazione del microcorso in corso... ⏳</p>";

  const prompt = `
Sei EleviAI. Genera un microcorso breve e chiaro basato su queste parole chiave: ${kw}.
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
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      output.innerHTML = "<p>Errore: risposta non valida dal server.</p>";
      console.error("Parsing error:", e);
      return;
    }

    // Se OpenAI risponde con errore (es. quota, chiave, billing, modello)
    if (!response.ok) {
      const msg = data?.error?.message || `Errore HTTP ${response.status}`;
      output.innerHTML = `<p><strong>Errore API:</strong> ${msg}</p>`;
      console.error("API error:", data);
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      output.innerHTML = "<p>Errore: nessun contenuto restituito dall'AI.</p>";
      console.error("No content:", data);
      return;
    }

    output.innerHTML = `<pre style="white-space: pre-wrap;">${text}</pre>`;
  } catch (err) {
    output.innerHTML = "<p>Errore di rete o di connessione. Controlla la console.</p>";
    console.error("Network/JS error:", err);
  }
});
