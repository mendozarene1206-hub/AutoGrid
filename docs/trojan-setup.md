# AutoGrid Trojan Architecture - Setup Guide

## Fase 1: Foundation (Database + Worker)

### 1. Instalar Dependencias

```bash
cd worker
npm install sharp
```

**Nota**: `sharp` requiere compilación nativa. Si tienes problemas:

```bash
# Windows (PowerShell como Admin)
npm install --global windows-build-tools
npm install sharp

# Linux/Mac
npm install sharp
```

### 2. Configurar Variables de Entorno

Agrega a `worker/.env`:

```env
# R2 Configuration
R2_BUCKET=your-bucket-name
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_PUBLIC_URL=pub-your-hash.r2.dev

# Redis
REDIS_URL=redis://localhost:6379

# Supabase (para logging opcional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. Aplicar Migración de Base de Datos

```bash
cd supabase

# Usando CLI de Supabase
supabase db push

# O manualmente en el SQL Editor
-- Ejecutar: migrations/20240201000000_trojan_schema.sql
```

### 4. Verificar Estructura

Tu estructura debería verse así:

```
worker/
├── src/
│   ├── processors/
│   │   ├── TrojanProcessor.ts    ✅ Nuevo
│   │   └── excelProcessor.ts     ✅ Legacy (mantenido)
│   ├── types/
│   │   └── sharp.d.ts            ✅ Nuevo
│   ├── lib/
│   │   └── r2.ts                 ✅ Existente
│   └── index.ts                  ✅ Modificado
└── package.json                  ✅ Actualizado

supabase/
└── migrations/
    └── 20240201000000_trojan_schema.sql  ✅ Nuevo
```

### 5. Iniciar el Worker

```bash
cd worker
npm run dev
```

Deberías ver:
```
[Worker] Starting AutoGrid Trojan Processing Worker...
[Worker] Connected to Redis
[Worker] Using R2 bucket: your-bucket
[Worker] Mode: TROJAN (Data + Assets separation)
[Worker] Ready and waiting for Trojan jobs...
```

### 6. Probar el Procesamiento

Sube un archivo Excel a través de la API. El worker automáticamente:

1. Identificará la hoja "Desglose" (o variantes)
2. Extraerá los datos como JSON plano
3. Procesará las demás hojas buscando imágenes
4. Convertirá imágenes a WebP
5. Subirá todo a R2 con estructura organizada
6. Guardará metadata en Supabase

### 7. Verificar Resultados

En R2, verás la estructura:
```
processed/{spreadsheetId}/
├── trojan-manifest.json      # Manifest completo
├── main-data.json            # Datos de hoja Desglose
└── assets/
    └── {conceptCode}/        # Ej: 5.2.1/
        ├── img-5.2.1-xxx.webp
        └── img-5.2.1-yyy.webp
```

En Supabase:
- `estimation_sheets` - Datos de la hoja principal
- `estimation_assets` - Metadata de imágenes
- `concept_asset_mappings` - Relaciones concepto-assets

## Troubleshooting

### Error: "Cannot find module 'sharp'"
```bash
npm install sharp --save
```

### Error: "No main Desglose sheet found"
Verifica que tu Excel tenga una hoja con nombre que contenga "Desglose".
El processor busca: `['Desglose', '03 Desglose', 'Desglose f', '03 Desglose f']`

### Error: "Out of memory"
El modo Trojan carga el archivo completo en memoria para extraer imágenes.
Para archivos > 200MB, considera:
- Aumentar RAM del worker
- O usar procesamiento por partes

### Las imágenes no se extraen
Asegúrate de que las imágenes estén:
1. Insertadas en celdas (no como fondo)
2. En formato soportado (PNG, JPG, BMP, GIF)
3. Visibles en las hojas (no ocultas)

## Siguiente Paso

Una vez funcionando la Fase 1, continúa con:
- **Fase 2**: Backend API (endpoints para consultar datos/assets)
- **Fase 3**: Frontend Shell (router + layout)
- **Fase 4**: Vista Univer (integrar datos JSON)
- **Fase 5**: Vista Tree (AG Grid con assets)
