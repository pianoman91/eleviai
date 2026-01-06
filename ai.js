const generateBtn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");
const courseLangInput = document.getElementById("courseLanguage");

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return { ok: true, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false, data: null, raw: text };
  }
}

generateBtn?.addEventListener("click", async () => {
  const kw = textarea ? textarea.value.trim() : "";
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const langPref = langPrefRaw || "Italiano";

  if (!kw) {
    output.innerHTML = "<p>Inserisci almeno una parola chiave.</p>";
    return;
  }

  const token = window.__accessToken || "";
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  output.innerHTML = "<p>Generazione dell'indice del corso in corso... ⏳</p>";

  try {
    const response = await fetch(`/api/generateOutline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        keywords: kw,
        language: langPref
      })
    });

    const parsed = await safeReadJson(response);

    if (!response.ok) {
      // se non è JSON, mostro il testo grezzo
      const msg = parsed.ok ? (parsed.data?.error || `Errore HTTP ${response.status}`) : parsed.raw;

      output.innerHTML = `
        <p><strong>Errore server:</strong> ${msg}</p>
        <p class="tiny" style="opacity:.8;">Status: ${response.status}</p>
      `;
      console.error("API error:", { status: response.status, parsed });
      return;
    }

    if (!parsed.ok) {
      output.innerHTML = `<p><strong>Errore:</strong> risposta non JSON dal server.</p><pre>${parsed.raw}</pre>`;
      console.error("Non-JSON success response:", parsed.raw);
      return;
    }

    const outlineText = parsed.data?.outline;
    if (!outlineText) {
      output.innerHTML = "<p>Nessun indice restituito dall'AI.</p>";
      console.error("No outline:", parsed.data);
      return;
    }

    localStorage.setItem("eleviai_outline", outlineText);
    localStorage.setItem("eleviai_keywords", kw);
    localStorage.setItem("eleviai_language", langPref);
    localStorage.setItem("eleviai_current_chapter", "1");

    output.innerHTML = `
      <h2>Indice del corso</h2>
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${outlineText}</pre>
      <button class="btn small" id="start-course">Inizia dal capitolo 1</button>
    `;

    document.getElementById("start-course")?.addEventListener("click", () => {
      window.location.href = "chapter.html";
    });

  } catch (err) {
    output.innerHTML = "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error:", err);
  }
});
