# AutoGrid Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AUTOGRID                                │
│                      (Trojan Pattern)                           │
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

## Data Flow (Zero-RAM Philosophy)

```
1. User Uploads Excel
   └── Browser → R2 Direct (presigned URL)
       └── Zero server memory used

2. Job Created
   └── Server → BullMQ (Redis)

3. Worker Processes
   └── Streaming Excel parse
       └── Chunk into 2000-row JSON files
           └── Compress with gzip
               └── Store in R2

4. Frontend Displays
   └── Load chunks on-demand via proxy
       └── Univer Grid renders
```

## Services

### Frontend (Port 5173)
- React 19 + TypeScript strict
- Vite build tool
- Univer spreadsheet grid
- Supabase auth client

### Server (Port 3001)
- Express 5 API
- BullMQ queue management
- Presigned URL generation
- JWT authentication

### Worker (Background)
- BullMQ job processor
- Streaming Excel parser (ExcelJS)
- R2 operations
- Chunking logic (2000 rows)

### MCP Server (Port 3000)
- Model Context Protocol
- Gemini AI integration
- Tools: catalog query, math eval
- Rate limiting: 20 req/hour/user

## External Dependencies

### Supabase
- PostgreSQL database
- Row Level Security (RLS)
- JWT authentication
- Real-time subscriptions

### Cloudflare R2
- Object storage (S3-compatible)
- Excel file storage
- Chunk storage (JSON.gz)

### Redis
- BullMQ queue backend
- Job state management
- Rate limiting cache
