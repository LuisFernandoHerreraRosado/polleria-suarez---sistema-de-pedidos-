// =========================================================
// SERVICE WORKER — Gestión de Caché y Funcionamiento Offline
// =========================================================
// Un Service Worker es un script que el navegador ejecuta en segundo plano.
// Permite que la aplicación funcione sin conexión a internet (offline),
// manejando las peticiones de red y sirviendo archivos desde la caché.

const NOMBRE_CACHE = 'polleria-suarez-v1';

// Lista de archivos que se guardarán en la caché del navegador
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
  // Bootstrap desde CDN para que la interfaz se vea bien incluso offline
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

// ==========================================
// EVENTO: install (Instalación)
// Se ejecuta cuando el Service Worker se instala por primera vez.
// Aquí abrimos la caché y guardamos todos los archivos necesarios.
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
// EVENTO: activate (Activación)
// Se ejecuta cuando el SW toma el control de la aplicación.
// Se usa para limpiar versiones antiguas de la caché y asegurar que
// el usuario tenga siempre la versión más reciente.
// ==========================================
self.addEventListener('activate', (evento) => {
  console.log('[SW] ✅ Service Worker activado');

  evento.waitUntil(
    caches.keys().then(nombres => {
      return Promise.all(
        nombres
          .filter(nombre => nombre !== NOMBRE_CACHE) // Filtrar cachés obsoletas
          .map(nombre => {
            console.log('[SW] 🗑️ Eliminando caché viejo:', nombre);
            return caches.delete(nombre); // Eliminar caché antigua
          })
      );
    })
  );
});

// ==========================================
// EVENTO: fetch (Petición de recursos)
// Se ejecuta cada vez que la aplicación solicita un archivo (imagen, script, html, etc).
// Primero busca en la caché; si lo encuentra, lo sirve desde ahí.
// Si no está en la caché, intenta descargarlo de internet.
// ==========================================
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request)
      .then(respuestaCacheada => {
        if (respuestaCacheada) {
          // ✅ El recurso está en la caché -> se devuelve inmediatamente
          console.log('[SW] 📂 Sirviendo desde caché:', evento.request.url);
          return respuestaCacheada;
        }

        // ❌ No está en la caché -> se solicita a través de la red (internet)
        console.log('[SW] 🌐 Pidiendo a la red:', evento.request.url);
        return fetch(evento.request);
      })
  );
});
