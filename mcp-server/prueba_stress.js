
const API_URL = "http://localhost:3000/api/audit";

const samplePayload = {
    sheetContext: {
        sheets: {
            "Hoja1": {
                rows: {
                    "0": { "0": { "v": "100", "m": "100" }, "1": { "v": "50", "m": "50" } }
                }
            }
        }
    },
    userMessage: "Audita esta hoja simple por favor."
};

async function sendRequest(id) {
    console.log(`[Request ${id}] Enviando...`);
    const start = Date.now();
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(samplePayload)
        });
        const data = await response.json();
        const duration = (Date.now() - start) / 1000;
        console.log(`[Request ${id}] Finalizada en ${duration}s. Status: ${response.status}`);
        // console.log(`[Request ${id}] Resultado:`, data.analysis?.substring(0, 50) + "...");
    } catch (error) {
        console.error(`[Request ${id}] Error:`, error.message);
    }
}

async function runStressTest(concurrency) {
    console.log(`Iniciando prueba de stress con ${concurrency} llamadas simultáneas...`);
    const requests = [];
    for (let i = 1; i <= concurrency; i++) {
        requests.push(sendRequest(i));
    }
    await Promise.all(requests);
    console.log("Prueba de stress finalizada.");
}

runStressTest(5);
