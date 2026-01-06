const generateBtn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");
const courseLangInput = document.getElementById("courseLanguage");

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

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error || `Errore HTTP ${response.status}`;

      // Trial finito (402)
      if (response.status === 402) {
        output.innerHTML = `
          <p><strong>Free trial terminato.</strong></p>
          <p>${msg}</p>
          <p>Ora puoi acquistare 1 corso oppure abbonarti (step Stripe nel prossimo passaggio).</p>
          <a class="btn small" href="index.html#pricing">Vai ai prezzi</a>
        `;
        return;
      }

      // Email non confermata
      if (response.status === 403 && /not confirmed/i.test(msg)) {
        output.innerHTML = `
          <p><strong>Email non confermata.</strong></p>
          <p>Controlla la casella email e conferma l’account, poi ricarica.</p>
        `;
        return;
      }

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

    localStorage.setItem("eleviai_outline", outlineText);
    localStorage.setItem("eleviai_keywords", kw);
    localStorage.setItem("eleviai_language", langPref);
    localStorage.setItem("eleviai_current_chapter", "1");

    output.innerHTML = `
      <h2>Indice del corso</h2>
      <pre style="white-space: pre-wrap; margin-bottom: 16px;">${outlineText}</pre>
      <button class="btn small" id="start-course">
        Inizia dal capitolo 1
      </button>
    `;

    document.getElementById("start-course")?.addEventListener("click", () => {
      window.location.href = "chapter.html";
    });

  } catch (err) {
    output.innerHTML =
      "<p><strong>Errore di rete:</strong> controlla la connessione e riprova.</p>";
    console.error("Network error (generateOutline):", err);
  }
});
