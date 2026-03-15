// ============================================
// SERVICE WORKER — Ejemplo Básico (Nivel 1)
// ============================================
// Un Service Worker es un script que el navegador
// ejecuta en segundo plano, separado de la página web.
// Permite: caché offline, notificaciones push, sync en background.

const NOMBRE_CACHE = 'polleria-suarez-v1';

// Archivos que queremos guardar en caché para que funcionen sin internet
const ARCHIVOS_CACHE = [
  '/',
  '/new-order.html',
  '/order-summary.html',
  '/stock.html',
  '/admin-pedidos.html',
  '/app.js',
  '/contactanos.html',
  '/login.html',
  '/register.html',
  '/manifest.json',
  'new-order.html?msg',
  'order-summary.html?msg',
  'stock.html?msg',
  'admin-pedidos.html?msg',
  'contactanos.html?msg',
  'login.html?msg',
  'register.html?msg',
  // Bootstrap desde CDN (si lo descargas localmente, mejor)
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

// ==========================================
// EVENTO: install
// Se ejecuta UNA VEZ cuando el SW se instala
// ==========================================
self.addEventListener('install', (evento) => {
  console.log('[SW] 🔧 Instalando Service Worker...');

  evento.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then(cache => {
        console.log('[SW] 📦 Guardando archivos en caché');
        return cache.addAll(ARCHIVOS_CACHE);
      })
  );
});

// ==========================================
// EVENTO: activate
// Se ejecuta cuando el SW toma el control
// Aquí limpiamos cachés viejos
// ==========================================
self.addEventListener('activate', (evento) => {
  console.log('[SW] ✅ Service Worker activado');

  evento.waitUntil(
    caches.keys().then(nombres => {
      return Promise.all(
        nombres
          .filter(nombre => nombre !== NOMBRE_CACHE) // cachés que NO son el actual
          .map(nombre => {
            console.log('[SW] 🗑️ Eliminando caché viejo:', nombre);
            return caches.delete(nombre);
          })
      );
    })
  );
});

// ==========================================
// EVENTO: fetch
// Se ejecuta cada vez que la página pide un recurso
// Aquí decidimos: ¿usamos caché o internet?
// ==========================================
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request)
      .then(respuestaCacheada => {
        if (respuestaCacheada) {
          // ✅ Tenemos el archivo en caché → lo devolvemos sin ir a internet
          console.log('[SW] 📂 Sirviendo desde caché:', evento.request.url);
          return respuestaCacheada;
        }

        // ❌ No está en caché → lo pedimos a internet
        console.log('[SW] 🌐 Pidiendo a la red:', evento.request.url);
        return fetch(evento.request);
      })
  );
});
