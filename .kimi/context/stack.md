# Tech Stack

## Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.3 | UI framework |
| Vite | 7.2.4 | Build tool |
| Univer | 0.15.1 | Spreadsheet grid |
| Supabase JS | 2.x | Database client |
| ExcelJS | 4.x | Client-side parsing |
| pako | - | Gzip compression |
| html2pdf.js | - | PDF export |

## Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Express | 5.0.0 | HTTP server |
| BullMQ | 5.0.0 | Job queue |
| ioredis | 5.3.0 | Redis client |
| AWS SDK | 3.x | R2 operations |
| Helmet.js | - | Security headers |
| Zod | - | Validation |

## Worker
| Package | Purpose |
|---------|---------|
| BullMQ | Job processing |
| ExcelJS | Streaming parser |
| p-limit | Concurrency control |

## MCP Server
| Package | Purpose |
|---------|---------|
| MCP SDK | Protocol implementation |
| Google AI SDK | Gemini integration |
| JWT | Authentication |
| bcrypt | Password hashing |
| mathjs | Safe math evaluation |

## Infrastructure
| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL + Auth |
| Cloudflare R2 | Object storage |
| Redis | Queue + Cache |
