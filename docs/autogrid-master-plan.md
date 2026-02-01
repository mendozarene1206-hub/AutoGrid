# AutoGrid - Master Plan

> Plan maestro de desarrollo siguiendo best practices de Boris Cherny.
> **Status**: DRAFT - Pendiente de aprobación
> **Last Updated**: 2026-01-31

---

## 🎯 Visión del Proyecto

**AutoGrid** es un sistema de gestión de estimaciones de construcción con IA para auditoría, diseñado para el mercado mexicano (NOM-151 compliance).

**Core Value Proposition**: Permitir a residentes de obra y administradores gestionar estimaciones de construcción con trazabilidad forense, auditoría IA y flujos de aprobación digitales.

---

## 📊 Estado Actual (Sprint 0-1)

### ✅ Completado (Foundation Listo)
| Componente | Estado | Detalle |
|------------|--------|---------|
| Upload System | ✅ | Presigned URLs → R2 direct, zero RAM |
| Excel Worker | ✅ | Streaming + chunking 2000 filas |
| Univer Grid | ✅ | Básico, renderizando chunks |
| MCP Server | ✅ | Estructura lista, tools básicos |
| Database | ✅ | Schema completo con RLS |
| Auth | ✅ | JWT + rate limiting |

### 🔄 En Progreso (50-80%)
| Componente | Estado | Bloqueos |
|------------|--------|----------|
| Univer Pro Integration | 🔄 60% | Necesita licencia/config |
| AI Audit (Gemini) | 🔄 40% | Prompt tuning pendiente |
| Workflow Engine | 🔄 30% | Estados definidos, lógica pendiente |
| Digital Signatures | 🔄 20% | SHA-256 listo, UI pendiente |

### 📋 Pendiente (0%)
| Componente | Prioridad | Complejidad |
|------------|-----------|-------------|
| Reportes PDF | P1 | Media |
| Dashboard Analytics | P2 | Media |
| Notificaciones | P1 | Baja |
| Offline Mode | P3 | Alta |

---

## 🗺️ Roadmap por Fases

### FASE 1: Core Foundation (Semanas 1-2) - ACTUAL
**Objetivo**: Terminar la base técnica

#### Sprint 1.1: Univer Pro Integration
**Owner**: Frontend Dev  
**Estimado**: 5 días

**Tareas**:
- [ ] Configurar Univer Pro license
- [ ] Implementar custom cell renderers (status chips)
- [ ] Event handling: onSelectionChange para auditoría
- [ ] Cell editing con validación en tiempo real
- [ ] Performance: Lazy loading de chunks en scroll

**Definition of Done**:
- [ ] Grid renderiza 10,000+ filas sin lag
- [ ] Cell status chips visibles (DRAFT, IN_REVIEW, etc.)
- [ ] Edición inline funciona
- [ ] Tests de performance < 100ms por operación

---

#### Sprint 1.2: AI Audit System (MCP + Gemini)
**Owner**: Full-stack Dev  
**Estimado**: 7 días

**Tareas**:
- [ ] Finalizar system prompt para Gemini
- [ ] Implementar tool: `validate_calculations`
- [ ] Implementar tool: `check_compliance`
- [ ] Implementar tool: `suggest_corrections`
- [ ] UI: Panel de auditoría con highlight de celdas
- [ ] Rate limiting: 20 req/hour por usuario

**Definition of Done**:
- [ ] Auditoría completa en < 30 segundos
- [ ] Precisión > 85% en detección de errores
- [ ] UI muestra celdas sospechosas resaltadas
- [ ] Logs de auditoría guardados en DB

---

### FASE 2: Workflow & Signatures (Semanas 3-4)
**Objetivo**: Flujo completo de aprobación NOM-151

#### Sprint 2.1: Workflow Engine
**Owner**: Full-stack Dev  
**Estimado**: 5 días

**Estados**:
```
DRAFT → IN_REVIEW → APPROVED_INTERNAL → SIGNED
   ↑___________|
```

**Tareas**:
- [ ] Edge Function: `transitionState` con validación FSM
- [ ] UI: Botones de acción según rol (Resident/Manager)
- [ ] Email notifications en transiciones
- [ ] Audit log de cada transición
- [ ] Validación: solo Resident envía a review, solo Manager aprueba

**Reglas de Negocio**:
- Documento en SIGNED es INMUTABLE
- SHA-256 hash se genera en APPROVED_INTERNAL
- Snapshot se guarda antes de cualquier transición

---

#### Sprint 2.2: Digital Signatures
**Owner**: Full-stack Dev  
**Estimado**: 5 días

**Tareas**:
- [ ] Implementar firma digital con certificado
- [ ] UI: Modal de firma con canvas para rúbrica
- [ ] Validación: solo usuarios con rol Manager pueden firmar
- [ ] Guardar firma en tabla `signatures` con snapshot_hash
- [ ] Generar PDF firmado con sello digital

**Compliance NOM-151**:
- [ ] Integridad: SHA-256 del documento
- [ ] Autenticidad: Certificado del firmante
- [ ] No repudio: Timestamp + audit log

---

### FASE 3: Reporting & Analytics (Semanas 5-6)
**Objetivo**: Visibilidad y cumplimiento

#### Sprint 3.1: PDF Reports
**Owner**: Frontend Dev  
**Estimado**: 4 días

**Reportes**:
- [ ] Estimación completa (como el Excel pero PDF)
- [ ] Resumen ejecutivo con gráficas
- [ ] Reporte de auditoría (hallazgos de IA)
- [ ] Constancia de firma (documento legal)

**Tech**: html2pdf.js o Puppeteer en worker

---

#### Sprint 3.2: Dashboard Analytics
**Owner**: Frontend Dev  
**Estimado**: 4 días

**Métricas**:
- [ ] Estimaciones por estado (funnel)
- [ ] Tiempo promedio de aprobación
- [ ] Errores detectados por auditoría IA
- [ ] Uso de plataforma (MAU, DAU)

**Tech**: Chart.js o Recharts

---

### FASE 4: Polish & Scale (Semanas 7-8)
**Objetivo**: Producción-ready

#### Sprint 4.1: Notifications System
**Owner**: Full-stack Dev  
**Estimado**: 3 días

**Canales**:
- [ ] Email (SendGrid/AWS SES)
- [ ] In-app (toast notifications)
- [ ] Push (opcional, PWA)

**Eventos**:
- Documento enviado a revisión
- Documento aprobado/rechazado
- Documento firmado
- Errores detectados por IA

---

#### Sprint 4.2: Testing & QA
**Owner**: QA/DevOps  
**Estimado**: 5 días

**Testing**:
- [ ] Unit tests: > 70% coverage
- [ ] Integration tests: API endpoints
- [ ] E2E tests: Flujos críticos (login → upload → approve → sign)
- [ ] Performance tests: 150MB Excel upload
- [ ] Security audit: OWASP Top 10

---

#### Sprint 4.3: DevOps & Monitoring
**Owner**: DevOps  
**Estimado**: 3 días

**Infra**:
- [ ] Docker compose para local dev
- [ ] GitHub Actions CI/CD
- [ ] Deploy staging en Railway/Render
- [ ] Monitoring: LogRocket o Sentry
- [ ] Alertas: PagerDuty/Discord

---

### FASE 5: Advanced Features (Semanas 9-12) - POST-MVP
**Objetivo**: Diferenciadores competitivos

#### Sprint 5.1: Offline Mode
**Owner**: Full-stack Dev  
**Estimado**: 10 días

**Features**:
- [ ] Service Worker para cache
- [ ] IndexedDB para datos offline
- [ ] Sync cuando vuelve conexión
- [ ] Conflict resolution

---

#### Sprint 5.2: Advanced AI Features
**Owner**: Full-stack Dev  
**Estimado**: 7 días

**Features**:
- [ ] Predicción de precios con ML
- [ ] Análisis de tendencias de costos
- [ ] Sugerencias automáticas de conceptos
- [ ] Chatbot para consultas del catálogo

---

## 📋 Dependencias entre Tareas

```
Univer Pro Integration
        │
        ▼
AI Audit System ─────────┐
        │                │
        ▼                ▼
Workflow Engine ───► Digital Signatures
        │                │
        └────────┬───────┘
                 ▼
         PDF Reports & Dashboard
                 │
                 ▼
      Notifications & Polish
```

**Crítico**: Univer Pro debe estar estable antes de AI Audit (la UI necesita el grid funcionando).

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Univer Pro no cumple performance | Media | Alto | Pivot a AG Grid (1 día) |
| Gemini no preciso enough | Media | Alto | Fine-tuning + fallback manual |
| Cambios regulatorios NOM-151 | Baja | Alto | Abstraer lógica de compliance |
| Escalabilidad R2/Supabase | Baja | Medio | Cache + CDN |
| Falta de tests | Alta | Medio | Sprint 4.2 dedicado a testing |

---

## 🎯 Métricas de Éxito

### Técnicas
- **Performance**: Excel 150MB procesado en < 60s
- **Uptime**: 99.9% en producción
- **Coverage**: > 70% test coverage
- **Security**: 0 vulnerabilidades críticas

### Negocio
- **Tiempo de aprobación**: Reducir de 7 días a 2 días
- **Errores detectados**: 90% de errores matemáticos antes de firma
- **Adopción**: 80% de residentes usan semanalmente
- **Compliance**: 100% de documentos cumplen NOM-151

---

## 📅 Timeline Visual

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12
       ├─────┤
       FASE 1: Foundation
             ├─────┤
             FASE 2: Workflow
                   ├─────┤
                   FASE 3: Reporting
                         ├─────┤
                         FASE 4: Polish
                               ├──────────┤
                               FASE 5: Advanced (post-MVP)

MVP Launch: End of Week 8
```

---

## 🎓 Decisiones Pendientes

1. **Univer Pro vs AG Grid**: ¿Mantener Univer o migrar?
2. **Email Provider**: SendGrid vs AWS SES vs Mailgun
3. **PDF Generation**: Client-side (html2pdf) vs Server-side (Puppeteer)
4. **AI Model**: ¿Seguir con Gemini o probar Claude/OpenAI?
5. **Deploy**: ¿Railway, Render, AWS, o VPS propio?

---

## ✅ Checklist de Aprobación

- [ ] Plan revisado por equipo técnico
- [ ] Recursos asignados (¿quién hace qué?)
- [ ] Presupuesto aprobado (licencias Univer, hosting, etc.)
- [ ] Fechas realistas validadas
- [ ] Stakeholders alineados

**Aprobado por**: _______________  
**Fecha**: _______________

---

*Este plan sigue el principio de Boris Cherny: "Plan First, Then Execute"*
