# Security Rules

## NEVER Bypass These Rules

### 1. Authentication
- JWT required on ALL API routes except health checks
- Token refresh on 401 responses
- Secure cookie storage (httpOnly, sameSite)

### 2. Authorization (RBAC)
| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Manager | Approve documents, view all projects |
| Resident | Create/edit estimations, submit for review |

### 3. Row Level Security (RLS)
- Users see ONLY their own spreadsheets
- Signatures table is read-only after creation
- No direct UPDATE on signed documents

### 4. Rate Limiting
| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 req / 15 min |
| Authentication | 5 req / 15 min |
| LLM/AI | 20 req / hour |

### 5. Input Validation
- Zod schemas for ALL inputs
- No raw SQL (use Supabase client)
- File type validation (Excel only)
- File size limits (150MB max)

### 6. Secrets Management
- NO secrets in code
- Use environment variables
- .env files in .gitignore
- Rotate keys quarterly

### 7. NOM-151 Compliance (Digital Signatures)
- SHA-256 hashing for document integrity
- Certificate-based signatures
- Immutable audit trail
- Timestamp on every action

## Security Checklist (Pre-commit)
- [ ] Input validation present
- [ ] Auth checks on protected routes
- [ ] No console.log of sensitive data
- [ ] Rate limiting considered
- [ ] RLS policies respected
