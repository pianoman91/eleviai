// ELEMENTI PER IL MICROCORSO DA KEYWORDS
const generateBtn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");
const courseLangInput = document.getElementById("courseLanguage");

// ELEMENTI PER I SUGGERIMENTI DI CARRIERA
const suggestBtn = document.getElementById("suggest");
const suggestionsBox = document.getElementById("suggestions");
const linkedinInput = document.getElementById("linkedin");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const jobTitleInput = document.getElementById("jobTitle");

// === HANDLER: GENERA MICROCORSO DA KEYWORDS ===
generateBtn?.addEventListener("click", async () => {
  const kw = textarea ? textarea.value.trim() : "";
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const uiLang = document.documentElement.getAttribute("data-lang") || "it";

  // Se l'utente non specifica la lingua, usiamo quella dell'interfaccia
  const langPref = langPrefRaw || (uiLang === "en" ? "English" : "Italiano");

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

    const courseText = data.content;
    const now = new Date().toLocaleDateString("it-IT");
    const badgeId = `EAI-${Date.now().toString().slice(-6)}`;

    // Proviamo a estrarre il titolo del corso dal testo generato
    let courseTitle = kw;
    try {
      const lines = courseText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Cerchiamo una riga che contenga "Titolo del corso" o simili
      let titleLine =
        lines.find((l) =>
          /titolo del corso|course title|title of the course/i.test(l)
        ) || lines[0];

      if (titleLine) {
        const parts = titleLine.split(":");
        courseTitle =
          (parts.length > 1 ? parts.slice(1).join(":") : titleLine).trim();
      }
    } catch (e) {
      console.warn("Impossibile estrarre il titolo, uso le keywords:", e);
      courseTitle = kw;
    }

    // Testo del corso + badge + pulsante LinkedIn
    output.innerHTML = `
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${courseText}</pre>
      <div class="badge-card">
        <div class="badge-icon">✓</div>
        <div class="badge-text">
          <div class="badge-title">Badge EleviAI – Corso verificato</div>
          <div class="badge-body">
            Corso: ${courseTitle}<br/>
            Verificato il: ${now}<br/>
            ID verifica: ${badgeId}
          </div>
          <button class="btn small badge-share" data-course-title="${courseTitle}">
            Condividi su LinkedIn
          </button>
        </div>
      </div>
    `;

    // Collega il pulsante "Condividi su LinkedIn"
    const shareBtn = document.querySelector(".badge-share");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        const title =
          shareBtn.dataset.courseTitle || "Microcorso EleviAI";
        const baseUrl = window.location.origin + "/prova.html";
        const urlWithCourse = baseUrl + "?course=" + encodeURIComponent(title);

        const linkedinUrl =
          "https://www.linkedin.com/sharing/share-offsite/?url=" +
          encodeURIComponent(urlWithCourse);

        window.open(linkedinUrl, "_blank", "noopener");
      });
    }
  } catch (err) {
    output.innerHTML =
      "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (generate):", err);
  }
});

// === HANDLER: SUGGERISCI 3 CORSI PER LA CARRIERA ===
suggestBtn?.addEventListener("click", async () => {
  const linkedin = linkedinInput ? linkedinInput.value.trim() : "";
  const firstName = firstNameInput ? firstNameInput.value.trim() : "";
  const lastName = lastNameInput ? lastNameInput.value.trim() : "";
  const jobTitle = jobTitleInput ? jobTitleInput.value.trim() : "";

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
