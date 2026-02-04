# Auditoría: Trojan Architecture Fases 4 & 5

> Documento de auditoría post-implementación vs. especificaciones y best practices.
> **Fecha**: 2026-02-03
> **Auditor**: Kimi Code CLI (Auto-revisión)

---

## 📊 Resumen Ejecutivo

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Conformidad API** | 🟡 Parcial | Coincide con spec, pero faltan validaciones Zod |
| **TypeScript** | 🟡 Parcial | Tipos correctos, pero hay variables no usadas |
| **Testing** | 🔴 Ausente | Ningún test unitario o de integración |
| **Documentación** | 🟢 Buena | JSDoc en todos los archivos |
| **Arquitectura** | 🟡 Parcial | Separación OK, pero mezcla concerns en hooks |
| **Performance** | 🟡 Parcial | Lazy loading OK, falta virtualización Univer |

**Veredicto**: Implementación funcional pero con deuda técnica. Necesita refactor antes de producción.

---

## 🔍 Hallazgos Detallados

### 1. TrojanUniverGrid.tsx (Fase 4)

#### ✅ Lo que está bien
| Aspecto | Implementación | Cumple |
|---------|---------------|--------|
| Props interface | `estimationId`, `readOnly`, `onCellEdit` | ✅ Sí |
| Loading state | Skeleton con animación shimmer | ✅ Sí |
| Error handling | UI amigable con retry | ✅ Sí |
| Logs estructurados | `[TrojanUniverGrid]` prefix | ✅ Sí |
| Custom hook | `useUniverData` separado | ✅ Sí |

#### 🔴 Problemas Encontrados

| Problema | Severidad | Línea | Descripción |
|----------|-----------|-------|-------------|
| Variables no usadas | Media | 413-414 | `optimisticUpdates`, `editedCells` preparados pero no usados |
| Handlers preparados | Media | 459, 476 | `_handleCellEdit`, `_handleWorkbookChange` sin implementar |
| Style inválido | Baja | 352 | `fw: 2` no existe en `IStyleData` (cambiado a `bl: 1`) |
| Cell value type | Media | 333 | `isNaN(numValue) ? value : numValue` - value puede ser {} |
| Sin tests | Alta | - | Ningún test de componente |

#### 📝 Recomendaciones
```typescript
// PROBLEMA: Variables preparadas pero sin usar
const [optimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
const [, setEditedCells] = useState<EditedCell[]>([]);

// SOLUCIÓN: O implementar edición completa, o eliminar hasta que se necesite
// Opción A: Implementar edición
const handleCellEdit = useCallback((rowIndex: number, column: string, value: unknown) => {
    setOptimisticUpdates(prev => new Map(prev.set(`${rowIndex}-${column}`, {
        rowIndex, column, originalValue: data?.rows[rowIndex][column], 
        newValue: value, timestamp: Date.now()
    })));
    // Llamar API para persistir
    persistEdit(estimationId, rowIndex, column, value);
}, [estimationId, data]);

// Opción B: Eliminar hasta implementar (YAGNI)
// Remover estado y handlers no usados
```

---

### 2. TrojanTreeView.tsx (Fase 5 - Tree)

#### ✅ Lo que está bien
| Aspecto | Implementación | Cumple |
|---------|---------------|--------|
| AG Grid Tree | `treeData={true}` con `getDataPath` | ✅ Sí |
| Cell renderer | `ConceptCellRenderer` con estilos | ✅ Sí |
| Selección | `onRowSelected` emite `onConceptSelect` | ✅ Sí |
| Virtualización | AG Grid maneja automáticamente | ✅ Sí |
| Logs | Estructurados con context | ✅ Sí |

#### 🔴 Problemas Encontrados

| Problema | Severidad | Línea | Descripción |
|----------|-----------|-------|-------------|
| `_logError` no usado | Baja | 71 | Función definida pero nunca llamada |
| `TrojanFlatNode` comentado | Baja | 40 | Import comentado, disponible pero no usado |
| Sin tests | Alta | - | Ningún test de grid interactions |
| Error boundary | Media | - | Sin ErrorBoundary para AG Grid crashes |

#### 📝 Recomendaciones
```typescript
// AGREGAR: Error Boundary para AG Grid
class GridErrorBoundary extends React.Component {
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return <div>Error cargando árbol. <button onClick={retry}>Reintentar</button></div>;
        }
        return this.props.children;
    }
}
```

---

### 3. TrojanAssetPanel.tsx (Fase 5 - Assets)

#### ✅ Lo que está bien
| Aspecto | Implementación | Cumple |
|---------|---------------|--------|
| Tabs | Fotos, Generadores, Especificaciones | ✅ Sí |
| Lazy loading | Intersection Observer | ✅ Sí |
| Lightbox | Navegación flechas + teclado | ✅ Sí |
| Signed URL refresh | Auto-refresh 5 min antes | ✅ Sí |
| Paginación | "Cargar más" funcional | ✅ Sí |

#### 🔴 Problemas Encontrados

| Problema | Severidad | Línea | Descripción |
|----------|-----------|-------|-------------|
| `_logWarn`, `_logError` no usados | Baja | 50, 55 | Preparados pero no llamados |
| Sin tests | Alta | - | Ningún test de lightbox, thumbnails |
| `imageLoaded` en Lightbox | Baja | 93 | Definido pero solo usado para spinner |

#### 📝 Recomendaciones
```typescript
// MEJORAR: Uso de imageLoaded para UX
const [imageLoaded, setImageLoaded] = useState(false);

// Mostrar skeleton mientras carga
{!imageLoaded && <Skeleton />}
<img 
    onLoad={() => setImageLoaded(true)}
    style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
/>
```

---

### 4. Custom Hooks

#### useUniverData.ts

| Aspecto | Estado | Notas |
|---------|--------|-------|
| AbortController | ✅ | Correctamente implementado |
| Race condition | ✅ | Request ID tracking |
| Retry logic | ❌ | Sin retry automático |
| Tipos | ✅ | Completos |

**Problema**: Sin retry en errores de red transitorios.

```typescript
// AGREGAR: Retry con exponential backoff
const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
    throw new Error('Max retries exceeded');
};
```

#### useTreeData.ts

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Flatten tree | ✅ | Recursivo con cycle detection |
| Memoización | ✅ | `useMemo` para transformación |
| Error handling | ✅ | Try-catch con logs |

**Problema**: Cycle detection loggea pero no arroja error.

#### useAssets.ts

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Grouping | ✅ | `groupAssetsByType` funciona |
| URL refresh | ✅ | `hasExpiringUrls` detecta |
| Paginación | ✅ | `loadMore` incrementa offset |

**Problema**: No hay cancelación de fetch si cambia conceptCode rápidamente.

---

### 5. Tipos TypeScript

#### trojanTree.ts

| Aspecto | Estado |
|---------|--------|
| `TrojanTreeNode` | ✅ Completo |
| `TrojanFlatNode` | ✅ Correcto |
| Response types | ✅ Con success/error |

#### trojanAssets.ts

| Aspecto | Estado |
|---------|--------|
| `TrojanAsset` | ✅ Completo |
| `TrojanAssetType` | ✅ Union type |
| Response types | ✅ Con paginación |

#### shared/types.ts

**Problema**: Tipos duplicados entre `shared/types.ts` y `frontend/src/types/`.

```typescript
// shared/types.ts debería ser source of truth
// frontend/src/types/ debería re-exportar o extender

// AHORA: Duplicación
// shared/types.ts: TrojanTreeNode
// frontend/src/types/trojanTree.ts: TrojanTreeNode (copia)

// IDEAL:
// shared/types.ts: Source of truth
// frontend/src/types/trojanTree.ts: 
//    export type { TrojanTreeNode } from '../../../shared/types';
```

---

### 6. Integración App.tsx

#### Cambios realizados
- ✅ Import de componentes Trojan
- ✅ Estados `selectedConceptCode`, `isAssetPanelOpen`
- ✅ Render condicional por `viewMode`
- ✅ Logs en cambio de vista

#### Problemas

| Problema | Línea | Descripción |
|----------|-------|-------------|
| Estado no reseteado | - | Al cambiar proyecto, no se limpia `selectedConceptCode` |
| Props no pasadas | 447 | `TrojanTreeView` no recibe `selectedConceptCode` correctamente |

```typescript
// CORREGIR en openProject:
const openProject = async (id: string) => {
    // ... existing code ...
    setSelectedConceptCode(null); // AGREGAR ESTO
    setIsAssetPanelOpen(false);   // AGREGAR ESTO
    // ...
};
```

---

## 📋 Plan de Corrección

### Prioridad Alta (Antes de merge)

- [ ] **Tests mínimos**: Al menos 1 test por componente crítico
- [ ] **Fix variables no usadas**: Implementar o eliminar
- [ ] **Retry logic**: Agregar a hooks de fetch
- [ ] **Reset estado**: Limpiar selección al cambiar proyecto

### Prioridad Media (Antes de producción)

- [ ] **Error boundaries**: Agregar a grids
- [ ] **Unificar tipos**: `shared/types.ts` como source of truth
- [ ] **Zod validation**: Validar respuestas API
- [ ] **Performance**: Virtualización para Univer (si hay +5000 filas)

### Prioridad Baja (Nice to have)

- [ ] **Storybook**: Documentar componentes
- [ ] **E2E tests**: Flujo completo Grid ↔ Tree
- [ ] **Analytics**: Métricas de uso de vistas

---

## 🎯 Métricas de Calidad

| Métrica | Valor | Target | Estado |
|---------|-------|--------|--------|
| TypeScript errors | 15 | 0 | 🔴 |
| Test coverage | 0% | 70% | 🔴 |
| Console logs en prod | Sí | No | 🔴 |
| Unused variables | 8 | 0 | 🟡 |
| JSDoc coverage | 90% | 80% | 🟢 |
| Component separation | Buena | Buena | 🟢 |

---

## ✅ Checklist de Boris Cherny

| Tip | Aplicado | Problemas |
|-----|----------|-----------|
| **Challenge Mode** | 🟡 Parcial | No se detectaron todos los edge cases |
| **Prove It Works** | 🟡 Parcial | Logs OK, pero sin tests |
| **Elegant Solution** | 🟢 Sí | Separación de concerns OK |
| **Detailed Specs** | 🟡 Parcial | Tipos OK, pero sin Zod validation |

---

## 🚀 Recomendación Final

**NO MERGEAR a main** hasta completar:
1. Tests básicos (mínimo 3: UniverGrid, TreeView, AssetPanel)
2. Fix TypeScript errors
3. Implementar retry en hooks

**Estimado para corregir**: 4-6 horas de trabajo.

---

*Auditoría generada siguiendo best practices de Boris Cherny: "Grill me on these changes"*
