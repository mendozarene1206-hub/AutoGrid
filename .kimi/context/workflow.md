# Workflow States

## State Machine

```
                    ┌─────────────┐
         ┌─────────►│    DRAFT    │◄────────┐
         │          └──────┬──────┘         │
         │                 │ submit          │ reject
         │                 ▼                 │
         │          ┌─────────────┐          │
         │          │  IN_REVIEW  │──────────┘
         │          └──────┬──────┘
         │                 │ approve
         │                 ▼
         │          ┌─────────────┐
         │          │APPROVED_INT │
         │          └──────┬──────┘
         │                 │ sign
         │                 ▼
         │          ┌─────────────┐
         └──────────┤   SIGNED    │  ← INMUTABLE
                    └─────────────┘
```

## Business Rules

### DRAFT
- **Can Edit**: Yes (Resident only)
- **Can Delete**: Yes (Owner only)
- **Next State**: IN_REVIEW (submit action)
- **Snapshot**: None yet

### IN_REVIEW
- **Can Edit**: No (frozen)
- **Can Comment**: Yes (Manager)
- **Next States**: 
  - APPROVED_INTERNAL (Manager approves)
  - DRAFT (Manager rejects)
- **Snapshot**: None yet

### APPROVED_INTERNAL
- **Can Edit**: No
- **Can Sign**: Yes (Manager only)
- **Next State**: SIGNED
- **Snapshot**: Generated with SHA-256 hash

### SIGNED
- **Can Edit**: NEVER (immutable)
- **Can View**: Yes (all authorized users)
- **Can Download**: Yes (as PDF with signature)
- **Next State**: None (terminal)
- **Snapshot**: Permanent, hash stored in blockchain (optional)

## Role Permissions

| Action | Resident | Manager | Admin |
|--------|----------|---------|-------|
| Create estimation | ✅ | ✅ | ✅ |
| Edit DRAFT | ✅ (own) | ✅ (any) | ✅ |
| Submit to review | ✅ (own) | ❌ | ✅ |
| Approve/Reject | ❌ | ✅ | ✅ |
| Sign document | ❌ | ✅ | ✅ |
| View SIGNED | ✅ (own projects) | ✅ (all) | ✅ |
| Delete | ✅ (own DRAFT) | ❌ | ✅ |

## Audit Trail
Every state transition logs:
- Who performed the action
- Timestamp (UTC)
- Previous state → New state
- Reason/comment
- SHA-256 of document snapshot
