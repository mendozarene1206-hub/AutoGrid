# KIMI.md - AutoGrid Project Context

> Archivo de contexto compartido para Kimi Code CLI siguiendo best practices de Boris Cherny.
> **Regla**: Si Kimi hace algo mal, agrégalo aquí para que no se repita.

---

## 📋 Project Overview

**AutoGrid** - Sistema de gestión de estimaciones de construcción con IA para auditoría.
- **Stack**: React 19 + TypeScript + Express 5 + Supabase + BullMQ + Cloudflare R2
- **Mercado**: México (NOM-151 compliance)
- **Arquitectura**: Microservicios (frontend, server, worker, mcp-server)

---

## 🗂️ Project Structure

```
AutoGrid/
├── frontend/          # React 19 + Vite + Univer Grid
├── server/            # Express API (port 3001)
├── worker/            # BullMQ job processor
├── mcp-server/        # MCP + AI server (port 3000)
├── univer-server/     # Univer Pro server
├── supabase/          # PostgreSQL migrations
├── shared/            # TypeScript types shared
└── docs/              # Documentation & roadmaps
```

---

## 🛠️ Common Commands

```bash
# Development (run in separate terminals)
cd server && npm run dev      # API server
cd worker && npm run dev      # Job worker
cd mcp-server && npm run dev  # MCP server
cd frontend && npm run dev    # Frontend

# Database
cd supabase && supabase db reset

# Logs
tail -f mcp-server/server.log
```

---

## 🎯 Code Style & Conventions

### TypeScript
- **Strict mode enabled** - No `any` types without justification
- **Explicit return types** on exported functions
- **Interfaces over types** for object shapes
- **Shared types** go in `shared/types.ts`

### Naming
- `PascalCase` for components, interfaces, types
- `camelCase` for variables, functions, methods
- `kebab-case` for files (except React components: `PascalCase.tsx`)
- `UPPER_SNAKE_CASE` for constants

### File Organization
```
src/
├── components/     # React components
├── routes/         # API routes (backend)
├── processors/     # Job processors (worker)
├── tools/          # MCP tools
├── lib/            # Utilities & config
└── types.ts        # Shared types
```

---

## 🔒 Security Rules (NEVER bypass)

1. **Authentication**: JWT required for all API routes (except health checks)
2. **Authorization**: Check roles (Admin, Manager, Resident)
3. **RLS**: Supabase Row Level Security policies active
4. **Rate Limiting**: 100 req/15min general, 5 req/15min auth, 20 req/hour LLM
5. **CORS**: Only configured origins allowed
6. **Input Validation**: Zod schemas for all inputs
7. **No secrets in code** - Use environment variables

---

## 🧪 Testing Requirements

**Currently NO tests exist** - When adding:
- Use Vitest for unit tests
- Test files: `*.test.ts` or `*.spec.ts`
- Place tests next to source files
- Minimum coverage: 70%

---

## 🐛 Known Issues & Gotchas

1. **Excel Processing**: Large files (150MB+) use streaming - don't load to memory
2. **Chunking**: 2000 rows per chunk for Univer grid performance
3. **Redis**: Required for BullMQ queues
4. **R2 Upload**: Browser → R2 direct (zero server RAM)
5. **MCP Server**: SSE transport, tools must be registered in index.ts

---

## 🚀 Workflow States

```
DRAFT → IN_REVIEW → APPROVED_INTERNAL → SIGNED
   ↑___________|
```

**Rules**:
- Only Resident can submit to review
- Only Manager can approve
- Signed documents are IMMUTABLE
- SHA-256 hashing for forensic integrity

---

## 📝 When Kimi Makes Mistakes

_Add entries here with date and fix_

| Date | Mistake | Fix Applied |
|------|---------|-------------|
| 2026-01-31 | - | - |

---

## 🎯 Kimi Instructions

1. **Plan Mode First**: Always create a plan before implementing
2. **Minimal Changes**: Only touch what's necessary
3. **Follow existing patterns**: Match code style in file
4. **Update this file**: When learning something new about the project
5. **Test before commit**: Run type checks and linters
6. **Document breaking changes**: Update docs/ if APIs change

---

## 🤖 Kimi Tools (Boris Cherny Style)

### Available Skills (in `.kimi/skills/`)
| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `feature-spec` | Write PRDs and specs | Before implementing features |
| `code-reviewer` | Review code quality | Before committing |
| `debug-analyzer` | Debug issues | When errors occur |
| `refactor-planner` | Plan refactoring | When restructuring code |
| `advanced-prompting` | Prompting techniques | For complex requests |
| `learning-mode` | Learn while coding | For understanding |

**Usage**: Tell Kimi: "Use [skill-name] skill to [task]"

### Plan Mode Templates (in `.kimi/templates/`)
| Template | Use Case |
|----------|----------|
| `feature-plan.md` | New features |
| `bugfix-plan.md` | Bug fixes |
| `refactor-plan.md` | Refactoring |
| `ascii-diagram.md` | ASCII diagrams |
| `html-presentation.md` | Interactive HTML slides |

**Usage**: Start with `/plan`, then reference template

### Workflows (in `.kimi/workflows/`)
- `feature-implementation.md` - End-to-end feature process
- `code-review.md` - Pre-commit checklist

---

## 🎓 Learning Mode (Boris Cherny Tips)

### Enable Learning Mode
```
"Use learning mode - explain the why behind changes"
"Teach me as you code"
```

### Techniques

| Technique | Prompt | Output |
|-----------|--------|--------|
| **HTML Presentation** | `"Create HTML presentation of [topic]"` | Interactive slides in `docs/learning/` |
| **ASCII Diagrams** | `"Draw ASCII diagram of [system]"` | Visual architecture in terminal |
| **Spaced Repetition** | `"Spaced repetition learning on [topic]"` | Structured learning session |
| **Socratic Method** | `"Use Socratic method for [concept]"` | Learn through questions |
| **Code Archaeology** | `"Explain history of [component]"` | Evolution + context |

### Quick Examples
```bash
# Create visual guide
"Create HTML presentation explaining the Excel processing pipeline"

# Visualize architecture
"Draw ASCII diagram of the JWT auth flow"

# Deep learning
"Spaced repetition learning on BullMQ architecture"

# Understand legacy code
"Explain the history of the chunking system"
```

**See `.kimi/skills/learning-mode.md` for full guide**

---

## 🚀 Advanced Prompting (Boris Cherny Level Up)

### Technique A: Challenge Mode
**Prompt**: `"Grill me on these changes and don't approve until I pass your test"`

**Use when**: Before PR submission, want thorough critique
**Result**: Kimi acts as senior reviewer asking tough questions

---

### Technique B: Prove It Works  
**Prompt**: `"Prove to me this works. Show me the diff in behavior between main and this branch"`

**Use when**: Verifying correctness, before merging
**Result**: Comparison table showing before/after metrics

---

### Technique C: Elegant Solution
**Prompt**: `"Knowing everything you know now, scrap this and implement the elegant solution"`

**Use when**: Current fix feels hacky/brittle
**Result**: Clean architecture from first principles

---

### Technique D: Detailed Specs First
**Prompt**: `"Write detailed specs and reduce ambiguity before handing work off"`

**Use when**: Requirements unclear, complex feature
**Result**: Comprehensive spec with data models, API, edge cases

---

### Quick Reference
| Technique | Prompt |
|-----------|--------|
| Challenge | `"Grill me on these changes..."` |
| Verify | `"Prove to me this works..."` |
| Elegance | `"Knowing everything... scrap this..."` |
| Spec-First | `"Write detailed specs before touching code..."` |

**See `.kimi/skills/advanced-prompting.md` for full guide**

---

## 📚 Key Documentation

- `docs/autogrid-roadmap.md` - Roadmap general
- `docs/ROADMAP_v7.md` - Roadmap detallado
- `ANALISIS_REPO.md` - Análisis completo del repositorio
- `shared/types.ts` - Tipos compartidos
- `.kimi/README.md` - Kimi configuration guide

---

*Last updated: 2026-01-31*
