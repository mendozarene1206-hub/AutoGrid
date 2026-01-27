/**
 * test/index.ts - Test Utilities Export
 * 
 * Central export for all benchmark and testing utilities.
 * Import these in the app to enable console-based testing.
 */

export { runParserBenchmark } from './benchmark';
export type { BenchmarkResult, BenchmarkOptions } from './benchmark';

export { runFidelityAudit } from './fidelity-audit';
export type { FidelityReport, FidelityCheck } from './fidelity-audit';

// Re-export for convenience
import { runParserBenchmark, type BenchmarkResult } from './benchmark';
import { runFidelityAudit, type FidelityReport } from './fidelity-audit';

/**
 * Run full benchmark suite on a file
 */
export async function runFullBenchmark(file: File): Promise<{
    benchmark: BenchmarkResult;
    fidelity: FidelityReport;
}> {
    console.log('\n🚀 RUNNING FULL BENCHMARK SUITE\n');
    console.log('════════════════════════════════════════════════════════════\n');

    // 1. Performance benchmark
    const benchmark = await runParserBenchmark(file, { verbose: true });

    // 2. Fidelity audit
    const fidelity = await runFidelityAudit(file);

    // 3. Summary comparison
    console.log('\n📊 FINAL SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`File:             ${benchmark.fileName}`);
    console.log(`Size:             ${benchmark.fileSizeMB.toFixed(2)} MB`);
    console.log(`Parse Time:       ${benchmark.timings.totalMs.toFixed(0)} ms`);
    console.log(`Cells:            ${benchmark.stats.totalCells.toLocaleString()}`);
    console.log(`Styles:           ${benchmark.stats.stylesGenerated.toLocaleString()}`);
    console.log(`Memory Delta:     ${benchmark.memory.heapDeltaMB.toFixed(1)} MB`);
    console.log(`Fidelity Score:   ${fidelity.overallScore}%`);
    console.log('════════════════════════════════════════════════════════════\n');

    // Performance grade
    const cellsPerSecond = benchmark.stats.totalCells / (benchmark.timings.totalMs / 1000);
    console.log(`⚡ Performance:    ${Math.round(cellsPerSecond).toLocaleString()} cells/second`);

    if (cellsPerSecond > 50000) {
        console.log('   Grade: 🟢 EXCELLENT');
    } else if (cellsPerSecond > 20000) {
        console.log('   Grade: 🟡 GOOD');
    } else if (cellsPerSecond > 10000) {
        console.log('   Grade: 🟠 ACCEPTABLE');
    } else {
        console.log('   Grade: 🔴 NEEDS OPTIMIZATION');
    }

    // Univer Pro comparison (estimated)
    console.log('\n📈 COMPARISON vs Univer Pro (estimated server-side):');
    const univerProEstimate = benchmark.stats.totalCells / 500000 * 1220; // Based on their 500k cells = 1.22s
    console.log(`   Univer Pro:     ~${univerProEstimate.toFixed(0)} ms (server-side)`);
    console.log(`   Your Parser:    ${benchmark.timings.totalMs.toFixed(0)} ms (client-side)`);
    console.log(`   Ratio:          ${(benchmark.timings.totalMs / univerProEstimate).toFixed(1)}x slower`);
    console.log('\n   Note: Client-side parsing is expected to be slower than server-side.');
    console.log('   A ratio under 10x is acceptable for client-side processing.');

    console.log('\n════════════════════════════════════════════════════════════\n');

    return { benchmark, fidelity };
}

// Register global helpers
if (typeof window !== 'undefined') {
    (window as any).runFullBenchmark = runFullBenchmark;

    // File picker helper
    (window as any).benchmarkWithPicker = async () => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const result = await runFullBenchmark(file);
                    resolve(result);
                } else {
                    reject(new Error('No file selected'));
                }
            };
            input.click();
        });
    };

    console.log('📊 Benchmark tools ready. Quick start:');
    console.log('   await window.benchmarkWithPicker()  // Opens file picker');
    console.log('   await window.runFullBenchmark(file) // Full suite on file');
}
