(() => {
  const SVG_SHOW = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const SVG_HIDE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  function enhanceShowPw(root = document) {
    const inputs = root.querySelectorAll('input[type="password"][data-showpw], input[type="text"][data-showpw]');
    inputs.forEach(input => {
      if (input.dataset._pwToggleInit) return;
      input.dataset._pwToggleInit = "1";

      let wrap = input.closest('.pw-field');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'pw-field';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
      }

      input.style.paddingRight = input.style.paddingRight || "42px";

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      const isShown = input.type === 'text';
      btn.innerHTML = isShown ? SVG_HIDE : SVG_SHOW;
      btn.setAttribute('aria-label', isShown ? 'Skrýt heslo' : 'Zobrazit heslo');
      btn.setAttribute('aria-pressed', String(isShown));
      wrap.appendChild(btn);

      btn.addEventListener('click', () => {
        const nowShown = input.type === 'password';
        input.type = nowShown ? 'text' : 'password';
        btn.innerHTML = nowShown ? SVG_HIDE : SVG_SHOW;
        btn.setAttribute('aria-pressed', String(nowShown));
        btn.setAttribute('aria-label', nowShown ? 'Skrýt heslo' : 'Zobrazit heslo');
        input.focus({ preventScroll: true });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => enhanceShowPw());
  window.initShowPasswordToggles = enhanceShowPw;
})();