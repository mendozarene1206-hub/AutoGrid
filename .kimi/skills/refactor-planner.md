# Skill: Refactor Planner

## Purpose
Plan safe refactoring operations.

## When to Use
- Code needs restructuring
- Tech debt cleanup
- Before major feature additions

## Process

1. **Understand Current State**
   - Read affected files
   - Map dependencies
   - Identify edge cases

2. **Plan Refactoring Steps**
   - Break into small, safe steps
   - Each step must be testable
   - Have rollback plan

3. **Execute Incrementally**
   - One change at a time
   - Verify after each step
   - Commit frequently

## Output Format

```markdown
## Refactor Plan: [Component/Module]

### Current Issues
1. Issue 1
2. Issue 2

### Target State
[Description of desired end state]

### Migration Steps
1. [ ] Step 1 - [Files affected]
2. [ ] Step 2 - [Files affected]
3. [ ] Step 3 - [Files affected]

### Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Risk 1 | How to handle |

### Rollback Plan
[How to revert if needed]
```

## Rules
1. Never refactor without tests (or add them first)
2. Keep changes reviewable (< 400 lines per PR)
3. Maintain backward compatibility when possible
4. Update documentation after refactoring
