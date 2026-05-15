---
name: testing-telegram-import
description: Test the Telegram schedule import feature end-to-end. Use when verifying import parsing, analytics, default position application, or auto-placement changes.
---

# Testing: Telegram Schedule Import Feature

## Prerequisites

### Environment Setup
1. PostgreSQL running on localhost:5432 with database `schedule_generator`
2. Backend: `cd server && npm run dev` (runs on port 3001)
3. Frontend: `cd client && npm run dev` (runs on port 5173, proxies API to 3001)
4. Set `ADMIN_PASSWORD=test123` in `server/.env`
5. Run `npx prisma migrate deploy` in `server/` to ensure DB schema is current

### Devin Secrets Needed
- None required. Default admin credentials: username `admin`, password `test123`

### Test Data
- User-provided Telegram export files (.txt) with schedule messages
- Format: `[date time] Author: DD.MM Day\n1 разделка ...\n🫗Замес в HH.MM ...\n🫔Разделка с HH.MM\n1⃣Name2⃣Name...\n🥖Выпечка ...`
- Larger datasets (3-6 months, 50+ messages) give more meaningful analytics
- A copy of test data may be at `client/public/test-schedule.txt`

## Test Procedure

### 1. Login
- Navigate to http://localhost:5173
- Login with admin/test123

### 2. Navigate to Import Tab
- Click "Импорт" (6th tab in navigation bar)
- Verify: textarea and "Анализировать" button visible
- Note: "Анализировать" button is disabled when textarea is empty

### 3. Paste and Analyze Data
- Paste Telegram schedule text into textarea
- For large files (>1000 lines), use browser_console to set textarea value programmatically:
  ```js
  // Load from public file
  fetch('/test-schedule.txt').then(r=>r.text()).then(t=>{
    const ta = document.querySelector('textarea');
    const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    nativeSet.call(ta, t);
    ta.dispatchEvent(new Event('input', {bubbles:true}));
  });
  ```
- Click "Анализировать"
- Verify summary cards: schedules count, workers count, records count, date range
- Verify worker stats table shows per-shift position frequencies with suggestions

### 4. Apply Default Positions
- Click "Применить позиции по умолчанию"
- Verify success message shows created/updated counts
- Note: Some edge-case worker names (e.g., "..", "⚡️Ф⚡️") might not be persisted

### 5. Verify Workers Tab
- Navigate to "Работники" tab
- Verify worker count matches expected (may be slightly less than analytics due to edge cases)
- Verify workers show "смена/поз" (shift/position) format for default positions
- Cross-reference a few workers' positions with analytics suggestions

### 6. Verify Auto-Placement
- Navigate to "Редактор" tab
- Press Ctrl+B to add a new block
- New block should auto-populate cutting workers based on shift number:
  - Block 2 = shift 2: workers with shift 2 defaults are placed at their positions
  - Only positions where exactly one worker defaults to that position are filled
- Verify at least one worker is auto-filled at the correct position

## Known Issues & Workarounds

- **Viewport mismatch**: Browser viewport may be 1600x1069 while screenshots are 1024x768. Use browser_console JS for reliable element interaction if clicks miss targets.
- **Large file pasting**: Direct typing of large files may fail. Use the fetch() + programmatic value setting approach shown above.
- **Worker count discrepancy**: Analytics may show more workers than are persisted. Edge-case names with special characters or very short names might not be saved. This is expected behavior.
- **Auto-placement partial fill**: Only position 1 workers (or positions with a single unique default worker) get auto-filled. Other positions remain empty for manual selection. This is by design.

## Key Files
- `client/src/components/ImportPanel.tsx` — Import UI component
- `server/src/lib/telegram-parser.ts` — Telegram message parser
- `server/src/routes/import.ts` — Import API endpoints
- `client/src/store/scheduleStore.ts` — Schedule state management (applyDefaultWorkers)
