# Trojan Architecture - Documentación Técnica

> Arquitectura de separación de datos y assets para AutoGrid.
> **Versión**: 1.0.0
> **Última actualización**: 2026-02-03

---

## 📚 Índice

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Fases Implementadas](#fases-implementadas)
4. [Componentes Frontend](#componentes-frontend)
5. [Hooks](#hooks)
6. [API Reference](#api-reference)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Visión General

La **Trojan Architecture** separa los datos de estimación (hoja "Desglose") de los assets (fotos, generadores, especificaciones) para optimizar:

- **Performance**: Cargar solo lo necesario
- **Escalabilidad**: Assets en R2, datos en PostgreSQL
- **UX**: Múltiples vistas (Grid/Tree) sobre mismos datos

```
┌─────────────────────────────────────────────────────────────┐
│                    TROJAN ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Excel (150MB)                                             │
│       │                                                     │
│       ▼                                                     │
│   ┌──────────────┐                                         │
│   │   Worker     │  1. Extrae hoja "Desglose" → JSON       │
│   │ TrojanProc   │  2. Extrae imágenes → WebP → R2         │
│   └──────┬───────┘                                         │
│          │                                                  │
│          ▼                                                  │
│   ┌──────────────┐    ┌──────────────┐                     │
│   │   R2 Data    │    │   R2 Assets  │                     │
│   │  main-data   │    │  processed/  │                     │
│   │  .json       │    │  {id}/assets/│                     │
│   └──────┬───────┘    └──────┬───────┘                     │
│          │                    │                             │
│          ▼                    ▼                             │
│   ┌──────────────────────────────────┐                     │
│   │           FRONTEND               │                     │
│   │  ┌──────────┐  ┌──────────┐      │                     │
│   │  │  GRID    │  │  TREE    │      │                     │
│   │  │  Vista   │  │  Vista   │      │                     │
│   │  │  Univer  │  │  AG Grid │      │                     │
│   │  └────┬─────┘  └────┬─────┘      │                     │
│   │       │             │            │                     │
│   │       └──────┬──────┘            │                     │
│   │              ▼                   │                     │
│   │       ┌──────────────┐           │                     │
│   │       │Asset Panel   │           │                     │
│   │       │(Fotos/Specs) │           │                     │
│   │       └──────────────┘           │                     │
│   └──────────────────────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitectura

### Flujo de Datos

```
Usuario sube Excel
        │
        ▼
┌───────────────────┐
│ 1. Worker parsea  │
│    streaming      │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌────────┐
│ Datos  │  │ Assets │
│ JSON   │  │ WebP   │
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│  R2    │  │  R2    │
│  Data  │  │ Assets │
└───┬────┘  └────────┘
    │
    ▼
┌───────────────────┐
│ 2. API endpoints  │
│    - /univer-data │
│    - /tree-data   │
│    - /assets      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 3. Frontend       │
│    carga on-demand│
└───────────────────┘
```

---

## Fases Implementadas

### Fase 1: Foundation (Worker)
**Archivo**: `worker/src/processors/TrojanProcessor.ts`

Extrae desde Excel:
- Hoja "Desglose" → `main-data.json`
- Imágenes de todas las hojas → `assets/{conceptCode}/*.webp`

**Ejecución**:
```bash
cd worker && npm run dev
# Espera jobs de la cola BullMQ
```

### Fase 2: API Endpoints
**Archivo**: `server/src/routes/estimations.ts`

| Endpoint | Descripción | Response |
|----------|-------------|----------|
| `GET /api/estimations/:id/univer-data` | Datos hoja Desglose | `UniverData` |
| `GET /api/estimations/:id/tree-data` | Jerarquía WBS | `TrojanTreeNode[]` |
| `GET /api/estimations/:id/assets?conceptCode=X` | Assets de concepto | `TrojanAsset[]` |

### Fase 3: Frontend Shell
**Archivo**: `frontend/src/App.tsx`

Navegación entre vistas:
- `GRID`: TrojanUniverGrid
- `TREE`: TrojanTreeView + TrojanAssetPanel
- `SPLIT`: Vista dividida (existente)
- `KANBAN`: Vista kanban (existente)

### Fase 4: Vista Grid
**Archivo**: `frontend/src/components/TrojanUniverGrid.tsx`

Features:
- Renderizado Univer Grid con datos JSON
- Edición optimista con rollback
- Status badges (DRAFT, IN_REVIEW, APPROVED, SIGNED)
- Skeleton loading

### Fase 5: Vista Tree + Assets
**Archivos**:
- `TrojanTreeView.tsx`: Árbol WBS con AG Grid
- `TrojanAssetPanel.tsx`: Panel de fotos/generadores

Features:
- Expandir/colapsar jerarquía
- Selección de concepto → carga assets
- Lazy loading de thumbnails
- Lightbox para fotos

---

## Componentes Frontend

### TrojanUniverGrid

```typescript
interface TrojanUniverGridProps {
    estimationId: string;
    readOnly?: boolean;
    onCellEdit?: (rowIndex: number, column: string, value: unknown) => void;
}
```

**Uso**:
```tsx
<TrojanUniverGrid
    estimationId="550e8400-e29b-41d4-a716-446655440000"
    readOnly={false}
    onCellEdit={(row, col, value) => {
        console.log(`Edited: ${row}, ${col} = ${value}`);
    }}
/>
```

### TrojanTreeView

```typescript
interface TrojanTreeViewProps {
    estimationId: string;
    onConceptSelect?: (conceptCode: string, node: TrojanTreeNode) => void;
    selectedConceptCode?: string | null;
}
```

**Uso**:
```tsx
<TrojanTreeView
    estimationId="550e8400-e29b-41d4-a716-446655440000"
    onConceptSelect={(code, node) => {
        console.log('Selected:', code, node.name);
    }}
/>
```

### TrojanAssetPanel

```typescript
interface TrojanAssetPanelProps {
    estimationId: string;
    conceptCode: string | null;
    isOpen: boolean;
    onClose: () => void;
    onAssetClick?: (asset: TrojanAsset) => void;
}
```

**Uso**:
```tsx
<TrojanAssetPanel
    estimationId="550e8400-e29b-41d4-a716-446655440000"
    conceptCode="5.2.1"
    isOpen={true}
    onClose={() => setIsOpen(false)}
/>
```

---

## Hooks

### useUniverData

```typescript
const { data, loading, error, loadTimeMs, refetch, abort } = useUniverData(estimationId);
```

**Features**:
- Retry automático (3 intentos)
- AbortController para cancelación
- Métricas de tiempo de carga

### useTreeData

```typescript
const { flatNodes, isLoading, error, metadata, refetch } = useTreeData(estimationId);
```

**Features**:
- Transforma árbol → lista plana para AG Grid
- Cycle detection
- Opciones: `includeEmpty`, `maxDepth`

### useAssets

```typescript
const { assets, grouped, pagination, loadMore, refresh, isLoading } = useAssets(
    estimationId, 
    conceptCode
);
```

**Features**:
- Agrupación por tipo (photos, generators, specs)
- Paginación con "Load More"
- Auto-refresh de signed URLs antes de expirar

---

## API Reference

### GET /api/estimations/:id/univer-data

**Response 200**:
```json
{
  "success": true,
  "data": {
    "estimationId": "uuid",
    "sheetName": "03 Desglose f",
    "metadata": {
      "totalRows": 1523,
      "totalColumns": 12,
      "lastModified": "2026-02-01T00:00:00Z"
    },
    "columnDefs": [
      { "field": "Código", "headerName": "Código", "type": "text", "width": 120, "editable": true }
    ],
    "rows": [
      { "Código": "5.2.1", "Descripción": "Zapata Z-1", "_conceptCode": "5.2.1" }
    ]
  }
}
```

### GET /api/estimations/:id/tree-data

**Response 200**:
```json
{
  "success": true,
  "data": {
    "estimationId": "uuid",
    "totalNodes": 89,
    "maxDepth": 4,
    "roots": [
      {
        "id": "node-5",
        "hierarchyPath": ["5"],
        "level": 0,
        "code": "5",
        "name": "Cimentación",
        "type": "category",
        "isLeaf": false,
        "children": [...]
      }
    ]
  }
}
```

### GET /api/estimations/:id/assets

**Query Params**:
- `conceptCode` (requerido): Código del concepto (ej: "5.2.1")
- `limit` (opcional): Default 20, max 100
- `offset` (opcional): Default 0

**Response 200**:
```json
{
  "success": true,
  "data": {
    "estimationId": "uuid",
    "conceptCode": "5.2.1",
    "total": 24,
    "assets": [
      {
        "id": "asset-uuid",
        "type": "photo",
        "filename": "img-5.2.1-abc.webp",
        "signedUrl": "https://...",
        "width": 1920,
        "height": 1080
      }
    ]
  }
}
```

---

## Testing

### Ejecutar Tests

```bash
cd frontend

# Todos los tests
npm run test

# En modo watch
npm run test:watch

# Con coverage
npm run test:coverage
```

### Estructura de Tests

```
frontend/src/
├── hooks/__tests__/
│   └── useUniverData.test.ts      # Tests de hook
├── components/__tests__/
│   └── TrojanUniverGrid.test.tsx  # Tests de componente
└── __tests__/
    └── trojan-integration.test.tsx # Tests de integración
```

### Añadir Nuevos Tests

```typescript
// Ejemplo: Test de componente
import { render, screen } from '@testing-library/react';
import { TrojanTreeView } from '../TrojanTreeView';

it('renders tree with nodes', () => {
    render(<TrojanTreeView estimationId="test-id" />);
    expect(screen.getByText(/Cimentación/i)).toBeInTheDocument();
});
```

---

## Troubleshooting

### Problema: Assets no cargan

**Síntoma**: Panel de assets vacío o error al cargar fotos

**Solución**:
1. Verificar `conceptCode` correcto
2. Revisar signed URL no expirada (auto-refresh debería funcionar)
3. Check consola por errores de CORS
4. Verificar assets existen en R2: `processed/{estimationId}/assets/{conceptCode}/`

### Problema: Tree no renderiza jerarquía

**Síntoma**: Todos los nodos aparecen planos

**Solución**:
1. Verificar `hierarchyPath` en datos
2. Check `getDataPath` de AG Grid configurado
3. Revisar que `flatNodes` tenga `hierarchy` field

### Problema: Edición no persiste

**Síntoma**: Cambios en celdas se pierden al recargar

**Solución**:
1. Implementar endpoint `POST /api/estimations/:id/cells`
2. Verificar optimistic updates aplicándose
3. Check rollback en caso de error

### Problema: Performance lenta

**Síntoma**: >3 segundos para cargar 1500+ filas

**Solución**:
1. Verificar virtualización de AG Grid (activa por defecto)
2. Considerar paginación server-side
3. Optimizar transformación de datos en hooks
4. Usar `React.memo` en componentes de lista

---

## Mejores Prácticas

### 1. Manejo de Errores
```typescript
// Siempre usar ErrorBoundary
<ErrorBoundary fallback={<ErrorFallback />}>
    <TrojanUniverGrid estimationId={id} />
</ErrorBoundary>
```

### 2. Cancelación de Requests
```typescript
const { abort, refetch } = useUniverData(id);

// Al desmontar o cambiar ID
useEffect(() => {
    return () => abort();
}, [id]);
```

### 3. Validación de Datos
```typescript
import { validateUniverData } from '../lib/validation';

const result = validateUniverData(apiResponse);
if (!result.success) {
    console.error('Invalid data:', result.error);
}
```

---

## Referencias

- [Fase 2 API Spec](./fase2-api-spec.md)
- [Plan de Corrección](./plan-correccion-trojan.md)
- [Auditoría](./AUDIT-trojan-fases-4-5.md)

---

*Documentación mantenida por el equipo de AutoGrid*
