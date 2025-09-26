(() => {
  const EYE = "👁";      // hidden state (password)
  const EYE_OFF = "🙈";  // shown state (text)

  function enhanceShowPw(root = document) {
    const inputs = root.querySelectorAll('input[type="password"][data-showpw], input[type="text"][data-showpw]');
    inputs.forEach(input => {
      // Prevent double-initialization
      if (input.dataset._pwToggleInit) return;
      input.dataset._pwToggleInit = "1";

      // Ensure a wrapper exists for positioning
      let wrap = input.closest('.pw-field');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'pw-field';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
      }

      // Make room for the button if someone overrides padding
      input.style.paddingRight = input.style.paddingRight || "42px";

      // Create the button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      const isShown = input.type === 'text';
      btn.textContent = isShown ? EYE_OFF : EYE;
      btn.setAttribute('aria-label', isShown ? 'Skrýt heslo' : 'Zobrazit heslo');
      btn.setAttribute('aria-pressed', String(isShown));
      wrap.appendChild(btn);

      // Toggle behavior
      btn.addEventListener('click', () => {
        const nowShown = input.type === 'password';
        input.type = nowShown ? 'text' : 'password';
        btn.textContent = nowShown ? EYE_OFF : EYE;
        btn.setAttribute('aria-pressed', String(nowShown));
        btn.setAttribute('aria-label', nowShown ? 'Skrýt heslo' : 'Zobrazit heslo');
        // Keep focus in the field (nice UX)
        input.focus({ preventScroll: true });
      });
    });
  }

  // Auto-run and expose for dynamic content
  document.addEventListener('DOMContentLoaded', () => enhanceShowPw());
  window.initShowPasswordToggles = enhanceShowPw;
})();