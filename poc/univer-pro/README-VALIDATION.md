# Univer Pro Validation POC

Este directorio contiene el entorno de validación de Univer Pro para AutoGrid v7.0.

## Sprint 0.1: Technical Validation

### Tareas de Validación

1. ✅ **Task 1: Univer Pro Setup** - Starter kit clonado y configurado
2. ⏳ **Task 2: Excel Import Testing** - Pendiente de prueba con archivos
3. ⏳ **Task 3: Custom Cell Renderers** - Pendiente de prueba
4. ⏳ **Task 4: Selection Events** - Pendiente de prueba
5. ⏳ **Task 5: Performance Benchmark** - Pendiente de prueba

## Cómo ejecutar

```bash
# Navegar al directorio
cd poc/univer-pro

# Instalar dependencias (ya hecho)
pnpm install

# Iniciar servidor de validación
pnpm validate
# o
pnpm dev:validation
```

Esto abrirá `http://localhost:5173/index-validation.html` con la interfaz de prueba.

## Funcionalidades de Prueba

### Excel Import (Task 2)
- Botón "Import Excel" para cargar archivos .xlsx
- Prueba con `estimacion_prueba.xlsx` (archivo pequeño)
- Prueba con `SUMMYT_ESTIMACIÓN  29-.xlsx` (92MB)
- Mide tiempo de importación y fidelidad de datos

### Selection Events (Task 4)
- Botón "Test Selection" para activar listener
- Muestra eventos de selección en tiempo real
- Verifica acceso a índices de fila/columna

### Performance Benchmark (Task 5)
- Botón "Benchmark" para ejecutar pruebas
- Genera 500 filas x 20 columnas de datos
- Mide: tiempo de carga, tiempo de renderizado, uso de memoria

### Custom Renderers (Task 3)
- Botón "Apply Status Formatting" para probar formatos condicionales
- Prueba colores de fondo según estado (PENDING, APPROVED, REJECTED)
- Canvas-based grids no soportan React components directamente

## Decisiones Técnicas Pendientes

### ✅ Encontrado
- Univer Pro requiere servidor Docker para funcionalidad completa
- Versión standalone (sin servidor) permite probar API básica
- Importación nativa de XLSX requiere licencia/servidor
- Canvas rendering (no DOM) = no custom React components

### ❓ Por Validar
- ¿Funciona `importXLSXToSnapshotAsync` sin licencia?
- ¿Performance con archivo de 92MB?
- ¿Selection events incluyen row/column indices?
- ¿Alternativas viables para Status Chips?

## Notas Importantes

1. **Licencia**: Este POC usa versión sin licencia (mostrará watermark)
2. **Servidor**: Para funcionalidad completa se necesita desplegar Univer Server con Docker
3. **APIs**: Algunas APIs Pro pueden no estar disponibles en modo standalone

## Próximos Pasos

1. Ejecutar pruebas con archivos reales
2. Documentar resultados
3. Comparar con approach actual (ExcelJS + Univer open-source)
4. Decisión: ¿Migrar a Univer Pro o mantener approach actual?
