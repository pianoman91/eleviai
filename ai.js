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

// ===== FUNZIONI DI SUPPORTO =====

// Estrae una sezione tra due marker, se presenti
function extractSection(text, marker, nextMarker) {
  const start = text.indexOf(marker);
  if (start === -1) return "";
  const from = start + marker.length;
  if (!nextMarker) {
    return text.slice(from).trim();
  }
  const nextIndex = text.indexOf(nextMarker, from);
  const end = nextIndex === -1 ? text.length : nextIndex;
  return text.slice(from, end).trim();
}

// Prova a ricavare il titolo del corso dal testo completo
function extractCourseTitle(fullText, fallback) {
  try {
    const lines = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let titleLine =
      lines.find((l) =>
        /titolo del corso|course title|title of the course/i.test(l)
      ) || lines[0];

    if (!titleLine) return fallback || "Microcorso EleviAI";

    const parts = titleLine.split(":");
    const candidate =
      (parts.length > 1 ? parts.slice(1).join(":") : titleLine).trim();
    return candidate || fallback || "Microcorso EleviAI";
  } catch (e) {
    console.warn("Impossibile estrarre il titolo, uso fallback:", e);
    return fallback || "Microcorso EleviAI";
  }
}

// ===== HANDLER: GENERA MICROCORSO (MOSTRA SOLO INDICE) =====

generateBtn?.addEventListener("click", async () => {
  const kw = textarea ? textarea.value.trim() : "";
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const uiLang = document.documentElement.getAttribute("data-lang") || "it";
  const langPref = langPrefRaw || (uiLang === "en" ? "English" : "Italiano";

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

    const fullCourseText = data.content;

    // Salviamo tutto il corso in localStorage per seminar.html e quiz.html
    try {
      localStorage.setItem("eleviai_last_course", fullCourseText);
      localStorage.setItem("eleviai_last_keywords", kw);
      localStorage.setItem("eleviai_last_language", langPref);
    } catch (e) {
      console.warn("Impossibile salvare in localStorage:", e);
    }

    // Estraiamo solo l'indice per la pagina di prova
    const markerIndex = "### INDICE DEL CORSO";
    const markerSeminar = "### SEMINARIO DETTAGLIATO";

    const indexSection =
      extractSection(fullCourseText, markerIndex, markerSeminar) ||
      fullCourseText;

    const courseTitle = extractCourseTitle(fullCourseText, kw);

    output.innerHTML = `
      <h2>Indice del corso</h2>
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${indexSection}</pre>
      <button class="btn small" id="open-seminar">
        Apri seminario completo
      </button>
    `;

    const openSeminarBtn = document.getElementById("open-seminar");
    if (openSeminarBtn) {
      openSeminarBtn.addEventListener("click", () => {
        window.location.href = "seminar.html";
      });
    }

  } catch (err) {
    output.innerHTML =
      "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (generate):", err);
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
