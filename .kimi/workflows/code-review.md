# Workflow: Code Review Process

## Purpose
Standardized code review process for maintaining quality.

## Trigger
Before any commit or PR submission.

## Steps

1. **Self Review**
   ```bash
   # Run type checker
   cd [service] && npm run type-check
   
   # Run linter
   cd [service] && npm run lint
   
   # Run tests (if exist)
   cd [service] && npm test
   ```

2. **Security Check**
   - [ ] No secrets in code
   - [ ] Input validation present
   - [ ] Auth checks in place
   - [ ] No SQL injection vectors

3. **Quality Check**
   - [ ] Functions are focused
   - [ ] Error handling is comprehensive
   - [ ] No console.logs (use proper logger)
   - [ ] Comments explain WHY, not WHAT

4. **Update Documentation**
   - [ ] KIMI.md updated if lesson learned
   - [ ] API docs updated if endpoints changed
   - [ ] Comments added for complex logic

5. **Final Review**
   - [ ] Changes are minimal and focused
   - [ ] Commit message is descriptive
   - [ ] Ready for PR

## Output
- Clean code ready for submission
- Updated KIMI.md if applicable
