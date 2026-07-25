# HanPath Project Summary
**Date:** July 17, 2026

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
- **Hybrid API Translation Pipeline:** 
  - *Upfront English Meaning Lookup:* Integrates `get_youdao_meaning(word)` to fetch clean English definitions from the Youdao Suggestion API on-demand before construction of the Gemini payload, resolving placeholder bugs.
  - *Post-Generation Thai Translation:* Integrates `add_thai_translations_to_lesson(lesson_data)` to post-process English text fields (lesson title, grammar titles, grammar explanations, example sentences, and practice prompts) using a rate-limit-free Google Translate web API. This saves **~25% in output tokens** and speeds up generation.
- **Automatic Self-Healing Parser:** At start-up, the script parses `generated_lessons.jsonl` using a robust checker (`is_lesson_complete`) that scans for JSON schema completeness (ensuring presence of all core arrays, dialogue lines, and localized translation keys). Any incomplete or corrupt records are automatically purged, and the clean, sorted records are rewritten back to the file.
- **Seamless Incremental Resume:** Incorporates globally unique lesson IDs to query local `.jsonl` files and live database caches. Already generated days are skipped instantly, protecting against redundant API calls.
- **Throttling & API Budgeting:** Employs a 6-second sleep throttle to respect Gemini's 15 RPM limit and handles 429 rate limits gracefully with an automated sleep-and-retry strategy. It supports a `--limit` argument to generate a specific budget of lessons per run to prevent exceeding daily free tier budgets.

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

**Overall Completion Status: ~83%** (Core Application is ~95% Complete)

**Milestones Achieved:**
- ✅ **Phase 1: Database & Backend:** Schema setup, Turso cloud migration, API routes, and **Full HSK 1 curriculum seeding** are completed (39 days/300 words generated and seeded). HSK 2 & 3 content generation is in progress.
- ✅ **Phase 2: Diagnostic System:** Global placement tests and per-lesson gating pre-tests are fully functional.
- ✅ **Phase 3: Core Learning Engine:** Vocab tracing, Grammar interactions, Dialogue UI, Pinyin Matrix chart, and Quizzes are fully operational.
- ✅ **Phase 4: Consistency & Retention:** Streak tracking, progress syncing (smart merge between local/server), and daily reminders implemented.
- ✅ **Phase 5: UX & Localization:** Kid-friendly styling applied, inline styles refactored to CSS utility classes. Complete Thai translation injected across both the frontend UI and Turso database records.

**Pending / Next Steps:**
- ⏳ **HSK 2 & 3 Seeding:** Content generation and database seeding for the intermediate curriculums.
- ⏳ **HSK 4, 5 & 6 Seeding:** Advanced content generation and database seeding for higher proficiency levels.
- ⏳ **Phase 6: Future Enhancements:**
  - *Multi-Character Writing Pad:* Expanding the `hanzi-writer` integration to support writing multiple characters sequentially for vocabularies longer than one character.
  - *Full HSK Mock Exams:* Adding comprehensive end-of-level exams that accurately simulate the latest official HSK exam formats (2026 version) for formal test preparation.
  - *Contextual LLM Translation Pipeline:* Utilizing a free-tier LLM (e.g., Gemini) to generate high-quality, context-aware Thai translations for future curriculum seeding, avoiding awkward word-by-word literal translations.
  - *Pronunciation Assessment:* Integrating a speech-to-text API (e.g., Web Speech API or external service) to score user pronunciation accuracy.
  - *DevOps & Custom Domains:* Docker containerization, formal production deployment on Vercel, and configuration of a clean, branded custom domain (avoiding phishing-like URLs).
  - *Automated Testing:* Implementing a test suite (Jest/Supertest) to guard against regressions in the API and UI state.

---

## 4. Key Discussions & Decisions Log

- **Interactive Confirmations Guardrail (Reverted TTY Check):** Decided to completely block force overwrites (`--force`) in non-interactive tasks. Reverted the seeder's automatic override patch to ensure force database deletes cannot run silently in background task runners, and locked this constraint locally in `.agents/AGENTS.md`.
- **CEDICT Parsing & Dictionary Lookup:** Moved vocabulary English definitions out of Gemini's scope by querying the Youdao API locally. This prevents Chinese characters from ending up in the English meaning fields.
- **Post-Generation Translation Pipeline:** Moved long grammar explanations and example translations to Google Translate (via raw HTTP web calls post-generation) rather than prompting Gemini. This reduces Gemini output token count by ~25%, shortens response latency, and guarantees complete, natural Thai translation output.
- **Language Suffix Suffixing vs Unified Columns:** Unified character and Pinyin columns while splitting translation meanings (`meaning_en` / `meaning_th`) to avoid corruption, maintaining mixed-language compatibility in the database.

