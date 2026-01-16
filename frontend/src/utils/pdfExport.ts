import html2pdf from 'html2pdf.js';

export const exportToPDF = async (spreadsheetId: string, status: string, role: string) => {
    const gridElement = document.querySelector('.grid-section');
    if (!gridElement) return;

    // Create a temporary container for the report
    const reportContainer = document.createElement('div');
    reportContainer.className = 'pdf-report-container';
    reportContainer.style.padding = '40px';
    reportContainer.style.background = 'white';
    reportContainer.style.color = 'black';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    reportContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="margin: 0; color: #333;">REPORTE DE ESTIMACIÓN</h1>
            <div style="text-align: right;">
                <p style="margin: 0;"><strong>ID:</strong> ${spreadsheetId}</p>
                <p style="margin: 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        
        <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 1px solid #ddd;">Detalles del Proyecto</h3>
                <p><strong>Estado:</strong> ${status.toUpperCase()}</p>
                <p><strong>Generado por:</strong> ${role.toUpperCase()}</p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 1px solid #ddd;">Resumen</h3>
                <p>Este documento es una representación oficial de la estimación cargada en el sistema AutoGrid.</p>
            </div>
        </div>

        <div class="pdf-grid-summary">
            <!-- La idea aquí es que para un reporte real, renderizaríamos una tabla limpia -->
            <p>Verificar los datos técnicos en el sistema digital.</p>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px;">
                Firma Residente
            </div>
            <div style="border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px;">
                Firma Supervisor
            </div>
        </div>
    `;

    const opt = {
        margin: 1,
        filename: `Estimacion_${spreadsheetId.substring(0, 8)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(reportContainer).set(opt).save();
};
