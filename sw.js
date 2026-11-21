// Service worker: guarda o app para funcionar sem internet.
const CACHE = 'alarmes-plc-v8';
const ESSENCIAIS = ['./', './index.html'];
const OPCIONAIS = ['./manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ESSENCIAIS.map(u => c.add(new Request(u, { cache: 'reload' }))));   // se falhar, não instala
    await Promise.all(OPCIONAIS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Rede primeiro quando há internet (pega versões novas); sem internet, ou se a rede
// demorar mais de 3,5 s, usa a cópia guardada.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = (await cache.match(req, { ignoreSearch: true })) ||
                     (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    try {
      const limite = new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), guardado ? 3500 : 20000));
      const resp = await Promise.race([fetch(req), limite]);
      if (resp && resp.ok) e.waitUntil(cache.put(req, resp.clone()));
      return resp;
    } catch (erro) {
      if (guardado) return guardado;
      throw erro;
    }
  })());
});
