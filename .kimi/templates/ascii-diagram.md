# Template: ASCII Diagram

## Purpose
Create clear ASCII diagrams for code, architecture, and flows.

## Types

### 1. Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        SYSTEM NAME                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │  Component A │◄────►│  Component B │◄────►│ComponentC│  │
│  └──────┬───────┘      └──────┬───────┘      └────┬─────┘  │
│         │                     │                    │        │
│         └─────────────────────┴────────────────────┘        │
│                          │                                  │
│                          ▼                                  │
│                   ┌──────────────┐                         │
│                   │  Database    │                         │
│                   └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Flow Diagram
```
START
  │
  ▼
┌─────────┐    Yes    ┌─────────┐
│Condition├──────────►│ Action A│
└────┬────┘           └────┬────┘
     │ No                   │
     ▼                      ▼
┌─────────┐           ┌─────────┐
│ Action B│◄──────────┤ Merge   │
└────┬────┘           └─────────┘
     │
     ▼
    END
```

### 3. Sequence Diagram
```
Actor A    Service    Database
   │          │           │
   │──req────►│           │
   │          │──query───►│
   │          │◄─result───│
   │◄─resp────│           │
   │          │           │
```

### 4. Timeline/State
```
Time ───────────────────────────────────────►

State A      [████████████]
                  │
State B           [████████████████]
                       │
State C                [████████████████████████]
```

### 5. Tree/Hierarchy
```
Root
├── Branch A
│   ├── Leaf A1
│   └── Leaf A2
├── Branch B
│   ├── Leaf B1
│   │   └── Sub-leaf
│   └── Leaf B2
└── Branch C
```

## Usage

Tell Kimi:
```
"Create ASCII diagram of [topic] using [type]"
"Draw the [system] architecture as ASCII"
"Show me the [flow] as ASCII art"
```

## Tips
- Keep width under 80 chars for mobile
- Use box-drawing characters: ┌─┐│└┘├┤┬┴┼
- Use arrows: ─►◄─▲▼
- Add legend if complex
