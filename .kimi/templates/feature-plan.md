# Plan: [Feature Name]

## Objective
[One sentence describing what we want to achieve]

## Current State
[What's already implemented related to this]

## Requirements
### Functional
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Non-Functional
- [ ] Performance criteria
- [ ] Security requirements
- [ ] UX requirements

## Technical Approach
### Components/Services Affected
| Service | Files | Changes |
|---------|-------|---------|
| frontend | `Component.tsx` | Add UI |
| server | `route.ts` | New endpoint |
| worker | `processor.ts` | Handle job |

### Data Model Changes
```typescript
// Add to shared/types.ts
interface NewType {
  // fields
}
```

### API Design
```typescript
// New endpoint
POST /api/feature
Request: { /* schema */ }
Response: { /* schema */ }
```

## Implementation Steps
1. [ ] Step 1: [Description] - Estimated: X min
2. [ ] Step 2: [Description] - Estimated: X min
3. [ ] Step 3: [Description] - Estimated: X min

## Testing Strategy
- [ ] Unit tests for...
- [ ] Integration test for...
- [ ] Manual test: [steps]

## Risks & Mitigation
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Risk 1 | Low/Med/High | Low/Med/High | Strategy |

## Success Criteria
- [ ] Feature works as specified
- [ ] No TypeScript errors
- [ ] No security issues
- [ ] Documentation updated

---

**Status**: [DRAFT / APPROVED / IN_PROGRESS / DONE]  
**Approved by**: [User name]  
**Date**: [Date]
