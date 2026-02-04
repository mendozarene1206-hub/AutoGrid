# Fase 6 Hybrid: Persistencia + Testing (Sin Deploy Cloud)

> Plan adaptado: Implementar calidad de producción manteniendo localhost.
> **Estrategia**: "Preparar el código para producción, deploy después"

---

## 🎯 Filosofía Hybrid

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│   FASE 6 COMPLETA                   vs         FASE 6 HYBRID (Recomendado)  │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐          │
│   │ PERSISTENCIA    │ ✅                       │ PERSISTENCIA    │ ✅ AHORA │
│   │ (Guardar edits) │                          │ (Guardar edits) │          │
│   └─────────────────┘                          └─────────────────┘          │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐          │
│   │ INFRA CLOUD     │ ✅                       │ INFRA CLOUD     │ ⏳ DESPUÉS│
│   │ (Railway/etc)   │                          │ (Mantener local)│          │
│   └─────────────────┘                          └─────────────────┘          │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐          │
│   │ TESTING 70%     │ ✅                       │ TESTING 70%     │ ✅ AHORA │
│   └─────────────────┘                          └─────────────────┘          │
│                                                                              │
│   ┌─────────────────┐                          ┌─────────────────┐          │
│   │ CI/CD           │ ✅                       │ CI/CD Local     │ ✅ AHORA │
│   └─────────────────┘                          └─────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ventajas de Hybrid:**
- ✅ Implementas valor crítico AHORA (persistencia)
- ✅ Preparas código para producción (tests, estructura)
- ✅ Sin costos mensuales todavía
- ✅ Puedes iterar rápido localmente
- ✅ Cuando hagas deploy, todo estará listo

---

## 📋 Scope Fase 6 Hybrid (3-4 días)

### DÍA 1: Persistencia Backend

**Objetivo**: Endpoint para guardar ediciones

**Tareas**:
```typescript
// 1. Crear endpoint
// Archivo: server/src/routes/estimations.ts

POST /api/estimations/:id/cells
Body: {
  rowIndex: number;
  column: string;
  value: unknown;
  previousValue?: unknown;
}

// 2. Migration SQL
// Archivo: supabase/migrations/20240203000000_cell_edits.sql

CREATE TABLE cell_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id uuid REFERENCES spreadsheets(id),
  row_index integer NOT NULL,
  column_name text NOT NULL,
  previous_value jsonb,
  new_value jsonb NOT NULL,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamp DEFAULT now(),
  version integer DEFAULT 1
);

-- Índices para performance
CREATE INDEX idx_cell_edits_spreadsheet ON cell_edits(spreadsheet_id);
CREATE INDEX idx_cell_edits_cell ON cell_edits(spreadsheet_id, row_index, column_name);

-- RLS policies
ALTER TABLE cell_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can edit own spreadsheets" ON cell_edits
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM spreadsheets 
      WHERE id = spreadsheet_id 
      AND user_id = auth.uid()
    )
  );
```

**Validaciones endpoint**:
- [ ] JWT válido
- [ ] Usuario es dueño del spreadsheet
- [ ] Spreadsheet no está en estado SIGNED
- [ ] Valor cumple tipo de columna (number, text, etc.)
- [ ] Optimistic locking (version check)

---

### DÍA 2: Persistencia Frontend + Conflict Handling

**Objetivo**: Conectar Grid con API de persistencia

**Tareas**:
```typescript
// Archivo: frontend/src/components/TrojanUniverGrid.tsx

// 1. Implementar handleCellEdit completo
const handleCellEdit = useCallback(async (
  rowIndex: number, 
  column: string, 
  newValue: unknown
) => {
  if (!data || readOnly || !estimationId) return;
  
  const originalValue = data.rows[rowIndex]?.[column];
  
  // Optimistic update UI
  setOptimisticUpdates(prev => /* ... */);
  setPendingSave(true);
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/estimations/${estimationId}/cells`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex,
          column,
          value: newValue,
          previousValue: originalValue,
          version: currentVersion // optimistic locking
        })
      }
    );
    
    if (response.status === 409) {
      // Conflicto: alguien más editó
      const conflict = await response.json();
      showConflictDialog({
        yours: newValue,
        server: conflict.currentValue,
        onOverwrite: () => retryWithForce(rowIndex, column, newValue),
        onDiscard: () => revertToServerValue(rowIndex, column, conflict.currentValue)
      });
      return;
    }
    
    if (!response.ok) throw new Error('Save failed');
    
    // Éxito
    showToast('Guardado ✓', 'success');
    
  } catch (error) {
    // Error: rollback
    showToast('Error al guardar', 'error');
    revertOptimisticUpdate(rowIndex, column, originalValue);
  } finally {
    setPendingSave(false);
  }
}, [estimationId, data, readOnly]);
```

**UI Components**:
- [ ] Toast notification (éxito/error/guardando)
- [ ] Conflict resolution dialog
- [ ] Pending save indicator
- [ ] Retry button en error

---

### DÍA 3: Testing Suite Completo

**Objetivo**: 70% coverage mínimo

**Estructura de tests**:
```
frontend/src/
├── hooks/__tests__/
│   ├── useUniverData.test.ts      (ampliar)
│   ├── useTreeData.test.ts        (nuevo)
│   └── useAssets.test.ts          (nuevo)
│
├── components/__tests__/
│   ├── TrojanUniverGrid.test.tsx  (ampliar)
│   ├── TrojanTreeView.test.tsx    (nuevo)
│   ├── TrojanAssetPanel.test.tsx  (nuevo)
│   └── ErrorBoundary.test.tsx     (nuevo)
│
├── lib/__tests__/
│   ├── fetchWithRetry.test.ts     (nuevo)
│   └── validation.test.ts         (nuevo)
│
└── integration/
    └── persistence-flow.test.ts   (nuevo)
```

**Tests críticos a implementar**:

```typescript
// useUniverData.test.ts - Tests adicionales
it('should retry on network error', async () => {
  // Mock fetch falla 2 veces, luego funciona
  // Verificar que se llamó 3 veces
});

it('should abort request on unmount', async () => {
  // Desmontar componente
  // Verificar AbortController abortó
});

// TrojanUniverGrid.test.ts - Tests adicionales
it('should call onCellEdit when cell changes', async () => {
  const onCellEdit = vi.fn();
  render(<TrojanUniverGrid estimationId="1" onCellEdit={onCellEdit} />);
  // Simular edición
  // Verificar onCellEdit llamado con parámetros correctos
});

it('should show pending state while saving', async () => {
  // Mock fetch lento
  // Verificar indicador de "Guardando..." visible
});

it('should rollback on save error', async () => {
  // Mock fetch error
  // Verificar valor vuelve a original
  // Verificar toast de error
});

// integration/persistence-flow.test.ts
it('complete flow: edit → save → reload → verify persisted', async () => {
  // 1. Render grid
  // 2. Editar celda
  // 3. Esperar POST /cells
  // 4. Simular reload (nuevo fetch)
  // 5. Verificar valor persistido
});
```

**Cobertura mínima por archivo**:
- `useUniverData.ts`: 80%
- `useTreeData.ts`: 70%
- `TrojanUniverGrid.tsx`: 60%
- `fetchWithRetry.ts`: 90%
- `validation.ts`: 80%

---

### DÍA 4: CI/CD Local + Scripts + Documentación

**Objetivo**: Automatización sin GitHub Actions todavía

**Scripts npm**:
```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check && npm run test",
    "pre-commit": "npm run validate",
    "pre-push": "npm run validate && npm run build"
  }
}
```

**Git Hooks** (opcional pero recomendado):
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run pre-commit
```

**GitHub Actions básico** (para cuando subas a remoto):
```yaml
# .github/workflows/validate.yml
name: Validate

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: cd frontend && npm ci
        
      - name: Lint
        run: cd frontend && npm run lint
        
      - name: Type check
        run: cd frontend && npm run type-check
        
      - name: Test
        run: cd frontend && npm run test
        
      - name: Build
        run: cd frontend && npm run build
```

**Documentación**:
- [ ] Actualizar `TROJAN-ARCHITECTURE.md` con persistencia
- [ ] Crear `TESTING.md` con guía de tests
- [ ] Actualizar `KIMI.md` con lecciones aprendidas

---

## ✅ Checklist Fase 6 Hybrid Completa

### Persistencia
- [x] Retry logic (YA ESTÁ)
- [ ] Endpoint POST /cells
- [ ] Tabla cell_edits
- [ ] Optimistic locking (version)
- [ ] Conflict resolution UI
- [ ] Toast notifications
- [ ] Rollback on error

### Testing
- [ ] 70% coverage hooks
- [ ] 60% coverage components
- [ ] Integration tests persistencia
- [ ] Mock service worker (MSW) para API

### Calidad de Código
- [ ] 0 TypeScript errors (código nuevo)
- [ ] ESLint passing
- [ ] Prettier formatting
- [ ] Git hooks configurados

### Documentación
- [ ] Cómo funciona persistencia
- [ ] Cómo correr tests
- [ ] Cómo agregar tests nuevos

---

## 🚀 Beneficios Inmediatos (Sin Deploy)

### 1. Calidad de Código
```
Antes: "Parece funcionar, no toques nada"
Después: Tests garantizan que funciona
```

### 2. Confianza para Refactorizar
```
Quieres cambiar useUniverData?
- Corre tests
- Si pasan: cambio seguro
- Si fallan: sabes qué rompiste
```

### 3. Onboarding más Fácil
```
Nuevo dev llega:
1. Lee tests → entiende cómo funciona
2. Corre tests → verifica setup
3. Hace cambio → tests guían implementación
```

### 4. Preparado para Cloud
```
Cuando quieras deploy:
- Código ya está testeado
- Estructura es correcta
- Solo cambias URLs (localhost → railway)
```

---

## 📊 Comparativa: Fase 5 vs Hybrid vs Completa

| Aspecto | Fase 5 | Hybrid (Recomendado) | Completa |
|---------|--------|----------------------|----------|
| **Ediciones persisten** | ❌ Se pierden | ✅ Se guardan en DB | ✅ Se guardan en DB |
| **Disponibilidad** | Solo localhost | Solo localhost | Internet 24/7 |
| **Tests** | 0% | 70% | 70% |
| **CI/CD** | Manual | GitHub Actions | GitHub Actions |
| **Costo mensual** | $0 | $0 | ~$11 |
| **Tiempo implementar** | - | 3-4 días | 5-7 días |
| **Listo para beta** | ❌ | ✅ Sí (local) | ✅ Sí (pública) |

**Hybrid es el sweet spot**: Máximo valor, mínimo costo, preparado para escalar.

---

## 🎯 Plan de Migración a Cloud (Después)

Cuando estés listo para deploy, solo necesitas:

```bash
# Día 1: Infraestructura
1. Crear Upstash Redis
2. Deploy Server a Railway
3. Actualizar .env frontend con nueva API_URL

# Día 2: Deploy Frontend
4. Deploy Frontend a Vercel
5. Configurar CORS
6. Probar end-to-end

# Total: 2 días adicionales (vs 5 de Fase 6 completa)
```

Todo el código ya estará testeado y funcionando. Solo cambias URLs.

---

## ✅ Decisión Recomendada

**¿Procedemos con Fase 6 Hybrid?**

Timeline: **3-4 días**
- Día 1: Backend persistencia
- Día 2: Frontend persistencia  
- Día 3: Testing suite
- Día 4: CI/CD + Polish

**Resultado**: Código production-ready corriendo en localhost, listo para deploy cuando decidas.

---

*¿Aprobamos este plan Hybrid?*
