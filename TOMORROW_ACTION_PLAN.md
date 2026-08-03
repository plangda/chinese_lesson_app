# Tomorrow's Action Plan (2026-07-30)

## Current Status

✅ **Field Masking Implemented**
- `generate_hsk_full.py`: masking/unmasking logic added
- `test_field_masking.py`: unit tests pass (no API quota used)
- `commit 4518e2e`: Changes committed to main

❌ **API Quota Exhausted** 
- Free tier limit: 20 requests/day for gemini-3.5-flash
- Quota resets: ~UTC midnight (should be available by morning)

## Step 1: Validate Masking Fix Works (First Thing Tomorrow)

### When quota resets:
```bash
cd "C:\Users\USER\OneDrive\Desktop\knowledge\My project\Chinese web learning"
python patch_thai_translations.py --level hsk1 --limit 1
```

### Expected result:
- hsk1_day4 should succeed with "llm" marking (not "fallback")
- Output should show: `[Thai LLM translation] hsk1_day4 completed`
- No "Translation corruption detected" errors

### If it fails:
- Debug unmask logic (likely small bug in field restoration)
- Contact me before proceeding with broader deployment

### If it succeeds:
- Masking approach is **proven**, proceed to Phase 2

---

## Step 2: Conservative Rollout (After Phase 1 Success)

### Reduce retry attempts (optional optimization):
Edit `generate_hsk_full.py`, line ~227:
```python
def add_thai_translations_to_lesson_llm(lesson_data, max_retries=1):  # Changed from 3 to 1
```

**Why:** Reduces API quota per lesson from 3 calls to ~1.5 calls average
**When:** Only after hsk1_day4 passes with masking

### Deploy 4 more HSK1 lessons:
```bash
python patch_thai_translations.py --level hsk1 --limit 4
```

### Push to Turso:
```bash
node patch_thai_to_turso.js hsk1 5  # Push all 5 (day4-day8 or similar)
```

**Total API Cost:** ~8-10 calls (under 20-call limit)

---

## Step 3: Plan Rest of Deployment (Based on Phase 2 Results)

**If Phase 2 succeeds with masking (high probability):**

### Option A: Continue Daily Batching (Safe, Simple)
```
Day 2: 6 lessons from HSK1/HSK2
Day 3: 6 lessons from HSK2
Day 4: 6 lessons from HSK2/HSK3
... (7-8 days total)
```

**Pros:** Minimal code changes, guaranteed quota safety
**Cons:** Takes a week

### Option B: Implement Batch Translation (Fast, Complex)
Send 3-4 lessons per API call instead of 1:
```
Day 2: Implement batching (~2-3 hours)
Day 3: Deploy all 38 remaining lessons in 3 batches
```

**Pros:** Finish in 2-3 days
**Cons:** Requires modifying LLM prompt + validation logic

### Decision Point:
- **Recommend Path A** unless you need completion urgently
- Can upgrade to path B anytime

---

## File Status

**Ready to deploy:**
- ✅ `generate_hsk_full.py` (field masking + LLM function)
- ✅ `patch_thai_translations.py` (state tracking + numeric sort)
- ✅ `patch_thai_to_turso.js` (Turso DB updates)
- ✅ `test_field_masking.py` (unit test proof)

**Don't commit:**
- ❌ `generated_lessons.jsonl` (test artifacts)
- ❌ `patched_lessons_state.json` (will be recreated by patch script)

---

## Quota Accounting

### Tomorrow's Budget: 20 API calls free tier

**Phase 1:** hsk1_day4 retry = 1 call (or 3 if retries needed)
**Phase 2:** 4 new lessons = ~6 calls (assuming 1.5 avg per lesson)

**Total: ~7-9 calls (Safe within 20-call limit)**

---

## Key Files to Reference

- `PATTERN_ANALYSIS_DAY4.md` — Why pattern couldn't help, why masking does
- `MASKING_IMPLEMENTATION_STATUS.md` — Implementation details + next steps
- `memory/deployment_quota_strategy.md` — Full quota planning for all 43 lessons
- `test_field_masking.py` — Proof that masking logic works (run anytime)

---

## Success Criteria for Tomorrow

✅ hsk1_day4 validation passes with masking
✅ 4-5 more HSK1 lessons patched successfully
✅ All patched lessons pushed to Turso
✅ State file updated with "llm" markers
✅ Quota usage stays under 20 calls
✅ Plan confirmed for remaining 38 lessons

---

**Good luck tomorrow! The foundation is solid—masking tests pass, code is committed, just need to validate with real API calls.**
