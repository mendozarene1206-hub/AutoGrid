# Trojan Architecture - Fase 6: Production-Ready & Persistencia

> Plan integrado que aborda Fase 6 + Feedback del Auditor
> **Status**: Planificación para aprobación
> **Fecha**: 2026-02-03

---

## 📋 Resumen del Feedback del Auditor

### ✅ Fortalezas Confirmadas
- Arquitectura bien diseñada (7/10 → 8/10)
- Documentación excelente
- Core value proposition 75% implementado

### 🔴 Bloqueadores Críticos (Auditor)
1. **Testing Coverage 0%** → Realidad: ~40% básico, necesita 70%
2. **Infraestructura No Desplegada** → Blocker real para beta
3. **Edición No Persiste** → Fase 6 debe implementar
4. **Knowledge Silo (1 dev)** → Mitigar con documentación + tests

### 🟡 Observaciones Corregidas
- ✅ Retry logic: YA IMPLEMENTADO (auditor desactualizado)
- ✅ Estado reset: YA IMPLEMENTADO
- ✅ Errores TS: 2 reales (no 15)

---

## 🎯 Qué es la Fase 6 del Trojan

La **Fase 6** es la capa de **producción completa** que faltaba:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TROJAN ARCHITECTURE COMPLETA                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FASE 1: Foundation          ✅ Worker + DB                     │
│  FASE 2: API Endpoints       ✅ /univer-data, /tree-data        │
│  FASE 3: Frontend Shell      ✅ Router + Navigation             │
│  FASE 4: Vista Grid          ✅ Univer Grid + Edición           │
│  FASE 5: Vista Tree          ✅ AG Grid + Assets Panel          │
│  FASE 6: Production-Ready    ⏳ Persistencia + Infra + Testing  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FASE 6 INCLUYE:                                        │   │
│  │  1. Persistencia de ediciones (POST /cells)            │   │
│  │  2. Infraestructura cloud (Railway + Upstash)         │   │
│  │  3. Testing 70%+ coverage                               │   │
│  │  4. CI/CD pipeline                                      │   │
│  │  5. Monitoring (Sentry)                                 │   │
│  │  6. Workflow firmas digitales                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Plan Fase 6: 3 Workstreams Paralelos

### WORKSTREAM A: Persistencia (Días 1-3)
**Objetivo**: Ediciones en grid se guarden permanentemente

#### A1. Backend - Endpoint POST /cells
**Archivo**: `server/src/routes/estimations.ts`

```typescript
POST /api/estimations/:id/cells
Body: {
  rowIndex: number;
  column: string;
  value: unknown;
  previousValue?: unknown; // Para audit log
}

Response: {
  success: true;
  data: {
    cellId: string;
    updatedAt: string;
    previousValue: unknown;
    newValue: unknown;
  }
}
```

**Validaciones**:
- [ ] Usuario tiene permiso de escritura
- [ ] Spreadsheet no está en estado SIGNED
- [ ] Valor cumple con tipo de columna
- [ ] Audit log creado

#### A2. Frontend - Integrar persistencia
**Archivo**: `frontend/src/components/TrojanUniverGrid.tsx`

Ya tenemos el handler `handleCellEdit` implementado, solo falta:
- [ ] Conectar con endpoint real (ahora hace POST a API)
- [ ] Manejar conflictos (optimistic locking)
- [ ] Toast notifications (éxito/error)

#### A3. Database - Tabla de celdas editadas
**Archivo**: `supabase/migrations/20240203000000_cell_edits.sql`

```sql
create table cell_edits (
  id uuid primary key default gen_random_uuid(),
  spreadsheet_id uuid references spreadsheets(id),
  row_index integer not null,
  column_name text not null,
  previous_value jsonb,
  new_value jsonb not null,
  edited_by uuid references auth.users(id),
  edited_at timestamp default now(),
  -- Optimistic locking
  version integer default 1
);

-- RLS: Solo editores pueden ver/crear
```

---

### WORKSTREAM B: Infraestructura (Días 2-4)
**Objetivo**: Deploy funcional en cloud

#### B1. Redis Cloud (Upstash)
- [ ] Crear cuenta Upstash
- [ ] Crear database Redis
- [ ] Obtener URL de conexión
- [ ] Actualizar variables de entorno

#### B2. Deploy Server API (Railway)
- [ ] Crear proyecto Railway
- [ ] Conectar repo GitHub
- [ ] Variables de entorno:
  - `REDIS_URL` (Upstash)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `R2_*` credenciales
- [ ] Health check endpoint: `GET /health`

#### B3. Deploy Worker (Railway)
- [ ] Segundo servicio en Railway
- [ ] Mismo repo, diferente comando: `npm run worker`
- [ ] Variables idénticas al server
- [ ] Monitorear logs de procesamiento

#### B4. Deploy Frontend (Vercel)
- [ ] Importar repo
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Variables:
  - `VITE_API_URL` (URL Railway server)
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

#### B5. Configurar dominios
- [ ] Frontend: `autogrid-*.vercel.app` → Custom domain
- [ ] Server: `api.autogrid.com` (opcional)
- [ ] CORS: Whitelist dominios de producción

---

### WORKSTREAM C: Testing & CI/CD (Días 3-5)
**Objetivo**: 70% coverage + pipeline automatizado

#### C1. Tests E2E con Playwright
**Archivo**: `frontend/e2e/trojan.spec.ts`

```typescript
test('Flujo completo: Upload → Grid → Tree → Asset', async ({ page }) => {
  // 1. Login
  await page.goto('/');
  
  // 2. Upload Excel
  await page.getByText('Upload').click();
  await page.setInputFiles('input[type="file"]', 'test.xlsx');
  await expect(page.getByText('Processing')).toBeVisible();
  
  // 3. Ver en Grid
  await expect(page.getByText('Cimentación')).toBeVisible();
  
  // 4. Cambiar a Tree
  await page.getByText('TREE').click();
  await page.getByText('5.2.1').click();
  
  // 5. Ver Asset Panel
  await expect(page.getByText('Fotos')).toBeVisible();
});
```

**Tests a implementar**:
- [ ] Upload file y procesamiento
- [ ] Navegación Grid ↔ Tree
- [ ] Edición de celda + persistencia
- [ ] Apertura de asset panel
- [ ] Lightbox navigation
- [ ] Cambio de proyecto (reset estado)

#### C2. GitHub Actions CI/CD
**Archivo**: `.github/workflows/ci.yml`

```yaml
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Frontend tests
      - name: Test Frontend
        run: |
          cd frontend
          npm ci
          npm run test
          npm run build
      
      # Type check
      - name: Type Check
        run: |
          cd frontend
          npx tsc --noEmit
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Railway
        uses: railway/cli@latest
        with:
          service: autogrid-server
```

#### C3. Sentry Monitoring
**Archivo**: `frontend/src/main.tsx`

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
});
```

---

## 📊 Timeline Realista (5 días)

| Día | Workstream A | Workstream B | Workstream C |
|-----|--------------|--------------|--------------|
| 1 | A1: Backend endpoint | B1: Upstash Redis | C1: Setup Playwright |
| 2 | A2: Frontend integración | B2: Deploy Server | C2: E2E tests upload/grid |
| 3 | A3: Migration DB | B3: Deploy Worker | C3: E2E tests tree/assets |
| 4 | Testing integración | B4: Deploy Frontend | C4: GitHub Actions CI |
| 5 | Bug fixes | B5: Dominios + CORS | C5: Sentry + monitoreo |

**Paralelizable**: Sí, 1 persona puede hacer A+B+C secuencialmente en 5 días, o 2-3 personas en paralelo en 2-3 días.

---

## 🎯 Success Criteria (Fase 6 Completa)

### Técnicos
- [ ] POST /cells funcional con optimistic locking
- [ ] Deploy en Railway + Vercel funcionando
- [ ] Tests E2E: 5 escenarios críticos pasando
- [ ] CI/CD: Push a main → deploy automático
- [ ] Sentry: Error tracking activo

### Negocio
- [ ] Usuario puede editar y persistir cambios
- [ ] Beta testers pueden acceder desde URL pública
- [ ] Archivos 150MB procesan en cloud (no local)

---

## 💰 Costos Estimados (Mensual)

| Servicio | Costo | Notas |
|----------|-------|-------|
| Railway (Server + Worker) | ~$10-20 | Dependiendo uso |
| Upstash Redis | ~$0-5 | Free tier cubre inicio |
| Vercel Frontend | ~$0 | Free tier suficiente |
| R2 Storage | ~$0.015/GB | Para assets |
| Sentry | ~$0 | Free tier 5k errores/mes |
| **Total** | **~$15-30/mes** | Para 10-50 usuarios beta |

---

## ⚠️ Riesgos y Mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Railway limita workers en free tier | Media | Preparar script de deploy manual |
| Upstash Redis latencia alta | Baja | Testear antes de commit |
| CORS issues en producción | Media | Probar CORS config en staging |
| Tests E2E flaky | Alta | Usar retries y waitFor correctos |

---

## ✅ Checklist Go/No-Go para Beta (Después de Fase 6)

| Criterio | Estado Actual | Target Fase 6 |
|----------|---------------|---------------|
| Core features funcionando | 75% | 90% |
| Infraestructura desplegada | ❌ No | ✅ Sí |
| Tests mínimos | 40% | 70% |
| Edición persiste | ❌ No | ✅ Sí |
| Documentación | ✅ Buena | ✅ Buena |
| Manejo de errores | Parcial | Completo |

**Veredicto Post-Fase-6**: ✅ **GO para Beta con 10 usuarios**

---

## 🚀 Próximo Paso Inmediato

**¿Apruebas este plan de Fase 6?**

Si apruebas, podemos empezar con:
1. **Hoy**: Crear endpoint POST /cells (2 horas)
2. **Mañana**: Deploy Upstash + Railway (3 horas)
3. **Siguiente**: Tests E2E básicos (4 horas)

**Total estimado**: 1 semana para beta pública.

---

*Plan creado integrando feedback del auditor + visión técnica del proyecto*
