const CACHE_NAME = 'ai-term-normal-quiz-v3';
const PRECACHE = [
  './normal-quiz.html',
  './stage-journey-preview.html?view=normal&pwa=1',
  './rpg-theme.css',
  './game-core.js',
  './normal-mode-core.js',
  './interaction-gate.js',
  './quiz-sounds.js',
  './rpg-fx.js',
  './rpg-stages.js',
  './data/questions.json',
  './assets/normal-quiz-icon-512.png',
  './assets/sounds/quiz-correct-tv-02.wav',
  './assets/sounds/quiz-wrong-game-show-03.wav',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })),
  );
});
