# Plan: Refactor [Component/Module]

## Motivation
[Why are we doing this refactoring?]

## Scope
### In Scope
- [ ] Item 1
- [ ] Item 2

### Out of Scope
- [ ] Won't change X
- [ ] Won't touch Y

## Current State
[Describe current implementation and issues]

## Target State
[Describe desired end state]

## Migration Strategy
### Phase 1: Preparation
- [ ] Add tests (if missing)
- [ ] Document current behavior
- [ ] Create feature flag (if needed)

### Phase 2: Implementation
- [ ] Step 1: [Small, safe change]
- [ ] Step 2: [Small, safe change]
- [ ] Step 3: [Small, safe change]

### Phase 3: Cleanup
- [ ] Remove old code
- [ ] Update documentation
- [ ] Verify no references to old code

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking change | Medium | High | Feature flag + gradual rollout |
| Performance regression | Low | Medium | Benchmark before/after |

## Rollback Plan
[How to revert if something goes wrong]

## Success Metrics
- [ ] All tests pass
- [ ] Performance same or better
- [ ] Code coverage maintained
- [ ] No user-facing changes (or documented)

---

**Status**: [DRAFT / APPROVED / IN_PROGRESS / DONE]  
**Estimated Effort**: [Hours/Days]  
**Date**: [Date]
