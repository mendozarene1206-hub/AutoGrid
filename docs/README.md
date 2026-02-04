# Documentación AutoGrid

> Centro de documentación técnica y guías del proyecto AutoGrid.

---

## 📚 Documentación por Módulo

### Trojan Architecture (Nuevo)

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [TROJAN-ARCHITECTURE.md](./TROJAN-ARCHITECTURE.md) | Documentación técnica completa | Developers |
| [TROJAN-SETUP-GUIDE.md](./TROJAN-SETUP-GUIDE.md) | Guía de configuración paso a paso | DevOps/New devs |
| [TROJAN-DIAGRAM.txt](./TROJAN-DIAGRAM.txt) | Diagrama visual ASCII de arquitectura | Architects |
| [AUDIT-trojan-fases-4-5.md](./AUDIT-trojan-fases-4-5.md) | Auditoría post-implementación | Tech leads |
| [CORRECTION-SUMMARY.md](./CORRECTION-SUMMARY.md) | Resumen de correcciones aplicadas | Developers |
| [plan-correccion-trojan.md](./plan-correccion-trojan.md) | Plan de corrección detallado | Project managers |

### Especificaciones API

| Documento | Descripción |
|-----------|-------------|
| [fase2-api-spec.md](./fase2-api-spec.md) | Especificación endpoints Trojan |

### Roadmaps y Planificación

| Documento | Descripción |
|-----------|-------------|
| [autogrid-master-plan.md](./autogrid-master-plan.md) | Plan maestro 12 semanas |
| [autogrid-roadmap.md](./autogrid-roadmap.md) | Roadmap general |
| [ROADMAP_v7.md](./ROADMAP_v7.md) | Roadmap versión 7 detallado |
| [sprint_0_1_tasks.md](./sprint_0_1_tasks.md) | Tareas Sprint 0.1 |
| [sprint_0_1_implementation_plan.md](./sprint_0_1_implementation_plan.md) | Plan de implementación |

### Guias Técnicas

| Documento | Descripción |
|-----------|-------------|
| [trojan-setup.md](./trojan-setup.md) | Setup inicial Trojan (Fases 1-2) |
| [trojan-boris-tips.md](./trojan-boris-tips.md) | Best practices aplicadas |
| [univer-pro-integration.md](./univer-pro-integration.md) | Guía Univer Pro |

### Benchmarks

| Documento | Descripción |
|-----------|-------------|
| [excel-parser-benchmark-plan.md](./excel-parser-benchmark-plan.md) | Plan de benchmark |
| [benchmark-walkthrough.md](./benchmark-walkthrough.md) | Walkthrough del benchmark |

---

## 🚀 Quick Start

### Nuevo en el proyecto?

1. Lee: [TROJAN-ARCHITECTURE.md](./TROJAN-ARCHITECTURE.md) - Entiende la arquitectura
2. Lee: [TROJAN-SETUP-GUIDE.md](./TROJAN-SETUP-GUIDE.md) - Configura tu entorno
3. Mira: [TROJAN-DIAGRAM.txt](./TROJAN-DIAGRAM.txt) - Visualiza el sistema

### Developer trabajando en código?

1. API: [fase2-api-spec.md](./fase2-api-spec.md)
2. Componentes: Ver `frontend/src/components/Trojan*.tsx`
3. Hooks: Ver `frontend/src/hooks/use*.ts`
4. Tests: `npm run test` en `frontend/`

### Tech Lead evaluando calidad?

1. [AUDIT-trojan-fases-4-5.md](./AUDIT-trojan-fases-4-5.md)
2. [CORRECTION-SUMMARY.md](./CORRECTION-SUMMARY.md)

---

## 📊 Estado del Proyecto

| Módulo | Estado | Documentación |
|--------|--------|---------------|
| Trojan Fase 1 (Worker) | ✅ Completo | [trojan-setup.md](./trojan-setup.md) |
| Trojan Fase 2 (API) | ✅ Completo | [fase2-api-spec.md](./fase2-api-spec.md) |
| Trojan Fase 3 (Shell) | ✅ Completo | [TROJAN-ARCHITECTURE.md](./TROJAN-ARCHITECTURE.md) |
| Trojan Fase 4 (Grid) | ✅ Completo | [TROJAN-ARCHITECTURE.md](./TROJAN-ARCHITECTURE.md) |
| Trojan Fase 5 (Tree) | ✅ Completo | [TROJAN-ARCHITECTURE.md](./TROJAN-ARCHITECTURE.md) |

---

## 📝 Convenciones de Documentación

- **SKILL.md**: Guías de habilidades para Kimi CLI (en `.kimi/skills/`)
- **plan-*.md**: Planes de implementación detallados
- **AUDIT-*.md**: Auditorías post-implementación
- **Guías**: `-GUIDE.md` o `-setup.md`
- **Specs**: `*-spec.md`

---

## 🔄 Mantenimiento

Cuando agregues nueva documentación:

1. Actualiza este README
2. Sigue las convenciones de nomenclatura
3. Agrega entrada en `KIMI.md` si aprendes algo nuevo
4. Vincula documentos relacionados

---

*Última actualización: 2026-02-03*
