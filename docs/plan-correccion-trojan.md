# Plan de Corrección: Trojan Architecture Fases 4 & 5

> Plan detallado siguiendo workflow de feature-implementation.md
> **Status**: APPROVED para ejecución
> **Fecha**: 2026-02-03

---

## Objective
Corregir deuda técnica de Fases 4 & 5: implementar retry logic, tests, unificación de tipos y error boundaries.

## Current State (Post-Auditoría)
- ✅ Componentes funcionales creados
- 🟡 15 errores TypeScript pendientes
- 🔴 0% cobertura de tests
- 🟡 Variables no usadas preparadas para futuro
- 🟡 Sin retry en fetchs

---

## FASE A: Critical Fixes

### A1. Retry Logic en Hooks (45 min)
**Archivos afectados**: `useUniverData.ts`, `useTreeData.ts`, `useAssets.ts`

```typescript
// Crear: frontend/src/lib/fetchWithRetry.ts
// Modificar: Agregar retry a los 3 hooks
```

**Criterios**:
- [ ] Exponential backoff: 1s, 2s, 4s
- [ ] Max 3 retries
- [ ] Solo retry en errores de red (5xx, timeout), no 4xx
- [ ] AbortController respeta retries

### A2. Fix Reset de Estado (15 min)
**Archivo**: `App.tsx`

```typescript
// Modificar: openProject function
// Agregar: setSelectedConceptCode(null) y setIsAssetPanelOpen(false)
```

**Criterios**:
- [ ] Al abrir nuevo proyecto, panel de assets se cierra
- [ ] Concepto seleccionado se limpia
- [ ] Logs estructurados del reset

### A3. Variables No Usadas (30 min)
**Archivos**: `TrojanUniverGrid.tsx`, `TrojanAssetPanel.tsx`, `TrojanTreeView.tsx`

**Opción**: Implementar edición optimista (mejor que eliminar)

```typescript
// TrojanUniverGrid.tsx:
// - Implementar handleCellEdit real
// - Conectar optimistic updates
// - Agregar POST /api/estimations/:id/cells para persistir
```

**Criterios**:
- [ ] Edición funciona con optimistic UI
- [ ] Rollback en error
- [ ] Estado pending mientras guarda

---

## FASE B: Testing

### B1. Tests Unitarios Hooks (45 min)
**Archivo**: `frontend/src/hooks/__tests__/useUniverData.test.ts`

```typescript
// Tests:
// - Loading state inicial
// - Fetch exitoso
// - Fetch con error
// - Retry automático
// - AbortController en unmount
// - Refetch manual
```

**Criterios**:
- [ ] Vitest configurado
- [ ] MSW (Mock Service Worker) para API
- [ ] 80% coverage de hooks

### B2. Tests Componentes (45 min)
**Archivos**: 
- `TrojanUniverGrid.test.tsx`
- `TrojanTreeView.test.tsx`
- `TrojanAssetPanel.test.tsx`

```typescript
// Tests:
// - Renderiza sin crash
// - Muestra loading state
// - Muestra error state
// - Renderiza datos correctamente
// - Emite eventos correctamente
```

**Criterios**:
- [ ] React Testing Library
- [ ] Mocks de hooks
- [ ] 70% coverage de componentes

### B3. Tests Integración (30 min)
**Archivo**: `frontend/src/__tests__/trojan-integration.test.tsx`

```typescript
// Tests:
// - Flujo: Grid → cambiar a Tree → seleccionar concepto → ver assets
// - Cambio de proyecto resetea estado
// - Navegación entre vistas preserva selección
```

**Criterios**:
- [ ] Test completo de flujo de usuario
- [ ] Setup de providers (Supabase, etc.)

---

## FASE C: Polish

### C1. Unificar Tipos (30 min)
**Archivos**:
- `shared/types.ts` (source of truth)
- `frontend/src/types/trojanTree.ts` (re-exportar)
- `frontend/src/types/trojanAssets.ts` (re-exportar)

```typescript
// shared/types.ts - Agregar tipos Trojan
export interface TrojanTreeNode { ... }
export interface TrojanAsset { ... }

// frontend/src/types/trojanTree.ts
export type { TrojanTreeNode } from '../../../shared/types';
```

**Criterios**:
- [ ] Tipos en un solo lugar
- [ ] Frontend re-exporta desde shared
- [ ] No duplicación

### C2. Error Boundaries (30 min)
**Archivo**: `frontend/src/components/ErrorBoundary.tsx` (nuevo)

```typescript
// Crear ErrorBoundary genérico
// Aplicar a TrojanUniverGrid y TrojanTreeView
```

**Criterios**:
- [ ] UI amigable en crash
- [ ] Botón retry
- [ ] Log de error

### C3. Zod Validation (30 min)
**Archivo**: `frontend/src/lib/validation.ts` (nuevo)

```typescript
// Schemas Zod para respuestas API
const UniverDataSchema = z.object({ ... });
const TreeDataSchema = z.object({ ... });
const AssetsSchema = z.object({ ... });

// Usar en hooks para validar respuestas
```

**Criterios**:
- [ ] Validación runtime de API responses
- [ ] Error claro si schema no coincide
- [ ] Type inference desde Zod

---

## Implementation Steps

### Orden de ejecución:
1. **A1** → Retry logic (base para tests estables)
2. **A2** → Fix reset estado (bug crítico)
3. **A3** → Implementar edición (aprovechar variables)
4. **B1** → Tests hooks (con retry ya implementado)
5. **B2** → Tests componentes
6. **B3** → Tests integración
7. **C1** → Unificar tipos
8. **C2** → Error boundaries
9. **C3** → Zod validation

### Tiempo estimado: **6-7 horas**

---

## Success Criteria

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| TypeScript errors | 15 | 0 | 0 ✅ |
| Test coverage | 0% | >70% | >70% ✅ |
| Variables no usadas | 8 | 0 | 0 ✅ |
| Retry logic | ❌ | ✅ | ✅ |
| Error boundaries | ❌ | ✅ | ✅ |
| Zod validation | ❌ | ✅ | ✅ |

---

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests flaky con timers | Med | Med | Usar fake timers de Vitest |
| Zod schemas desync con API | Med | High | Comparar con fase2-api-spec.md |
| Breaking change en tipos | Low | High | Gradual migration, no delete old |

---

## Approval

**Approved by**: Rene  
**Date**: 2026-02-03  
**Next step**: Executar Fase A

---

*"Plan First, Then Execute" - Boris Cherny*
