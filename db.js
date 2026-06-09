
const dbPromise = new Promise((resolve) => {

    const req =
        indexedDB.open(
            "ticker-db",
            1
        );

    req.onupgradeneeded = () => {

        const db = req.result;

        db.createObjectStore(
            "transactions",
            {
                keyPath: "id"
            }
        );

        db.createObjectStore(
            "history",
            {
                keyPath: "symbol"
            }
        );
    };

    req.onsuccess =
        () => resolve(req.result);
});