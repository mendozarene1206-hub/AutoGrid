# Workflow: Feature Implementation

## Purpose
Standardized process for implementing new features following Boris Cherny's "Plan First" approach.

## Steps

### Phase 1: Planning (REQUIRED)
1. Use `/plan` to create detailed plan
2. Fill out `.kimi/templates/feature-plan.md`
3. Get user approval before proceeding
4. Break into subtasks if needed

### Phase 2: Specification
1. Use `feature-spec` skill to write PRD
2. Define data models
3. Design API contracts
4. Plan UI components

### Phase 3: Implementation
1. Implement backend first (API → DB → Logic)
2. Implement frontend (Components → Integration)
3. Add tests as you go
4. Use `debug-analyzer` skill if issues arise

### Phase 4: Review
1. Use `code-reviewer` skill for self-review
2. Run all checks (types, lint, tests)
3. Verify against requirements
4. Update KIMI.md with any lessons

### Phase 5: Submit
1. Commit with descriptive message
2. Create PR with plan attached
3. Request review

## Checklist
- [ ] Plan approved by user
- [ ] Specification document written
- [ ] Implementation complete
- [ ] Self-review done
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Ready for PR
