# Skill: Learning Mode

## Purpose
Use Kimi not just for coding, but for deep understanding and learning.

## Configuration

### Enable Learning Mode
Tell Kimi to use explanatory style:
```
"Use learning mode - explain the why behind every change"
"Enable explanatory output style"
"Teach me as you code"
```

### Expected Behavior
When learning mode is enabled, Kimi will:
1. Explain WHY, not just WHAT
2. Connect to first principles
3. Show alternatives considered
4. Link to relevant concepts
5. Ask if concepts are clear

---

## Technique A: Visual HTML Presentations

### When to Use
- Exploring unfamiliar codebases
- Understanding complex architectures
- Onboarding to new systems

### Prompt Pattern
```
"Generate a visual HTML presentation explaining [code/concept]"
"Create an interactive slide deck for [architecture/protocol]"
"Make me a learnable HTML doc about [topic]"
```

### Expected Output
Kimi creates a standalone HTML file with:
- Clean, modern design
- Slide-like sections
- Code syntax highlighting
- Diagrams (Mermaid or ASCII)
- Interactive elements
- Summary at the end

### Example
```
"Generate a visual HTML presentation explaining the AutoGrid Excel processing pipeline"
```

Output: `docs/learning/excel-pipeline.html`

---

## Technique B: ASCII Diagrams

### When to Use
- Understanding code flow
- Visualizing protocols
- Architecture overview
- Quick sketches

### Prompt Pattern
```
"Draw an ASCII diagram of [component/flow]"
"Show me the data flow as ASCII art"
"Create an ASCII architecture diagram"
```

### Types of Diagrams

#### 1. Flow Diagrams
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Start  │───►│ Process │───►│   End   │
└─────────┘    └─────────┘    └─────────┘
```

#### 2. Architecture Diagrams
```
┌─────────────────────────────────────┐
│           Frontend (Vite)           │
└──────────────┬──────────────────────┘
               │ HTTP
               ▼
┌─────────────────────────────────────┐
│           API Server                │
└──────────────┬──────────────────────┘
               │ BullMQ
               ▼
┌─────────────────────────────────────┐
│           Worker                    │
└─────────────────────────────────────┘
```

#### 3. Sequence Diagrams
```
User    Frontend    Server    Worker
 │          │          │          │
 │──req───►│          │          │
 │          │──req───►│          │
 │          │          │──job───►│
 │          │          │◄─done───│
 │          │◄─res────│          │
 │◄─res────│          │          │
```

### Example
```
"Draw an ASCII diagram of the JWT authentication flow in our server"
```

---

## Technique C: Spaced Repetition Learning

### When to Use
- Mastering complex concepts
- Preparing for interviews
- Deep learning of architecture
- Understanding trade-offs

### Prompt Pattern
```
"Let's do spaced repetition learning on [topic]"
"I'll explain my understanding of [concept], you ask follow-ups"
"Test my knowledge of [system] with increasing difficulty"
```

### Process

#### Round 1: Initial Assessment
**User**: "I'll explain how BullMQ works in our system"
**User explains...**

**Kimi**: 
- Identifies gaps
- Asks clarifying questions
- Corrects misconceptions

#### Round 2: Fill Gaps
**Kimi**: "You mentioned X but didn't cover Y. How does job retry work?"
**User explains retry mechanism**

#### Round 3: Connections
**Kimi**: "How does BullMQ relate to Redis persistence? What happens if Redis restarts?"

#### Round 4: Application
**Kimi**: "Given a scenario where [X happens], how would you debug using your knowledge?"

### Storage
Kimi summarizes learning in a file:
```markdown
# Learning: BullMQ Architecture
Date: 2026-01-31
User Level: Intermediate → Advanced

## Concepts Mastered
- Job queuing and processing
- Retry mechanisms
- Rate limiting

## Gaps Identified
- Redis persistence edge cases
- Dead letter queues

## Next Session
- Scheduled: [date]
- Focus: Redis persistence + DLQ
```

---

## Technique D: Code Archaeology

### When to Use
- Understanding legacy code
- Finding why something was built
- Tracing evolution of features

### Prompt Pattern
```
"Explain the history and evolution of [component]"
"Why was [decision] made? Show me the git history context"
"Walk me through how [feature] works, line by line"
```

### Expected Output
Kimi will:
1. Read relevant files
2. Show git history if informative
3. Explain design decisions
4. Show before/after if refactored
5. Connect to business requirements

---

## Technique E: Socratic Teaching

### When to Use
- Building intuition
- Understanding trade-offs
- Problem-solving practice

### Prompt Pattern
```
"Don't tell me the answer. Guide me with questions"
"Help me discover [concept] through questions"
"Use the Socratic method to teach me [topic]"
```

### Example Session

**User**: "Teach me about database transactions using Socratic method"

**Kimi**: 
> Let's think about this. If two users try to update the same row simultaneously, what could go wrong?

**User**: "They might overwrite each other's changes"

**Kimi**: 
> Exactly! That's called a "lost update". Now, what if one update fails halfway through? Say, updating 3 related tables - first succeeds, second fails, third never runs?

**User**: "The database would be in an inconsistent state"

**Kimi**: 
> Right. So what properties would an ideal solution have?

[Continues until user fully understands ACID]

---

## Quick Reference

| Goal | Technique | Prompt |
|------|-----------|--------|
| Learn codebase | HTML Presentation | `"Create HTML presentation of [system]"` |
| Visualize flow | ASCII Diagrams | `"Draw ASCII diagram of [flow]"` |
| Master concept | Spaced Repetition | `"Spaced repetition learning on [topic]"` |
| Understand history | Code Archaeology | `"Explain history of [component]"` |
| Build intuition | Socratic Method | `"Use Socratic method for [topic]"` |
| Deep understanding | Learning Mode | `"Enable learning mode"` |

---

## Output Formats

### Learning Mode Output
```markdown
## Change: Added retry logic

### What
Added exponential backoff for failed jobs

### Why
Prevents thundering herd when service recovers

### First Principles
- Failures are inevitable in distributed systems
- Immediate retry can overwhelm recovering services
- Exponential backoff spreads load over time

### Alternatives Considered
1. **Fixed delay** - Simple but doesn't adapt to load
2. **Circuit breaker** - Better but more complex
3. **Exponential backoff** - ✅ Best balance

### Formula Used
```
delay = base_delay * (2 ^ attempt_number)
max_delay = 5 minutes
```

### Learn More
- [AWS Exponential Backoff](link)
- [Google SRE Book - Handling Overload](link)
```

---

## Best Practices

### For Users
1. **Start with Learning Mode** when exploring new code
2. **Save HTML presentations** for future reference
3. **Use ASCII diagrams** in PR descriptions
4. **Regular spaced repetition** for complex systems
5. **Ask "why"** until you understand fundamentals

### For Kimi
1. **Be patient** - learning takes time
2. **Check understanding** - "Does this make sense?"
3. **Connect concepts** - show relationships
4. **Provide resources** - links to learn more
5. **Adapt level** - match user's current understanding
