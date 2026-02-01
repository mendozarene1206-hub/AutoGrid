# AutoGrid Context for Kimi

This directory contains structured context about the AutoGrid project for Kimi Code CLI.

## Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `overview.md` | Project identity and Trojan architecture concept | First time / High level |
| `architecture.md` | System architecture and data flow | Understanding components |
| `stack.md` | Technology stack by layer | Technical decisions |
| `security.md` | Security rules and compliance | Before auth/security work |
| `workflow.md` | Workflow states and business rules | Before workflow features |
| `status.md` | Current sprint status and blockers | Daily standup / Planning |

## Quick Commands

```bash
# Read all context
cat .kimi/context/*.md

# Read specific context
cat .kimi/context/architecture.md
cat .kimi/context/workflow.md
```

## For Web Usage (claude.ai/code)

Copy and paste these files in order:
1. `overview.md` - Project basics
2. `architecture.md` - How it works
3. `stack.md` - Technologies used
4. `status.md` - What's done/pending

Then reference specific files as needed:
- Working on auth → Share `security.md`
- Working on approvals → Share `workflow.md`
