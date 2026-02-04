# Fase 6 Explicada en Detalle

> Guía completa de qué es, por qué existe y cómo funciona la Fase 6 del Trojan Architecture.

---

## 🤔 El Problema: ¿Por qué necesitamos Fase 6?

### Situación Actual (Después de Fase 5)

Imagina que eres un **residente de obra** usando AutoGrid:

```
1. Subes tu Excel de 150MB con 1,500 filas de estimación
2. Abres la vista GRID y ves todos los datos
3. Editas la celda "Cantidad: 12 → 15" (una corrección)
4. La UI muestra "15" ✨
5. Recargas la página...
6. ¡Vuelve a decir "12"! 😤
```

**¿Qué pasó?**
- La edición solo existía en la memoria del navegador
- No se guardó en ningún lado
- Se perdió al recargar

### Otro Problema

```
Tu jefe te dice:
"Quiero probar la plataforma desde mi casa"

Tú respondes:
"Ah, no, eso solo funciona en mi laptop local"
```

**¿Por qué?**
- Redis solo corre en tu máquina
- El Worker solo está en tu laptop
- No hay URL pública

---

## 🎯 La Solución: Fase 6 = "Producción Real"

La **Fase 6** convierte AutoGrid de una **demo local** en una **aplicación real** que:

1. ✅ **Guarda las ediciones** (persistencia)
2. ✅ **Funciona en internet** (infraestructura cloud)
3. ✅ **No se rompe fácil** (testing)
4. ✅ **Se arregla sola** (CI/CD + monitoreo)

---

## 🏗️ Arquitectura de Fase 6

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANTES (Fase 5) - Solo Local                         │
└─────────────────────────────────────────────────────────────────────────────┘

   Tu Laptop
   ┌─────────────────────────────────────────┐
   │  Browser                                │
   │  ┌─────────────┐                       │
   │  │ Edición: 15 │ ◀── Solo en memoria  │
   │  └─────────────┘      (se pierde)     │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐
   │  Server Local   │  localhost:3001
   │  (Express)      │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Redis Local    │  localhost:6379
   │  (BullMQ Queue) │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Worker Local   │  Procesa archivos
   └─────────────────┘

   ❌ Solo funciona en tu casa
   ❌ Se apaga si cierras la laptop
   ❌ Ediciones se pierden


┌─────────────────────────────────────────────────────────────────────────────┐
│                      DESPUÉS (Fase 6) - En Internet                         │
└─────────────────────────────────────────────────────────────────────────────┘

   Cualquier Usuario
   ┌─────────────────────────────────────────┐
   │  Browser                                │
   │  ┌─────────────┐                       │
   │  │ Edición: 15 │ ◀── Guardado en DB   │
   │  └─────────────┘      (persiste)      │
   └────────┬────────────────────────────────┘
            │ HTTPS
            ▼
   ┌─────────────────────────────────────────┐
   │  Vercel CDN                             │
   │  (Frontend Estático)                    │
   │  autogrid.vercel.app                    │
   └────────┬────────────────────────────────┘
            │ API Calls
            ▼
   ┌─────────────────────────────────────────┐
   │  Railway Cloud                          │
   │  ┌──────────────┐  ┌──────────────┐    │
   │  │ Server API   │  │ Worker       │    │
   │  │ (Express)    │  │ (BullMQ)     │    │
   │  └──────────────┘  └──────────────┘    │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Upstash Redis                          │
   │  (Cloud Queue)                          │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │  Supabase                               │
   │  ┌──────────────┐  ┌──────────────┐    │
   │  │ PostgreSQL   │  │ R2 Storage   │    │
   │  │ (Datos)      │  │ (Assets)     │    │
   │  └──────────────┘  └──────────────┘    │
   └─────────────────────────────────────────┘

   ✅ Funciona desde cualquier lugar
   ✅ Siempre disponible (24/7)
   ✅ Ediciones se guardan permanentemente
```

---

## 📦 Los 3 Pilares de Fase 6

### Pilar 1: Persistencia (Guardar Ediciones)

#### El Flujo Completo

```
Usuario edita celda
        │
        ▼
┌──────────────────────┐
│ 1. OPTIMISTIC UPDATE │ ◀── Muestra cambio inmediato
│    (UI only)         │     (para que no espere)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. ENVÍO AL SERVER   │ ◀── POST /api/estimations/123/cells
│    (Background)      │     Body: {row: 5, col: "Cantidad", value: 15}
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. VALIDACIÓN        │ ◀── ¿Tiene permiso? ¿No está firmado?
│    (Server)          │     ¿Tipo de dato correcto?
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 4. GUARDAR EN DB     │ ◀── INSERT INTO cell_edits
│    (PostgreSQL)      │     Guarda: valor anterior, nuevo, quién, cuándo
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 5. RESPUESTA         │ ◀── 200 OK (éxito) o 409 Conflict (alguien más editó)
│                      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 6. CONFIRMACIÓN UI   │ ◀── Toast "Guardado ✓" o "Conflicto detectado"
│                      │
└──────────────────────┘
```

#### Ejemplo de Código

```typescript
// Cuando el usuario edita una celda
async function handleCellEdit(rowIndex, column, newValue) {
  // PASO 1: Optimistic Update (inmediato)
  updateUIRightNow(rowIndex, column, newValue); 
  showToast("Guardando...", "loading");
  
  // PASO 2-5: Enviar al servidor
  try {
    const response = await fetch('/api/estimations/123/cells', {
      method: 'POST',
      body: JSON.stringify({
        rowIndex,
        column,
        value: newValue,
        previousValue: originalValue
      })
    });
    
    if (response.ok) {
      // PASO 6: Éxito
      showToast("Guardado ✓", "success");
    } else if (response.status === 409) {
      // Conflicto: alguien más editó mientras tanto
      showToast("Alguien más editó esta celda", "warning");
      showOptions("¿Sobrescribir o descartar?");
    }
  } catch (error) {
    // Error de red: rollback
    updateUIRightNow(rowIndex, column, originalValue);
    showToast("Error al guardar", "error");
  }
}
```

#### Estructura de la Base de Datos

```sql
-- Tabla nueva: cell_edits
create table cell_edits (
  id uuid primary key default gen_random_uuid(),
  spreadsheet_id uuid references spreadsheets(id),
  row_index integer not null,        -- Fila editada
  column_name text not null,         -- Columna editada
  previous_value jsonb,              -- Valor anterior (por si acaso)
  new_value jsonb not null,          -- Nuevo valor
  edited_by uuid references auth.users(id), -- Quién editó
  edited_at timestamp default now(), -- Cuándo
  version integer default 1          -- Para optimistic locking
);

-- Ejemplo de registro:
-- id: "abc-123"
-- spreadsheet_id: "estimation-456"
-- row_index: 42
-- column_name: "Cantidad"
-- previous_value: "12"
-- new_value: "15"
-- edited_by: "user-789"
-- edited_at: "2026-02-03 14:30:00"
-- version: 3
```

---

### Pilar 2: Infraestructura Cloud (Funcionar en Internet)

#### Los 4 Servicios que necesitamos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STACK DE INFRAESTRUCTURA FASE 6                          │
└─────────────────────────────────────────────────────────────────────────────┘

1. VERCEL (Frontend)
   ┌────────────────────────────────────────┐
   │ • Aloja el código React compilado      │
   │ • CDN global (rápido desde cualquier  │
   │   parte del mundo)                     │
   │ • HTTPS automático                     │
   │ • URL: autogrid.vercel.app             │
   │ • Costo: $0 (free tier)                │
   └────────────────────────────────────────┘
   
   ¿Por qué Vercel?
   ✅ Optimizado para React/Next.js
   ✅ Deploy automático al hacer push a GitHub
   ✅ Preview URLs para cada Pull Request


2. RAILWAY (Backend)
   ┌────────────────────────────────────────┐
   │ • Corre Server API (Express)           │
   │ • Corre Worker (BullMQ)                │
   │ • Escalado automático                  │
   │ • Logs centralizados                   │
   │ • Costo: ~$10-20/mes                   │
   └────────────────────────────────────────┘
   
   ¿Por qué Railway?
   ✅ Muy fácil de usar (mejor que AWS para startups)
   ✅ Deploy automático desde Git
   ✅ Variables de entorno seguras
   ✅ Soporte nativo para Redis


3. UPSTASH REDIS (Cola de trabajos)
   ┌────────────────────────────────────────┐
   │ • Base de datos Redis serverless       │
   │ • Maneja la cola de BullMQ             │
   │ • No necesitas administrar servidor    │
   │ • Costo: $0 (10k comandos/día free)    │
   └────────────────────────────────────────┘
   
   ¿Por qué Upstash?
   ✅ Serverless = no configuras nada
   ✅ Muy rápido (< 5ms latencia)
   ✅ Free tier generoso


4. SUPABASE + R2 (Datos y Archivos)
   ┌────────────────────────────────────────┐
   │ • PostgreSQL: Datos de estimaciones    │
   │ • R2 Storage: Assets (fotos, Excel)    │
   │ • Auth: Login de usuarios              │
   │ • Costo: ~$0-5/mes inicial             │
   └────────────────────────────────────────┘
```

#### Diagrama de Conexiones

```
Usuario en México
        │
        ▼ HTTPS
┌─────────────────┐     ┌─────────────────┐
│   Vercel CDN    │────▶│  Railway API    │
│   (Frontend)    │     │  (Server)       │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │ Upstash  │  │ Supabase │  │   R2     │
            │ Redis    │  │   SQL    │  │ Storage  │
            └──────────┘  └──────────┘  └──────────┘
```

---

### Pilar 3: Testing & CI/CD (No Romper lo que Funciona)

#### El Problema que Resuelve

```
Escenario sin Testing:

Tú: "Voy a agregar un botón nuevo"
[Cambias código]
[Deploy a producción]
Usuario: "¡La página no carga!"
Tú: "😰 ¿Qué rompí?"


Escenario con Testing:

Tú: "Voy a agregar un botón nuevo"
[Cambias código]
[GitHub corre tests automáticamente]
Tests: "❌ FAIL: El grid no renderiza"
Tú: "Ah, corrijo antes de deploy"
[Deploy seguro]
Usuario: "Todo funciona 👍"
```

#### Pirámide de Testing

```
                    ┌─────────┐
                    │  E2E    │  ◀── Tests de usuario real
                    │  10%    │     "Sube archivo, edita celda"
                    └────┬────┘     Lentos pero completos
                         │
                    ┌────┴────┐
                    │Integration│ ◀── Tests de componentes
                    │  20%    │     "Grid recibe datos y renderiza"
                    └────┬────┘     Más rápidos
                         │
                    ┌────┴────┐
                    │  Unit   │  ◀── Tests de funciones
                    │  70%    │     "useUniverData hace fetch"
                    └─────────┘     Muy rápidos
```

#### CI/CD Pipeline (Automatización)

```
Tú haces push a GitHub
        │
        ▼
┌─────────────────────┐
│ 1. LINT + TYPE CHECK│ ◀── ESLint revisa código
│    (1 minuto)       │     TypeScript revisa tipos
└──────────┬──────────┘
           │
           ▼ ¿Pasó?
┌─────────────────────┐
│ 2. UNIT TESTS       │ ◀── Vitest corre tests unitarios
│    (2 minutos)      │     Debe tener 70%+ coverage
└──────────┬──────────┘
           │
           ▼ ¿Pasó?
┌─────────────────────┐
│ 3. BUILD            │ ◀── Vite compila el código
│    (1 minuto)       │     Genera bundle de producción
└──────────┬──────────┘
           │
           ▼ ¿Pasó?
┌─────────────────────┐
│ 4. DEPLOY           │ ◀── Sube automáticamente a
│    (2 minutos)      │     Vercel y Railway
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. SMOKE TESTS      │ ◀── Playwright verifica que
│    (3 minutos)      │     la app funciona en producción
└─────────────────────┘
        │
        ▼ Todo pasó
   "✅ Deploy exitoso"
```

---

## 💰 Costos Reales (Mensuales)

```
Escenario: 10 usuarios beta, 50 archivos procesados al mes

┌─────────────────────────────────────────┐
│ Vercel (Frontend)        │ $0          │
│                          │ (free tier) │
├─────────────────────────────────────────┤
│ Railway (Server)         │ $5          │
│ Railway (Worker)         │ $5          │
├─────────────────────────────────────────┤
│ Upstash Redis            │ $0          │
│                          │ (free tier) │
├─────────────────────────────────────────┤
│ Supabase PostgreSQL      │ $0          │
│                          │ (free tier) │
├─────────────────────────────────────────┤
│ R2 Storage (50GB)        │ $0.75       │
│ ($0.015/GB)              │             │
├─────────────────────────────────────────┤
│ Sentry (Errores)         │ $0          │
│                          │ (free tier) │
├─────────────────────────────────────────┤
│                          │             │
│ TOTAL MENSUAL:           │ ~$11        │
│                          │             │
│ Con 100 usuarios:        │ ~$25-30     │
│ Con 1000 usuarios:       │ ~$100-150   │
└─────────────────────────────────────────┘
```

**Conclusión**: Muy barato para empezar, escala lineal.

---

## 🎓 Analogía Simple

Imagina que AutoGrid es un **restaurante**:

| Fase | Analogía del Restaurante |
|------|-------------------------|
| **Fase 1-5** | Restaurante en tu casa. Solo sirves a tu familia. Si se acaba la comida, vas al mercado (tu laptop). |
| **Fase 6 Persistencia** | Ahora tienes una **caja registradora** que guarda todos los pedidos. Si cierras y abres, los pedidos siguen ahí. |
| **Fase 6 Infraestructura** | Mueves el restaurante a una **ubicación comercial**. Ahora cualquiera puede llegar. Tienes proveedores (cloud) que te traen ingredientes automáticamente. |
| **Fase 6 Testing** | Contratas a un **food critic** que prueba cada plato antes de servirlo. Si algo está mal, no sale de la cocina. |

---

## ✅ Checklist Fase 6 Completa

### Persistencia
- [ ] Endpoint POST /cells funciona
- [ ] Tabla cell_edits creada
- [ ] Ediciones se guardan en DB
- [ ] Se recuperan al cargar
- [ ] Manejo de conflictos (2 usuarios editan)

### Infraestructura
- [ ] URL pública funciona (https://autogrid.vercel.app)
- [ ] Redis en cloud (no local)
- [ ] Server en Railway
- [ ] Worker en Railway
- [ ] Cualquier usuario puede acceder

### Testing
- [ ] Tests unitarios corren
- [ ] Tests E2E corren
- [ ] 70% coverage mínimo
- [ ] CI/CD pipeline configurado
- [ ] Deploy automático funciona

### Monitoreo
- [ ] Sentry captura errores
- [ ] Logs centralizados
- [ ] Health checks
- [ ] Alertas configuradas

---

## 🚀 Timeline Visual

```
Día 1: Persistencia Backend
├─ Mañana: Crear endpoint POST /cells
└─ Tarde: Crear tabla cell_edits en Supabase

Día 2: Persistencia Frontend
├─ Mañana: Conectar handleCellEdit con API
└─ Tarde: Toast notifications, manejo de errores

Día 3: Infraestructura
├─ Mañana: Crear cuenta Upstash, obtener URL Redis
├─ Mediodía: Deploy Server a Railway
└─ Tarde: Deploy Worker a Railway

Día 4: Frontend Deploy + Testing
├─ Mañana: Deploy Frontend a Vercel
├─ Mediodía: Configurar dominios y CORS
└─ Tarde: Escribir 3 tests E2E básicos

Día 5: CI/CD + Polish
├─ Mañana: Configurar GitHub Actions
├─ Mediodía: Agregar Sentry
└─ Tarde: Testing completo, bug fixes

FINAL: Beta pública lista 🎉
```

---

## ❓ Preguntas Frecuentes

### "¿Por qué no usar AWS?"
Railway es más simple para empezar. AWS tiene 200+ servicios y es fácil perderse. Railway es como "AWS simplificado".

### "¿Qué pasa si Railway se cae?"
Tienes backups en GitHub. Puedes migrar a AWS/Heroku en 1 día si es necesario.

### "¿Los usuarios pierden datos si hay error?"
No. Con optimistic UI, si falla el guardado, se revierte automáticamente y se muestra error.

### "¿Cuántos usuarios soporta?"
Con el plan de $20/mes: ~100 usuarios concurrentes. Para más, se escala horizontalmente.

---

## 🎯 Resumen Ejecutivo

**Fase 6 = Convertir demo en producto real**

| Aspecto | Antes (Fase 5) | Después (Fase 6) |
|---------|----------------|------------------|
| **Ediciones** | Se pierden al recargar | Se guardan permanentemente |
| **Disponibilidad** | Solo tu laptop | 24/7 desde cualquier lugar |
| **Testing** | Manual | Automático |
| **Deploy** | Manual | Automático con cada push |
| **Costo** | $0 (tu laptop) | ~$11/mes |
| **Usuarios** | Solo tú | Cualquiera con URL |

**Inversión**: 5 días de trabajo + $11/mes
**Retorno**: Producto usable por clientes reales

---

*¿Te gustaría que profundice en algún pilar específico?*
