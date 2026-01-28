# AutoGrid v7.0 - Implementation Roadmap
## 12-Week Plan to MVP (Phase 1-4)

---

## 📋 Overview

**Goal**: Launch a production-ready AutoGrid with Grid View, Split View, Workflow Engine, and Forensic Layer.

**Team Structure**:
- 1 Full-Stack Developer (React + Supabase)
- 1 Frontend Developer (Univer Pro + UI/UX)
- 1 Part-time DevOps/QA

**Tech Validation Sprints** (Weeks 1-2): De-risk core technologies before full build.

---

## 🔬 WEEK 1-2: Tech Validation & POC

### Sprint 0.1: Univer Pro Feasibility
**Goal**: Validate if Univer Pro can handle our requirements.

**Tasks**:
- [ ] Set up Univer Pro Hello World
- [ ] Test Custom Cell Renderers (Status chips)
- [ ] Test onSelectionChange event handling
- [ ] Test cell editing with validation
- [ ] Performance test: Load 500+ rows
- [ ] Decision: Continue with Univer or pivot to AG Grid?

**Deliverable**: Technical Decision Document

**Risk Mitigation**: If Univer fails, pivot to AG Grid Enterprise (1-day setup).

---

### Sprint 0.2: Database Schema & Supabase Setup
**Goal**: Implement core tables and RLS policies.

**Tasks**:
- [ ] Run SQL migration (autogrid_migration_v7.sql)
- [ ] Set up Row-Level Security policies
- [ ] Create Supabase Edge Function boilerplate
- [ ] Test audit_logs trigger
- [ ] Set up React Query for data fetching

**Deliverable**: Working database with sample data

---

## 🟢 PHASE 1: CORE DATA & FORENSIC LAYER (Weeks 3-4)

### Sprint 1.1: Data Models & API Layer
**Goal**: Build the foundation for multi-view architecture.

**Tasks**:
- [ ] Implement TypeScript interfaces (types.ts)
- [ ] Create Supabase client wrapper with typed queries
- [ ] Build CRUD hooks (useEstimationItems, useEstimation)
- [ ] Implement audit logging client-side utilities
- [ ] Write unit tests for data transformations

**Deliverable**: Type-safe data layer

---

### Sprint 1.2: Snapshot System
**Goal**: Implement immutable versioning with SHA-256.

**Tasks**:
- [ ] Create Supabase Edge Function: `generateSnapshot`
- [ ] Implement SHA-256 hashing (crypto-js or Web Crypto API)
- [ ] Build snapshot comparison UI
- [ ] Test snapshot integrity validation
- [ ] Add snapshot restore functionality (read-only preview)

**Deliverable**: Working snapshot system with hash verification

**Acceptance Criteria**:
- Creating V1 snapshot freezes data at submission
- Hash mismatch triggers alert
- Users can view historical snapshots

---

## 🟢 PHASE 2: WORKFLOW ENGINE (Weeks 5-6)

### Sprint 2.1: State Machine Backend
**Goal**: Enforce workflow transitions with validation.

**Tasks**:
- [ ] Create Supabase Edge Function: `transitionEstimationState`
- [ ] Implement state validation logic (FSM)
- [ ] Build compliance gate checks (missing/expired docs)
- [ ] Add state transition audit logging
- [ ] Write integration tests for each transition

**Deliverable**: Backend state machine

**State Transition Rules**:
```
DRAFT → SUBMITTED: Requires valid compliance docs + no math errors
SUBMITTED → UNDER_REVIEW: Auto (when auditor opens)
UNDER_REVIEW → NEGOTIATION: Requires at least 1 rejection
NEGOTIATION → AGREED: Requires all items APPROVED/REJECTED with reasons
AGREED → INVOICED: Requires uploaded XML matching total
```

---

### Sprint 2.2: Workflow UI
**Goal**: Build status indicators and transition controls.

**Tasks**:
- [ ] Create StatusBadge component with color coding
- [ ] Build WorkflowStepper component (progress bar)
- [ ] Implement "Submit for Review" button with validation checks
- [ ] Add reactive validation (disable submit if errors exist)
- [ ] Create ComplianceChecklist component

**Deliverable**: Complete workflow UI

---

## 🟡 PHASE 3: GRID VIEW (Weeks 7-8)

### Sprint 3.1: Univer Pro Integration
**Goal**: Render estimation_items in Univer grid.

**Tasks**:
- [ ] Implement univerConfig.ts (column definitions)
- [ ] Build data transformer (Supabase → Univer format)
- [ ] Set up cell styling (read-only fields, highlights)
- [ ] Implement field-level permissions
- [ ] Add real-time sync (Univer edits → Supabase)

**Deliverable**: Working grid with live data

---

### Sprint 3.2: Validation & Visual Feedback
**Goal**: Implement "Digital Redline" features.

**Tasks**:
- [ ] Build validation engine (validateEstimationItems)
- [ ] Add cell decorations for errors/warnings (yellow triangles)
- [ ] Implement "Highlight Cell" feature (red background + strikethrough)
- [ ] Create ValidationPanel component (error list)
- [ ] Add math error detection

**Deliverable**: Grid with visual validation feedback

**Acceptance Criteria**:
- Math errors are auto-flagged
- Rejected cells show red background
- Validation panel shows all errors with row numbers

---

## 🟡 PHASE 4: SPLIT VIEW (Weeks 9-10)

### Sprint 4.1: Layout & Selection
**Goal**: Build resizable split view with row selection.

**Tasks**:
- [ ] Implement SplitView.tsx component
- [ ] Add react-resizable for panel sizing
- [ ] Listen to Univer onSelectionChange
- [ ] Build ContextPanel skeleton
- [ ] Add smooth animations (panel slide-in)

**Deliverable**: Working split layout

---

### Sprint 4.2: Expanded Record (The "Super Row")
**Goal**: Display rich metadata for selected item.

**Tasks**:
- [ ] Build ExpandedRecord data fetcher (join estimation + contract + project)
- [ ] Create MetadataSection component
- [ ] Build TimelineSection (audit log visualization)
- [ ] Implement VarianceAlert component
- [ ] Add CommentsSection with add/reply functionality

**Deliverable**: Full context panel

**Acceptance Criteria**:
- Selecting a row loads full record in <2s
- Audit history shows last 20 changes
- Comments are real-time (Supabase Realtime)

---

## 🧪 INTEGRATION & TESTING (Weeks 11-12)

### Sprint 5.1: End-to-End Testing
**Goal**: Test full workflow from draft to agreed.

**Tasks**:
- [ ] Write E2E tests (Playwright or Cypress)
- [ ] Test contractor workflow (create → edit → submit)
- [ ] Test auditor workflow (review → reject → approve)
- [ ] Load testing (500 items, 10 concurrent users)
- [ ] Bug bash & fix critical issues

**Deliverable**: Production-ready system

---

### Sprint 5.2: Polish & Documentation
**Goal**: Prepare for beta launch.

**Tasks**:
- [ ] UI polish (loading states, error messages)
- [ ] Write user documentation (Notion or GitBook)
- [ ] Create onboarding flow (guided tour)
- [ ] Set up error monitoring (Sentry)
- [ ] Deploy to production (Vercel + Supabase Pro)

**Deliverable**: MVP ready for beta users

---

## 📊 Post-MVP Roadmap (Phases 5-6)

### Phase 5: Multi-View (Weeks 13-16)
- **Week 13-14**: Kanban View (React DnD)
- **Week 15-16**: Timeline/Gantt View (Recharts or Gantt-React)

### Phase 6: DocuSign Integration (Weeks 17-20)
- **Week 17-18**: PDF generation with `@react-pdf/renderer`
- **Week 19**: DocuSign API integration (Embedded Signing)
- **Week 20**: Webhook handling & signed PDF storage

---

## 🎯 Success Metrics

**MVP (Week 12)**:
- [ ] 3 beta customers onboarded
- [ ] 10+ estimations processed
- [ ] <5 critical bugs reported
- [ ] Grid loads <2s with 500 rows
- [ ] 95%+ uptime

**Phase 5 (Week 16)**:
- [ ] Users actively use Kanban view
- [ ] 50%+ users prefer Timeline over Grid

**Phase 6 (Week 20)**:
- [ ] 5+ legally-binding signatures executed
- [ ] NOM-151 compliance validated by legal

---

## 🚨 Risk Management

### High-Risk Items
1. **Univer Pro Custom Renderers**: May not support React components
   - **Mitigation**: Validate in Sprint 0.1, pivot to AG Grid if needed
   
2. **Real-time Sync Conflicts**: Two users editing same cell
   - **Mitigation**: Implement optimistic locking with conflict resolution UI

3. **Performance with Large Grids**: 1000+ rows may slow down
   - **Mitigation**: Implement virtual scrolling, pagination, or lazy loading

### Dependencies
- Supabase RLS must be bulletproof (security audit in Week 11)
- DocuSign sandbox access required by Week 17

---

## 📦 Deliverables Checklist

### Week 12 (MVP Launch)
- [ ] Working Grid View with validation
- [ ] Split View with Expanded Record
- [ ] Workflow State Machine (DRAFT → AGREED)
- [ ] Snapshot System with integrity checks
- [ ] User documentation
- [ ] Production deployment

### Week 16 (Multi-View)
- [ ] Kanban View
- [ ] Timeline/Gantt View
- [ ] View switcher UI

### Week 20 (Legal Closure)
- [ ] PDF generation with hash
- [ ] DocuSign integration
- [ ] NOM-151 compliance report

---

## 💰 Budget Estimate

**Infrastructure (Monthly)**:
- Supabase Pro: $25
- Cloudflare R2: ~$5 (storage + egress)
- Vercel Pro: $20
- DocuSign Developer: $0 (free tier, then $10/user/month)
- **Total**: ~$50-60/month

**Development (3 months)**:
- 2 developers × 12 weeks × $50/hr × 40hr/week = $48,000
- **OR** Outsource to 1 senior dev: ~$20-30k

**One-time**:
- Univer Pro License: Contact sales for pricing
- Legal review (NOM-151): $2,000

**Total to MVP**: ~$25-50k depending on team structure

---

## 🎓 Key Learnings & Best Practices

1. **Start with data model**: The SQL schema is the source of truth
2. **Validate tech early**: Don't commit to Univer without POC
3. **Build incrementally**: Each sprint should be shippable
4. **Focus on UX**: Construction users hate complexity
5. **Test with real data**: Import actual Excel files from contractors

---

## 📞 Next Steps

1. **Week 1**: Run Sprint 0.1 (Univer POC)
2. **Week 2**: Deploy database schema
3. **Week 3**: Start building!
