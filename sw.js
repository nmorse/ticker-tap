const CACHE =
    "ticker-tap-v1";

const FILES = [

    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./db.js",
    "./manifest.json"
];

self.addEventListener(
    "install",
    event => {

        event.waitUntil(
            caches.open(CACHE)
            .then(cache =>
                cache.addAll(FILES))
        );
    }
);
