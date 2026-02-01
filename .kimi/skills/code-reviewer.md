# Skill: Code Reviewer

## Purpose
Review code for quality, security, and adherence to project conventions.

## When to Use
- Before committing changes
- When refactoring existing code
- For PR review assistance

## Review Checklist

### TypeScript Quality
- [ ] No `any` types without comment
- [ ] Return types declared on exports
- [ ] Proper error handling with typed errors
- [ ] No unused imports/variables

### Security
- [ ] Input validation with Zod
- [ ] Auth checks on protected routes
- [ ] No secrets in code
- [ ] SQL injection prevention (use Supabase RLS)

### Performance
- [ ] No N+1 queries
- [ ] Proper streaming for large files
- [ ] Async/await used correctly
- [ ] No memory leaks

### Code Style
- [ ] Matches existing patterns in file
- [ ] Consistent naming conventions
- [ ] Comments for complex logic
- [ ] Functions < 50 lines when possible

## Output Format

```markdown
## Code Review: [File/PR]

### ✅ Good
- Point 1
- Point 2

### ⚠️ Suggestions
- [ ] Suggestion 1
- [ ] Suggestion 2

### 🚨 Blockers
- [ ] Critical issue 1

### Summary
[APPROVE / REQUEST CHANGES]
```

## Rules
1. Be constructive, not critical
2. Explain WHY, not just WHAT
3. Prioritize security over style
4. Suggest fixes, don't just point problems
