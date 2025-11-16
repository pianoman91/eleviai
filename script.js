// Anno nel footer
document.getElementById('y').textContent = new Date().getFullYear();

// Smooth scroll per i link con hash
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Form "Early Access": apre l’email con il contenuto precompilato (nessun server necessario)
const form = document.getElementById('early-form');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const to = 'founders@eleviai.com'; // cambia se vuoi
  const subject = encodeURIComponent('Richiesta Early Access EleviAI');
  const body = encodeURIComponent(`Ciao team EleviAI,\necco la mia email per l'accesso in anteprima:\n${email}\n\nObiettivi/ambito:\n- \n\nGrazie!`);
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
});
