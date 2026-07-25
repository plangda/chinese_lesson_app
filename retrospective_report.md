# Project Retrospective & Lessons Learned

As the HanPath team progresses through the development phases, this document serves as a living record of our lessons learned, preventing regression errors and streamlining future implementation.

## 1. Strict Schema Enforcement for Generative AI
**The Error:** The Python script (`generate_hsk_full.py`) failed to output Thai translations, English examples, and grammar arrays.
**The Cause:** We relied on a loose, outdated JSON template in the LLM prompt that did not perfectly mirror our frontend constraints or the `hsk-curriculum-generator` schema. 
**Prevention:** We must treat LLM prompts as strict API contracts. Every generation script must enforce structured JSON output and contain a validation step *before* inserting data. If a required field is missing, the script must throw an error and retry, rather than silently saving corrupted data.

## 2. Zero-Trust Frontend Architecture (Defensive Programming)
**The Error:** The dynamic quiz generator asked nonsensical questions like *"Does 请 mean '请'?"*
**The Cause:** The UI blindly trusted that the `meaning` field coming from the database was a valid, translated string.
**Prevention:** The frontend (`app.js`) must never assume data perfection. We must implement defensive guards across all interactive components. If data is malformed, the UI should gracefully skip the question or render a fallback.

## 3. Separate "Source of Truth" from "Generative Enhancement"
**The Error:** The system generated 509 words instead of the official 300 words for HSK 1.
**The Cause:** We allowed the generation script to dictate the curriculum scope instead of strictly binding it to an official source.
**Prevention:** We will adopt a strict pipeline: **Retrieve -> Verify -> Enhance**. We must first retrieve the official, static lists, verify them, and *only then* pass them to the LLM solely for generating contextual examples and dialogues.

## 4. Full-Stack Localization Audits
**The Error:** We localized the UI into Thai, but the backend AI scripts were still generating monolingual content.
**Prevention:** Localization is a full-stack requirement. Any script that touches the database or generates JSON must be audited against the localization requirements before being run in production.

## 5. The Regression Guardrail (Impact Analysis)
**The Error:** Grouping words by theme accidentally broke the AI prompt that generated translations.
**Prevention:** Before committing *any* bug fix or script refactor, developers must perform a mandatory **Impact Analysis**. Trace where the modified data flows and explicitly verify that adjacent functionalities are not broken.

## 6. Cross-Referencing Feature Manifests
**Prevention:** When altering core data structures, developers must cross-reference `critical_components.json` or the feature manifest to ensure that no core feature defined in the project scope is silently dropped during a refactor.

## 7. Mandatory Edge-Case Handling
**Prevention:** Code reviews will strictly enforce that all UI functions handle "empty data states" and "error conditions" using early returns (`if (!data) return;`) rather than attempting to parse undefined strings.

## 8. End-to-End Pipeline Verification ("Test Output != Live Data")
**The Error:** After implementing schema fixes and defensive UI checks, `localhost:3000` still showed no changes, and quizzes appeared empty or skipped.
**The Cause:**
- Data was generated into an offline `.jsonl` file, but the DB insertion script (`insert_generated_lessons.js`) was never executed to sync it into Turso.
- `insert_generated_lessons.js` contained an outdated schema mapping that ignored new Thai localization fields (`translation_th`, `example_translation_th`), causing silent data loss even if run.
- The UI's defensive checks gracefully skipped missing data, which accidentally obscured the fact that the live database was holding stale records.
**Prevention:**
1. **Full-Pipeline Execution:** Every feature involving data must be verified end-to-end: *Script Generator -> DB Import -> Turso Database -> API Endpoint -> UI Rendering*.
2. **Synchronized Import Scripts:** Whenever an AI JSON output schema is modified, all database import and mapping scripts must be updated in tandem.
3. **Visible Warning Flags:** Defensive UI code must log explicit warnings when fallback states are triggered, preventing missing data from being mistaken for a working UI.
## 9. Environment Sync & Deployment Verification
**The Error:** Features and bug fixes verified locally were not visible on the live production URL.
**The Cause:** Changes made locally were not committed and pushed to the remote repository, meaning the production host (Vercel) was still serving an outdated build.
**Prevention:** Always maintain a clear checklist showing the state of local vs. production builds. Ensure deployment commands or git pushes are part of the final verification step before handing a task back to the user.

## 10. Comprehensive Dependency Auditing During Cleanups
**The Error:** A critical JavaScript crash (`TypeError: Cannot set properties of undefined (setting 'hsk1')`) prevented lessons from loading locally.
**The Cause:** The removal of `lessons.js` left `app.js` to initialize the global `window.CHINESE_LESSONS` object on the fly, but the initialization missed defining the empty `lessons` object required by dynamic routes.
**Prevention:** When deleting fallback files or refactoring modules, perform a comprehensive code search (grep) to ensure all runtime dependencies of the removed file are fully accounted for and initialized in the replacement module.

## 11. Page-Level Language Toggle Audits
**The Error:** Toggling languages mid-lesson successfully translated vocabulary cards but left lesson titles and badges stuck in the original language.
**The Cause:** The language toggle only re-rendered individual active panes and did not trigger updates for static page-level titles which were only set once during the initial route load (`startLesson`).
**Prevention:** UI language switches must trigger a complete DOM translation pass, including both dynamic pane contents and static parent page headers.

## 12. Idempotent DB Seeding & Strict Constraints
**The Error:** Vocabulary words duplicated on the lesson cards.
**The Cause:** Seeding scripts were run multiple times on the database without unique constraints or cleanup steps (`DELETE`), resulting in double entries.
**Prevention:** Seeding scripts must be idempotent—either clearing the target tables before running or using `INSERT OR REPLACE` along with unique constraints in the schema.

## 13. State Cleanliness and Pipeline Restarts during Refactoring
**The Error:** After implementing the themes mapping system, HSK 1 Day 1 still contained alphabetical verbs (*爱*, *爱好*, *帮*) instead of greetings, and those verbs were permanently lost from the rest of the themed curriculum.
**The Cause:** The generator script saw `"hsk1_day1"` was already present in the cached `generated_lessons.jsonl` and skipped generating it. This kept the old alphabetical day 1, which had consumed verbs that subsequent days were supposed to use but had to generate without.
**Prevention:** When refactoring order-dependent or state-dependent pipelines, legacy caches and database records must be completely invalidated and wiped. Reusing stale caches blocks new pipeline paths and corrupts the resulting dataset.

## 14. Normalizing String Keys for Fuzzy Mapping (Variant Safety)
**The Error:** Core vocabulary words containing variant pipes (like *爸爸|爸*, *妈妈|妈*, *弟弟|弟*) did not match their respective themes in `hsk1_themes_final.json` (which searched for flat strings like `"爸爸"`), causing them to be dumped into the additional catch-all chunk instead of their family theme.
**The Cause:** The loop used a strict string equality check (`==`) to match theme keys against the database vocabulary character keys, causing variants to fail matches.
**Prevention:** When matching data across configurations, always normalize/sanitize the keys (e.g. stripping suffixes after `|` or removing extra spaces) before running the comparison.

## 15. Strict Logging for Mismatched Items in Generation Loops
**The Error:** Mismatched theme words fell through silently to the end-of-process catch-all chunks, leaving them undetected.
**Prevention:** Data generation loops must never fail silently. If a requested configuration key or word cannot be matched in the vocabulary list, the script must output a warning or throw an exception, making mismatch bugs immediately visible in the console.

## 16. Dataset-Wide Auditing
**The Error:** The fact that family members were in the "Additional Vocabulary" day was missed because we only checked one or two files.
**Prevention:** Verify data distribution across the entire output dataset rather than auditing individual items. Implement summary validation tests (e.g. counting total words mapped vs unmatched) before seeding database tables.
