/* global fetch, DOMParser, URL, location, document, console */
// The article HTML is already readable without JavaScript. Load the current
// Vite entry from index.html to add the normal React UI, auth and practice CTAs.
// Resolve bundles at request time so deploying frontend never leaves stale hashes.
try {
  const response = await fetch('/index.html', { cache: 'no-cache', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Cannot load application shell');
  const shell = new DOMParser().parseFromString(await response.text(), 'text/html');
  const modules = Array.from(shell.querySelectorAll('script[type="module"][src]'));
  if (!modules.length) throw new Error('Application entry missing');
  const safeAsset = (value) => {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && (url.pathname.startsWith('/assets/') || url.pathname === '/src/main.tsx');
  };
  shell.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"]').forEach((link) => {
    if (safeAsset(link.getAttribute('href'))) document.head.append(link.cloneNode(true));
  });
  for (const module of modules) {
    if (!safeAsset(module.getAttribute('src'))) continue;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = module.getAttribute('src');
    script.crossOrigin = 'anonymous';
    document.body.append(script);
  }
} catch (error) {
  // Keep the server-rendered article visible if JS/CDN/network fails.
  console.warn('News application could not start; static article remains available.', error);
}
