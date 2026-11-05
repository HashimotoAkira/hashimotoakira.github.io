// i18n.js – language toggle & auto-detect based on browser locale
(async () => {
  const resp = await fetch('assets/i18n.json');
  const dict = await resp.json();

  // Determine initial language: stored preference > browser language > default "en"
  const stored = localStorage.getItem('lang');
  const browserLang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  let currentLang = stored || browserLang;

  const toggleBtn = document.getElementById('langToggle');
  const flagVN = document.getElementById('flagVN');
  const flagGB = document.getElementById('flagGB');

  // Show the flag of the language it will switch TO
  function updateFlag(lang) {
    if (!flagVN || !flagGB) return;
    if (lang === 'en') {
      // Currently English → show VN flag (click to switch to Vietnamese)
      flagVN.style.display = 'block';
      flagGB.style.display = 'none';
      if (toggleBtn) toggleBtn.title = 'Chuyển sang Tiếng Việt';
    } else {
      // Currently Vietnamese → show GB flag (click to switch to English)
      flagVN.style.display = 'none';
      flagGB.style.display = 'block';
      if (toggleBtn) toggleBtn.title = 'Switch to English';
    }
  }

  // Apply translations to all elements with data-i18n
  function apply(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[lang] && dict[lang][key]) {
        el.textContent = dict[lang][key];
      }
    });
    updateFlag(lang);
  }

  // Apply on load
  apply(currentLang);

  // Toggle button handler
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentLang = currentLang === 'en' ? 'vi' : 'en';
      localStorage.setItem('lang', currentLang);
      apply(currentLang);
    });
  }
})();
