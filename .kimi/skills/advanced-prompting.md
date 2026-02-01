# Skill: Advanced Prompting (Boris Cherny Style)

## Purpose
Use sophisticated prompting techniques to get higher quality output from Kimi.

## Technique A: Challenge Mode (Reviewer)

### When to Use
- Before submitting a PR
- When you want thorough critique
- To catch edge cases

### Prompt Pattern
```
"Grill me on these changes. Don't approve until I pass your test."
```

### Expected Behavior
Kimi will:
1. Act as a senior code reviewer
2. Ask tough questions about the implementation
3. Challenge assumptions
4. Point out edge cases
5. Verify you understand the changes
6. Only "approve" when satisfied

### Example
```
"Grill me on this authentication refactor. Don't approve until I can explain:
- Why we use JWT over sessions
- How token refresh works
- What happens on token theft
- Rate limiting strategy"
```

---

## Technique B: Prove It Works

### When to Use
- Before merging features
- To verify correctness
- When behavior changed

### Prompt Pattern
```
"Prove to me this works. Show me the diff in behavior between main and this branch."
```

### Expected Behavior
Kimi will:
1. Analyze both branches
2. Identify behavioral differences
3. Create a comparison table
4. Verify expected vs actual behavior
5. Flag any regressions

### Example
```
"Prove to me this caching layer works. Show me:
- Response times before/after
- Cache hit rates
- Memory usage impact
- Invalidation behavior"
```

---

## Technique C: Elegant Solution

### When to Use
- After a mediocre/brittle fix
- When code feels "hacky"
- For technical debt reduction

### Prompt Pattern
```
"Knowing everything you know now, scrap this and implement the elegant solution."
```

### Expected Behavior
Kimi will:
1. Discard the current approach
2. Re-analyze the problem from first principles
3. Propose a cleaner architecture
4. Implement using best practices
5. Explain why it's better

### Example
```
"Knowing everything you know now about this Excel parsing bug, 
scrap the current try/catch workaround and implement the elegant solution."
```

---

## Technique D: Detailed Specs (Pre-work)

### When to Use
- Before any implementation
- When requirements are unclear
- For complex features

### Prompt Pattern
```
"Let's write a detailed spec before touching any code. I want:
- Data models
- API contracts
- Error cases
- Edge cases
- Test scenarios"
```

### Expected Behavior
Kimi will:
1. Not write any implementation code
2. Create comprehensive specification
3. Ask clarifying questions
4. Document all edge cases
5. Get your approval before coding

### Example
```
"Before we implement the notification system, write a detailed spec including:
- Database schema
- Queue design
- Email template system
- Rate limiting
- Failure handling
- Backward compatibility"
```

---

## Technique E: Socratic Method

### When to Use
- When you want to understand deeply
- For learning complex concepts
- To validate your understanding

### Prompt Pattern
```
"Don't tell me the answer. Ask me questions until I figure it out myself."
```

### Expected Behavior
Kimi will:
1. Guide through questions
2. Not give direct answers
3. Help you discover the solution
4. Verify understanding at each step

---

## Quick Reference Card

| Situation | Technique | Prompt |
|-----------|-----------|--------|
| Pre-PR review | Challenge Mode | "Grill me on these changes..." |
| Verify correctness | Prove It Works | "Prove to me this works..." |
| Hacky code | Elegant Solution | "Knowing everything... scrap this..." |
| Unclear requirements | Detailed Specs | "Write detailed specs first..." |
| Want to learn | Socratic Method | "Ask me questions until..." |

---

## Rules for User

1. **Be specific** in your prompts - ambiguity kills quality
2. **Challenge Kimi** - don't accept first drafts blindly
3. **Iterate** - use "elegant solution" when needed
4. **Spec first** - never rush to implementation
5. **Verify** - always ask Kimi to prove it works

---

## Rules for Kimi

1. **Take the challenge seriously** - be a tough reviewer
2. **Ask hard questions** - don't be polite at expense of quality
3. **Show your work** - when proving, show the analysis
4. **Don't be afraid to restart** - elegant solutions often require it
5. **Demand clarity** - ask questions when specs are vague
