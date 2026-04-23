/**
 * lang-switch.js — Universal IT/EN language switcher for PNL.
 * Include this script in <head> (or early in <body>) on every page.
 * Pages must have: <html data-lang="it"> as default.
 * Text wrapped in .lang-it / .lang-en spans will be shown/hidden via CSS (styles.css).
 */
(function () {
  // Apply saved language immediately (before paint) to avoid flash
  const saved = localStorage.getItem("eleviai_lang");
  const lang = saved === "en" ? "en" : "it";
  document.documentElement.setAttribute("data-lang", lang);

  document.addEventListener("DOMContentLoaded", function () {
    // If the page already has a .lang-switch in the DOM, just init buttons
    // Otherwise inject a fixed floating widget in the bottom-right corner
    if (!document.querySelector(".lang-switch")) {
      const el = document.createElement("div");
      el.className = "lang-switch lang-switch-fixed";
      el.setAttribute("aria-label", "Language selector");
      el.innerHTML =
        '<button class="lang-btn" data-lang="it" type="button" aria-label="Italiano">IT</button>' +
        '<button class="lang-btn" data-lang="en" type="button" aria-label="English">EN</button>';
      document.body.appendChild(el);
    }

    const buttons = document.querySelectorAll(".lang-btn");
    const current = localStorage.getItem("eleviai_lang") || "it";
    buttons.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.lang === current);
      btn.addEventListener("click", function () {
        const l = btn.dataset.lang;
        document.documentElement.setAttribute("data-lang", l);
        localStorage.setItem("eleviai_lang", l);
        buttons.forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
      });
    });
  });
})();
