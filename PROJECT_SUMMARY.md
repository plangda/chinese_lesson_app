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

**Data Schema (Core Entities):**
- `user_progress`: Tracks HSK level, scores, streaks, time spent, and completed lessons.
- `lessons`: Curricular structure mapping days to HSK levels.
- `vocab`, `grammar`, `dialogue_lines`, `quizzes`: Relational tables linking content securely to `lesson_id`.

---

## 3. Project Progress

**Overall Completion Status: ~80%** (Core Application is ~95% Complete)

**Milestones Achieved:**
- ⏳ **Phase 1: Database & Backend:** Schema setup, Turso cloud migration, API routes established (Complete). Full HSK 1 curriculum seeding is in progress (Day 1 seeded).
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
