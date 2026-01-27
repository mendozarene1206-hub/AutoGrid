# Excel Parser Benchmark Testing Strategy

A comprehensive testing strategy for comparing AutoGrid's custom ExcelJS parser against Univer Pro's native import functionality to determine build vs. buy decision.

---

## Executive Summary

Your current implementation uses **ExcelJS with Web Workers** for parsing, which is a solid architecture. Based on the codebase review and Univer Pro benchmarks, here's the strategic comparison:

| Metric | Your Parser (Estimated) | Univer Pro Backend |
|--------|------------------------|-------------------|
| 500K cells (5.4MB) | ~8-15 seconds | **1.22 seconds** |
| 1M cells (11MB) | ~20-35 seconds | **2.39 seconds** |
| 5M cells (55MB) | ~90-180 seconds | **11.3 seconds** |

> [!IMPORTANT]
> Univer Pro's benchmarks are server-side (EC2 4vCPU). Your parser runs client-side in a Web Worker, which faces browser memory limits and weaker CPUs. This is an architectural difference, not just a speed difference.

---

## Proposed Changes

### [NEW] [benchmark.ts](file:///C:/Users/Rene/.gemini/antigravity/scratch/AutoGrid/frontend/src/test/benchmark.ts)

Complete benchmark script measuring:
- Parsing speed (file → JSON → IWorkbookData)
- Transformation overhead
- Univer rendering time
- Memory consumption via Performance API

### [NEW] [fidelity-audit.ts](file:///C:/Users/Rene/.gemini/antigravity/scratch/AutoGrid/frontend/src/test/fidelity-audit.ts)

Data fidelity checker for:
- Merged cells
- Cell styles (background, fonts)
- Number formatting (currency, percentages)
- Formula preservation

### [NEW] [stress-test-generator.mjs](file:///C:/Users/Rene/.gemini/antigravity/scratch/AutoGrid/frontend/generate-stress-test.mjs)

Script to generate edge-case Excel files for stress testing.

---

## Critical Metrics Definition

### 1. Parsing Speed (Time-to-Interactive)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TIMING BREAKDOWN                            │
├─────────────────────────────────────────────────────────────────────┤
│  T1: File → ArrayBuffer           (file.arrayBuffer())              │
│  T2: ArrayBuffer → ExcelJS        (workbook.xlsx.load())            │
│  T3: ExcelJS → IWorkbookData      (convertExcelJSToUniver())        │
│  T4: IWorkbookData → Univer Render (univerAPI.createWorkbook())     │
└─────────────────────────────────────────────────────────────────────┘
```

**Your bottleneck is likely T2 + T3**, not T4. Univer's renderer is highly optimized.

### 2. Data Fidelity Checklist

| Feature | Priority | Current Support |
|---------|----------|-----------------|
| Merged Cells | 🔴 Critical | ✅ Supported (`worksheet.model.merges`) |
| Bold/Italic/Underline | 🟡 High | ✅ Supported (`cell.font`) |
| Background Colors | 🟡 High | ✅ Supported (`cell.fill`) |
| Number Formats | 🔴 Critical | ✅ Supported (`cell.numFmt`) |
| Currency Formatting | 🔴 Critical | ⚠️ Via numFmt pattern |
| Formulas (as formulas) | 🔴 Critical | ✅ Supported (`cell.formula`) |
| Formulas (as values) | 🟢 Low | ✅ Supported (`cell.result`) |
| Conditional Formatting | 🟡 High | ❌ Not extracted |
| Data Validation | 🟡 High | ❌ Not extracted |
| Named Ranges | 🟢 Low | ❌ Not extracted |
| Freeze Panes | 🟡 High | ✅ Supported (main thread only) |
| Column Widths | 🟡 High | ✅ Supported |
| Row Heights | 🟡 High | ✅ Supported |
| Borders | 🔴 Critical | ✅ Supported (main thread) |

### 3. Memory Consumption

```javascript
// Key metrics to capture
const memoryMetrics = {
  heapUsedBefore: performance.memory?.usedJSHeapSize,
  heapUsedAfter: performance.memory?.usedJSHeapSize,
  heapPeak: Math.max(...samples),
  heapLimit: performance.memory?.jsHeapSizeLimit
};
```

> [!WARNING]
> Chrome limits `performance.memory` to Chrome only with `--enable-precise-memory-info` flag. For production, use `navigator.deviceMemory` + heuristics.

---

## Optimization Review - Current Code Issues

### Issue 1: Duplicated Logic (Worker vs Main Thread)
**Files:** `ingestion.ts` (493 lines) + `ingestion.worker.ts` (235 lines)

```diff
- // ingestion.worker.ts line 186-207
- function convertExcelJSStyleToUniver(cell: ExcelJS.Cell): IStyleData | undefined {
-     // SIMPLIFIED version - missing borders!
-     ...
- }

+ // Solution: Extract to shared/converters.ts
+ export function convertExcelJSStyleToUniver(cell: ExcelJS.Cell): IStyleData | undefined
```

**Impact:** Worker version is missing border extraction, causing data fidelity loss for WBS files.

### Issue 2: Synchronous Style Indexing
**File:** `ingestion.ts:212-214`

```javascript
// CURRENT: Creates unique style ID for EVERY cell
const styleId = `s${styleIndex++}`;
styles[styleId] = style;
univerCell.s = styleId;
```

**Problem:** A 5000-row file with 25 columns could create 125,000 style entries when only 20-30 unique styles exist.

```javascript
// OPTIMIZED: Hash-based style deduplication
const styleHash = JSON.stringify(style);
if (!styleCache.has(styleHash)) {
    const styleId = `s${styleIndex++}`;
    styleCache.set(styleHash, styleId);
    styles[styleId] = style;
}
univerCell.s = styleCache.get(styleHash);
```

### Issue 3: Constructor WBS Pattern Not Leveraged
Your WBS files likely have repeating patterns:
- Row headers with same style
- Data cells with number format
- Total rows with bold + borders

Pre-identifying these patterns could skip per-cell processing.

---

## Stress Test File Specification

### Recommended Test File Structure

| Test Case | Rows | Cols | Sheets | Edge Cases |
|-----------|------|------|--------|------------|
| `stress_basic.xlsx` | 5,000 | 25 | 1 | Mixed data types |
| `stress_merges.xlsx` | 2,000 | 50 | 3 | 500+ merged regions |
| `stress_styles.xlsx` | 5,000 | 25 | 1 | Unique style per cell |
| `stress_formulas.xlsx` | 1,000 | 50 | 1 | Cross-sheet formulas |
| `stress_wbs.xlsx` | 10,000 | 30 | 2 | Nested WBS structure |

### Edge Cases to Include

1. **Merged Cell Spanning**
   - Horizontal merges (A1:E1 headers)
   - Vertical merges (WBS item groups)
   - Large rectangular merges (20x10 cells)

2. **Number Formats**
   - `$#,##0.00` (currency)
   - `0.00%` (percentages)
   - `#,##0` (thousands)
   - `yyyy-mm-dd` (dates)

3. **Style Complexity**
   - Cells with 8+ style properties
   - Diagonal borders (rare but valid)
   - Gradient fills

4. **Formula Types**
   - Simple references: `=A1+B1`
   - Cross-sheet: `=Sheet2!A1`
   - Array formulas: `{=SUM(A1:A10)}`
   - Named ranges: `=TotalCost`

5. **Unicode & Long Text**
   - Spanish characters: `ñ, á, é, í, ó, ú`
   - 32,767 character cells (Excel max)
   - RTL text (Arabic, Hebrew)

---

## Verification Plan

### Automated Tests

```bash
# Run benchmark suite
cd frontend
npm run benchmark

# Generate stress test files
node generate-stress-test.mjs

# Run fidelity audit
npm run test:fidelity
```

### Manual Verification

1. **Import original .xlsx into Excel Online**
2. **Import into AutoGrid via custom parser**
3. **Screenshot comparison** of:
   - Merged cell rendering
   - Currency formatting
   - Conditional formatting (if implemented)

### Performance Baseline Commands

```javascript
// Console snippet to benchmark current implementation
await window.runParserBenchmark('./stress_basic.xlsx');

// Output:
// {
//   fileLoadMs: 234,
//   excelJSParseMs: 4521,
//   transformMs: 1876,
//   renderMs: 342,
//   totalMs: 6973,
//   memoryDeltaMB: 45.2
// }
```

---

## Decision Framework

### Keep Custom Parser If:
- ✅ Parse time < 10s for 5000 rows
- ✅ Memory stays under 500MB
- ✅ Fidelity score > 90%
- ✅ No critical features missing

### Consider Univer Pro If:
- ❌ Parse time > 30s for 5000 rows
- ❌ Browser crashes on low-end devices
- ❌ Conditional formatting is required
- ❌ Data validation must roundtrip

### Hybrid Approach (Recommended):
1. **Use Custom Parser** for preview/quick import
2. **Use Univer Pro Backend** for archival/full-fidelity imports
3. Let users choose based on urgency vs. accuracy

---

## Next Steps

1. [ ] Approve this plan
2. [ ] I'll create the benchmark scripts
3. [ ] Generate stress test Excel files
4. [ ] Run benchmarks and capture results
5. [ ] Provide final recommendation

> [!TIP]
> If you already have sample construction WBS files, share them - real-world data often reveals issues synthetic tests miss.
