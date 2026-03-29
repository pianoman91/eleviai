const generateBtn = document.getElementById("generate");
const output = document.getElementById("output");
const textarea = document.getElementById("keywords");
const courseLangInput = document.getElementById("courseLanguage");

async function handleUpgrade(plan) {
  const btns = document.querySelectorAll(".upgrade-btn");
  btns.forEach(b => { b.disabled = true; b.textContent = "…"; });

  const token = window.__accessToken || "";
  if (!token) { window.location.href = "auth.html"; return; }

  try {
    const res = await fetch("/api/stripe-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json().catch(() => ({}));

    if (data.url) {
      window.location.href = data.url;
      return;
    }
    throw new Error(data.error || "Unexpected response");
  } catch (err) {
    btns.forEach(b => { b.disabled = false; b.textContent = b.dataset.label || "…"; });
    alert(getLang() === "en" ? "Could not start checkout. Try again." : "Impossibile avviare il pagamento. Riprova.");
    console.error("Upgrade error:", err);
  }
}

const suggestBtn = document.getElementById("suggest");
const suggestionsBox = document.getElementById("suggestions");

function getLang() {
  return document.documentElement.getAttribute("data-lang") || "it";
}

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return { ok: true, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false, data: null, raw: text };
  }
}

// ---- Generate lecture outline ----
generateBtn?.addEventListener("click", async () => {
  const kw = textarea ? textarea.value.trim() : "";
  const langPrefRaw = courseLangInput ? courseLangInput.value.trim() : "";
  const langPref = langPrefRaw || "Italiano";
  const lang = getLang();

  if (!kw) {
    output.innerHTML = `<p>${lang === "en" ? "Enter at least one keyword." : "Inserisci almeno una parola chiave."}</p>`;
    return;
  }

  const token = window.__accessToken || "";
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  output.innerHTML = `<p>${lang === "en" ? "Generating course outline... ⏳" : "Generazione dell'indice del corso in corso... ⏳"}</p>`;

  try {
    const response = await fetch("/api/generateOutline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ keywords: kw, language: langPref })
    });

    const parsed = await safeReadJson(response);

    if (!response.ok) {
      if (response.status === 402) {
        const isEn = lang === "en";
        output.innerHTML = `
          <div style="
            background: linear-gradient(135deg, #1a1530 0%, #0e1a26 100%);
            border: 1px solid #3d2f70;
            border-radius: 14px;
            padding: 28px 24px;
            text-align: center;
          ">
            <h3 style="margin: 0 0 8px; font-size: 20px;">
              ${isEn ? "Free trial used" : "Prova gratuita esaurita"}
            </h3>
            <p style="color: var(--muted); margin: 0 0 24px; font-size: 14px; line-height: 1.6;">
              ${isEn
                ? "Purchase additional seminars to keep learning."
                : "Acquista seminari aggiuntivi per continuare a imparare."}
            </p>
            <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
              <div style="
                background: #0c1020;
                border: 1px solid #2a3145;
                border-radius: 12px;
                padding: 20px 24px;
                flex: 1 1 180px;
                max-width: 220px;
              ">
                <div style="font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;">
                  1 Seminar
                </div>
                <div style="font-size: 28px; font-weight: 900; margin-bottom: 16px;">
                  €4.99
                </div>
                <button class="btn small upgrade-btn" data-plan="single" data-label="${isEn ? 'Buy 1' : 'Acquista 1'}" style="width:100%;">
                  ${isEn ? "Buy 1" : "Acquista 1"}
                </button>
              </div>
              <div style="
                background: #0c1020;
                border: 2px solid #7c5cff;
                border-radius: 12px;
                padding: 20px 24px;
                flex: 1 1 180px;
                max-width: 220px;
                position: relative;
              ">
                <div style="
                  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
                  background: linear-gradient(135deg, #7c5cff, #31d0aa);
                  color: #0b0d12; font-weight: 800; font-size: 10px;
                  letter-spacing: .8px; text-transform: uppercase;
                  padding: 2px 10px; border-radius: 10px;
                ">${isEn ? "Best value" : "Miglior offerta"}</div>
                <div style="font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;">
                  5 Seminars
                </div>
                <div style="font-size: 28px; font-weight: 900; margin-bottom: 4px;">
                  €9.99
                </div>
                <div style="font-size: 12px; color: #31d0aa; margin-bottom: 12px;">
                  ${isEn ? "Save 60%" : "Risparmi il 60%"}
                </div>
                <button class="btn small upgrade-btn" data-plan="pack5" data-label="${isEn ? 'Buy 5' : 'Acquista 5'}" style="width:100%; background:linear-gradient(135deg,#7c5cff,#31d0aa); border:none; color:#0b0d12; font-weight:700;">
                  ${isEn ? "Buy 5" : "Acquista 5"}
                </button>
              </div>
            </div>
          </div>
        `;
        document.querySelectorAll(".upgrade-btn").forEach(btn => {
          btn.addEventListener("click", () => handleUpgrade(btn.dataset.plan));
        });
        return;
      }
      const msg = parsed.ok ? (parsed.data?.error || `Errore HTTP ${response.status}`) : parsed.raw;
      output.innerHTML = `<p><strong>${lang === "en" ? "Server error" : "Errore server"}:</strong> ${msg}</p>`;
      return;
    }

    if (!parsed.ok) {
      output.innerHTML = `<p><strong>Errore:</strong> risposta non JSON dal server.</p><pre>${parsed.raw}</pre>`;
      return;
    }

    const outlineText = parsed.data?.outline;
    if (!outlineText) {
      output.innerHTML = `<p>${lang === "en" ? "No outline returned from AI." : "Nessun indice restituito dall'AI."}</p>`;
      return;
    }

    localStorage.setItem("eleviai_outline", outlineText);
    localStorage.setItem("eleviai_keywords", kw);
    localStorage.setItem("eleviai_language", langPref);
    localStorage.setItem("eleviai_current_chapter", "1");

    output.innerHTML = `
      <h2>${lang === "en" ? "Course outline" : "Indice del corso"}</h2>
      <pre style="white-space:pre-wrap; margin-bottom:16px;">${outlineText}</pre>
      <button class="btn small" id="start-course">
        ${lang === "en" ? "Start from chapter 1" : "Inizia dal capitolo 1"}
      </button>
    `;

    document.getElementById("start-course")?.addEventListener("click", () => {
      window.location.href = "chapter.html";
    });

  } catch (err) {
    output.innerHTML = `<p><strong>${getLang() === "en" ? "Network error:" : "Errore di rete:"}</strong> ${getLang() === "en" ? "check your connection and try again." : "controlla la connessione e riprova."}</p>`;
    console.error("Network error:", err);
  }
});

// ---- Career course suggestions ----
suggestBtn?.addEventListener("click", async () => {
  const lang = getLang();
  const linkedin = (document.getElementById("linkedin")?.value || "").trim();
  const firstName = (document.getElementById("firstName")?.value || "").trim();
  const lastName = (document.getElementById("lastName")?.value || "").trim();
  const jobTitle = (document.getElementById("jobTitle")?.value || "").trim();

  if (!linkedin && !(firstName && lastName && jobTitle)) {
    suggestionsBox.innerHTML = `<p style="color:#ff8080;">${
      lang === "en"
        ? "Enter a LinkedIn URL, or fill in First name, Last name and Job title."
        : "Inserisci il link LinkedIn oppure Nome, Cognome e Job title."
    }</p>`;
    return;
  }

  const token = window.__accessToken || "";
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  suggestionsBox.innerHTML = `<p>${lang === "en" ? "Analysing your profile... ⏳" : "Analisi del tuo profilo in corso... ⏳"}</p>`;
  suggestBtn.disabled = true;

  try {
    const response = await fetch("/api/suggest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ linkedin, firstName, lastName, jobTitle, language: lang === "en" ? "English" : "Italiano" })
    });

    const parsed = await safeReadJson(response);

    if (!response.ok) {
      const msg = parsed.ok ? (parsed.data?.error || `HTTP ${response.status}`) : parsed.raw;
      suggestionsBox.innerHTML = `<p style="color:#ff8080;"><strong>${lang === "en" ? "Error" : "Errore"}:</strong> ${msg}</p>`;
      return;
    }

    if (!parsed.ok || !parsed.data?.suggestions) {
      suggestionsBox.innerHTML = `<p style="color:#ff8080;">${lang === "en" ? "No suggestions received." : "Nessun suggerimento ricevuto."}</p>`;
      return;
    }

    renderSuggestions(parsed.data.suggestions, lang);

  } catch (err) {
    suggestionsBox.innerHTML = `<p style="color:#ff8080;">${lang === "en" ? "Network error. Try again." : "Errore di rete. Riprova."}</p>`;
    console.error("Suggest error:", err);
  } finally {
    suggestBtn.disabled = false;
  }
});

function renderSuggestions(text, lang) {
  // Parse the numbered format:  "1) Title\n   Description..."
  const blocks = text.split(/\n\s*(?=\d+\))/g).map(b => b.trim()).filter(Boolean);
  const cards = blocks.map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    // First line: "1) Title of the course"
    const titleLine = lines[0] || "";
    const title = titleLine.replace(/^\d+\)\s*/, "").trim();
    const description = lines.slice(1).join(" ").trim();
    return { title, description };
  }).filter(c => c.title);

  if (!cards.length) {
    // Fallback: just show raw text
    suggestionsBox.innerHTML = `<pre style="white-space:pre-wrap;">${text}</pre>`;
    return;
  }

  const html = cards.map((c, i) => `
    <div style="
      background:#0c1020;
      border:1px solid #2a3145;
      border-radius:12px;
      padding:16px 18px;
      margin-bottom:12px;
    ">
      <div style="font-size:11px; font-weight:700; color:var(--brand-2); letter-spacing:.8px; text-transform:uppercase; margin-bottom:6px;">
        ${lang === "en" ? "Suggestion" : "Suggerimento"} ${i + 1}
      </div>
      <div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px;">${escapeHtml(c.title)}</div>
      ${c.description ? `<div style="font-size:14px; color:var(--muted); line-height:1.5; margin-bottom:14px;">${escapeHtml(c.description)}</div>` : ""}
      <button
        class="btn small"
        style="background:linear-gradient(135deg,var(--brand),var(--brand-2)); border:none; color:#0b0d12; font-weight:700;"
        data-title="${escapeAttr(c.title)}"
        onclick="generateFromSuggestion(this.dataset.title)"
      >
        ${lang === "en" ? "Generate this lecture →" : "Genera questa lezione →"}
      </button>
    </div>
  `).join("");

  suggestionsBox.innerHTML = html;
}

// Called by the suggestion card buttons
window.generateFromSuggestion = function (courseTitle) {
  if (textarea) textarea.value = courseTitle;
  if (!courseLangInput.value.trim()) {
    courseLangInput.value = getLang() === "en" ? "English" : "Italiano";
  }
  // Scroll to and trigger the generate button
  output.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => generateBtn?.click(), 400);
};

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return (s || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// Auto-trigger checkout if redirected here from pricing page
(function () {
  const plan = new URLSearchParams(window.location.search).get("checkout");
  if (plan === "single" || plan === "pack5") {
    handleUpgrade(plan);
  }
})();
