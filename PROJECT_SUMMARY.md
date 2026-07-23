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

**Data Schema (Core Entities):**
- `user_progress`: Tracks HSK level, scores, streaks, time spent, and completed lessons.
- `lessons`: Curricular structure mapping days to HSK levels.
- `vocab`, `grammar`, `dialogue_lines`, `quizzes`: Relational tables linking content securely to `lesson_id`.

---

## 3. Project Progress

**Overall Completion Status: ~80%** (Core Application is ~95% Complete)

**Milestones Achieved:**
- ✅ **Phase 1: Database & Backend:** Schema setup, Turso cloud migration, API routes established, and full HSK 1 curriculum seeded. Standardized on the official 300-word HSK 1 vocabulary mapped across 38 semantic themes (Greetings, Family, Food, Time) with full Thai localization and strict schema validation. Backend architecture successfully refactored for massive query performance improvements.
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
