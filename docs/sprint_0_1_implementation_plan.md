# AutoGrid v7.0 - Implementation Plan
## Sprint 0.1: Univer Pro Feasibility & Technical Validation

---

## 📋 Executive Summary

**Objective**: Validate if Univer Pro can handle AutoGrid's requirements before committing to the full 12-week roadmap.

**Current State Analysis**:
- ✅ You already have a working Univer integration (v0.15.1) with open-source plugins
- ✅ ExcelJS parser with benchmarks is implemented and functional
- ✅ Supabase migrations exist with initial schema
- ⚠️ Using **open-source Univer**, not Univer Pro

---

## 🔍 Expert Analysis & Recommendations

### Key Observation: Univer vs Univer Pro

Your roadmap mentions "Univer Pro" but your current `package.json` shows you're using **open-source Univer** (`@univerjs/presets`), not Univer Pro (`@univerjs-pro/*`).

**Univer Pro requires**:
1. A server deployment (Docker-based)
2. Commercial license ($499-999+)
3. Different package installation (`@univerjs-pro/*`)

**Univer Pro offers** (that you don't currently have):
- Native `.xlsx` import/export (eliminates ExcelJS dependency!)
- Advanced formula engine
- Pivot Tables
- Charts & Sparklines
- Collaboration (cursors + history)
- Edit History

### 🚨 Critical Decision Point

| Approach | Pros | Cons |
|----------|------|------|
| **Continue with Open-Source Univer + ExcelJS** | Free, working now, full control | Manual Excel parsing, limited features |
| **Upgrade to Univer Pro** | Native Excel import, collaboration, pivot tables | Cost ($500+), server dependency, learning curve |
| **Pivot to AG Grid Enterprise** | Best-in-class grid, React-native | Higher cost ($2,500+), different API entirely |

### My Recommendation

Based on your roadmap requirements (workflow engine, forensic layer, split view), I recommend:

1. **Phase 1 (Week 1)**: Test Univer Pro with their 30-day trial
2. **Phase 2 (Week 2)**: If Univer Pro's native import handles your 92MB Excel files well, migrate
3. **Fallback**: Keep ExcelJS as backup for edge cases or if Univer Pro doesn't meet needs

---

## 🔬 Sprint 0.1: Technical Validation Tasks

### Task 1: Deploy Univer Pro Server (Local)
> **Goal**: Get Univer Pro running locally to test features

```bash
# Clone the Univer Pro starter kit
npx degit dream-num/univer-pro-sheet-start-kit univer-pro-poc
cd univer-pro-poc
npm install
npm run dev
```

**Validation Points**:
- [ ] Server starts successfully
- [ ] Can access http://localhost:5173
- [ ] Watermark appears (expected without license)

---

### Task 2: Test Native Excel Import
> **Goal**: Validate if Univer Pro can import your 92MB Excel file natively

**Test Procedure**:
```javascript
// Using Univer Pro's Facade API
const snapshot = await univerAPI.importXLSXToSnapshotAsync(file);
univerAPI.createWorkbook(snapshot);
```

**Metrics to Capture**:
- [ ] Time to import (compare with your ExcelJS benchmark: ~X seconds)
- [ ] Memory usage
- [ ] Data fidelity (formulas, styles, merged cells preserved?)
- [ ] Performance with 500+ rows

---

### Task 3: Test Custom Cell Rendering
> **Goal**: Validate if we can render Status Chips in cells

Univer Pro uses a canvas-based renderer, not DOM. Custom cell rendering requires:
1. Custom cell type plugin
2. Canvas drawing code

**POC Approach**:
```typescript
// Check if we can use conditional formatting as an alternative
// Univer Pro supports cell background colors based on values
```

**Alternatives if custom renderers don't work**:
- Use conditional formatting (background colors per status)
- Use data validation dropdowns with icons
- Overlay React components (hybrid approach)

---

### Task 4: Test Selection Events
> **Goal**: Validate `onSelectionChange` for Split View

```typescript
univerAPI.onSelectionChange((selection) => {
  console.log('Selected cell:', selection);
  // Must be able to get row/column indices
});
```

**Required for**:
- Split View: Show expanded record when row selected
- Validation Panel: Highlight cells with errors

---

### Task 5: Performance Benchmark
> **Goal**: Compare Univer Pro vs current ExcelJS approach

| Metric | ExcelJS (Current) | Univer Pro | Winner |
|--------|-------------------|------------|--------|
| File Load | ? ms | ? ms | |
| Parse/Transform | ? ms | ? ms | |
| Render 500 rows | ? ms | ? ms | |
| Memory Delta | ? MB | ? MB | |

---

## 📊 Roadmap Corrections & Suggestions

### Issue 1: Univer Pro License
Your budget shows "$499-999 (one-time or annual)" — this is now **contact sales** pricing. Get a quote directly from Univer.

### Issue 2: Custom Renderers Risk
Your risk section correctly identifies this. Canvas-based grids rarely support React component renderers. Plan for:
- Status indicators via background colors
- Tooltip overlays for detailed info
- External UI panel for complex interactions

### Issue 3: Database Schema
> Good: You have migrations already
> Suggestion: Review `autogrid_migration_v7.sql` to ensure it matches your `types.ts`

### Issue 4: Real-time Sync
Univer Pro has built-in collaboration. If you use it, you may not need custom Supabase Realtime logic for cell edits.

---

## ✅ Sprint 0.1 Deliverables Checklist

- [ ] **Decision Document**: Continue Univer Pro or pivot to alternative
- [ ] **Performance Report**: Benchmark comparison table
- [ ] **POC Repository**: Working Univer Pro demo with your Excel file loaded
- [ ] **Risk Assessment**: Updated risk matrix based on findings

---

## 🎯 Immediate Next Steps

1. **Now**: Clone and run Univer Pro starter kit
2. **Test 1**: Import your `SUMMYT_ESTIMACIÓN 29-.xlsx` (92MB) file
3. **Test 2**: Check if selection events work
4. **Test 3**: Try conditional formatting for status colors
5. **Decision**: Proceed with Univer Pro or keep current ExcelJS approach

---

## 📝 Questions for You

Before proceeding, I'd like to confirm:

1. **Budget**: Have you contacted Univer sales for actual pricing?
2. **Server**: Are you okay with running a Docker server for Univer Pro, or do you prefer client-only?
3. **Priority**: Is native Excel import more valuable than custom cell renderers?
4. **Fallback**: Should I prepare an AG Grid Enterprise POC as a backup?

---

## 🚀 Ready to Start?

Approve this plan and I'll:
1. Set up the Univer Pro POC in your `AutoGrid` project
2. Run the validation tests
3. Create a comparison report
