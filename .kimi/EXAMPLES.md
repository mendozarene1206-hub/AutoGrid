# Examples: Using Kimi with Boris Cherny Patterns

## Example 1: Implementing a New Feature

### User Request
> "Quiero agregar un sistema de notificaciones por email cuando un documento cambia de estado"

### Kimi's Process

1. **Start Plan Mode**
   ```
   /plan Agregar sistema de notificaciones por email cuando un documento cambia de estado
   ```

2. **Use Template**
   Kimi fills out `.kimi/templates/feature-plan.md` with:
   - Objective: Add email notifications on state changes
   - Components affected: server, worker, maybe frontend
   - API changes needed
   - Database changes (notifications table?)

3. **Get Approval**
   Kimi presents plan and waits for user approval

4. **Use Skill - Feature Spec**
   Once approved, Kimi uses `feature-spec` skill to write detailed PRD

5. **Implement**
   Following the spec, Kimi implements:
   - Database migration for notifications table
   - Email service in server
   - Worker job for sending emails
   - UI for notification preferences

6. **Self Review**
   Uses `code-reviewer` skill before finalizing

7. **Update KIMI.md**
   If any lessons learned, adds to the mistakes table

---

## Example 2: Debugging an Issue

### User Request
> "El worker se crashea cuando procesa archivos Excel grandes"

### Kimi's Process

1. **Use Debug Analyzer Skill**
   ```
   "Use debug-analyzer skill to investigate worker crash on large Excel files"
   ```

2. **Investigate**
   Kimi reads:
   - Worker logs (`mcp-server/server.log`)
   - `worker/src/processors/excelProcessor.ts`
   - Recent changes to worker

3. **Root Cause**
   Identifies that streaming isn't being used properly for files > 100MB

4. **Fix**
   Implements proper streaming with chunking

5. **Update KIMI.md**
   Adds entry:
   ```markdown
   | 2026-01-31 | Worker crashed on large Excel files | Implemented streaming with chunking |
   ```

---

## Example 3: Code Review

### User Request
> "Revisa este código antes de que lo suba"

### Kimi's Process

1. **Use Code Reviewer Skill**
   ```
   "Use code-reviewer skill to review the changes in [files]"
   ```

2. **Checklist Review**
   - TypeScript quality
   - Security
   - Performance
   - Code style

3. **Output**
   ```markdown
   ## Code Review: Email Service

   ### ✅ Good
   - Proper error handling
   - Input validation with Zod

   ### ⚠️ Suggestions
   - [ ] Add rate limiting for email sending
   - [ ] Extract email template to separate file

   ### 🚨 Blockers
   - None

   ### Summary
   APPROVE with suggestions
   ```

---

# 🚀 ADVANCED PROMPTING (Boris Cherny Level Up)

## Example 4: Challenge Mode (Grill Me)

### User Request
> "Grill me on these changes and don't approve until I pass your test"

### Kimi's Response
Kimi acts as senior reviewer:

```markdown
## 🔥 Code Review Challenge

I'll grill you on this auth refactor. Answer these:

### Question 1: Token Strategy
**Q**: Why JWT over session-based auth? What's the trade-off?
**Your Answer**: [You respond]
**Kimi**: Good, but what about token size? JWTs can get large...

### Question 2: Refresh Logic
**Q**: Walk me through the refresh token flow. What happens if:
1. User has two tabs open?
2. Refresh token is stolen?
3. Server restarts mid-refresh?

### Question 3: Security Edge Cases
**Q**: How do you prevent:
- Token replay attacks?
- Timing attacks on validation?
- Brute force on refresh?

### ✅ Approval Status
[PASS / NEEDS WORK] - Continue until you pass!
```

---

## Example 5: Prove It Works

### User Request
> "Prove to me this caching layer works. Show me the diff in behavior"

### Kimi's Response

```markdown
## Proof of Work: Caching Layer

### Branch Comparison
| Aspect | Main | Feature | Delta |
|--------|------|---------|-------|
| Response Time (p95) | 245ms | 12ms | -95% ✅ |
| Cache Hit Rate | N/A | 87% | New metric |
| Memory Usage | 120MB | 156MB | +30MB |
| DB Queries | 150/min | 20/min | -87% ✅ |

### Behavior Diff

#### Scenario: Fetching spreadsheet chunks
**Main**: 
1. Query DB for chunk list
2. Query R2 for each chunk (5 queries)
3. Return aggregated data
4. **Total**: ~200ms, 6 DB calls

**Feature**:
1. Check cache for chunk list
2. Cache hit → Return immediately
3. **Total**: ~5ms, 0 DB calls

### Edge Cases Tested
- ✅ Cache miss behavior
- ✅ Cache invalidation on update
- ✅ Concurrent requests (no stampede)
- ✅ Memory limit enforcement

### Verdict
✅ **APPROVED** - Performance gains validated
```

---

## Example 6: Elegant Solution

### User Request
> "Knowing everything you know now, scrap this and implement the elegant solution"

### Context
You had a brittle fix for Excel parsing:
```typescript
// UGLY: try-catch spaghetti
try {
  const data = parseExcel(file);
} catch (e) {
  if (e.message.includes('sheet')) {
    // retry with different parser
  } else if (e.message.includes('format')) {
    // convert first
  }
  // ... more hacks
}
```

### Kimi's Response

```markdown
## 🗑️ Scrapping the Hack

You're right - that approach is brittle. Let me re-analyze from first principles.

### Root Problem
Excel files can be:
- .xlsx (Open XML)
- .xls (Binary BIFF)
- Corrupted/Invalid
- Password protected
- Huge (streaming needed)

### Elegant Architecture

```typescript
// Strategy Pattern
interface ExcelParser {
  canParse(file: File): boolean;
  parse(file: File): AsyncGenerator<Row>;
}

class XlsxParser implements ExcelParser { /* ... */ }
class XlsParser implements ExcelParser { /* ... */ }
class CsvFallbackParser implements ExcelParser { /* ... */ }

// Factory with auto-detection
const parser = ExcelParserFactory.create(file);
const rows = parser.parse(file); // Always works
```

### Why This is Better
1. **Open/Closed**: New formats? Add new parser
2. **No conditionals**: Auto-detection handles logic
3. **Streaming**: Built-in for all parsers
4. **Testable**: Each parser tested independently
5. **No magic strings**: No parsing error messages

### Migration Path
1. Create parser interface
2. Migrate xlsx parser first
3. Add xls parser
4. Add fallback
5. Remove old code

[Elegant implementation follows...]
```

---

## Example 7: Detailed Specs First

### User Request
> "Before we implement the notification system, write a detailed spec"

### Kimi's Response

```markdown
# Spec: Notification System

## 🚫 Implementation Phase: NOT STARTED
Waiting for spec approval...

## Data Model

```typescript
// notifications table
interface Notification {
  id: uuid;
  user_id: uuid;
  type: 'document_state_change' | 'mention' | 'deadline';
  payload: JSON;
  read_at: timestamp | null;
  created_at: timestamp;
  
  // Email tracking
  email_sent: boolean;
  email_sent_at: timestamp | null;
}

// user_preferences table (extension)
interface NotificationPreference {
  user_id: uuid;
  email_enabled: boolean;
  push_enabled: boolean;
  document_changes: boolean;
  mentions: boolean;
  digest_frequency: 'immediate' | 'hourly' | 'daily';
}
```

## API Design

### Create Notification (Internal)
```typescript
POST /internal/notifications
{
  user_id: string;
  type: NotificationType;
  payload: object;
}
```

### Mark as Read
```typescript
PATCH /api/notifications/:id/read
```

### Get Notifications
```typescript
GET /api/notifications?unread_only=true&limit=20
```

## Queue Design (BullMQ)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  notification   │───►│  email-sender   │───►│  rate-limiter   │
│     queue       │    │     worker      │    │   (per user)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │
       ▼
┌─────────────────┐
│  push-sender    │
│     worker      │
└─────────────────┘
```

## Error Cases

| Error | Handling | Retry |
|-------|----------|-------|
| Email bounce | Mark failed, notify admin | No |
| Rate limit | Delay 1 hour | Yes (3x) |
| Invalid email | Disable email for user | No |
| Queue full | Alert ops, backoff | Yes |

## Edge Cases

1. **User disables email mid-send**: Check preference before each send
2. **1000 notifications at once**: Batch digest
3. **Server crash during send**: Idempotent email IDs
4. **User deleted**: Cascade delete notifications
5. **Timezone**: Store all in UTC, convert for digest

## Test Scenarios

- [ ] Unit: Notification creation
- [ ] Unit: Preference parsing
- [ ] Integration: Full flow
- [ ] E2E: Real email (Mailtrap)
- [ ] Load: 10k notifications
- [ ] Chaos: Worker crash recovery

## Open Questions

1. Do we need SMS fallback for critical alerts?
2. Should we support in-app notification center?
3. What's the email provider? (SendGrid/AWS SES?)

**APPROVE SPEC?** [Yes/No/Changes needed]
```

---

# 🎓 LEARNING MODE (Boris Cherny Tips)

## Example 8: HTML Presentation

### User Request
> "Create a visual HTML presentation explaining the Excel processing pipeline"

### Kimi's Response

Kimi generates: `docs/learning/excel-pipeline.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Excel Processing Pipeline - Visual Guide</title>
    <style>
        /* Modern, clean styles */
        /* ... */
    </style>
</head>
<body>
    <!-- Slide 1: Title -->
    <section class="slide">
        <h1>📊 Excel Processing Pipeline</h1>
        <p>How AutoGrid handles 150MB+ Excel files</p>
    </section>
    
    <!-- Slide 2: Architecture -->
    <section class="slide">
        <h2>Architecture Overview</h2>
        <div class="diagram">
User → Frontend → Server → Worker → R2
              ↓         ↓
         Presigned   Chunks
           URL       (2000 rows)
        </div>
    </section>
    
    <!-- Slide 3: The Flow -->
    <section class="slide">
        <h2>Step-by-Step Flow</h2>
        <div class="card-grid">
            <div class="card">
                <h3>1️⃣ Upload</h3>
                <p>Browser → R2 direct</p>
                <p>Zero server RAM</p>
            </div>
            <div class="card">
                <h3>2️⃣ Queue</h3>
                <p>BullMQ job created</p>
                <p>Worker picks up</p>
            </div>
            <div class="card">
                <h3>3️⃣ Process</h3>
                <p>Streaming parse</p>
                <p>Chunk into JSON</p>
            </div>
        </div>
    </section>
    
    <!-- More slides... -->
</body>
</html>
```

**Result**: Standalone HTML file with interactive slides, diagrams, and code examples!

---

## Example 9: ASCII Diagrams

### User Request
> "Draw an ASCII diagram of the JWT authentication flow"

### Kimi's Response

```
## JWT Authentication Flow

### Login Flow
```
┌─────────┐                         ┌─────────┐
│  User   │──POST /login───────────►│ Server  │
│         │  {email, password}      │         │
│         │                         │──┐      │
│         │                         │  │ Hash │
│         │                         │  │ Verify
│         │                         │◄─┘      │
│         │◄──{access, refresh}────│         │
│         │                         │         │
└────┬────┘                         └─────────┘
     │
     │ Stores tokens
     ▼
┌─────────────┐
│ localStorage│
│  or Cookie  │
└─────────────┘
```

### Authenticated Request Flow
```
┌─────────┐                         ┌─────────┐
│ Frontend│──GET /api/data─────────►│ Server  │
│         │  Authorization:         │         │
│         │  Bearer <access_token>  │         │
│         │                         │──┐      │
│         │                         │  │ Verify
│         │                         │  │ JWT   
│         │                         │◄─┘      │
│         │◄────{data}─────────────│         │
└─────────┘                         └─────────┘
```

### Token Refresh Flow
```
┌─────────┐                         ┌─────────┐
│ Frontend│──POST /refresh─────────►│ Server  │
│         │  {refresh_token}        │         │
│         │                         │──┐      │
│         │                         │  │ Check│
│         │                         │  │ Redis│
│         │                         │◄─┘      │
│         │◄──{new_access_token}───│         │
└─────────┘                         └─────────┘
```

### Logout Flow
```
┌─────────┐                         ┌─────────┐      ┌───────┐
│ Frontend│──POST /logout──────────►│ Server  │─────►│ Redis │
│         │  {refresh_token}        │         │      │       │
│         │                         │ Blacklist      │ Store │
│         │◄────{success}──────────│         │      │       │
└─────────┘                         └─────────┘      └───────┘
```
```

---

## Example 10: Spaced Repetition Learning

### User Request
> "Spaced repetition learning on BullMQ architecture"

### Kimi's Response

```markdown
# 🧠 Spaced Repetition: BullMQ

## Round 1: Your Turn
Explain to me how BullMQ works in our system. Take your time, 
cover:
- What is BullMQ?
- How do we use it?
- What are jobs and queues?

[You explain...]

---

## Gap Analysis

✅ **Got it**:
- BullMQ is a Redis-based queue
- We use it for background jobs
- Jobs are tasks, queues organize them

⚠️ **Missing**:
- You didn't mention workers
- Retry mechanism unclear
- Rate limiting not covered

---

## Round 2: Fill the Gaps

**Q**: What happens when a job fails? How many times do we retry?

[You answer...]

**Kimi**: Correct! We use exponential backoff with 3 retries.
Now, what if all retries fail?

[You answer...]

**Kimi**: Right - Dead Letter Queue (DLQ). Let's move deeper.

---

## Round 3: Connections

**Q**: How does BullMQ relate to Redis persistence? 
What happens if Redis restarts while a job is processing?

[You think...]

**Kimi**: 
- BullMQ uses Redis lists and sorted sets
- Job state is stored in Redis
- If Redis restarts, unacked jobs go back to queue
- This is the "at least once" guarantee

---

## Round 4: Application

**Scenario**: You see in logs that the same Excel file 
is being processed 3 times. What could be happening?

[You diagnose...]

**Kimi**: 
✅ **Correct diagnosis**:
- Worker crashed during processing
- Job timeout < actual processing time
- Job requeued, picked up by another worker
- Repeat...

**Fix**: Increase job timeout or implement idempotency key!

---

## 📊 Session Summary

| Concept | Level Before | Level After |
|---------|-------------|-------------|
| Basic concepts | ✅ Known | ✅ Mastered |
| Retry/DLQ | ⚠️ Partial | ✅ Mastered |
| Redis connection | ❌ Unknown | ✅ Mastered |
| Troubleshooting | ❌ Unknown | ✅ Mastered |

**Next Session**: Redis persistence internals + Monitoring

*Saved to: `.kimi/learning/bullmq-session-2026-01-31.md`*
```

---

## Example 11: Socratic Method

### User Request
> "Teach me about database transactions using Socratic method"

### Kimi's Response

```markdown
# 🏛️ Socratic Method: Database Transactions

I'll guide you with questions. No answers from me!

---

**Kimi**: Let's think about this scenario:
> Two users try to update the same bank account balance 
> simultaneously. What could go wrong?

[You answer: They might overwrite each other's changes]

**Kimi**: Exactly! That's called a "lost update". 
Now, what if one update fails halfway through? 
Say, updating 3 related tables - first succeeds, 
second fails, third never runs?

[You answer: The database would be inconsistent]

**Kimi**: Right. The account balance and transaction 
history wouldn't match. What properties would an 
ideal solution need to prevent both problems?

[You think: Atomicity? Consistency?]

**Kimi**: Good direction! You're thinking about making 
operations atomic and maintaining consistency. 
What about isolation and durability? Why might those matter?

[You discuss isolation preventing interference...]

**Kimi**: Excellent! Now you've discovered ACID properties:
- **A**tomicity: All or nothing
- **C**onsistency: Valid state to valid state
- **I**solation: Concurrent transactions don't interfere
- **D**urability: Committed data survives crashes

**Final Question**: In our AutoGrid system, why might we 
NOT want strict isolation for the notification queue?

[You reason about performance vs consistency trade-offs...]

**Kimi**: 🎉 You've mastered transactions! You understand:
1. The problems they solve
2. ACID properties
3. Real-world trade-offs

No need to memorize - you understand the principles!
```

---

## Example 12: Code Archaeology

### User Request
> "Explain the history and evolution of the chunking system"

### Kimi's Response

```markdown
# 🏛️ Code Archaeology: Chunking System

## Current State (2026)
```typescript
// 2000 rows per chunk
const CHUNK_SIZE = 2000;
const chunks = await createChunks(data, CHUNK_SIZE);
```

## Evolution Timeline

### v1.0 (Initial)
```typescript
// NO CHUNKING - Load everything to memory
const data = await parseExcel(file); // 💥 OOM on large files
return data;
```
**Problem**: Server crashed on files > 50MB

---

### v1.1 (Quick Fix)
```typescript
// Simple pagination in memory
const allRows = await parseExcel(file);
const pages = chunk(allRows, 1000); // Still loads all first!
return pages;
```
**Problem**: Still OOM, just delayed

---

### v2.0 (Streaming - Current)
```typescript
// True streaming with generator
async function* parseStreaming(file) {
  for await (const row of excelStream(file)) {
    yield row;
  }
}

// Chunk without loading all
const chunks = await createChunksStreaming(parseStreaming(file));
```
**Why this works**: Constant memory usage regardless of file size

---

### Why 2000 rows?

**Benchmarks showed**:
| Chunk Size | Parse Time | Memory | UX |
|------------|-----------|--------|-----|
| 500 | Slow | Low | Too many requests |
| 1000 | OK | Low | Good |
| **2000** | **Fast** | **Low** | **Best balance** |
| 5000 | Fast | Medium | Slow initial load |
| 10000 | Fast | High | Unresponsive |

---

### Lessons Learned

1. **Measure first**: We benchmarked before deciding
2. **Memory > Speed**: Streaming beats loading
3. **UX matters**: 2000 rows = sweet spot for Univer grid
4. **Iterative**: Took 3 attempts to get right

### Future Considerations

- Adaptive chunk sizing based on row width
- Compression (already implemented with gzip)
- Client-side caching of chunks

*Next evolution: Maybe Web Workers for client-side parsing?*
```

---

## Quick Reference

### Basic Patterns
| Escenario | Comando |
|-----------|---------|
| Nueva feature | `/plan [description]` |
| Bug misterioso | `"Usa debug-analyzer skill"` |
| Revisar código | `"Usa code-reviewer skill"` |
| Escribir spec | `"Usa feature-spec skill"` |

### Advanced Patterns (Level Up)
| Technique | Prompt |
|-----------|--------|
| **Challenge Mode** | `"Grill me on these changes. Don't approve until I pass"` |
| **Prove It Works** | `"Prove to me this works. Show me the diff in behavior"` |
| **Elegant Solution** | `"Knowing everything, scrap this and implement the elegant solution"` |
| **Detailed Specs** | `"Write detailed specs before touching code"` |

### Learning Mode Patterns
| Goal | Prompt |
|------|--------|
| **Visual Guide** | `"Create HTML presentation of [system]"` |
| **ASCII Diagram** | `"Draw ASCII diagram of [flow]"` |
| **Deep Learning** | `"Spaced repetition learning on [topic]"` |
| **Understand History** | `"Explain history of [component]"` |
| **Build Intuition** | `"Use Socratic method for [concept]"` |

---

## 📝 Updating KIMI.md

Cuando Kimi hace algo mal, añade a la tabla:

```markdown
| 2026-02-01 | Descripción del error | Cómo se corrigió |
```

Esto sigue el principio de Boris: *"Turn mistakes into institutional memory"* 🧠
