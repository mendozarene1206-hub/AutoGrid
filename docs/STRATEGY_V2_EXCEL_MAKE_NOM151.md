# AutoGrid Strategy V2: Excel + Make + NOM-151

> **Date**: 2026-02-04  
> **Status**: Strategic Pivot Approved  
> **Document Owner**: Kimi Code CLI + Product Team

---

## Executive Summary

AutoGrid pivotará a una estrategia diferenciada centrada en tres pilares:

1. **Excel-Like Usage** (The Trojan Horse) - Zero learning curve
2. **Workflow via Make.com** - No-code automation ecosystem
3. **NOM-151 Compliance Nativo** - Moat regulatorio defensible

Esta estrategia reduce el time-to-market de 12-18 meses a 6-10 semanas, mientras construye un diferenciador único en el mercado mexicano de construcción.

---

## The Problem with Current Approach

### Strategy V1 ("All-in-One Construction OS")
- ❌ Compite contra Procore/Smartsheet en features
- ❌ Requiere 12-18 meses de desarrollo
- ❌ $200k+ de inversión
- ❌ Sin diferenciador claro

### Strategy V2 ("Excel + NOM-151 Connector")
- ✅ Aprovecha familiaridad con Excel
- ✅ Leverage Make.com (1000+ integraciones)
- ✅ NOM-151 como moat regulatorio
- ✅ 6-10 semanas a MVP
- ✅ $25-40k inversión

---

## Pillar 1: Excel-Like Usage (The Trojan Horse)

### Concepto

Los residentes de obra **ya usan Excel**. No queremos cambiar su comportamiento, queremos **mejorarlo**.

```
SMARTSHEET/MONDAY              AUTOGRID (Trojan)
─────────────────────────────────────────────────────
"Aprende nuestra herramienta"  "Usa Excel como siempre"
Importas TU Excel              Procesamos TU Excel nativo
Grid genérico                  Grid con TUS fórmulas/colores
Empiezas de cero               Empiezas con tu archivo
Configuras columnas            Tus columnas se detectan automático
```

### Ventajas Competitivas

| Métrica | Competidores | AutoGrid |
|---------|--------------|----------|
| Time-to-value | 30 minutos | 30 segundos |
| Curva de aprendizaje | Media-Alta | Ninguna |
| Lock-in | Vendor lock-in | Lock-in positivo (fotos vinculadas) |
| Migración de datos | Compleja | Automática (es tu Excel) |

### Implementación Técnica

```typescript
// Trojan Processor - Ya implementado
processTrojanExcel(file: ExcelFile) {
  1. Identifica hoja "Desglose"
  2. Extrae datos limpios (<50KB JSON)
  3. Extrae imágenes → WebP → R2
  4. Vincula imágenes a códigos de concepto
  5. Renderiza en Univer Grid (familiar Excel UI)
}
```

### Features Clave

- ✅ **TrojanUniverGrid.tsx** - Grid con edición optimista
- 🆕 **ConceptDrawer.tsx** - Side panel 480px (Progressive Disclosure)
- 🆕 **SmartCell.tsx** - Photo badges + status border
- 🆕 **Keyboard shortcuts** - E (edit), Space (drawer), Esc (close)
- 🆕 **Formula bar** - Siempre visible (Excel familiarity)

---

## Pillar 2: Workflow via Make.com

### Por qué Make (vs Build)

| Opción | Tiempo | Costo | Mantenimiento |
|--------|--------|-------|---------------|
| **Workflow propio** | 3-4 meses | $40k dev | Equipo dedicado |
| **Make.com** | 1 semana | $200/mes | Ellos lo mantienen |

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    AUTOGRID FRONTEND                     │
│  (Excel-like Grid + NOM-151 Status + Photo Drawer)      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ Webhook
┌─────────────────────────────────────────────────────────┐
│                      MAKE.COM                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ NOM-151      │  │ Notificaciones│  │ Integraciones│  │
│  │ Workflow     │  │ Email/Slack  │  │ SAP/Oracle   │  │
│  │ (Visual)     │  │ WhatsApp     │  │ QuickBooks   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ API
┌─────────────────────────────────────────────────────────┐
│                    AUTOGRID BACKEND                      │
│  (Supabase + R2 + Trojan Processor)                      │
└─────────────────────────────────────────────────────────┘
```

### Webhooks Estándar (API Contract)

```typescript
// AutoGrid emite estos eventos a Make

interface AutoGridWebhook {
  event: 'estimation.created' 
       | 'estimation.submitted'
       | 'estimation.approved'
       | 'estimation.rejected'
       | 'estimation.signed'
       | 'concept.updated'
       | 'photo.uploaded';
  payload: {
    estimationId: string;
    userId: string;
    timestamp: string;
    data: unknown;
  };
  signature: string; // SHA-256 para verificación
}
```

### Workflows Pre-configurados (Blueprints)

#### Blueprint 1: NOM-151 Submission Workflow
```
TRIGGER: estimation.submitted
    │
    ├──► Validar campos obligatorios (Zod schema)
    ├──► Generar SHA-256 snapshot
    ├──► Guardar snapshot en Supabase
    ├──► Enviar email a Residente: "Recibido #12345"
    ├──► Crear tarea en Asana/Monday del Auditor
    ├──► Notificar Slack #estimaciones
    ├──► Cambiar estado: IN_REVIEW
    └──► Esperar aprobación...
```

#### Blueprint 2: Rejection Handling
```
TRIGGER: concept.rejected
    │
    ├──► Actualizar status en AutoGrid
    ├──► Enviar WhatsApp al Residente: "Concepto 5.2.1 rechazado"
    ├──► Crear corrección en tabla
    ├──► Alertar Gerente si >3 rechazos en 24h
    └──► Actualizar dashboard de métricas
```

#### Blueprint 3: Approval & Signing
```
TRIGGER: estimation.approved
    │
    ├──► Validar todos los conceptos aprobados
    ├──► Generar PDF final con hash
    ├──► Enviar a DocuSign (o FIEL nativo)
    ├──► Esperar firma (poll cada 5 min)
    ├──► Guardar certificado de firma
    ├──► Cambiar estado: SIGNED
    ├──► Notificar ambas partes
    └──► Archivar en storage permanente
```

### Alternativas a Make.com

| Tool | Precio | Pros | Contras | Cuándo usar |
|------|--------|------|---------|-------------|
| **Make** | $200/mes | Visual, 1000+ apps | Latencia, vendor lock-in | **AHORA** - Validación |
| **n8n** | $50/mes | Self-hosted, open source | Necesitas DevOps | Escalar >100 usuarios |
| **Zapier** | $500/mes | Enterprise-grade | Caro, menos flexible | Enterprise clients |
| **Temporal** | $0 (self) | Code-first, robusto | Build yourself | Custom workflows complejos |

**Estrategia**: Empezar con Make, migrar a n8n self-hosted al escalar.

---

## Pillar 3: NOM-151 Compliance Nativo

### Qué significa "Nativo"

| Feature | Implementación | Valor Legal |
|---------|----------------|-------------|
| **SHA-256 Hashing** | En cada transición de estado | Integridad forense |
| **Timestamping TSA** | Time Stamping Authority | No repudio temporal |
| **Audit Trail** | Merkle tree / Blockchain ligero | Cadena de custodia |
| **Firma FIEL** | e.firma SAT (CFDI) | Legalmente vinculante en México |
| **DocuSign** | Fallback para extranjeros | Internacional |
| **PDF Certificado** | Hash en metadata | Evidencia digital |

### Workflow NOM-151

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  DRAFT  │────▶│ IN_REVIEW   │────▶│  APPROVED   │────▶│ SIGNED  │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
      │                                        ▲              │
      │                                        │              │
      └────────────────────────────────────────┘              │
                   (loop si rechazos)                         │
                                                              │
                                                         [IMMUTABLE]
```

### Estados y Transiciones

| Estado | Descripción | Próximo | Validación |
|--------|-------------|---------|------------|
| **DRAFT** | Edición libre | SUBMITTED | Campos obligatorios completos |
| **SUBMITTED** | Enviado a revisión | IN_REVIEW | SHA-256 snapshot generado |
| **IN_REVIEW** | Auditor revisando | APPROVED/DRAFT | Todos los conceptos revisados |
| **APPROVED** | Aprobado, esperando firma | SIGNED | Firma digital completada |
| **SIGNED** | Firmado, inmutable | - | Certificado guardado |

### Firma Digital: DocuSign vs FIEL

| Escenario | Solución | Costo | Implementación |
|-----------|----------|-------|----------------|
| Residente mexicano | **FIEL nativo** | $0 | SAT SDK + validación |
| Extranjero o sin FIEL | **DocuSign** | $10/firma | DocuSign API |
| Enterprise (Cemex, ICA) | **Ambos** con fallback | Variable | Lógica condicional |

---

## Competitive Analysis: Post-Strategy

### vs Smartsheet/Monday.com

| Dimensión | Smartsheet | AutoGrid V2 |
|-----------|------------|-------------|
| Onboarding | 30 min configurando | 30 segundos (tu Excel) |
| NOM-151 | ❌ No soporta | ✅ Nativo |
| Construcción MX | Templates genéricos | Templates específicos |
| Precio | $15-30/usuario | $49/residente (ilimitado) |

**Veredicto**: AutoGrid gana en vertical + compliance.

### vs Procore

| Dimensión | Procore | AutoGrid V2 |
|-----------|---------|-------------|
| Complejidad | Overkill para medianas | Justo lo necesario |
| NOM-151 | ❌ US-focused | ✅ México nativo |
| Precio | $400-700/usuario | $49/residente |
| Integraciones | 300+ | 1000+ vía Make |

**Veredicto**: AutoGrid gana en precio + compliance MX.

### vs Excel + Email (Status Quo)

| Dimensión | Excel + Email | AutoGrid V2 |
|-----------|---------------|-------------|
| Fotos vinculadas | ❌ Manual | ✅ Automático |
| NOM-151 | ❌ Imposible | ✅ Nativo |
| Auditoría | ❌ Caos | ✅ Trail completo |
| Versiones | ❌ Confusión | ✅ Snapshots SHA-256 |

**Veredicto**: AutoGrid es la modernización obvia.

---

## Business Model

### Pricing Strategy

| Plan | Precio | Target | Features |
|------|--------|--------|----------|
| **Free** | $0 | Freelancers | 5 estimaciones/mes, Make basic, sin NOM-151 |
| **Residente** | $49/mes | Residentes independientes | Ilimitado, Make Pro, NOM-151 completo |
| **Constructora** | $199/mes | PyMEs constructoras | 5 usuarios, admin dashboard, API access |
| **Enterprise** | Custom | Cemex, ICA, etc. | On-premise, SLA 99.9%, custom integrations |

### Unit Economics

```
Customer: Constructora (Plan $199/mes)
├── Costos:
│   ├── Supabase: $25/mes
│   ├── Make.com: $50/mes (pro-rata)
│   ├── R2 Storage: $10/mes
│   └── DocuSign: $30/mes (3 firmas)
│   └── TOTAL: $115/mes
│
├── Revenue: $199/mes
├── Gross Margin: 42%
└── LTV (24 meses): $2,016
```

### Market Sizing (SAM)

| Métrica | Valor | Fuente |
|---------|-------|--------|
| Construcción México 2024 | $15B USD | INEGI |
| Obras públicas (requieren NOM-151) | 40% | SHCP |
| Residentes profesionales | ~15,000 | CMIC estimate |
| Constructoras medianas | ~3,000 | CMIC |
| **SAM** | **$18M ARR** | 15k × $49 × 12 meses × 20% penetration |

---

## Implementation Roadmap

### Phase A: Excel-Like Foundation (2-3 semanas)

**Goal**: Validar Progressive Disclosure con usuarios

| Componente | Status | Effort |
|------------|--------|--------|
| TrojanUniverGrid.tsx | ✅ Existe | - |
| ConceptDrawer.tsx | 🆕 Nuevo | 3 días |
| SmartCell.tsx | 🆕 Nuevo | 2 días |
| Keyboard shortcuts (E, Space, Esc) | 🆕 Nuevo | 1 día |
| Formula bar visible | 🆕 Nuevo | 1 día |
| **Total** | | **7 días** |

**Success Criteria**:
- Usuario abre Excel 88MB en <30 segundos
- Click en celda → Drawer opens in <500ms
- Zero training needed for residente

### Phase B: Make Integration (1-2 semanas)

**Goal**: Webhooks funcionando con blueprints pre-configurados

| Task | Effort |
|------|--------|
| Webhook service (standardized events) | 2 días |
| Make account + OAuth | 1 día |
| Blueprint: NOM-151 Submission | 2 días |
| Blueprint: Approval Workflow | 2 días |
| Documentation | 1 día |
| **Total** | **8 días** |

**Success Criteria**:
- Webhook entrega en <2 segundos
- Make blueprint funciona sin código
- Usuario conecta Make en <5 minutos

### Phase C: NOM-151 Core (2-3 semanas)

**Goal**: Workflow completo DRAFT → SIGNED

| Componente | Effort |
|------------|--------|
| SHA-256 snapshot service | 3 días |
| State machine implementation | 3 días |
| DocuSign integration | 3 días |
| FIEL integration research | 2 días |
| Audit trail UI (ForensicTimeline) | 3 días |
| **Total** | **14 días** |

**Success Criteria**:
- Snapshot genera hash único
- Transición DRAFT→SIGNED en <5 minutos
- Audit trail inmutable verificable

### Phase D: Polish & Launch (1-2 semanas)

**Goal**: MVP comercializable

| Task | Effort |
|------|--------|
| Templates construcción mexicana | 3 días |
| Onboarding wizard | 2 días |
| Landing page "Excel + NOM-151" | 2 días |
| Pricing page + Stripe | 2 días |
| Documentation | 2 días |
| **Total** | **11 días** |

### Timeline Summary

```
Week 1-2:  Phase A (Excel-like)
Week 3:    Phase B (Make integration)
Week 4-5:  Phase C (NOM-151)
Week 6:    Phase D (Launch)
────────────────────────────────────
Total: 6 weeks to MVP
```

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Make.com sube precios** | Medium | High | Migración planificada a n8n |
| **FIEL integración compleja** | High | Medium | Empezar con DocuSign, FIEL v2 |
| **Univer no soporta todas las fórmulas** | Medium | High | Documentar limitaciones |
| **Competidor agrega NOM-151** | Low | High | Mover rápido, lock-in temprano |
| **Usuarios no quieren Make** | Medium | Medium | Hide complexity, parece nativo |

---

## Success Metrics (KPIs)

### Phase A
- [ ] Time-to-first-edit: <30 seconds
- [ ] Drawer open rate: >60% de usuarios
- [ ] Zero support tickets por "cómo usar"

### Phase B
- [ ] Make connection rate: >40% de usuarios
- [ ] Webhook delivery: <2s p95
- [ ] Blueprint usage: >5 workflows/usuario

### Phase C
- [ ] NOM-151 completion rate: >80%
- [ ] Hash verification: 100% success
- [ ] Time to sign: <5 minutos

### Phase D
- [ ] First 10 paying customers
- [ ] MRR: $500
- [ ] NPS: >50

---

## Next Immediate Actions

1. **Design ConceptDrawer mockups** (Figma)
2. **Setup Make.com account** (starter plan)
3. **Research FIEL integration** (SAT documentation)
4. **Interview 3 residentes** (validar Progressive Disclosure)
5. **Create Make blueprint template** (NOM-151 workflow)

---

## Decision Log

| Date | Decision | Rationale | Owner |
|------|----------|-----------|-------|
| 2026-02-04 | Pivot a Strategy V2 | Reduce time-to-market, diferenciador claro | Product Team |
| 2026-02-04 | Use Make.com vs build | 10x faster, 1000+ integrations | Tech Lead |
| 2026-02-04 | FIEL + DocuSign | Cubrir 100% de casos México | Legal Advisor |
| 2026-02-04 | Pricing $49/mes | Competitivo vs Procore, margen 40%+ | Business |

---

## Appendix

### A. Make.com Webhook Payload Schema

```typescript
// Full API contract for Make integration
// See: /docs/MAKE_INTEGRATION.md
```

### B. NOM-151 Legal Requirements

```
Referencia: NOM-151-SCFI-2016
Requisitos:
- Identificación del firmante
- Integridad del documento
- No repudio
- Validez jurídica

Implementación: SHA-256 + TSA + FIEL/DocuSign
```

### C. Competitive Benchmark Data

```
Fuente: G2, Capterra, entrevistas con usuarios
Fecha: Enero 2026
Metodología: Feature comparison + pricing analysis
```

---

*Document generated by Kimi Code CLI following Boris Cherny best practices*  
*Last updated: 2026-02-04*
