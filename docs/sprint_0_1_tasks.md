# AutoGrid v7.0 - Task List
## Sprint 0.1: Technical Validation (Weeks 1-2)

---

## Phase 0: Pre-Validation Analysis
- [x] Review current project state and existing Univer integration
- [x] Analyze Univer Pro documentation and requirements
- [x] Identify gap between open-source Univer and Univer Pro
- [x] Create implementation plan with recommendations
- [ ] Get user approval on validation approach

---

## Sprint 0.1: Univer Pro Feasibility

### Task 1: Univer Pro Server Setup
- [ ] Clone Univer Pro starter kit
- [ ] Install dependencies
- [ ] Start development server
- [ ] Verify server is accessible
- [ ] Document any setup issues

### Task 2: Excel Import Testing
- [ ] Test native .xlsx import with small file (estimacion_prueba.xlsx)
- [ ] Test native .xlsx import with large file (92MB SUMMYT file)
- [ ] Measure import time vs ExcelJS baseline
- [ ] Verify data fidelity (formulas, styles, merged cells)
- [ ] Document size limits or issues

### Task 3: Custom Cell Renderers
- [ ] Research Univer Pro custom cell renderer API
- [ ] Attempt to create Status Chip renderer
- [ ] Test conditional formatting as alternative
- [ ] Document feasibility and limitations

### Task 4: Selection Events
- [ ] Test onSelectionChange API
- [ ] Verify row/column index access
- [ ] Test multi-cell selection handling
- [ ] Confirm compatibility with Split View requirements

### Task 5: Performance Benchmark
- [ ] Load 500+ rows
- [ ] Measure render time
- [ ] Measure memory consumption
- [ ] Compare with ExcelJS + current Univer approach
- [ ] Create comparison report

---

## Sprint 0.2: Database & Supabase Setup

### Task 1: Review Existing Schema
- [ ] Analyze current migration files
- [ ] Compare with roadmap's autogrid_migration_v7.sql
- [ ] Identify schema gaps

### Task 2: RLS Policies
- [ ] Define Row-Level Security policies
- [ ] Test contractor access rules
- [ ] Test auditor access rules

### Task 3: Edge Functions
- [ ] Create Edge Function boilerplate
- [ ] Test audit_logs trigger
- [ ] Set up React Query hooks

---

## Decision Checkpoint

### Deliverables
- [ ] Technical Decision Document (Univer Pro vs alternatives)
- [ ] Performance Benchmark Report
- [ ] Updated Risk Assessment
- [ ] User approval to proceed with Phase 1

---

## Notes

**Current Status**: Planning Phase - Awaiting user approval

**Key Risks Identified**:
1. Univer Pro custom renderers may require canvas drawing
2. 92MB Excel files may hit import limits without license
3. Server deployment adds infrastructure complexity
