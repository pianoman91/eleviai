// ELEMENTI ESISTENTI (microcorso da keywords)
const generateBtn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");
const courseLangInput = document.getElementById("courseLanguage");


// NUOVI ELEMENTI (suggerimenti carriera)
const suggestBtn = document.getElementById("suggest");
const suggestionsBox = document.getElementById("suggestions");
const linkedinInput = document.getElementById("linkedin");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const jobTitleInput = document.getElementById("jobTitle");

// DEBUG MINIMO: controlla che gli elementi siano trovati
console.log("generateBtn:", generateBtn);
console.log("suggestBtn:", suggestBtn);

// === HANDLER: GENERA MICROCORSO DA KEYWORDS ===
generateBtn?.addEventListener("click", async () => {
  const kw = textarea.value.trim();
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const uiLang = document.documentElement.getAttribute("data-lang") || "it";

  // se l'utente non scrive nulla, usiamo la lingua dell'interfaccia
  const langPref =
    langPrefRaw ||
    (uiLang === "en" ? "English" : "Italiano");

  if (!kw) {
    output.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  output.innerHTML = "<p>Generazione del microcorso in corso... ⏳</p>";

  try {
    const response = await fetch(`/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: kw,
        language: langPref
      })
    });
    // ...


    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error || `Errore HTTP ${response.status}`;
      output.innerHTML = `<p><strong>Errore server:</strong> ${msg}</p>`;
      console.error("Generate API error:", data);
      return;
    }

    if (!data.content) {
      output.innerHTML = "<p>Nessun contenuto restituito dall'AI.</p>";
      console.error("No content:", data);
      return;
    }

    const now = new Date().toLocaleDateString("it-IT");
    const badgeId = `EAI-${Date.now().toString().slice(-6)}`;
    const courseText = data.content;

    // testuale + badge grafico
    output.innerHTML = `
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${courseText}</pre>
      <div class="badge-card">
        <div class="badge-icon">✓</div>
        <div class="badge-text">
          <div class="badge-title">Badge EleviAI – Corso verificato</div>
          <div class="badge-body">
            Argomento: ${kw}<br/>
            Verificato il: ${now}<br/>
            ID verifica: ${badgeId}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    output.innerHTML = "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (generate):", err);
  }
});

// === HANDLER: SUGGERISCI 3 CORSI PER LA CARRIERA ===
suggestBtn?.addEventListener("click", async () => {
  const linkedin = linkedinInput.value.trim();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const jobTitle = jobTitleInput.value.trim();

  // Deve esserci O il link LinkedIn, O Nome+Cognome+Job Title
  if (!linkedin && !(firstName && lastName && jobTitle)) {
    suggestionsBox.innerHTML =
      "<p>Inserisci il link LinkedIn <strong>oppure</strong> Nome, Cognome e Job title.</p>";
    return;
  }

  suggestionsBox.innerHTML =
    "<p>Analizzo il profilo e calcolo i migliori corsi per la tua carriera... ⏳</p>";

  try {
    const response = await fetch(`/api/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkedin,
        firstName,
        lastName,
        jobTitle
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error || `Errore HTTP ${response.status}`;
      suggestionsBox.innerHTML = `<p><strong>Errore server:</strong> ${msg}</p>`;
      console.error("Suggest API error:", data);
      return;
    }

    if (!data.suggestions) {
      suggestionsBox.innerHTML = "<p>Nessun suggerimento ricevuto dall'AI.</p>";
      console.error("No suggestions content:", data);
      return;
    }

    suggestionsBox.innerHTML = `
      <pre style="white-space: pre-wrap; margin:0;">${data.suggestions}</pre>
    `;
  } catch (err) {
    suggestionsBox.innerHTML =
      "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (suggest):", err);
  }
});
