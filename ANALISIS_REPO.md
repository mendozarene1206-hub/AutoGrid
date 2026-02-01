# Análisis del Repositorio AutoGrid

## 📋 Contexto del Proyecto

**Tipo**: Web App + API + Worker + MCP Server (arquitectura de microservicios)  
**Stack**: React 19 + TypeScript + Express 5 + Supabase + BullMQ + Cloudflare R2  
**Objetivo**: Sistema de gestión de estimaciones de construcción con IA para auditoría  
**Mercado**: México (NOM-151 compliance)

---

## 🗂️ Estructura del Repositorio

```
AutoGrid/
├── 📁 docs/                     # Documentación
│   ├── autogrid-roadmap.md      # Roadmap general
│   ├── ROADMAP_v7.md            # Roadmap detallado v7
│   ├── sprint_0_1_tasks.md      # Tareas del sprint
│   └── univer-pro-integration.md # Integración con Univer
│
├── 📁 server/                   # API REST (Express)
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── routes/
│   │   │   ├── upload.ts        # Subida de archivos (presigned URLs)
│   │   │   └── chunks.ts        # Proxy de chunks para CORS
│   │   └── lib/
│   │       ├── queue.ts         # BullMQ config
│   │       └── r2.ts            # Cloudflare R2 client
│   └── package.json
│
├── 📁 worker/                   # Procesador de Excel (BullMQ)
│   ├── src/
│   │   ├── index.ts             # Worker entry point
│   │   ├── processors/
│   │   │   └── excelProcessor.ts # Procesamiento streaming
│   │   └── lib/
│   │       └── r2.ts            # R2 operations
│   └── package.json
│
├── 📁 mcp-server/               # Servidor MCP + AI
│   ├── src/
│   │   ├── index.ts             # MCP + Express server
│   │   ├── tools/
│   │   │   ├── catalog.tool.ts  # Consulta de catálogos
│   │   │   └── math.tool.ts     # Evaluación matemática segura
│   │   └── system_prompt.md     # Prompt para Gemini
│   └── package.json
│
├── 📁 supabase/
│   └── migrations/              # Schema PostgreSQL
│       ├── 20240108000000_initial_schema.sql
│       ├── 20240108000001_add_concepts_and_profiles.sql
│       ├── 20240108000002_seed_data_and_contracts.sql
│       └── 20240108000003_add_storage_path.sql
│
├── 📁 shared/
│   └── types.ts                 # Tipos TypeScript compartidos
│
└── analyze-excel.mjs            # Script de análisis manual
```

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOGRID ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   FRONTEND   │    │    SERVER    │    │    WORKER    │      │
│  │   (Vite)     │◄──►│   (Express)  │◄──►│  (BullMQ)    │      │
│  │  React 19    │    │  Port 3001   │    │  Redis Queue │      │
│  │  Univer Grid │    │              │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Supabase   │    │ Cloudflare   │    │  LLM (Gemini)│      │
│  │  (Auth + DB) │    │     R2       │    │   via MCP    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 MCP SERVER (Port 3000)                    │  │
│  │  - SSE transport for MCP protocol                        │  │
│  │  - Workflow API routes                                   │  │
│  │  - Authentication (JWT)                                  │  │
│  │  - AI Audit API with rate limiting                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos Principal

```
Usuario sube Excel
    │
    ▼
┌────────────────────────┐
│ 1. Presigned URL       │──► Server genera URL para R2
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ 2. Upload directo      │──► Browser → R2 (zero server RAM)
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ 3. Job enqueued        │──► BullMQ job creado
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ 4. Worker procesa      │──► Streaming parse, chunking
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ 5. Chunks en R2        │──► JSON chunks + manifest
└────────────────────────┘
    │
    ▼
Frontend carga chunks on-demand vía server proxy
```

---

## 💡 Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **Procesamiento Excel** | Archivos de 150MB+ sin cargar en memoria | ExcelJS streaming |
| **Chunking Inteligente** | División en chunks de 2000 filas | Custom processor |
| **Auditoría IA** | Validación matemática y compliance | Google Gemini + MCP |
| **Forense** | SHA-256 hashing para integridad | crypto module |
| **Workflow** | Estados: Draft → Review → Approved → Signed | State machine |
| **Zero-RAM Upload** | Browser → R2 directo | Presigned URLs |
| **Compresión** | Reducción ~80% con gzip | pako (gzip) |

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### Tablas Principales

#### `spreadsheets` - Documentos de estimación
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- status (enum): draft | in_review | changes_requested | approved_internal | signed
- raw_data (jsonb) - Legacy storage
- storage_path (text) - Path en Supabase Storage (gzip)
- ai_context_summary (jsonb)
- created_at, updated_at
```

#### `signatures` - Firma digital (inmutable)
```sql
- id (uuid, PK)
- spreadsheet_id (uuid, FK)
- signer_id (uuid, FK)
- snapshot_hash (text) - SHA-256 del documento
- role (enum): Resident | Manager
- signed_at (timestamp)
```

#### `catalog_concepts` - Catálogo de precios
```sql
- id (uuid, PK)
- code (text, unique) - Ej: "5.2.4.1"
- description (text)
- unit (text) - m2, m3, kg, etc.
- unit_price (numeric)
- total_volume (numeric)
- category (text)
- contract_id (uuid, FK)
```

#### Otras tablas
- `projects` - Proyectos de construcción
- `contracts` - Contratos asociados
- `evidence_files` - Fotos/sketches
- `user_profiles` - Perfiles extendidos

---

## 🔒 Seguridad

### Capas de Seguridad

| Capa | Implementación |
|------|----------------|
| **Autenticación** | JWT + refresh tokens |
| **Autorización** | RBAC (roles: Admin, Manager, Resident) |
| **Database** | Row Level Security (RLS) policies |
| **Rate Limiting** | 100 req/15min general, 5 req/15min auth, 20 req/hour LLM |
| **Headers** | Helmet.js (CSP, HSTS, etc.) |
| **CORS** | Configurado para orígenes específicos |
| **Validación** | Zod schemas |
| **SQL Injection** | Prevención vía Supabase RLS |

### Políticas RLS Clave
- Usuarios solo ven sus propias spreadsheets
- Bloqueo de updates en documentos approved/signed
- Validación de roles para transiciones de workflow

---

## 📦 Tech Stack Detallado

### Frontend
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| React | 19.2.3 | UI framework |
| Vite | 7.2.4 | Build tool |
| Univer | 0.15.1 | Spreadsheet grid |
| Supabase JS | 2.x | Database client |
| ExcelJS | 4.x | Client-side parsing |
| html2pdf.js | - | PDF export |
| pako | - | Gzip compression |

### Server (API)
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| Express | 5.0.0 | HTTP server |
| BullMQ | 5.0.0 | Job queue |
| ioredis | 5.3.0 | Redis client |
| AWS SDK | 3.x | R2 (S3-compatible) |

### Worker
| Paquete | Propósito |
|---------|-----------|
| BullMQ | Job processing |
| ExcelJS | Streaming Excel parser |
| AWS SDK | R2 operations |

### MCP Server
| Paquete | Propósito |
|---------|-----------|
| MCP SDK | Model Context Protocol |
| Google AI SDK | Gemini integration |
| Zod | Schema validation |
| JWT | Authentication |
| bcrypt | Password hashing |
| mathjs | Safe math eval |
| p-limit | Concurrency control |

---

## 🎯 Flujos de Trabajo (Workflow)

### Estados del Documento

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
         └──────────┤   SIGNED    │
                    └─────────────┘
```

### Flujo de Auditoría IA

```
Usuario solicita auditoría
    │
    ▼
┌─────────────────────────┐
│ POST /api/audit         │──► Autenticado + rate limited
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ p-limit(1)              │──► Control de concurrencia
└─────────────────────────┘
    │
    ▼
┌─────────────────────────┐
│ Gemini con system       │──► Tools disponibles:
│ prompt                  │   - query_catalog
└─────────────────────────┘     - batch_query_catalog
    │                           - math_evaluate
    ▼                           - safe_update_cells
Respuesta con análisis + 
coordenadas de celdas
```

---

## 📝 Archivos Clave y sus Propósitos

### Backend
| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `server/src/index.ts` | ~100 | Entry point Express |
| `server/src/routes/upload.ts` | ~150 | Presigned URLs, job queue |
| `server/src/routes/chunks.ts` | ~80 | R2 chunk proxy (CORS) |
| `worker/src/index.ts` | ~50 | Worker setup |
| `worker/src/processors/excelProcessor.ts` | ~200 | Streaming parser, chunker |
| `mcp-server/src/index.ts` | ~300 | MCP + Express server |
| `mcp-server/src/tools/catalog.tool.ts` | ~100 | Catálogo queries |
| `mcp-server/src/tools/math.tool.ts` | ~50 | Safe math eval |

### Shared
| Archivo | Propósito |
|---------|-----------|
| `shared/types.ts` | Interfaces TypeScript compartidas |

### Configuración
| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/*.sql` | Schema PostgreSQL |
| `*/package.json` | Dependencias por servicio |
| `*/tsconfig.json` | Config TypeScript |

---

## 🚀 Estado Actual del Proyecto

### Sprint 0-1 (MVP) - EN PROGRESO

**✅ Completado:**
- [x] Sistema de upload con presigned URLs
- [x] Worker de procesamiento Excel (streaming)
- [x] Chunking de datos (2000 filas)
- [x] Grid básico con Univer
- [x] Estructura MCP Server
- [x] Schema de base de datos
- [x] Sistema de autenticación JWT
- [x] Rate limiting

**🔄 En Progreso:**
- [ ] Integración Univer Pro completa
- [ ] Sistema de auditoría IA (Gemini)
- [ ] Workflow de aprobaciones
- [ ] Sistema de firmas digitales

**📋 Pendiente:**
- [ ] Reportes PDF
- [ ] Dashboard analytics
- [ ] Notificaciones
- [ ] Offline mode

---

## 💪 Fortalezas del Diseño

1. **Escalabilidad**: Arquitectura de microservicios permite escalar worker independientemente
2. **Eficiencia**: Streaming + chunking permite manejar archivos grandes sin problemas de memoria
3. **Seguridad**: Múltiples capas (JWT, RLS, rate limiting, Helmet)
4. **Extensibilidad**: MCP permite agregar nuevas herramientas de IA fácilmente
5. **Compliance**: SHA-256 hashing para NOM-151 mexicana
6. **Type Safety**: TypeScript en todo el stack con tipos compartidos

---

## ⚠️ Áreas de Atención

1. **No hay tests**: Ningún archivo de test encontrado
2. **Logs en producción**: `server.log` en mcp-server (rotación necesaria)
3. **Variables de entorno**: `.env` files presentes (deben estar en .gitignore)
4. **Documentación API**: No hay OpenAPI/Swagger specs
5. **Monitoreo**: No hay sistema de monitoreo/alertas configurado

---

## 📊 Métricas de Código

- **Total de archivos fuente**: ~20 archivos TypeScript
- **Líneas de código aproximadas**: ~2,000 líneas
- **Servicios**: 4 (frontend, server, worker, mcp-server)
- **Dependencias principales**: ~30 paquetes
- **Migraciones SQL**: 4 archivos

---

## 🔧 Comandos Útiles

```bash
# Iniciar servidor API
cd server && npm run dev

# Iniciar worker
cd worker && npm run dev

# Iniciar MCP server
cd mcp-server && npm run dev

# Ver logs del MCP server
tail -f mcp-server/server.log
```

---

## 📚 Documentación Adicional

- `docs/autogrid-roadmap.md` - Roadmap general del proyecto
- `docs/ROADMAP_v7.md` - Roadmap detallado versión 7
- `docs/sprint_0_1_tasks.md` - Tareas del sprint actual
- `docs/sprint_0_1_implementation_plan.md` - Plan de implementación
- `docs/univer-pro-integration.md` - Guía de integración Univer Pro
- `docs/excel-parser-benchmark-plan.md` - Benchmark de parsers
- `docs/benchmark-walkthrough.md` - Walkthrough del benchmark

---

*Análisis generado: Enero 2026*
