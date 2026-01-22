
// Native fetch is available in Node 18+

const API_URL = 'http://localhost:3000/api/audit';

async function runTest(name, payload) {
    console.log(`\n--- Running Test: ${name} ---`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[PASS] Response received.`);
        console.log(`Analysis Preview: ${data.analysis.substring(0, 150)}...`);

        // Basic assertion logic could be added here
        return data;
    } catch (error) {
        console.error(`[FAIL] ${name}:`, error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error("Make sure the server is running on port 3000!");
        }
    }
}

async function main() {
    // Scenario 1: Geometric Math Error
    await runTest("Geometric Validation", {
        sheetContext: {
            rows: [
                { row: 1, concept: "Muro Block", largo: 10, alto: 5, total_claimed: 60, unit: "m2" }
            ]
        },
        userMessage: "Audita esta generadora. Verifica si el total cobrado corresponde a las dimensiones."
    });

    // Scenario 2: Catalog Code Check
    // We expect the agent to try using query_catalog
    await runTest("Catalog Query", {
        sheetContext: {
            rows: [
                { row: 2, code: "5.2.4.1", description: "Concreto f'c=250", qty: 15, unit: "m3" }
            ]
        },
        userMessage: "Verifica si este concepto '5.2.4.1' existe en el catálogo y su precio unitario."
    });
}

main();
