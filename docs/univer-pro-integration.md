# Univer Pro Integration Plan

## What Univer Pro Replaces

| Component | Before (Custom) | After (Univer Pro) |
|-----------|-----------------|-------------------|
| Excel Parser | `ingestion.worker.ts` | **Exchange Client** |
| Backend Worker | BullMQ + Redis | **Univer Server** (Docker) |
| Streaming Logic | `excelProcessor.ts` | **Built into Univer** |

**Result:** Remove ~500 lines of custom code, faster 150MB imports.

---

## Prerequisites

- [x] Univer Pro trial license obtained
- [ ] Docker Desktop installed
- [ ] License files downloaded (`license.txt`, `licenseKey.txt`)

---

## Phase 1: Deploy Univer Server (Local First)

**Time: 15 minutes**

### Step 1.1: Start Univer Server with Docker

```bash
# One-click deployment
bash -c "$(curl -fsSL https://get.univer.ai)"
```

This starts:
- PostgreSQL database
- Redis cache
- Univer API server on `http://localhost:8000`

### Step 1.2: Add License Files

```bash
# Copy your license files to the server configs
cp license.txt /docker-compose/configs/
cp licenseKey.txt /docker-compose/configs/

# Restart the server
cd /docker-compose
bash run.sh
```

### Step 1.3: Verify Server

Open browser: `http://localhost:8000/universer-api/license/key`

Should show:
```json
{
  "verify": true,
  "release_type": "COMMERCIAL"
}
```

---

## Phase 2: Update Frontend

**Time: 30 minutes**

### Step 2.1: Install Pro Packages

```bash
cd frontend
npm install @univerjs-pro/license @univerjs-pro/exchange-client @univerjs-pro/sheets-exchange-client
```

### Step 2.2: Add License Plugin

Edit `UniverGrid.tsx`:

```typescript
// Add at top of imports
import { UniverLicensePlugin } from '@univerjs-pro/license';
import { UniverExchangeClientPlugin } from '@univerjs-pro/exchange-client';
import { UniverSheetsExchangeClientPlugin } from '@univerjs-pro/sheets-exchange-client';

// Your license content (from license.txt)
const LICENSE = `paste-your-license-content-here`;

// In the useEffect where Univer is initialized, add FIRST:
univer.registerPlugin(UniverLicensePlugin, { license: LICENSE });

// Then add Exchange plugins AFTER other plugins:
univer.registerPlugin(UniverExchangeClientPlugin);
univer.registerPlugin(UniverSheetsExchangeClientPlugin);
```

### Step 2.3: Configure Server URL

Create/update `.env`:

```env
VITE_UNIVER_SERVER_URL=http://localhost:8000
```

### Step 2.4: Update Import Logic

Replace custom import in `App.tsx`:

```typescript
// OLD (custom parser)
import { ingestExcelFile } from './utils/ingestion';
const result = await ingestExcelFile(file, userId, spreadsheetId);

// NEW (Univer Pro)
const univerAPI = FUniver.newAPI(univer);
const snapshot = await univerAPI.importXLSXToSnapshotAsync(file);
setData(snapshot);
```

---

## Phase 3: Simplify Codebase

**Time: 15 minutes**

### Files to Remove (Optional)

These are no longer needed with Univer Pro:

| File | Reason |
|------|--------|
| `frontend/src/utils/ingestion.ts` | Replaced by exchange-client |
| `frontend/src/utils/ingestion.worker.ts` | Replaced by exchange-client |
| `worker/` folder | Replaced by Univer Server |
| `server/` folder | Can simplify (no BullMQ needed) |

### Files to Keep

| File | Still Needed For |
|------|------------------|
| `UniverGrid.tsx` | Rendering (add Pro plugins) |
| `ChunkedUniverGrid.tsx` | May not be needed with Pro |
| `UniverPersistenceService.ts` | Saving to Supabase |
| `r2Client.ts` | Only if using R2 for storage |

---

## Phase 4: Test

### Test 1: Small File (5MB)
```javascript
// In browser console
const file = /* select 5MB Excel */;
const snapshot = await univerAPI.importXLSXToSnapshotAsync(file);
console.log(snapshot); // Should show IWorkbookData
```

### Test 2: Large File (150MB)
```javascript
// Same process, should complete in ~30-60 seconds
const file = /* select 150MB Excel */;
const t0 = performance.now();
const snapshot = await univerAPI.importXLSXToSnapshotAsync(file);
console.log(`Imported in ${(performance.now() - t0) / 1000}s`);
```

---

## Architecture After Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLIFIED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐         ┌───────────────────────────────┐    │
│  │   Frontend   │ ───────▶│     Univer Server (Docker)    │    │
│  │  (Vercel)    │         │  - Excel import/export        │    │
│  │  + Pro SDK   │         │  - Formula calculation        │    │
│  └──────────────┘         │  - Collaboration              │    │
│         │                 └───────────────────────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │   Supabase   │  ← Still needed for auth, user data          │
│  └──────────────┘                                              │
│                                                                 │
│  ❌ No more Redis                                              │
│  ❌ No more BullMQ Worker                                      │
│  ❌ No more custom parser code                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Comparison

| | Before (Custom) | After (Univer Pro) |
|---|-----------------|-------------------|
| Redis | $0-10/mo | ❌ Not needed |
| Worker server | $5-10/mo | ❌ Not needed |
| Univer Server | $0 | $5-20/mo (Docker hosting) |
| License | $0 | Trial (free 30 days) |
| **Total** | ~$15/mo | ~$5-20/mo |

---

## Verification Checklist

- [ ] Univer Server running on localhost:8000
- [ ] License verified at `/universer-api/license/key`
- [ ] Pro packages installed in frontend
- [ ] License plugin registered first
- [ ] Exchange plugins registered
- [ ] 5MB file imports successfully
- [ ] 150MB file imports successfully
- [ ] No watermark on grid
