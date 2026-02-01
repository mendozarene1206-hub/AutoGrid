# AutoGrid - Contexto Completo para Desarrollo

## 🎯 Qué es AutoGrid

AutoGrid es un sistema de gestión de estimaciones de construcción con auditoría IA, diseñado para el mercado mexicano con cumplimiento NOM-151 (firmas digitales y trazabilidad forense).

**Problema que resuelve**: Los residentes de obra y administradores de construcción en México pierden semanas gestionando estimaciones en Excel, con errores matemáticos frecuentes y sin trazabilidad legal de aprobaciones.

**Solución**: Una plataforma web donde se pueden subir Excel de estimaciones, auditar automáticamente con IA (Gemini), gestionar flujos de aprobación digitales y firmar documentos con validez legal NOM-151.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUTOGRID                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   FRONTEND   │◄────►│    SERVER    │◄────►│    WORKER    │  │
│  │   (Vite)     │      │  (Express)   │      │  (BullMQ)    │  │
│  │  React 19    │      │   Port 3001  │      │ Redis Queue  │  │
│  │  Univer Grid │      │              │      │              │  │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘  │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Supabase   │      │  Cloudflare  │      │  LLM (Gemini)│  │
│  │  (Auth + DB) │      │     R2       │      │   via MCP    │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 MCP SERVER (Port 3000)                    │  │
│  │  - SSE transport for MCP protocol                        │  │
│  │  - Workflow API routes                                   │  │
│  │  - AI Audit API with rate limiting                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Flujo de Datos**:
1. Usuario sube Excel (Browser → R2 directo, zero RAM)
2. Server crea job en BullMQ
3. Worker procesa: streaming parse → chunks de 2000 filas → JSON en R2
4. Frontend carga chunks on-demand vía Univer Grid
5. Auditoría IA via MCP Server + Gemini

---

## 💻 Stack Tecnológico

### Frontend
- **React 19** con TypeScript strict
- **Vite** 7.x (build tool)
- **Univer** 0.15.x (spreadsheet grid)
- **Supabase JS** (auth + DB client)
- **pako** (gzip compression)
- **html2pdf.js** (PDF export)

### Backend
- **Express 5** (API server, port 3001)
- **BullMQ** (job queues con Redis)
- **ioredis** (Redis client)
- **AWS SDK v3** (R2 operations)
- **Helmet.js** (security headers)
- **Zod** (validation)

### Worker
- **BullMQ** (job processing)
- **ExcelJS** (streaming Excel parser)
- **p-limit** (concurrency control)

### MCP Server
- **MCP SDK** (Model Context Protocol)
- **Google AI SDK** (Gemini integration)
- **JWT** + **bcrypt** (auth)
- **mathjs** (safe math evaluation)

### Infraestructura
- **Supabase** (PostgreSQL + Auth + RLS)
- **Cloudflare R2** (object storage, S3-compatible)
- **Redis** (BullMQ + caching)

---

## 📁 Estructura de Carpetas

```
AutoGrid/
├── frontend/              # React + Vite + Univer
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks (React Query)
│   │   ├── lib/           # Utils, Supabase client
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── server/                # Express API (port 3001)
│   ├── src/
│   │   ├── routes/        # API routes (upload, chunks, auth)
│   │   ├── lib/           # Queue config, R2 client
│   │   └── index.ts       # Entry point
│   └── package.json
│
├── worker/                # BullMQ processor
│   ├── src/
│   │   ├── processors/    # Excel processor (streaming)
│   │   └── lib/           # R2 operations
│   └── package.json
│
├── mcp-server/            # MCP + AI Server (port 3000)
│   ├── src/
│   │   ├── tools/         # MCP tools (catalog, math)
│   │   └── index.ts       # MCP + Express server
│   └── package.json
│
├── univer-server/         # Univer Pro server (opcional)
│
├── supabase/
│   └── migrations/        # SQL schema migrations
│
├── shared/
│   └── types.ts           # Tipos compartidos entre servicios
│
├── docs/                  # Documentación
│   ├── learning/          # HTML presentations generadas
│   └── *.md               # Roadmaps y planes
│
├── .kimi/                 # Configuración Kimi CLI
│   ├── skills/            # Skills para tareas específicas
│   ├── templates/         # Templates para Plan Mode
│   └── workflows/         # Workflows estandarizados
│
├── KIMI.md                # Contexto del proyecto (lee esto primero)
└── ANALISIS_REPO.md       # Análisis completo del repo
```

---

## 🛠️ Comandos Comunes

```bash
# Iniciar todos los servicios (4 terminales separados)
cd server && npm run dev          # API: http://localhost:3001
cd worker && npm run dev          # Worker procesa jobs
cd mcp-server && npm run dev      # MCP: http://localhost:3000
cd frontend && npm run dev        # Frontend: http://localhost:5173

# Database
cd supabase && supabase db reset  # Reset schema + seed data

# Logs
tail -f mcp-server/server.log     # Ver logs del MCP
```

---

## 🔒 Reglas de Seguridad (NUNA bypass)

1. **JWT** requerido en TODOS los endpoints excepto health checks
2. **RBAC**: Admin, Manager, Resident (verificar en cada endpoint)
3. **RLS**: Row Level Security activo en Supabase
4. **Rate Limiting**:
   - 100 req/15min general
   - 5 req/15min auth endpoints
   - 20 req/hour para LLM/AI
5. **Validación**: Zod schemas para TODO input
6. **No secrets** en código → usar variables de entorno
7. **SHA-256** hashing para integridad de documentos (NOM-151)

---

## 🎯 Estados del Workflow

```
                    ┌─────────────┐
         ┌─────────►│    DRAFT    │◄────────┐
         │          └──────┬──────┘         │
         │                 │ submit          │ reject
         │                 ▼                 │
         │          ┌─────────────┐          │
         │          │  IN_REVIEW  │──────────┘
         │          └──────┬──────┘
         │                 │ approve
         │                 ▼
         │          ┌─────────────┐
         │          │APPROVED_INT │
         │          └──────┬──────┘
         │                 │ sign
         │                 ▼
         │          ┌─────────────┐
         └──────────┤   SIGNED    │  ← INMUTABLE
                    └─────────────┘
```

**Reglas de Negocio**:
- Solo **Resident** puede enviar a review
- Solo **Manager** puede aprobar
- Documento **SIGNED** es inmutable (con SHA-256 hash)
- Cada transición genera snapshot + audit log

---

## ✅ Estado Actual (Sprint 0-1)

### Completado ✅
- [x] Upload con presigned URLs → R2 (zero RAM)
- [x] Worker de procesamiento Excel (streaming)
- [x] Chunking inteligente (2000 filas)
- [x] Grid básico con Univer
- [x] MCP Server estructura
- [x] Database schema con RLS
- [x] Autenticación JWT
- [x] Rate limiting

### En Progreso 🔄
- [ ] Univer Pro Integration (60%)
- [ ] Sistema de auditoría IA con Gemini (40%)
- [ ] Workflow Engine (30%)
- [ ] Firmas digitales NOM-151 (20%)

### Pendiente 📋
- [ ] Reportes PDF
- [ ] Dashboard analytics
- [ ] Notificaciones email
- [ ] Tests (0% coverage actualmente)
- [ ] Offline mode

---

## 🧩 Componentes Clave

### 1. Excel Processing Pipeline
- **Upload**: Browser genera presigned URL → sube directo a R2
- **Queue**: Server crea job en BullMQ con metadata
- **Processing**: Worker hace streaming parse con ExcelJS
- **Chunking**: Divide en chunks de 2000 filas, comprime con gzip
- **Storage**: Guarda chunks JSON + manifest en R2
- **Display**: Frontend carga chunks bajo demanda vía proxy

### 2. AI Audit System (MCP)
- **Tools disponibles**:
  - `query_catalog`: Consulta catálogo de precios
  - `batch_query_catalog`: Búsqueda batch
  - `math_evaluate`: Evaluación matemática segura
  - `safe_update_cells`: Sugerir correcciones
- **Rate limit**: 20 req/hour por usuario
- **Prompt**: System prompt en `mcp-server/src/system_prompt.md`

### 3. Forensic Layer
- **Snapshots**: SHA-256 hash de cada versión aprobada
- **Audit Logs**: Cada cambio registrado con quién, qué, cuándo
- **Signatures**: Firmas digitales con certificado NOM-151
- **Immutability**: Documentos firmados no se pueden modificar

---

## 🎓 Convenciones de Código

### TypeScript
- **Strict mode** obligatorio
- **No `any`** sin justificación comentada
- **Return types** explícitos en funciones exportadas
- **Shared types** en `shared/types.ts`

### Naming
- `PascalCase`: Components, interfaces, types
- `camelCase`: Variables, functions, methods
- `kebab-case`: Archivos (excepto React: `PascalCase.tsx`)
- `UPPER_SNAKE_CASE`: Constantes

### Commits
- Mensajes descriptivos en español o inglés
- Un cambio lógico por commit
- No commits con código roto (TypeScript errors)

---

## 🚨 Gotchas Conocidos

1. **Excel grandes**: Siempre usar streaming, nunca cargar todo a memoria
2. **Chunks**: 2000 filas es el sweet spot para Univer (no cambiar sin benchmark)
3. **Redis**: Si Redis se reinicia, los jobs en progreso se reencolan
4. **R2**: Usar presigned URLs para uploads, no pasar archivos por server
5. **MCP**: Tools deben registrarse en `mcp-server/src/index.ts`
6. **RLS**: Siempre testear con usuario real, no con service_role

---

## 📚 Documentación Importante

- `KIMI.md` - Contexto del proyecto (leer primero siempre)
- `docs/autogrid-master-plan.md` - Roadmap completo 12 semanas
- `ANALISIS_REPO.md` - Análisis técnico detallado
- `shared/types.ts` - Tipos compartidos
- `.kimi/skills/` - Skills para tareas específicas

---

## 🤖 Cómo Usar Kimi con Este Proyecto

### Plan Mode
```
/plan [descripción de la feature]
```
Kimi usará templates de `.kimi/templates/`

### Skills
```
"Usa feature-spec skill para escribir el spec"
"Usa code-reviewer skill para revisar este código"
"Usa debug-analyzer skill para investigar el bug"
"Usa learning-mode skill para explicarme cómo funciona X"
```

### Advanced Prompting (Boris Cherny)
```
"Grill me on these changes, don't approve until I pass"
"Prove to me this works, show me the diff in behavior"
"Knowing everything, scrap this and implement the elegant solution"
```

### Learning Mode
```
"Create HTML presentation explaining the Excel pipeline"
"Draw ASCII diagram of the JWT auth flow"
"Spaced repetition learning on BullMQ architecture"
```

---

## 🎯 Decisiones Críticas Pendientes

1. **Univer Pro vs AG Grid**: ¿Mantener Univer (tiene problemas de performance) o migrar a AG Grid Enterprise?
2. **AI Model**: ¿Seguir con Gemini o probar Claude/OpenAI para auditoría?
3. **Email Provider**: SendGrid vs AWS SES
4. **PDF Generation**: Client-side (html2pdf) vs Server-side (Puppeteer)

---

## 📞 Contacto & Recursos

- **Repo**: GitHub (ya configurado)
- **Staging**: Por definir (Railway/Render/AWS)
- **Supabase Dashboard**: Configurado con proyecto
- **Cloudflare R2**: Configurado con buckets

---

*Este documento es el punto de partida para cualquier trabajo en AutoGrid. Copia y pega en la web de Kimi (claude.ai/code) para que tenga contexto completo.*

**Fecha**: 2026-01-31  
**Versión**: 1.0  
**Próxima actualización**: Al inicio de cada sprint
