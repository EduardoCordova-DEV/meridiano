// Apply the saved choice before React; never write during startup.
(() => {
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  let background;
  try {
    const saved = JSON.parse(localStorage.getItem('meridiano.preferences.v1') || 'null');
    if (saved?.version === 1 && (saved.theme === 'light' || saved.theme === 'dark')) theme = saved.theme;
    const color = saved?.version === 1 ? saved.personalization?.[theme]?.background : undefined;
    if (typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)) background = color;
  } catch {
    // The app's storage loader displays invalid-data and storage-access errors.
  }
  document.documentElement.dataset.theme = theme;
  if (background) document.documentElement.style.setProperty('--p-page', background);
  document.querySelector('meta[name="theme-color"]').content = background || (theme === 'dark' ? '#111b19' : '#f7f8f4');
})();
