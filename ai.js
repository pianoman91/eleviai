// ⚠️ NON usare questa chiave in produzione
const API_KEY = "INSERISCI_LA_TUA_API_KEY_DI_TEST";

document.getElementById("generate").addEventListener("click", async () => {
  const kw = document.getElementById("keywords").value.trim();
  const out = document.getElementById("output");

  if (kw.length === 0) {
    out.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  out.innerHTML = "<p>Generazione del microcorso in corso... ⏳</p>";

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
        max_tokens: 700,
      })
    });

    const data = await response.json();
    out.innerHTML = `<pre style="white-space: pre-wrap;">${data.choices[0].message.content}</pre>`;

  } catch (err) {
    out.innerHTML = "<p>Errore durante la generazione. Riprovare.</p>";
    console.error(err);
  }
});
