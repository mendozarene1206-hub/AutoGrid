# Fase 2: API Specification

## Overview

Endpoints REST para servir datos del TrojanProcessor al frontend.

---

## Endpoints

### 1. GET /api/estimations/:id/univer-data

Retorna los datos de la hoja principal (Desglose) para renderizar en Univer Grid.

**Request:**
```http
GET /api/estimations/550e8400-e29b-41d4-a716-446655440000/univer-data
Authorization: Bearer <jwt_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "estimationId": "550e8400-e29b-41d4-a716-446655440000",
    "sheetName": "03 Desglose f",
    "metadata": {
      "totalRows": 1523,
      "totalColumns": 12,
      "lastModified": "2026-02-01T00:15:30Z",
      "rowCount": 1523
    },
    "columnDefs": [
      {
        "field": "Código",
        "headerName": "Código",
        "type": "text",
        "width": 120,
        "editable": true
      },
      {
        "field": "Descripción",
        "headerName": "Descripción",
        "type": "text",
        "width": 300,
        "editable": true
      },
      {
        "field": "Cantidad",
        "headerName": "Cantidad",
        "type": "number",
        "width": 100,
        "editable": true
      }
    ],
    "rows": [
      {
        "Código": "5.2.1",
        "Descripción": "Zapata Z-1",
        "Cantidad": 12,
        "_conceptCode": "5.2.1"
      }
    ]
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Main sheet not found for estimation 550e8400...",
    "timestamp": "2026-02-01T00:15:30Z",
    "requestId": "1706745330123-abc123"
  }
}
```

---

### 2. GET /api/estimations/:id/tree-data

Retorna estructura jerárquica para AG Grid Tree.

**Request:**
```http
GET /api/estimations/550e8400-e29b-41d4-a716-446655440000/tree-data
Authorization: Bearer <jwt_token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "estimationId": "550e8400-e29b-41d4-a716-446655440000",
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
        "rowCount": 450,
        "photoCount": 24,
        "generatorCount": 12,
        "specCount": 8,
        "isLeaf": false,
        "children": [
          {
            "id": "node-5.2",
            "hierarchyPath": ["5", "5.2"],
            "level": 1,
            "code": "5.2",
            "name": "Zapatas",
            "type": "category",
            "rowCount": 150,
            "photoCount": 12,
            "generatorCount": 6,
            "specCount": 4,
            "isLeaf": false,
            "children": [
              {
                "id": "node-5.2.1",
                "hierarchyPath": ["5", "5.2", "5.2.1"],
                "level": 2,
                "code": "5.2.1",
                "name": "Zapata Z-1",
                "type": "concept",
                "rowCount": 50,
                "photoCount": 4,
                "generatorCount": 2,
                "specCount": 1,
                "isLeaf": true,
                "conceptCode": "5.2.1"
              }
            ]
          }
        ]
      }
    ],
    "flatList": [
      // Same nodes as roots but flattened for AG Grid
    ]
  }
}
```

**Query Parameters:**
- `includeEmpty=true` - Incluir nodos sin datos
- `maxDepth=3` - Limitar profundidad del árbol

---

### 3. GET /api/estimations/:id/assets

Lista assets (fotos/generadores) con signed URLs.

**Request:**
```http
GET /api/estimations/550e8400-e29b-41d4-a716-446655440000/assets?conceptCode=5.2.1&limit=10
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `conceptCode` | string | Filtrar por código (e.g., "5.2.1") |
| `sheetType` | enum | Tipo: detail, generator, photo, spec |
| `limit` | number | Máximo 100, default 20 |
| `offset` | number | Paginación, default 0 |
| `signed` | boolean | Generar signed URLs (default true) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "estimationId": "550e8400-e29b-41d4-a716-446655440000",
    "conceptCode": "5.2.1",
    "total": 24,
    "limit": 10,
    "offset": 0,
    "assets": [
      {
        "id": "asset-uuid-1",
        "conceptCode": "5.2.1",
        "type": "photo",
        "filename": "img-5.2.1-a1b2c3d4.webp",
        "originalName": "IMG_001",
        "width": 1920,
        "height": 1080,
        "sizeBytes": 245760,
        "storagePath": "processed/{id}/assets/5.2.1/img-5.2.1-a1b2c3d4.webp",
        "signedUrl": "https://pub-xxx.r2.cloudflarestorage.com/...?X-Amz-Expires=3600",
        "signedUrlExpiresAt": "2026-02-01T01:15:30Z",
        "uploadedAt": "2026-02-01T00:15:30Z"
      }
    ]
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `NOT_FOUND` | 404 | Recurso no existe |
| `VALIDATION_ERROR` | 400 | Parámetros inválidos |
| `UNAUTHORIZED` | 401 | JWT inválido o expirado |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Error del servidor |

---

## Rate Limiting

- **General**: 100 requests / 15 minutos
- **Assets**: 200 requests / 15 minutos (imágenes son costosas)

Headers de respuesta:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706745600
```

---

## Architecture

```
Request → Router → Zod Validation → Service → Database/R2
                ↓
         Error Handler ← Custom Errors
```

### Separación de Responsabilidades

| Capa | Responsabilidad |
|------|-----------------|
| **Router** | HTTP handling, validation, error formatting |
| **Service** | Business logic, data transformation |
| **Types** | Contracts, Zod schemas |

---

## Boris Cherny Tips Applied

1. **Challenge Mode**: Thin controllers (router), fat services
2. **Prove It Works**: Request IDs, structured logging, typed errors
3. **Elegant Solution**: Separation of concerns, dependency injection
4. **Detailed Specs**: Zod validation, TypeScript types, API docs
