/* Interface preference only: scene, garment and exported artwork keep their own colors. */
(function () {
  'use strict';
  if (window.StudioTheme) return;
  const KEY = 'meinerz.interface-theme';
  const choices = [['dark', 'Escuro'], ['gray', 'Cinza'], ['light', 'Claro']];
  const valid = value => choices.some(([id]) => id === value);
  let current = 'dark';
  try { const saved = localStorage.getItem(KEY); if (valid(saved)) current = saved; } catch {}

  function apply(theme, persist = false, broadcast = false) {
    if (!valid(theme)) return;
    current = theme;
    document.documentElement.dataset.interfaceTheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = {dark:'#101010', gray:'#50545a', light:'#f2f4f6'}[theme];
    if (persist) { try { localStorage.setItem(KEY, theme); } catch {} }
    document.querySelectorAll('[data-static-theme-picker] select').forEach(select => { select.value = theme; });
    window.dispatchEvent(new CustomEvent('studio-theme-change', {detail: {theme}}));
    if (broadcast) {
      const message = {type:'meinerz-interface-theme', theme};
      if (window.parent !== window) window.parent.postMessage(message, location.origin);
      for (const frame of document.querySelectorAll('iframe')) frame.contentWindow?.postMessage(message, location.origin);
    }
  }

  window.StudioTheme = Object.freeze({get: () => current, set: theme => apply(theme, true, true)});
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) apply(valid(event.newValue) ? event.newValue : 'dark');
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || !event.data || event.data.type !== 'meinerz-interface-theme') return;
    const related = (window.parent !== window && event.source === window.parent) ||
      [...document.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source);
    if (related && valid(event.data.theme) && event.data.theme !== current) apply(event.data.theme, false, true);
  });
  apply(current);

  function mount() {
    for (const host of document.querySelectorAll('[data-static-theme-picker]')) {
      if (host.querySelector('select')) continue;
      const label = document.createElement('label');
      label.className = 'interface-theme-control';
      const text = document.createElement('span'); text.textContent = 'Aparência';
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Tema da interface');
      for (const [id, name] of choices) {
        const option = document.createElement('option'); option.value = id; option.textContent = name; select.append(option);
      }
      select.value = current;
      select.addEventListener('change', () => window.StudioTheme.set(select.value));
      label.append(text, select); host.append(label);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
