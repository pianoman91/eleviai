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

// ===== HANDLER: GENERA SOLO L'INDICE =====

generateBtn?.addEventListener("click", async () => {
  const kw = textarea ? textarea.value.trim() : "";
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const uiLang = document.documentElement.getAttribute("data-lang") || "it";

  const langPref = langPrefRaw || (uiLang === "en" ? "English" : "Italiano");

  if (!kw) {
    output.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  output.innerHTML = "<p>Generazione dell'indice del corso in corso... ⏳</p>";

  try {
    const response = await fetch(`/api/generateOutline`, {
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
      console.error("GenerateOutline API error:", data);
      return;
    }

    if (!data.outline) {
      output.innerHTML = "<p>Nessun indice restituito dall'AI.</p>";
      console.error("No outline:", data);
      return;
    }

    const outlineText = data.outline;

    // Salvataggio in localStorage per le altre pagine
    try {
      localStorage.setItem("eleviai_outline", outlineText);
      localStorage.setItem("eleviai_keywords", kw);
      localStorage.setItem("eleviai_language", langPref);
      localStorage.setItem("eleviai_current_chapter", "1");
    } catch (e) {
      console.warn("Impossibile salvare in localStorage:", e);
    }

    output.innerHTML = `
      <h2>Indice del corso</h2>
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${outlineText}</pre>
      <button class="btn small" id="start-course">
        Inizia dal capitolo 1
      </button>
    `;

    const startBtn = document.getElementById("start-course");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        window.location.href = "chapter.html";
      });
    }
  } catch (err) {
    output.innerHTML =
      "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (generateOutline):", err);
  }
});

// ===== HANDLER: SUGGERISCI 3 CORSI PER LA CARRIERA =====

suggestBtn?.addEventListener("click", async () => {
  const linkedin = linkedinInput ? linkedinInput.value.trim() : "";
  const firstName = firstNameInput ? firstNameInput.value.trim() : "";
  const lastName = lastNameInput ? lastNameInput.value.trim() : "";
  const jobTitle = jobTitleInput ? jobTitleInput.value.trim() : "";

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
