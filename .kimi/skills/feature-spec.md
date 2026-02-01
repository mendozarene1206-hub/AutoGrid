# Skill: Feature Specification Writer

## Purpose
Write detailed PRD (Product Requirements Document) and technical specs before coding.

## When to Use
- Before implementing any new feature
- When requirements are unclear
- For complex changes that need planning

## Output Format

```markdown
# Feature Spec: [Feature Name]

## Overview
One paragraph describing what this feature does and why.

## Requirements
### Must Have
- [ ] Requirement 1
- [ ] Requirement 2

### Nice to Have
- [ ] Nice feature A

## Technical Design
### Data Model
\`\`\`typescript
// New types/interfaces needed
\`\`\`

### API Changes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/x   | Does Y |

### UI Changes
- Component: `ComponentName.tsx`
- Route: `/new-route`

## Implementation Steps
1. Step 1
2. Step 2
3. Step 3

## Testing Plan
- Unit tests for...
- Integration tests for...
```

## Rules
1. ALWAYS include data model changes
2. ALWAYS specify API contract
3. Keep under 500 lines
4. Get user approval before proceeding to code
