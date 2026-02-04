# Guía de Configuración: Trojan Architecture

> Guía paso a paso para configurar y usar la Trojan Architecture.

---

## Requisitos Previos

- Node.js 18+
- Redis (para BullMQ)
- Supabase CLI (opcional)

---

## 1. Instalación

### Backend (Server + Worker)

```bash
# Server
cd server
npm install

# Worker (procesamiento Excel)
cd ../worker
npm install

# MCP Server (IA)
cd ../mcp-server
npm install
```

### Frontend

```bash
cd frontend
npm install
```

**Dependencias adicionales para Trojan** (ya instaladas):
- `ag-grid-react` + `ag-grid-community` (Tree view)

---

## 2. Variables de Entorno

### Worker (.env)

```env
# R2 Configuration
R2_BUCKET=your-bucket
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_PUBLIC_URL=pub-xxx.r2.dev

# Redis
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Frontend (.env)

```env
# API URLs
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Server (.env)

```env
PORT=3001
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

# R2
R2_BUCKET=your-bucket
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
```

---

## 3. Iniciar Servicios

### Orden de inicio:

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Server API
cd server
npm run dev

# Terminal 3: Worker (procesamiento)
cd worker
npm run dev

# Terminal 4: MCP Server (opcional, para IA)
cd mcp-server
npm run dev

# Terminal 5: Frontend
cd frontend
npm run dev
```

**URLs**:
- Frontend: http://localhost:5173
- Server API: http://localhost:3001
- MCP Server: http://localhost:3000

---

## 4. Flujo de Uso

### Paso 1: Subir Excel

1. Ir a http://localhost:5173
2. Click "Upload"
3. Seleccionar archivo `.xlsx`
4. Esperar procesamiento (Worker extrae datos + assets)

### Paso 2: Ver en Grid

1. Click en proyecto
2. Seleccionar vista **GRID**
3. Editar celdas directamente
4. Cambios se guardan automáticamente

### Paso 3: Ver en Tree

1. Click toggle **TREE**
2. Expandir jerarquía (ej: 5 → 5.2 → 5.2.1)
3. Click en concepto → abre panel de assets
4. Ver fotos/generadores del concepto

---

## 5. Estructura de Archivos Procesados

En R2, cada estimación se almacena:

```
processed/{estimationId}/
├── trojan-manifest.json     # Metadata completa
├── main-data.json           # Datos hoja Desglose
└── assets/
    ├── 5.2.1/
    │   ├── img-5.2.1-a1.webp
    │   └── img-5.2.1-b2.webp
    ├── 5.2.2/
    │   └── ...
    └── ...
```

---

## 6. Comandos Útiles

### Ver logs del Worker

```bash
cd worker
npm run dev
# Ver console logs de procesamiento
```

### Limpiar cola de jobs

```bash
# Usando Redis CLI
redis-cli FLUSHALL
```

### Reprocesar archivo

```bash
# Subir mismo archivo genera nuevo job
# Worker reprocesa automáticamente
```

---

## 7. Testing

### Tests Unitarios

```bash
cd frontend
npm run test
```

### Test Manual

1. Subir `estimacion_prueba.xlsx`
2. Verificar aparece en Grid
3. Cambiar a Tree y navegar jerarquía
4. Click concepto → ver assets

---

## 8. Troubleshooting

### Worker no procesa

```bash
# Verificar Redis conectado
redis-cli ping  # Debe responder PONG

# Verificar Worker escuchando
# Debe mostrar: "[Worker] Ready and waiting for Trojan jobs..."
```

### Assets no aparecen

```bash
# Verificar en R2 Console
# Bucket → processed/{id}/assets/

# Verificar signed URLs válidos
# Revisar expiración (default 1 hora)
```

### TypeScript errors

```bash
cd frontend
npx tsc --noEmit
```

---

## 9. Siguientes Pasos

- [ ] Implementar `POST /api/estimations/:id/cells` para persistir ediciones
- [ ] Agregar export a PDF de estimación
- [ ] Implementar búsqueda en Tree view
- [ ] Agregar filtros por tipo de asset

---

*Guía actualizada: 2026-02-03*
