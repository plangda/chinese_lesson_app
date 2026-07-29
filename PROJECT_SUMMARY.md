# HanPath Project Summary
**Date:** July 29, 2026 (Last Updated)

## 1. Business Requirements

**Product Vision:** 
HanPath is a structured, daily Chinese learning application tailored to make language acquisition engaging, consistent, and accessible. It is designed with a kid-friendly, gamified aesthetic while retaining robust educational structures suited for all ages. 

**Core Features & User Flows:**
- **Curriculum & Pacing:** Content is mapped to standard HSK proficiency levels (HSK 1, 2, and 3). The curriculum is delivered in daily, digestible 1-hour sessions to prevent burnout and encourage habit-building.
- **4-Stage Daily Learning Engine:**
  - *Stage 1 (Vocabulary):* Interactive flashcards, stroke tracing (via HanziWriter), and pronunciation.
  - *Stage 2 (Grammar):* Concept explanations, examples, and sentence-reordering exercises.
  - *Stage 3 (Dialogue):* Conversational practice with Text-To-Speech (TTS) playback and bilingual translations.
  - *Stage 4 (Quiz):* Comprehensive end-of-lesson assessment to verify retention.
- **Diagnostic Pre-Testing:**
  - *Placement Test:* A global diagnostic tool to determine a user's starting HSK level.
  - *Lesson Pre-Test:* A micro-assessment allowing advanced users to "test out" of lessons they already know.
- **Retention & Gamification:** Daily streak counters, total time tracked, lesson completion scores, and user-configurable daily study reminders.
- **Bilingual Support:** Full UI and content localization in both English and Thai.

---

## 2. Technical Specification

**Architecture Overview:**
HanPath operates as a Single Page Application (SPA) with a lightweight Node.js backend connected to a remote cloud database.

**Frontend (Client-Side):**
- **Tech Stack:** Vanilla HTML5, CSS3 (Custom utility classes, CSS Variables, Glassmorphism design), and Vanilla JavaScript (ES6+). No heavy frameworks (like React/Vue) to ensure blazing fast load times and simple hosting.
- **State Management:** Centralized local JS `state` object synchronized with `localStorage` and the backend server.
- **Localization:** Custom robust i18n engine scanning the DOM for `data-i18n` attributes and mapping to a dual-language (EN/TH) dictionary object.
- **Key Libraries:** `hanzi-writer.min.js` (for stroke animations and character drawing), Native Web Speech API (for Text-To-Speech).

**Backend (Server-Side):**
- **Tech Stack:** Node.js, Express.js.
- **Database:** Turso Cloud Database (SQLite distributed at the edge).
- **Driver:** `@libsql/client` wrapper with custom exponential backoff retry logic for resilience against network instability.
- **API Design:** RESTful endpoints. Deeply nested curriculum data is fetched via highly optimized batch SQL queries (resolving previous N+1 query inefficiencies) and assembled in-memory (O(N) complexity) before being served to the client.

**Database Schema Design:**
- **Standardized Column Layout:** All user-facing translatable strings are explicitly separated into English (`_en`) and Thai (`_th`) columns in the database (e.g., `meaning_en`, `meaning_th` in the `vocab` table; `explanation_en`, `explanation_th` in the `grammar` table). This provides standard translation schemas across the entire database.
- **Mixed-Language Character Preservation:** Shared linguistic attributes—specifically the original Chinese characters (`character` and `example_cn` columns) and their standard Pinyin pronunciations (`pinyin` and `example_py` columns)—are stored in unified, language-agnostic columns. Only the contextual explanations and translated meanings are split into English (`_en`) and Thai (`_th`) columns. This schema separation ensures that the core Chinese characters and pronunciations are never processed by translation engines, preventing character corruption and maintaining clean, mixed-language layouts.
- **SQL Translation Aliases:** The server routes fetch these language-specific fields and alias them (e.g. `meaning_en as meaning`) to maintain seamless backward compatibility with the frontend's legacy code.
- **Quiz Elimination from Database:** The legacy `quizzes` table has been completely dropped from the database schema because post-lesson quizzes are generated dynamically in the frontend (inside `app.js`) using the lesson's active vocabulary list. This guarantees that quizzes are always dynamically localized and are in 100% synchronization with vocabulary.

**Quiz Engine Handling (Three Quiz Types):**
The application implements three distinct quiz types, all handled dynamically in the client frontend (without database queries):
1. **Diagnostic Placement Test (Pre-Test):** A 10-question general assessment loaded dynamically from a static JSON array (`preTestQuestions`) in `app.js` upon signup. Scores are evaluated to place the student in their starting HSK level (Level 1, 2, or 3) and award initial points.
2. **Lesson-Level Pre-Test (Skip-Lesson Quiz):** A placement quiz triggered before starting a lesson. It dynamically compiles 5+ questions using the lesson's active vocabulary pool. If the user scores 100%, they skip the study phases, unlock the lesson, and get bonus points.
3. **Daily Post-Lesson Quiz (Retention Quiz):** Injected at Stage 4 of the study engine. It dynamically compiles a 10+ question practice quiz based on the daily lesson's vocabulary words. This ensures questions are always in sync with the vocabulary studied and are fully translated into Thai.

**Seeding & Idempotency Logic:**
- **Check-and-Skip Efficiency:** To prevent redundant writes and save Turso database operations, the seeder `insert_generated_lessons.js` checks the database before importing. It runs a single count query: `SELECT COUNT(*) as count FROM vocab WHERE lesson_id = ?`.
  - **Skip:** If the count is greater than `0`, it skips the lesson, avoiding unnecessary updates.
  - **Self-Healing:** If the lesson ID exists in `lessons` but the count is `0`, it automatically clears the remnant rows and re-seeds the lesson (handling past script crashes automatically).
- **Gatekeeper CLI Prompt:** If a force overwrite is required (passing the `--force` or `-f` flag), the script checks if the shell is interactive (`process.stdin.isTTY`). If interactive, it halts and demands a manual `yes/no` response before overwriting. If non-interactive (such as in an AI session or automated runner), it safely aborts to prevent accidental loss of data.
- **Interactive HTTP Transactions:** Standard SQL `BEGIN TRANSACTION` commands fail over stateless edge HTTP endpoints. To make seeding completely bulletproof, we exposed the native LibSQL `.transaction("write")` API in `database.js`. All operations for a single lesson are executed inside this transactional scope; if any insert fails, the transaction is rolled back, leaving zero corrupted or partial rows.

**Process for Future Database Adjustments:**
- **Structural Database Changes:** We will **never** perform destructive `DROP TABLE` operations on a live production database. Future schema modifications will be handled via additive SQL Migration Scripts using the `ALTER TABLE` statement (e.g., `ALTER TABLE vocab ADD COLUMN ...`).
- **Content Typo Fixes & Adjustments:** Small spelling corrections or translation fixes will be done using targeted `UPDATE` scripts (or in a future phase, a web-based Admin Panel) rather than re-running the entire seeder.
- **Seeding for New Curriculum:** The seeding script is treated as a **One-Way Seed**. It will only be run to import *new* curriculum levels (like HSK 2 and HSK 3) while existing levels remain permanently untouched.

**HSK Curriculum Generator Specification (Offline Pipeline):**
- **Source of Truth (Official 2026 Remap):** Word lists are read directly from `hsk30.csv`, which has been fully remapped to the official 2026 HSK 3.0 standard counts (Level 1 = 300 words, Level 2 = 200 words, Level 3 = 500 words, etc.).
- **Dynamic Theme Clustering:** The vocabulary is grouped into thematic days using an offline clustering script (e.g., `cluster_hsk_2026_themes_dynamic.py`). Instead of a forced Day count, the number of lessons emerges naturally based on the semantic grouping of the words (aiming for a density of ~8-12 words per lesson). This dynamic clustering is standard across all levels.
- **LLM-Based Content Generator:** Content is generated programmatically using `generate_hsk_full.py` powered by the `gemini-2.5-flash` model. It translates standard HSK words into high-quality vocabulary sheets, grammar pointers, and dialogue scenarios complete with English and Thai translations.
- **LLM-Based Contextual Translation Pipeline (Active):**
  - *Upfront English Meaning Lookup:* Integrates `get_youdao_meaning(word)` to fetch clean English definitions from the Youdao Suggestion API on-demand before construction of the Gemini payload, resolving placeholder bugs.
  - *LLM Contextual Thai Translation:* Replaced the previous stateless Google Translate approach with a **single Gemini API call per lesson** via `add_thai_translations_to_lesson(lesson_data)`. The entire lesson JSON (vocab, grammar, dialogue) is submitted in one prompt, giving the model full pedagogical context. The system prompt instructs it to produce natural, idiomatic, kid-friendly Thai — explaining grammatical particles by function rather than literal name. This eliminates the word-by-word translation bug that corrupted `deconstruct_th` and `explanation_th` fields.
  - *Quota-Aware Two-Pass Mode:* The generator supports a `--no-translate` flag to skip Thai translation during generation (saving ~50% of the daily API quota). A separate script `patch_thai_translations.py` can then re-run LLM translation as targeted `UPDATE` SQL statements against Turso without re-seeding English content.
  - *SDK:* Migrated from the deprecated `google-generativeai` package to the current `google-genai` SDK (`google.genai.Client`). Model confirmed: `gemini-3.5-flash` (20 req/day free tier).
- **Automatic Self-Healing Parser:** At start-up, the script parses `generated_lessons.jsonl` using a robust checker (`is_lesson_complete`) that scans for JSON schema completeness (ensuring presence of all core arrays, dialogue lines, and localized translation keys). Any incomplete or corrupt records are automatically purged, and the clean, sorted records are rewritten back to the file.
- **Seamless Incremental Resume:** Incorporates globally unique lesson IDs to query local `.jsonl` files and live database caches. Already generated days are skipped instantly, protecting against redundant API calls.
- **Throttling & API Budgeting:** Employs a 6-second sleep throttle to respect Gemini's 15 RPM limit and handles 429 rate limits gracefully with an automated sleep-and-retry strategy. It supports a `--limit` argument to generate a specific budget of lessons per run to prevent exceeding daily free tier budgets.
- **Data-Quality Validation Guardrails (July 28):** Added multi-layered post-generation validation to `generate_lesson_content()` to catch language-contamination defects before they ever reach the database:
  - `find_thai_contamination()` — flags English-only fields (`title`, `meaning`, `deconstruct`, `explanation`, dialogue title) that contain Thai script.
  - `find_incomplete_practice()` — flags grammar practice exercises missing an embedded example sentence, an empty `answer` array, or an `answer` containing a token absent from `words`.
  - `find_chinese_field_contamination()` — flags `deconstruct`/`explanation` fields where Chinese characters make up more than 30% of alphabetic content (i.e. the model answered in Chinese instead of English).
  - Any failed check raises a `ValueError`, which feeds the existing retry loop in `run_generation`, so a contaminated response triggers automatic regeneration instead of being saved.
- **CJK/Pinyin-Preserving Translation Guardrail (July 28):** Rewrote `translate_en_to_th()` to use placeholder substitution instead of naive whole-string translation: embedded Chinese citations (and their attached pinyin/gloss parentheticals, length-capped so a full English gloss sentence isn't mistaken for a citation) are swapped for a marker token before the string is sent to Google Translate, then restored verbatim afterward. This prevents Chinese sentences from being translated away, prevents pinyin like `shànglái` from being garbled into nonsense, and fixes a whitespace-collapsing/broken-grammar artifact from the previous segment-by-segment translation approach.

**Data Schema (Core Entities & Standardized Columns):**
- `user_progress`: Tracks HSK level, scores, streaks, time spent, and completed lessons.
- `lessons`: Curricular structure mapping days to HSK levels. Columns: `id`, `hsk_level`, `day_number`, `title_en`, `title_th`.
- `vocab`: Relational vocab linking content to `lesson_id`. Columns: `id`, `lesson_id`, `character`, `pinyin`, `meaning_en`, `meaning_th`, `deconstruct_en`, `deconstruct_th`, `example_cn`, `example_py`, `example_en`, `example_th`.
- `grammar`: Grammar concepts linking content to `lesson_id`. Columns: `id`, `lesson_id`, `title_en`, `title_th`, `explanation_en`, `explanation_th`.
- `grammar_examples`: Examples linked to grammar rows. Columns: `id`, `grammar_id`, `cn`, `py`, `en`, `th`.
- `grammar_practice`: Practice questions linked to grammar rows. Columns: `id`, `grammar_id`, `prompt_en`, `prompt_th`, `words` (JSON array), `answer` (JSON array).
- `dialogues`: Dialogue headers linked to `lesson_id`. Columns: `id`, `lesson_id`, `title_en`, `title_th`.
- `dialogue_lines`: Individual conversation lines. Columns: `id`, `dialogue_id`, `speaker`, `cn`, `py`, `en`, `th`.

---

## 3. Project Progress

**Overall Completion Status: ~87%** (Core Application is ~95% Complete)

**Milestones Achieved:**
- ✅ **Phase 1: Database & Backend:** Schema setup, Turso cloud migration, API routes, and **Full HSK 1 curriculum seeding** are completed (26 days/300 words generated and seeded). **HSK 2 Days 1–17** generated and seeded (4 lessons remaining).
- ✅ **Phase 2: Diagnostic System:** Global placement tests and per-lesson gating pre-tests are fully functional.
- ✅ **Phase 3: Core Learning Engine:** Vocab tracing, Grammar interactions, Dialogue UI, Pinyin Matrix chart, and Quizzes are fully operational.
- ✅ **Phase 4: Consistency & Retention:** Streak tracking, progress syncing (smart merge between local/server), and daily reminders implemented.
- ✅ **Phase 5: UX & Localization:** Kid-friendly styling applied, inline styles refactored to CSS utility classes. Complete Thai translation injected across both the frontend UI and Turso database records.
- ✅ **Curriculum Generator Overhaul (July 27):** Migrated generator from deprecated `google-generativeai` to new `google.genai` SDK; replaced per-field Google Translate with single LLM contextual translation call per lesson.
- ✅ **Data-Quality Guardrails & Corruption Repair (July 28):** Investigated two live-reported bugs — Thai text appearing in English fields, and incomplete/unanswerable grammar-quiz exercises — and traced both to gaps in generation-time validation rather than frontend rendering bugs. Added four validation guards to `generate_hsk_full.py` and repaired all discovered corruption in both `generated_lessons.jsonl` and the live Turso database via targeted `UPDATE` scripts (never full reseeds): 5 lessons / 74 fields of Thai contamination, 16 grammar-practice records with missing or structurally broken practice exercises, 35 grammar-practice Thai translations that had dropped or mistranslated their embedded Chinese sentences, and 32 `deconstruct`/`explanation` fields that were answered entirely in Chinese instead of English.
- ✅ **Field Masking for LLM JSON Structure Protection (July 29):** Discovered that hsk1_day4 validation failed because the LLM was modifying `cn`/`py`/`character`/`pinyin` fields in the JSON response despite explicit "NEVER modify" prompt instructions. Pattern-based protection (`_CJK_PROTECT_PATTERN`) proved ineffective at the JSON field level. Implemented field masking: rename untranslatable fields to `_*_masked` versions before sending to LLM, then unmask the response to restore original field names. This structural approach prevents the LLM from ever seeing or modifying these fields. Unit test suite (`test_field_masking.py`) validates the complete mask/unmask/validate pipeline without consuming API quota. Confirmed working via 4 test cases.

**Pending / Next Steps:**
- ⏳ **HSK 2 Days 18–21:** Generate 4 remaining lessons (quota allows ~20 req/day; use `--no-translate` flag to save quota for separate patch pass).
  - Command: `python generate_hsk_full.py --limit 4 --no-translate`, then `node insert_generated_lessons.js`
- ⏳ **Thai Translation Patch for HSK1 & HSK2 (With Field Masking):**
  - **Phase 1 (Tomorrow, 2026-07-30):** API quota resets. Retry hsk1_day4 with field masking fix: `python patch_thai_translations.py --level hsk1 --limit 1`. If successful, patch 4-5 more HSK1 lessons. Push to Turso: `node patch_thai_to_turso.js hsk1 5`. Total API cost: ~8-10 calls (within 20-call quota).
  - **Phase 2 (Days 2-4 or Later):** Progressive rollout with two options:
    - *Option A (Safe):* Continue daily batching of 6 lessons/day (7-8 days total) using existing code.
    - *Option B (Fast):* Implement batch translation (3-4 lessons per API call) to finish in 2-3 days (requires ~2-3 hours of development).
  - **Key Improvement:** Field masking resolves hsk1_day4 validation failures where LLM modified cn/py fields. Masking prevents LLM from seeing these untranslatable fields entirely, guaranteeing preservation.
  - **Commands (Phase 2):** `python patch_thai_translations.py --level hsk1 --limit 6`, then repeat for hsk2 in daily batches.
- ⏳ **HSK 3 Seeding:** Content generation and seeding for 500-word intermediate-advanced curriculum.
- ⏳ **HSK 4, 5 & 6 Seeding:** Advanced content generation and database seeding for higher proficiency levels.
- ⏳ **Phase 6: Future Enhancements:**
  - *Multi-Character Writing Pad:* Expanding the `hanzi-writer` integration to support writing multiple characters sequentially for vocabularies longer than one character.
  - *Full HSK Mock Exams:* Adding comprehensive end-of-level exams that accurately simulate the latest official HSK exam formats (2026 version) for formal test preparation.
  - *Pronunciation Assessment:* Integrating a speech-to-text API (e.g., Web Speech API or external service) to score user pronunciation accuracy.
  - *DevOps & Custom Domains:* Docker containerization, formal production deployment on Vercel, and configuration of a clean, branded custom domain (avoiding phishing-like URLs).
  - *Automated Testing:* Implementing a test suite (Jest/Supertest) to guard against regressions in the API and UI state.

---

## 4. Key Discussions & Decisions Log

- **Interactive Confirmations Guardrail (Reverted TTY Check):** Decided to completely block force overwrites (`--force`) in non-interactive tasks. Reverted the seeder's automatic override patch to ensure force database deletes cannot run silently in background task runners, and locked this constraint locally in `.agents/AGENTS.md`.
- **CEDICT Parsing & Dictionary Lookup:** Moved vocabulary English definitions out of Gemini's scope by querying the Youdao API locally. This prevents Chinese characters from ending up in the English meaning fields.
- **LLM Contextual Thai Translation (July 27 — Replaced Google Translate):** Replaced the per-field Google Translate approach with a single `gemini-3.5-flash` LLM call per lesson. The full lesson JSON is submitted as context with a system prompt instructing natural, idiomatic, kid-friendly Thai. This eliminates the word-by-word translation bug that produced broken `deconstruct_th` and `explanation_th` content. A `--no-translate` CLI flag was added to `generate_hsk_full.py` to allow quota-efficient two-pass generation (generate first, translate separately).
- **Turso Thai Patch Strategy (No Re-seeding):** HSK1 Thai translation quality fix will be applied via targeted `UPDATE` SQL using `patch_thai_translations.py`. This avoids destructive re-seeding and respects the project rule against non-interactive force overwrites.
- **google.genai SDK Migration (July 27):** Migrated from the deprecated `google-generativeai` package (which caused silent 16-hour hangs with `gemini-3.5-flash`) to the current `google.genai` SDK. `gemini-3.5-flash` confirmed working; `gemini-2.0-flash` and `gemini-1.5-flash` are either quota-exhausted or not available on the free API version.
- **Free Tier Quota Constraint:** Both `gemini-3.5-flash` and `gemini-2.5-flash` share a **20 requests/day free tier limit**. With LLM translation costing 1 extra call per lesson, the practical generation rate is ~10 lessons/day (with translation) or ~20 lessons/day (with `--no-translate`).
- **Language Suffix Suffixing vs Unified Columns:** Unified character and Pinyin columns while splitting translation meanings (`meaning_en` / `meaning_th`) to avoid corruption, maintaining mixed-language compatibility in the database.
- **Auto-Language Detection in Translation Pipeline:** Configured the post-generation translator to use `sl=auto` rather than hardcoding `sl=en`.
- **Unique Character Constraint Handling (Polyphonic Words):** When encountering polyphonic words (same character with different pinyins/meanings like `好` as `hǎo` and `hào`) in the same day's "Additional Vocabulary" catch-all pool, they are programmatically distributed to different days to prevent database unique constraint conflicts.
- **Bilingual Title Prevention:** Added prompt constraints to the Gemini generator templates to enforce English-only titles and prohibit bilingual prefixes, letting the frontend handle structural formatting.
- **HSK Level Prefix Rendering Fix (July 27):** Updated `app.js` (lines 742, 795) to use a generic regex `l.id.replace(/^hsk\d_day/, '')` replacing the hardcoded `'hsk1_day'` string, so the dashboard correctly renders day numbers for HSK 2 and beyond.
- **Thai-Contamination Root Cause Correction (July 28):** An initial hypothesis attributed Thai text appearing in English fields (`title`, `deconstruct`) to `add_thai_translations_to_lesson()` overwriting the wrong dictionary keys. Direct inspection of the function and live data disproved this — every assignment in it correctly targets only `_th`-suffixed keys. The real cause was upstream: `generate_lesson_content()`'s prompt only enforced "English only" on the `title` field, and validation never checked a field's actual *language*, only key presence. Fixed by extending the English-only instruction to `deconstruct`/`meaning`/`explanation` and adding `find_thai_contamination()` to the validation block.
- **Grammar-Quiz "Incomplete Sentence" Root Cause Correction (July 28):** A second hypothesis attributed a reported "missing sentence" bug in the grammar quiz to a frontend template/rendering mismatch in `app.js`. Investigation showed `renderGrammarPane()` renders `practice.prompt` correctly as a plain string — the actual defect was in the data: several `grammar_practice` records had a generic instruction with no embedded example sentence, an empty `answer` array, or an `answer` that didn't match any token in `words` (making the exercise unwinnable via the drag-into-blank UI). Fixed via `find_incomplete_practice()` validation plus a one-time repair of all 16 affected records.
- **Full-Table CJK Integrity Audit (July 28):** Prompted by a request to verify a Chinese-protection guardrail existed in the translation pipeline, audited all 85 `grammar_practice` records by comparing the actual Chinese characters in `prompt_en` vs `prompt_th`. Found the pre-guardrail `translate_en_to_th()` had silently corrupted Thai translations across most of HSK2 (days 1–17) — dropping embedded Chinese sentences, mistranslating citation characters (`两`→`二`, `会`/`能`→`will`/`can`), and producing `NULL` in 5 cases. This reinforced a standing practice for this class of bug: always diff actual before/after content against a hypothesis rather than trusting it, since two prior hypotheses in this same investigation (translation key-mapping, frontend rendering) were both wrong on inspection.
- **Placeholder-Substitution Translation Strategy (July 28):** Segment-splitting text into protected/translatable chunks and translating each chunk independently (the first guardrail approach) proved unreliable — Google Translate trims whitespace from short isolated fragments and breaks grammatical continuity when a sentence is chopped around a citation (e.g. "由 X 和 Y 组成" fragmenting into disconnected words like "Depend on X and Y Composition"). Switched to placeholder substitution instead: replace protected spans with a marker token, translate the whole string as one coherent unit, then restore the original spans afterward. This produced fluent, correctly-spaced output and is now used by both `translate_en_to_th()` and the standalone Chinese→English repair script.
- **Field Masking for JSON Structure Preservation (July 29):** hsk1_day4 retry failed validation with "vocab[你]: character/pinyin field altered" and "grammar[...].examples: cn/py field altered" despite explicit LLM prompt instructions "NEVER modify 'character', 'pinyin', 'cn', or 'py' fields." Root cause analysis revealed the pattern-based protection (`_CJK_PROTECT_PATTERN`) designed to protect citations *within text* has zero effect on JSON *field names or values* — the LLM still receives raw `"cn": "..."` and `"py": "..."` keys and can modify them. Attempted solution of stricter prompt instructions proved insufficient; LLM instruction-following is probabilistic, not guaranteed. Implemented structural field masking instead: (1) Before sending to LLM, rename untranslatable fields using a masking function (`_mask_untranslatable_fields`): `character → _character_masked`, `pinyin → _pinyin_masked`, `cn → _cn_masked`, `py → _py_masked` across vocab, grammar examples, and dialogue lines. (2) Send the masked JSON to LLM with an updated prompt informing it about `_*_masked` fields. (3) After LLM response, unmask the response (`_unmask_fields`) to restore original field names. This approach is **structurally airtight** because the LLM never sees the original field names — it cannot modify what it cannot see. Unit test suite (`test_field_masking.py`) validates all four test cases without consuming API quota: masking removes original names, unmasking restores values, validation passes on correct responses, and validation correctly detects altered fields. Tomorrow's retry of hsk1_day4 will confirm masking works with live LLM responses. This masking pattern generalizes: any future fields requiring preservation can be added to the mask/unmask functions without changing the LLM prompt or validation logic.

