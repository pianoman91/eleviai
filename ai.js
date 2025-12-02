// Versione che usa il backend su Vercel per chiamare OpenAI

const btn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");

// Sostituisci questo con il tuo URL Vercel se necessario
// Se la pagina prova.html gira su Vercel, puoi usare direttamente "/api/generate"
const API_BASE = ""; // vuoto = stesso dominio dove gira la pagina

if (!btn || !output || !textarea) {
  alert("ai.js è caricato, ma non trova gli elementi nella pagina. Controlla gli id nel file prova.html");
}

btn.addEventListener("click", async () => {
  const kw = textarea.value.trim();

  if (!kw) {
    output.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  output.innerHTML = "<p>Generazione del microcorso in corso... ⏳</p>";

  try {
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ keywords: kw })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error || `Errore HTTP ${response.status}`;
      output.innerHTML = `<p><strong>Errore server:</strong> ${msg}</p>`;
      console.error("API error:", data);
      return;
    }

    if (!data.content) {
      output.innerHTML = "<p>Errore: nessun contenuto restituito dal server.</p>";
      console.error("No content:", data);
      return;
    }

   const now = new Date().toLocaleDateString("it-IT");
const courseText = data.content;

output.innerHTML = `
  <pre style="white-space: pre-wrap; margin-bottom: 16px;">${courseText}</pre>
  <div class="badge-card">
    <div class="badge-icon">✓</div>
    <div class="badge-text">
      <div class="badge-title">Badge EleviAI – Corso verificato</div>
      <div class="badge-body">
        Argomento: ${kw}<br/>
        Verificato il: ${now}<br/>
        ID verifica: EAI-${Date.now().toString().slice(-6)}
      </div>
    </div>
  </div>
`;

  } catch (err) {
    output.innerHTML = "<p><strong>Errore di rete:</strong> controlla la connessione o l'URL dell'API.</p>";
    console.error("Network error:", err);
  }
});
