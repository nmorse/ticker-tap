


let chart;

async function fetchHistory(symbol)
{
    // return [{date: "2026-02-01", close: 10}, 
    //         {date: "2026-03-01", close: 20}, 
    //         {date: "2026-04-01", close: 0}, 
    //         {date: "2026-05-01", close: 15}]
      // https://stooq.com/q/d/l/?s=aapl.us&i=d&apikey=i3JN9ah5dWOKsc2SfbUwMyxemp61GV7Z
    const url =
      `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&i=d&apikey=i3JN9ah5dWOKsc2SfbUwMyxemp61GV7Z`;

    const csv =
      await fetch(url)
      .then(r => r.text());

    return parseCSV(csv);
}

let history = []
let buys = []



async function loadHistory(symbol) {
    const url =
        `https://stooq.com/q/d/l/?s=${symbol.toLowerCase()}.us&i=d`;

    const response = await fetch(url);
    const csv = await response.text();

    return parseCSV(csv);
}

function createProjectionLine(
    startDate,
    startPrice,
    annualPercent,
    chartDates
) {
    const rate = annualPercent / 100;

    return chartDates.map(date => {

        const years =
            (Date(date) - Date(startDate)) /
            (365.25 * 24 * 3600 * 1000);

        return {
            x: date,
            y: startPrice * (1 + rate * years)
        };
    });
}

function parseCSV(csv)
{
    const lines =
        csv.trim().split("\n");

    return lines
        .slice(1)
        .map(line => {

            const [
                date,
                open,
                high,
                low,
                close
            ] = line.split(",");

            return {
                date:
                  new Date(date).toISOString(),
                close:
                  Number(close)
            };
        });
}

const priceDataset = {

    label: symbol,

    data: history.map(p => ({
        x: p.date,
        y: p.close
    })),

    borderWidth: 2,

    pointRadius: 0
};

const buyDataset = {

    type: "scatter",

    label: "Buys",

    data: buys.map(txn => ({
        x: new Date(txn.date).toISOString(),
        y: txn.price
    })),

    pointRadius: 6
};

const growthDatasets =
    buys.map((txn, i) => ({

        label:
            `Target ${i+1}`,

        data:
            createProjectionLine(
                new Date(txn.date).toISOString(),
                txn.price,
                growthPercent,
                history.map(
                    h => h.date
                )
            ),

        pointRadius: 0,

        borderDash: [5,5]
}));

chart = new Chart(document.getElementById("chart"), {

    type: "line",

    data: {

        datasets: [

            priceDataset,

            buyDataset,

            ...growthDatasets
        ]
    },

    options: {

        parsing: false,

        scales: {

            x: {
                type: "time"
            }
        }
    }
});
////////////////////////
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js');
    });
}

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("load")
        .addEventListener(
            "click",
            loadSymbol
        );

    document
        .getElementById("txnForm")
        .addEventListener(
            "submit",
            saveTransaction
        );
});

async function loadSymbol() {

    const symbol =
        document
        .getElementById("symbol")
        .value
        .trim()
        .toUpperCase();

    if (!symbol) {
        return;
    }

    try {

        const history =
            await fetchHistory(symbol);

        await saveHistory(
            symbol,
            history
        );

        const transactions =
            await getTransactions(symbol);

        renderChart(
            symbol,
            history,
            transactions
        );

    }
    catch (err) {

        console.error(err);

        alert(
            "Unable to load stock data."
        );
    }
}

async function saveHistory(
    symbol,
    history
) {
    const db =
        await dbPromise;

    const tx =
        db.transaction(
            "history",
            "readwrite"
        );

    // tx.objectStore("history")
    //   .put({
    //       symbol,
    //       history
    //   });
    await new Promise((resolve, reject) => {

        const req =
            tx.objectStore("history")
            .put({
                symbol,
                history
            });

        req.onsuccess = resolve;
        req.onerror = reject;
    });
    return tx.complete;
}


async function saveTransaction(event) {

    event.preventDefault();

    const symbol =
        document
        .getElementById("symbol")
        .value
        .trim()
        .toUpperCase();

    const txn = {

        id: crypto.randomUUID(),

        symbol,

        date:
            document
            .getElementById("date")
            .value,

        type:
            document
            .getElementById("type")
            .value,

        shares:
            Number(
                document
                .getElementById("shares")
                .value
            ),

        price:
            Number(
                document
                .getElementById("price")
                .value
            )
    };

    const db =
        await dbPromise;

    const tx =
        db.transaction(
            "transactions",
            "readwrite"
        );

    tx.objectStore(
        "transactions"
    ).put(txn);

    await new Promise(
        (resolve, reject) => {

            tx.oncomplete = resolve;
            tx.onerror = reject;
        }
    );

    await loadSymbol();
}

async function getTransactions(symbol)
{
    const db =
        await dbPromise;

    return new Promise(
        (resolve, reject) => {

            const req =
                db.transaction(
                    "transactions"
                )
                .objectStore(
                    "transactions"
                )
                .getAll();

            req.onsuccess =
                () => {

                    resolve(
                        req.result.filter(
                            txn =>
                                txn.symbol ===
                                symbol
                        )
                    );
                };

            req.onerror = reject;
        }
    );
}

function renderChart(
    symbol,
    history,
    transactions
) {

    const growthPercent =
        Number(
            document
            .getElementById("growth")
            .value
        );

    const buys =
        transactions.filter(
            t => t.type === "buy"
        );

    const sells =
        transactions.filter(
            t => t.type === "sell"
        );

    const datasets = [];

    datasets.push({

        label: symbol,

        data:
            history.map(p => ({
                x: p.date,
                y: p.close
            })),

        pointRadius: 3,

        tension: 0.01
    });

    datasets.push({

        type: "scatter",

        label: "Buys",

        data:
            buys.map(t => ({
                x: new Date(t.date).toISOString(),
                y: t.price
            })),

        pointRadius: 6
    });

    datasets.push({

        type: "scatter",

        label: "Sells",

        data:
            sells.map(t => ({
                x: new Date(t.date).toISOString(),
                y: t.price
            })),

        pointRadius: 6
    });

    for (const txn of buys) {

        datasets.push({

            label:
                `${growthPercent}% Target`,

            pointRadius: 0,

            borderDash: [5,5],

            data:
                createProjectionLine(
                    new Date(txn.date).toISOString(),
                    txn.price,
                    growthPercent,
                    history.map(
                        h => h.date
                    )
                )
        });
    }

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(
        document.getElementById("chart"),
        {
            type: "line",

            data: {
                datasets
            },

            // options: {
            //     parsing: false,
            //     responsive: true
            // }
        }
    );
}
