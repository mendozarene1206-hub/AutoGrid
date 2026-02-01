# Skill: Debug Analyzer

## Purpose
Systematically debug and fix issues.

## When to Use
- Error logs need analysis
- Bug reports without clear cause
- Performance issues

## Process

1. **Gather Evidence**
   - Read error logs
   - Check recent commits
   - Identify affected files

2. **Reproduce**
   - Find the minimal reproduction case
   - Check if it's deterministic

3. **Root Cause Analysis**
   - Trace data flow
   - Identify where it breaks
   - Check assumptions

4. **Fix & Verify**
   - Implement minimal fix
   - Test the fix
   - Check for regressions

## Output Format

```markdown
## Debug Report: [Issue Title]

### Error
\`\`\`
[Error message/stack trace]
\`\`\`

### Root Cause
[Explanation of what's causing the issue]

### Affected Files
- `file1.ts` - line 45
- `file2.ts` - line 120

### Fix Applied
\`\`\`typescript
// Code change
\`\`\`

### Verification
- [ ] Error no longer occurs
- [ ] No regressions introduced
- [ ] Tests pass (if exist)
```

## Rules
1. Never guess - always verify with evidence
2. Fix root cause, not symptoms
3. One fix at a time
4. Document the lesson learned
