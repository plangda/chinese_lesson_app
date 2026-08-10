# 🧠 Vocab Garden Upgrade: Cognitive Science & Architecture Review

---

## Part 1 — Cognitive Science Critique

### What the Plan Gets Right

The plan's core instinct — **eliminating passive self-grading** — is the most important decision. Research from Roediger & Karpicke (2006) on the *Retrieval Practice Effect* confirms that the act of attempting to recall, regardless of success, produces stronger memory traces than re-reading or even repeated review. Replacing "Got It / Missed" buttons with a challenge that *forces* retrieval before scoring is a sound and well-supported move.

---

### 🔴 Gap 1: Challenge Taxonomy Doesn't Map to Encoding Depth

The three challenge types are currently selected **randomly**, but they don't actually measure the same cognitive process:

| Challenge | What It Tests | Encoding Depth |
|---|---|---|
| Tone Identification | Phonological recognition | ⬛ Shallow |
| Pinyin Input | Phonological production | ⬛ Shallow-Medium |
| Radical Matching | Orthographic analysis | 🟨 Medium |
| **Missing: Meaning Recall** | Semantic mapping | 🟩 Deep |
| **Missing: Translation in Context** | Pragmatic usage | 🟩 Very Deep |

**Problem:** A user can answer tone and pinyin challenges without knowing what the word *means*. They are training phonological recognition only — which is not sufficient for real-world language comprehension.

**Recommendation:** Implement **Levels of Processing** (Craik & Lockhart, 1972) as the challenge selection logic. The challenge type should be chosen based on the current mastery stage:

```
Stage 1 (Seed)       → Recognition: "Which of these is 喝 (hē)?" (pick the character)
Stage 2 (Sprout)     → Phonology: Tone picker or Pinyin input
Stage 3 (Flower)     → Meaning: Show character → pick the correct translation
Stage 4 (Gold Tree)  → Usage: Fill-in-the-blank with the word in a real sentence
```

This means a word doesn't reach Gold until the user has demonstrated **usage-level understanding**, not just pronunciation.

---

### 🔴 Gap 2: Interleaving vs. Blocked Practice

The current SRS sessions review a queue of due cards sequentially — one word at a time, fully resolved before the next. This is **blocked practice**, which feels productive but produces weaker long-term retention than **interleaved practice** (Kornell & Bjork, 2008).

**Recommendation: Introduce "Round-Robin" Session Mode.**

Instead of Card 1 → Answer → Card 2 → Answer, batch 5-10 cards at once:

```
Round 1: Show cards [A, B, C, D, E] with their Hanzi — user "primes" each
Round 2: Challenge for A
Round 3: Challenge for B
...then intermix: A-challenge variant → D → B-challenge variant
```

This creates **interference** that forces the brain to discriminate between similar words (e.g., 喜欢 vs. 欢迎) — exactly what learners of Chinese need because so many characters share radicals and phonemes.

---

### 🔴 Gap 3: Seed Fusion Has a Critical Pedagogical Assumption Problem

The Seed Fusion mechanic is fun, but the current logic is:

> "Merge two single-character plants you have sprouted to unlock a compound word."

This backwards. In real Chinese acquisition, a learner first encounters the **compound word** in context (`水果`) before they consciously decomposes it into components (`水` + `果`). Fusion-as-discovery (bottom-up) maps to the Krashen *Acquisition* pathway, while the plan builds it top-down (analysis → combination).

**Recommendation: Invert the Fusion mechanic to "Deconstruct-then-Fuse":**

1. When a user waters a compound word plant (e.g., 水果), the challenge can include a **Decomposition Mode**: *"Which two characters make up 水果?"*  
2. Correctly deconstructing the compound word *unlocks the seed cards* for each component (水 and 果) at Stage 1 in the garden.  
3. The Fusion Lab then becomes the place where you can *re-combine* components you already understand into new, undiscovered compound words — discovery-driven, generative gameplay.

This more closely mirrors the **"form-meaning mapping"** process of real language acquisition.

---

### 🟡 Gap 4: The Golden Tree Has No Active Maintenance

A word that reaches Golden Status (Stage 4, interval ≥ 30 days) is described as "un-wilting" — permanently safe. This is **cognitively incorrect**: even long-term memory traces decay without maintenance, and this is especially true for procedural/linguistic knowledge.

**Recommendation:** Golden Trees should trigger **monthly "Prove It" challenges**. These are harder, usage-level prompts (e.g., write a sentence using the word). Failing a "Prove It" demotes the tree to Stage 3 — a meaningful setback that signals re-study is needed. This models the **maintenance rehearsal vs. elaborative rehearsal** distinction.

---

### ✅ Strength: "Harvest to Sentence" Targets Production

This is cognitively the strongest feature in the entire plan. It targets **generative production** — the hardest and most durable form of learning (Wittrock, 1989). The drag-and-drop sentence building forces the learner to apply grammar knowledge in a contextual way that recognition-based challenges cannot replicate.

**Enhancement Suggestion:** Instead of drag-and-drop (which can be guessed through elimination), present a **free-sort challenge** with distractors — include 2 extra words that *don't belong* in the sentence. The user must both build the correct sentence *and* discard the noise. This activates inhibitory control, a higher-order executive function.

---

## Part 2 — Architectural Recommendations

### Current Architecture Shape

Right now, the app is a **monolithic single-page app** with all views, logic, and state inside a single large `app.js` (2,560 lines). The Vocab Garden is not a module — it's a set of scattered functions within this monolith that share a global `state` object.

Adding four complex game mechanics (challenges, fusion, harvest, sentence quest) to this monolith will make `app.js` reach 4,000+ lines, making it unmaintainable.

---

### 🏗️ Proposed Architecture: Feature Modules with a Shared Event Bus

The key insight is that **the Vocab Garden is a separate application** that happens to share data with the lesson player. Treat it as one.

```
app.js (Orchestrator, ~200 lines)
  └── modules/
       ├── garden.js         ← Garden state, plant renderer, visual decay
       ├── srs-engine.js     ← SM-2 algorithm, challenge selector, scoring
       ├── challenge.js      ← Renders Tone/Pinyin/Radical/Sentence challenges
       ├── seed-fusion.js    ← Fusion Lab logic and decompose mechanic
       ├── sentence-quest.js ← Harvest basket, drag-drop, validation
       └── event-bus.js      ← Shared pub/sub event system
```

**How modules communicate — without coupling:**

Instead of `state.srsIndex++; renderSrsCard()` being tightly coupled inline, modules emit events:

```javascript
// In challenge.js:
EventBus.emit('challenge:completed', { vocabId, grade, xpEarned });

// In garden.js:
EventBus.on('challenge:completed', ({ vocabId, grade }) => {
  garden.updatePlantStage(vocabId, grade);
  garden.render();
});

// In srs-engine.js:
EventBus.on('challenge:completed', ({ vocabId, grade }) => {
  srsEngine.updateInterval(vocabId, grade);
});
```

This means: **Challenge.js doesn't know garden.js exists** — and yet the garden updates in real-time. Each feature can be developed, tested, and modified without touching other parts.

---

### 🔑 Recommendation: The Garden as the App's Home Screen

Currently the Dashboard is the app's home. But the **Vocab Garden is actually the ideal Home Screen** for a retention-first learning app.

**Consider this User Journey:**
1. User opens app → sees their garden first. Thirsty plants (due reviews) are front and center.
2. A **"Today's Garden" counter** shows: 🌿 3 plants need watering today, ⭐ 2 plants ready to harvest.
3. User can start their day with just the garden (reinforcing retention) without ever going through a lesson.
4. The lesson player becomes the "New Seeds" tab — you go there to grow new plants.

This reframes the mental model: **the lesson is where you plant seeds, and the garden is where you grow them.** This creates a daily habit loop grounded in the cognitive science concept of **spaced daily practice beats massed practice**.

---

### 🔑 Recommendation: Challenge Difficulty Auto-Calibration (IRT Model)

Rather than just SM-2 intervals, add a lightweight **Item Response Theory (IRT)** calibration layer. Track per-word challenge type accuracy separately:

```sql
-- Extend user_vocab_srs:
tone_accuracy     REAL DEFAULT 0.5,  -- success rate for tone challenges
pinyin_accuracy   REAL DEFAULT 0.5,  -- success rate for pinyin
meaning_accuracy  REAL DEFAULT 0.5,  -- success rate for meaning
usage_accuracy    REAL DEFAULT 0.5   -- success rate for usage
```

The challenge selector then always picks the **weakest dimension** of that word for the user, not a random type. This is called **targeted retrieval practice** and produces significantly better learning outcomes than random challenge rotation.

---

### 🔑 Recommendation: Introduce "Confusion Pairs" as a Garden Mechanic

The biggest problem Chinese learners face is **character confusability** — similar-looking characters (买/卖, 己/已/巳, 喝/渴). The garden can surface these automatically:

- When a plant is watered, the system checks if there are **look-alike characters** in the user's garden (characters sharing the same radical structure).
- If so, a `⚠️ Confusion Pair` badge appears: *"You know 喝 (hē, drink). Did you know 渴 (kě, thirsty) looks similar?"*
- Tapping the badge shows a side-by-side disambiguation card.

This feature requires no new database tables — just a pre-computed **confusion matrix** JSON file mapping confusable characters. It's high educational value at very low implementation cost.

---

## Summary Table

| Issue | Impact | Recommendation |
|---|---|---|
| All challenge types equally weighted | Users learn tones but not meaning | Map challenge type to mastery stage |
| Blocked practice sessions | Weaker long-term retention | Introduce interleaved "round-robin" session mode |
| Seed Fusion is top-down | Mismatches real acquisition order | Invert to decompose-first, fuse-second |
| Golden Trees never wilt | Doesn't model real memory decay | Monthly "Prove It" challenge for Gold status |
| Sentence Quest can be guessed | Weak discriminative challenge | Add distractor words to sentence building |
| Monolithic `app.js` | Unmaintainable at scale | Modular feature files + shared EventBus |
| Dashboard as home | Retention not front-and-center | Make Vocab Garden the home/daily loop |
| Random challenge type | Generic retrieval practice | IRT-based weakness-targeted challenge picker |
| No confusability teaching | Major gap for Chinese learners | Confusion pairs system with shared radical matrix |
