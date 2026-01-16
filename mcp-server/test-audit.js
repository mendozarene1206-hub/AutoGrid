// Usando fetch nativo de Node.js

const data = {
    sheetContext: {
        sheets: {
            "ESTIMACION_02": {
                "rows": {
                    "2": { // Fila 2: Muro Elevador (5.2.4.6)
                        "A": { "v": "5.2.4.6" },
                        "B": { "v": "Muro Elevador" },
                        "C": { "v": 1 }, // Cantidad
                        "D": { "v": 18000 } // Precio Incorrecto (Debe ser 15000)
                    },
                    "3": { // Fila 3: Columnas (5.2.4.2)
                        "A": { "v": "5.2.4.2" },
                        "B": { "v": "Columnas N3-N4" },
                        "C": { "v": 1.25 }, // Cantidad que EXPROPIA el contrato (Debe ser <= 1.0)
                        "D": { "v": 85000 }
                    }
                }
            }
        }
    },
    userMessage: "Audita esta hoja y dime si hay errores en los precios o en las cantidades contra el contrato."
};

async function test() {
    console.log("🚀 Enviando solicitud de auditoría...");
    try {
        const response = await fetch('http://localhost:3000/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("\n❌ ERROR EN LA AUDITORÍA:");
            console.error("Status:", response.status);
            console.error("Message:", result.error);
            console.error("Details:", result.details);
            return;
        }

        console.log("\n--- RESULTADO DE LA AUDITORÍA ---");
        console.log(result.analysis);
        console.log("\nCoordenadas resaltadas:", result.highlightCoordinates);
    } catch (error) {
        console.error("Error en el test:", error);
    }
}

test();
