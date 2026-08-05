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

## 17. Strict Verification of Source Compliance (Avoiding Unofficial Draft / Alphabetical Slicing Errors)
**The Error:** HSK 1 was implemented with a 300-word limit that was created by taking the draft 500-word alphabetical list and truncating it at row 300. This resulted in an HSK 1 list that was missing the letters T, W, X, Y, and Z, completely omitting core pronouns like `我` (wǒ - I) and daily phrases like `再见` (zàijiàn - goodbye).
**The Cause:** The development team trusted the file `hsk1_official_300.csv` as "official" without verifying its alphabetical completeness against the official guidelines published on CTI/MOE websites. In reality, the finalized HSK 3.0 (2026 version) specifies a curated list of 300 words for Level 1 and 200 words for Level 2, both spanning the entire alphabet A-Z.
**Prevention:** Always verify that vocabulary source files are compiled from the finalized, official syllabus releases (such as the 2026 CTI/MOE updates) and perform a sanity check on alphabet-wide coverage (A-Z) before initiating any curriculum generation. Never assume a third-party repository's draft file is the final compliance standard.

## 18. Redundancy between Generation Strings and UI Renderers (Title Prefixes)
**The Error:** Lesson titles rendered on the dashboard displayed with duplicate prefixes (e.g., `"Day 1: Day 1: Essential Greetings & Politeness in Chinese"`).
**The Cause:** The frontend dynamically prepends `"Day X: "` to any lesson title it displays based on the lesson's index number. However, the newly introduced AI clustering script generated themes that *already* had `"Day X: "` hardcoded in their title strings, resulting in duplication.
**Prevention:** Always check if the frontend template dynamically inserts UI prefixes (like *"Day X:"* or *"Section Y:"*) before formatting strings in data configurations. Keep database strings and content definitions clean of formatting prefixes, letting the UI handle visual presentation.

## 19. Validate Necessity Before Spending Live API Credits (Field Masking Round-Trip Failure)
**The Error:** Field masking (renaming `character`/`pinyin`/`cn`/`py` to `_*_masked` before sending a lesson to the LLM, then unmasking and byte-comparing the response) was implemented, unit-tested, committed, and then failed live against the real Gemini API with the identical error it was built to fix: `vocab[你]: character/pinyin field altered`. This burned real API quota and session budget confirming a fix that didn't work.
**The Cause:** Two compounding mistakes:
1. **The check was unnecessary in the first place.** `_apply_translated_fields()`, the function that actually merges the LLM's response back into the lesson, never reads `character`/`pinyin`/`cn`/`py` from the translated object — it only copies the new `_th`/`th` fields. Nobody traced this data flow before building and testing the masking system, so real API calls were spent validating a round-trip that downstream code didn't even consume.
2. **The masking approach also just relocated the same risk.** Renaming a field to an unusual synthetic name (`_character_masked`) and asking the LLM to echo it back perfectly is not more reliable than asking it to leave a normal field (`character`) alone — arguably less reliable, since the model has far less training exposure to that exact synthetic name. Masking papered over an LLM-instruction-following problem rather than eliminating it.
3. **The unit test gave false confidence.** `test_field_masking.py` only fed the mask/unmask logic a hand-written, perfectly-behaved fake LLM response, so "all tests pass" never actually exercised the real failure mode (an imperfect LLM response) before quota was spent on a live test.
**Prevention:**
1. **Trace before you test live.** Before spending any API/model credit to validate a fix, grep/read the downstream consumer of the field or value in question. If nothing reads it back, there is nothing to protect and no live test is needed at all.
2. **Prefer "don't send it" over "send it and check it comes back unchanged."** For any field that must never be altered by an LLM and isn't needed for translation context, strip it from the payload before the call instead of masking-and-comparing. A field that was never sent cannot be corrupted or mis-echoed, and needs no validation step at all.
3. **Unit tests for LLM-adjacent logic must include an adversarial/imperfect fixture**, not just a hand-crafted ideal response, or the test will pass while the real integration still fails.
4. **Ask before running anything that spends live API quota or significant model credits**, especially to "confirm" a fix — confirm it's structurally necessary first via a free code read.

## 20. Defensive Localization & Zero Unlocalized Property Literals
**The Error:** Toggling languages to Thai left dynamic Pinyin grammar rule titles stuck in English, while missing `_th` database columns caused silent fallbacks to English text.
**The Cause:**
1. Dynamic UI renderers in JavaScript accessed object properties directly (e.g. `g.title`) rather than calling localized getter helpers (`ld(g, 'title')`).
2. Seeding scripts inserted records without verifying that both `_en` and `_th` fields were populated, triggering automatic fallback to English via `ld()`.
**Prevention:**
1. **Zero Raw Literals in JS Renderers:** UI renderer functions must never access literal property names (e.g. `item.title`) or hardcode text strings. Dynamic content must use `ld(item, 'field')` and static UI strings must use `t('key')` or `data-i18n`.
2. **DB Seed Parity Validation:** Seeding scripts must include automated validation steps to ensure `_en` and `_th` fields are populated before committing rows to the database.

## 22. Open-Access Self-Hosted Audio vs. Third-Party Commercial CDN Dependencies
**The Error:** Relying on third-party commercial audio hosts (like Purple Culture or external web services) caused broken audio (404 errors) for single-vowel tone variations (`a2.mp3`, `a3.mp3`, `a4.mp3`), while exposing the app to commercial paywalls and hotlinking blocks.
**The Cause:** External commercial services modify endpoint structures or return HTTP 404s for non-standard Pinyin tone parameters, forcing client audio requests to fall back to speech synthesis.
**Prevention:** Self-host core Pinyin audio assets directly inside the application repository (`public/audio/pinyin/a1.mp3` - `a4.mp3`). Serving open-access, Creative Commons audio files locally guarantees < 5ms response times, 0% 404 failovers, offline functionality, and complete freedom from third-party commercial dependencies.

## 23. Hanzi Character Fallback vs. ASCII Phonetic Reading in Speech Synthesis
**The Error:** Fallback speech synthesis pronounced single vowel tone variations (`á`, `ǎ`, `à`) identically in Tone 1 (`ā`), and read consonant group ASCII strings (`zhi1`, `chi1`) in an English voice ("zhi-one").
**The Cause:**
1. Single Chinese Hanzi characters (like `啊`) passed to `SpeechSynthesisUtterance('啊')` are read by default in their primary dictionary tone (Tone 1 `ā`), ignoring intended tone numbers (2, 3, 4).
2. ASCII strings containing digits (e.g. `zhi1`) are parsed as English alphanumeric words by OS speech engines.
**Prevention:**
1. Maintain an explicit mapping dictionary (`pinyinToHanziMap`) that resolves ASCII Pinyin strings to distinct Hanzi characters with corresponding native tones (`a1` ➔ `啊`, `zhi1` ➔ `知`, `chi1` ➔ `吃`, `ri4` ➔ `日`).
2. Pass actual Chinese Hanzi characters to `speakText(hanziText)` during fallback, ensuring browser speech engines activate native Mandarin Chinese pronunciation instead of English letter spelling.

## 24. Client-Side In-Memory State Caching for Zero-Latency Localization
**The Error:** Toggling languages between English and Thai created a perceptible 200ms–500ms network lag before the UI text updated.
**The Cause:** The language toggle button re-executed asynchronous HTTP fetch requests (`fetch('/api/lessons/hsk1_day0')`) on every button click to retrieve localized lesson records from the cloud database.
**Prevention:** Cache reference curriculum payloads in application memory (`state.pinyinLessonData`) on initial page load. Subsequent language toggles re-render the UI synchronously from memory in **0 milliseconds**, providing an instantaneous UI transition.



