const translations = {
  it: {
    home: "Home",
    login: "Accedi",
    signup: "Registrati",
    trial: "Prova gratuita",
    generate: "Genera",
    suggestions: "Suggerimenti",
    logout: "Logout"
  },
  en: {
    home: "Home",
    login: "Login",
    signup: "Sign up",
    trial: "Free trial",
    generate: "Generate",
    suggestions: "Suggestions",
    logout: "Logout"
  }
};

function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = translations[lang][key] || key;
  });
}

function toggleLanguage() {
  const current = localStorage.getItem("lang") || "it";
  setLanguage(current === "it" ? "en" : "it");
}

document.addEventListener("DOMContentLoaded", () => {
  const lang = localStorage.getItem("lang") || "it";
  setLanguage(lang);
});
