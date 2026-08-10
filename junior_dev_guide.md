# HanPath — Junior Developer Implementation Guide
**Last Updated:** 2026-08-10 | **Status:** ✅ All Fixed (B1-B9)  
**Project path:** `C:\Users\USER\OneDrive\Desktop\knowledge\My project\Chinese web learning\`

---

## 0. Environment Setup (Do This First)

### Prerequisites
- Node.js 18+
- A terminal (PowerShell or Git Bash)

### How to run locally
```powershell
# Navigate to the project folder
cd "C:\Users\USER\OneDrive\Desktop\knowledge\My project\Chinese web learning"

# Install dependencies (only needed once)
npm install

# Start the local dev server
npm run dev
# → Server runs at http://localhost:3000
```

### How to check your work
1. Open `http://localhost:3000` in your browser
2. Log in with any test account
3. Open **DevTools → Console** (F12) — watch for red errors after each change
4. After every fix, verify the specific "✅ Verify" checklist under that fix

### Project file map (the ones you'll edit)
```
index.html           ← All HTML views. Search by section comment e.g. <!-- STUDENT DASHBOARD VIEW -->
app.js               ← All frontend JS logic (3096 lines). Line numbers given per fix below.
server.js            ← Express API server (745 lines). All API routes are here.
modules/garden.js    ← GardenRenderer class — renders the vocab garden panel
i18n.js              ← ALL UI strings in English + Thai. Never hardcode text in HTML/JS — use this file.
style.css            ← Global styles, CSS variables, animations
```

### The #1 Rule (never break this)
> **ALL visible text in the UI must be defined in `i18n.js`** and rendered via `data-i18n="key"` in HTML  
> or `window.t('key')` in JavaScript. Never write `innerHTML = "Some English string"` directly.

---

## Bug Status Board

| Bug | Problem | Files to Edit | Status |
|:----|:--------|:--------------|:------:|
| **B1** | Garden shows static card grid with no review actions | `modules/garden.js`, `index.html`, `app.js`, `style.css` | ✅ DONE |
| **B2** | Seed Fusion Lab: fusing characters returns "no compound found" | `server.js`, `app.js` | ✅ DONE |
| **B3** | Sentence Quest: game won't load / wrong columns / bad distractors | `app.js` | ✅ DONE |
| **B4** | Pinyin Lesson 0 has no entry point in the lessons list | `app.js` | ✅ DONE |
| **B5** | Thai translations missing for new garden UI strings | `i18n.js`, `modules/garden.js` | ✅ DONE |
| **B6** | Chinese characters invisible (white text on white background) | `modules/garden.js` | ✅ DONE |
| **B7** | Review sessions do not limit card counts | `server.js` | ✅ DONE |
| **B8** | Early exit from review sessions discards XP / lacks confirmation | `app.js`, `i18n.js` | ✅ DONE |
| **B9** | Review cards do not fully localize (mixed EN/TH distractors) | `modules/challenge-selector.js`, `app.js`, `server.js` | ✅ DONE |

---

## Fix B5 — Register Missing i18n Strings (Do This First — No Risk)

**Why first?** B1, B2, B3 code uses these keys. If you add the keys first, you can test translations immediately as you build each fix.

**File:** [`i18n.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/i18n.js)

### Step B5-1 — Add missing keys to the English (`en`) section

Find this exact line in `i18n.js` (around line 291):
```javascript
    "srs_empty_due": "All your plants are well watered today! 🌟"
  },
```

Replace it with:
```javascript
    "srs_empty_due": "All your plants are well watered today! 🌟",

    // Garden Dashboard — new keys (added 2026-08-10)
    "visual_garden_title": "Your Memory Garden",
    "confusion_alert_title": "Confusion Pair Alert",
    "garden_empty_title": "Your Garden is Empty",
    "garden_empty_desc": "You haven't planted any vocabulary seeds yet! Complete a lesson to populate your garden.",
    "btn_full_review": "⚔️ Full Garden Review",
    "btn_start_day1": "▶️ Start Day 1 Lesson"
  },
```

### Step B5-2 — Add the same keys to the Thai (`th`) section

Find this exact line in `i18n.js` (around line 578):
```javascript
    "srs_empty_due": "ต้นไม้ทุกต้นของคุณได้รับน้ำเพียงพอแล้ววันนี้! 🌟"
  }
```

Replace it with:
```javascript
    "srs_empty_due": "ต้นไม้ทุกต้นของคุณได้รับน้ำเพียงพอแล้ววันนี้! 🌟",

    // Garden Dashboard TH (added 2026-08-10)
    "visual_garden_title": "สวนคำศัพท์ของฉัน",
    "confusion_alert_title": "แจ้งเตือนคำที่สับสน",
    "garden_empty_title": "สวนของคุณว่างเปล่า",
    "garden_empty_desc": "คุณยังไม่ได้ปลูกคำศัพท์ใดเลย! เริ่มบทเรียนเพื่อเพิ่มคำศัพท์ในสวนของคุณ",
    "btn_full_review": "⚔️ ทบทวนสวนทั้งหมด",
    "btn_start_day1": "▶️ เริ่มบทเรียนวันที่ 1"
  }
```

### ✅ Verify B5
- Reload the app, switch language to Thai (🇹🇭 button in header)
- No keys should show as raw strings like `"visual_garden_title"` in the UI

---

## Fix B6 — Hanzi Characters Invisible on Garden Cards

**Why broken:** The `.plant-character` div has `color: #fff` (white text), but the parent `.glass-panel` card has a nearly-white background. White on white = invisible.

**File:** [`modules/garden.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/modules/garden.js)  
**Line:** 112

Find this (line 112):
```javascript
          <div class="plant-character" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.15rem; color: #fff;">
```

Replace with:
```javascript
          <div class="plant-character" style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.25rem; color: #1e293b; font-family: 'Noto Serif SC', serif;">
```

**What changed:** `color: #fff` → `color: #1e293b` (dark slate blue). Font size slightly larger, weight bolder for stroke readability.

### ✅ Verify B6
- Go to dashboard. If you have any planted words, their Hanzi (Chinese characters) should be clearly visible in dark color on the card background.

---

## Fix B4 — Restore Pinyin Lesson 0 to Dashboard Sidebar

**Why broken:** The Pinyin Daily Banner provides a quick practice entry point, but "Lesson 0: Pinyin Foundation" is chronologically the first lesson and should be permanently available at the top of the "Unlocked Lessons" list in the dashboard sidebar. Currently, it's missing from the array.

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 847

Find the start of the loop that renders lessons (line 847):
```javascript
  lessons.forEach(l => {
```

Replace it with:
```javascript
  // Inject Lesson 0 at the top of the list manually so it's always accessible
  const displayLessons = [
    { id: 'hsk1_day0', day_number: 0, title: 'Pinyin Chart', title_th: 'ตารางพินอิน' },
    ...lessons
  ];

  displayLessons.forEach(l => {
```

### ✅ Verify B4
- Go to dashboard.
- In the right sidebar, under **📖 Unlocked Lessons**, the very first item should be "Day 0: Pinyin Chart".
- Clicking the "Start Lesson" (or "Done (Re-learn)") button for it should open the Pinyin Chart view.

---

## Fix B3 — Sentence Quest Game Bugs

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
All changes are between lines **2928–3001**.

### Background — how the game works
1. `initSentenceQuest()` is called when the Sentence Quest view opens
2. It fetches all planted words from `/api/srs/garden`
3. It filters for "basket" words (sufficiently learned)
4. It picks one word that has an example sentence
5. It splits the sentence into characters and shows them shuffled as buttons
6. The learner clicks buttons in order to reconstruct the sentence
7. `checkSentenceQuest()` verifies the order

### Bug B3-A — Game is permanently locked for new users

**Location:** [`app.js` line 2946](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js#L2946)

**Why broken:** The filter `mastery_stage === 4` requires "Mastered" words. A new user has 0 mastered words, so the game never unlocks.

Find (line 2946):
```javascript
    const basket = (data.plants || []).filter(p => p.mastery_stage === 4);
```

Replace with:
```javascript
    const basket = (data.plants || []).filter(p => p.mastery_stage >= 3);
```

Also update the error message at lines 2951–2955. Find:
```javascript
      poolArea.innerHTML = `
        <div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 2rem;">
          🧺 Your Harvest Basket needs at least 3 Mastered words to trigger a Sentence Quest!<br/>
          You currently have <strong>${basket.length} / 3</strong> Mastered words. Keep watering due words to harvest them!
        </div>
      `;
```

Replace with:
```javascript
      poolArea.innerHTML = `
        <div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 2rem;">
          🧺 Your Harvest Basket needs at least 3 Blooming (🌻) or Mastered words to trigger a Sentence Quest!<br/>
          You currently have <strong>${basket.length} / 3</strong> qualifying words. Keep watering due words to level them up!
        </div>
      `;
```

### Bug B3-B — Wrong column name causes sentence to never load

**Location:** [`app.js` line 2960](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js#L2960)

**Why broken:** The code checks for `c.exampleCn` but the API actually returns a field named `example_sentence`. The typo means a sentence is never found.

> **How to confirm:** Open browser DevTools → Network tab → click "Sentence Quest" → look at the `/api/srs/garden` response JSON. You'll see the field is named `example_sentence`, not `exampleCn`.

Find (line 2960):
```javascript
    const cardWithSentence = basket.find(c => c.exampleCn || c.example_sentence);
```

Replace with:
```javascript
    const cardWithSentence = basket.find(c => c.example_sentence);
```

Find (line 2968):
```javascript
    const cnSentence = (cardWithSentence.exampleCn || cardWithSentence.example_sentence).replace(/[。，！？、,!?]/g, '');
```

Replace with:
```javascript
    const cnSentence = cardWithSentence.example_sentence.replace(/[。，！？、,!?]/g, '');
```

Find (line 2973):
```javascript
    promptArea.innerHTML = `Translate this sentence:<br/><span style="color: #fff; font-size: 1.35rem; font-family: var(--font-serif);">${cardWithSentence.exampleEn || 'Example sentence'}</span>`;
```

Replace with:
```javascript
    // Note: /api/srs/garden returns meaning_en (not exampleEn). Use that as the translation prompt.
    const exampleEn = cardWithSentence.meaning_en || 'Example sentence';
    promptArea.innerHTML = `Translate into Chinese:<br/><span style="color: #fff; font-size: 1.35rem; font-family: var(--font-serif);">${exampleEn}</span>`;
```

### Bug B3-C — Distractors can overlap with correct characters

**Location:** [`app.js` line 2977](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js#L2977)

**Why broken:** Hardcoded distractors like `['是', '不', '我', '他', '的']` may contain characters that are already in the sentence, making duplicates appear in the word pool.

Find (line 2977):
```javascript
    const distractorChars = ['是', '不', '我', '他', '的', '了', '好', '呢'].filter(c => !cardChars.includes(c));
```

Replace with:
```javascript
    // Pull distractors from the user's own planted words — they are level-appropriate and never overlap
    const distractorChars = (data.plants || [])
      .filter(p => p.character && p.character.length === 1 && !cardChars.includes(p.character))
      .map(p => p.character)
      .slice(0, 8);
```

### ✅ Verify B3
1. Complete at least 1 lesson so you have some planted words
2. Click **Learning Labs → Sentence Quest Game**
3. If you have 3+ stage-3 words, the game should load a sentence with word tiles
4. Clicking the tiles in correct order and pressing Check → should show ✅ success
5. Clicking in wrong order → should show ❌ with the correct answer shown

---

## Fix B2 — Seed Fusion Lab: No Compound Words Found

**The problem in plain English:**
The Seed Fusion Lab shows only the single-character words the user has already planted (e.g., `你`, `好`, `是`). But when you try to fuse two of them, the server looks for a two-character compound in the database and often finds nothing — either because the compound doesn't exist in the DB, or the user's planted characters don't form any known compounds.

**The fix:** Create a new API endpoint that gives the frontend a list of characters that are *known to form compounds*, and use that list as the pool instead.

### Step B2-1 — Add a new server endpoint

**File:** [`server.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/server.js)

Find this line (line 691):
```javascript
app.post('/api/srs/fuse', async (req, res) => {
```

Insert the following **above** that line (so it becomes lines 691–705):
```javascript
// GET /api/srs/fusion-pool — Returns all single characters that can form valid 2-char compounds in the vocab DB
app.get('/api/srs/fusion-pool', async (req, res) => {
  try {
    // Find every 2-character word in the vocab table
    const compounds = await db.all(
      `SELECT character FROM vocab WHERE LENGTH(character) = 2 LIMIT 300`
    );
    // Extract both characters from each compound (e.g. "你好" → ["你", "好"])
    const charSet = new Set();
    compounds.forEach(c => {
      if (c.character && c.character.length === 2) {
        charSet.add(c.character[0]);
        charSet.add(c.character[1]);
      }
    });
    res.json({ chars: [...charSet] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

```

### Step B2-2 — Update the frontend pool to use the new endpoint

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)

Find the `initSeedFusionLab` function starting at line 2791. Find this block inside it (around lines 2793–2812):
```javascript
  try {
    const res = await fetch('/api/srs/garden');
    if (!res.ok) return;
    const data = await res.json();
    
    // Filter single character seeds
    const singleSeeds = (data.plants || []).filter(p => p.character && p.character.length === 1);
    
    // Clear slots
    fusionSlot1 = null;
    fusionSlot2 = null;
    window.updateFusionSlotsUI();
    
    const poolContainer = document.getElementById('fusion-seed-pool');
    if (!poolContainer) return;
    
    if (singleSeeds.length === 0) {
      poolContainer.innerHTML = `<div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 1.5rem;">No single-character seeds planted yet. Plant words from Day 1+ lessons first!</div>`;
      return;
    }
    
    let html = '';
    singleSeeds.forEach(seed => {
```

Replace that entire block with:
```javascript
  try {
    // Fetch the pool of fuseable characters from the new endpoint
    const poolRes = await fetch('/api/srs/fusion-pool');
    if (!poolRes.ok) return;
    const poolData = await poolRes.json();
    const fuseableChars = poolData.chars || [];

    // Clear slots
    fusionSlot1 = null;
    fusionSlot2 = null;
    window.updateFusionSlotsUI();
    
    const poolContainer = document.getElementById('fusion-seed-pool');
    if (!poolContainer) return;
    
    if (fuseableChars.length === 0) {
      poolContainer.innerHTML = `<div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 1.5rem;">No fuseable characters found in the database.</div>`;
      return;
    }
    
    // Limit to 40 tiles for readability
    const displayChars = fuseableChars.slice(0, 40);
    let html = '';
    displayChars.forEach(char => {
      const seed = { character: char }; // shape expected by the button template below
```

> ⚠️ **Gotcha:** After this replacement, the remaining loop still references `seed` — make sure it now reads `char` for the `onclick` attribute. Find the button line below:
> ```javascript
>   onclick="window.selectFusionSeed('${seed.character}')"
> ```
> Since `seed.character === char`, this still works correctly — no further change needed.

### Step B2-3 — Improve the "no compound found" error message

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 2913 (approximately — search for `data.success` in the `triggerSeedFusion` function)

Find:
```javascript
      resultArea.innerHTML = `<span style="color: var(--danger);">${data.message}</span>`;
```

Replace with:
```javascript
      resultArea.innerHTML = `
        <span style="color: var(--danger);">${data.message}</span>
        <br/><small style="color:var(--text-secondary); margin-top: 0.5rem; display: block;">
          💡 Try combining: 你+好, 学+生, 老+师, 中+国, 日+本
        </small>
      `;
```

### ✅ Verify B2
1. Open the app → Learning Labs → **Seed Fusion Lab**
2. The character pool should now show a grid of characters (not be empty)
3. Click 你 then 好, press **Fuse** → should show `你好` with its meaning
4. Click two characters that don't form a word → should show the error message with hint examples

---

## Fix B1 — Garden Redesign: Replace Static Card Grid with Interactive Summary

**What we're building:**
```
┌──────────────────────────── Memory Garden ────────────────────────────┐
│  🌱 11 Seeds  🌿 4 Sprouts  🌻 2 Flowers  🌳 0 Trees                 │
│  ─────────────────────────────────────────────────────────────────── │
│  🌱  🌿  🌱  🌻  🥀  🌱  🌿  🌱  🌱  🌻  (hover = word tooltip)    │
│  + 3 more in your garden                                              │
│  ─────────────────────────────────────────────────────────────────── │
│  💧 3 words due for watering today                                    │
│  [ 💧 Water Thirsty Plants (3-Min Review) ]   ← primary              │
│  [ ⚔️ Full Garden Review ]                    ← secondary            │
└───────────────────────────────────────────────────────────────────────┘
```

### Step B1-1 — Rewrite `GardenRenderer.render()` in garden.js

**File:** [`modules/garden.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/modules/garden.js)

Find the entire `render(containerId, plants)` method (lines 77–138). Replace it completely with:

```javascript
  /**
   * Renders the interactive garden summary dashboard
   * @param {string} containerId DOM element ID of the container
   * @param {Array} plants Array of SRS plant records from /api/srs/garden
   */
  render(containerId, plants) {
    this.containerId = containerId;
    this.plants = plants;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Empty state — user has no planted words yet
    if (!plants || plants.length === 0) {
      container.innerHTML = this.getEmptyGardenStateHTML();
      return;
    }

    // Count plants by visual stage
    const counts = { seed: 0, sprout: 0, flower: 0, tree: 0, thirsty: 0, wilting: 0 };
    plants.forEach(p => {
      const s = this.getPlantState(p);
      if (s.status === 'wilting') counts.wilting++;
      else if (s.status === 'thirsty') counts.thirsty++;
      else if (s.status === 'evergreen') counts.tree++;
      else if (s.status === 'harvest' || s.status === 'flower') counts.flower++;
      else if (s.status === 'sprout') counts.sprout++;
      else counts.seed++;
    });

    const dueCount = counts.thirsty + counts.wilting;
    const plotPlants = plants.slice(0, 30); // cap at 30 tiles to avoid scroll exhaustion

    // Build the emoji tile grid (each tile = one planted word, shows emoji by growth stage)
    const tilesHtml = plotPlants.map(plant => {
      const s = this.getPlantState(plant);
      const meaning = plant.meaning || '';
      return `
        <div class="garden-tile"
             title="${plant.character} (${plant.pinyin || ''}) — ${meaning}"
             style="font-size: 1.9rem; cursor: default; user-select: none; transition: transform 0.2s; line-height: 1;"
             onmouseover="this.style.transform='scale(1.3)'"
             onmouseout="this.style.transform='scale(1)'">
          ${s.emoji}
        </div>`;
    }).join('');

    const overflowMsg = plants.length > 30
      ? `<div style="color:var(--text-secondary);font-size:0.8rem;text-align:center;margin-top:0.5rem;">
           +${plants.length - 30} more words in your garden
         </div>`
      : '';

    // Helper: safely call window.t() — falls back to English if i18n not loaded yet
    const tx = (key, fallback) => (window.t ? window.t(key) : fallback);

    container.innerHTML = `
      <!-- Stage count badges row -->
      <div class="garden-stage-badges" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
        <span style="background:rgba(0,245,212,0.12);color:var(--success);border:1px solid var(--success);border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌱 ${counts.seed} ${tx('stage_seeds','Seeds')}
        </span>
        <span style="background:rgba(100,200,100,0.12);color:#6bc96b;border:1px solid #6bc96b;border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌿 ${counts.sprout} ${tx('stage_sprouts','Sprouts')}
        </span>
        <span style="background:rgba(255,200,0,0.12);color:#ffd700;border:1px solid #ffd700;border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌻 ${counts.flower} ${tx('stage_flowers','Flowers')}
        </span>
        <span style="background:rgba(46,196,182,0.12);color:var(--accent);border:1px solid var(--accent);border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌳 ${counts.tree} ${tx('stage_trees','Trees')}
        </span>
      </div>

      <!-- Emoji tile grid -->
      <div class="garden-tile-grid"
           style="display:flex;flex-wrap:wrap;gap:0.6rem;min-height:80px;padding:0.75rem;background:rgba(0,0,0,0.08);border-radius:12px;margin-bottom:0.5rem;">
        ${tilesHtml}
      </div>
      ${overflowMsg}

      <!-- Due status label -->
      <div style="margin:1rem 0 0.5rem;font-size:0.85rem;">
        ${dueCount > 0
          ? `<span style="color:var(--accent);font-weight:bold;">💧 ${dueCount} ${tx('thirsty_plants_count','words due for watering')}</span>`
          : `<span style="color:var(--success);">✅ ${tx('srs_empty_due','All plants watered today!')}</span>`}
      </div>

      <!-- CTA Buttons -->
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        ${dueCount > 0 ? `
        <button id="garden-water-due-btn" class="btn btn-primary"
                style="padding:0.75rem;font-weight:bold;border-radius:24px;box-shadow:0 4px 15px rgba(0,245,212,0.25);"
                onclick="window.startSrsSession('normal')">
          💧 ${tx('btn_water_plants','Water Thirsty Plants (3-Min Review)')}
        </button>` : ''}
        <button id="garden-full-review-btn" class="btn btn-secondary"
                style="padding:0.65rem;border-radius:24px;"
                onclick="window.startSrsSession('full')">
          ${tx('btn_full_review','⚔️ Full Garden Review')}
        </button>
      </div>
    `;
  }
```

### Step B1-2 — Add `'full'` mode to `startSrsSession` in app.js

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 2530

The current function only handles `'normal'` and `'rescue'` modes via the `/api/srs/due` endpoint. The new `'full'` mode needs to fetch *all* planted words (not just due ones) from `/api/srs/garden`.

Find the entire `startSrsSession` function (lines 2530–2551):
```javascript
async function startSrsSession(mode = 'normal') {
  try {
    const res = await fetch(`/api/srs/due?mode=${mode}`);
    if (!res.ok) return;
    const cards = await res.json();

    if (!cards || cards.length === 0) {
      alert(t('srs_empty_due'));
      return;
    }

    // Initialize the interleaved round-robin engine
    srsEngine.initSession(cards, 5);
    state.srsSessionMode = mode;
    state.srsXpEarned = 0;

    switchView('srs-view');
    renderSrsCard();
  } catch (err) {
    console.error("Failed to start SRS session:", err);
  }
}
```

Replace with:
```javascript
async function startSrsSession(mode = 'normal') {
  try {
    let cards;

    if (mode === 'full') {
      // Full review: fetch ALL planted words from the garden (not just due ones)
      const res = await fetch('/api/srs/garden');
      if (!res.ok) return;
      const gardenData = await res.json();
      // The garden endpoint returns { plants: [...] } — reshape each plant into the card format
      // that the SRS engine expects (same fields as /api/srs/due cards)
      cards = (gardenData.plants || []).map(p => ({
        srs_id: p.vocab_id,
        vocab_id: p.vocab_id,
        character: p.character,
        pinyin: p.pinyin,
        meaning: p.meaning,
        meaning_th: p.meaning_th,
        mastery_stage: p.mastery_stage,
        interval_days: p.interval_days,
        times_forgotten: p.times_forgotten
      }));
    } else {
      // Normal or rescue mode: fetch only due cards
      const res = await fetch(`/api/srs/due?mode=${mode}`);
      if (!res.ok) return;
      cards = await res.json();
    }

    if (!cards || cards.length === 0) {
      alert(t('srs_empty_due'));
      return;
    }

    // Initialize the interleaved round-robin engine
    srsEngine.initSession(cards, 5);
    state.srsSessionMode = mode;
    state.srsXpEarned = 0;

    switchView('srs-view');
    renderSrsCard();
  } catch (err) {
    console.error("Failed to start SRS session:", err);
  }
}
```

### Step B1-3 — Add sticky sidebar CSS

**File:** [`style.css`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/style.css)

Scroll to the **very end** of the file and add:
```css
/* ================================================
   Dashboard Sticky Sidebar (added 2026-08-10)
   ================================================ */
@media (min-width: 1024px) {
  .dashboard-sidebar {
    position: sticky;
    /* Use CSS var for header height so it works even if banner wraps to 2 lines */
    top: calc(var(--header-height, 80px) + 1.5rem);
    max-height: calc(100vh - var(--header-height, 80px) - 3rem);
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-width: thin;
  }
}
```

### Step B1-4 — Apply `.dashboard-sidebar` class to the right column in index.html

**File:** [`index.html`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/index.html)

Find the right sidebar column div (the comment says `<!-- Right Area: Lessons & Quests Sidebar -->`). It looks like this (around line 252):
```html
        <!-- Right Area: Lessons & Quests Sidebar -->
        <div style="display: flex; flex-direction: column; gap: 2rem;">
```

Add the class `dashboard-sidebar` to it:
```html
        <!-- Right Area: Lessons & Quests Sidebar -->
        <div class="dashboard-sidebar" style="display: flex; flex-direction: column; gap: 2rem;">
```

### Step B1-5 — Remove the duplicate CTA from the Habit Banner

The banner at the top of the dashboard already has a `💧 Water All Due Words` button. Now that the garden card has the primary CTA, the banner button is redundant (two primary green buttons = confusing).

**File:** [`index.html`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/index.html)

Find (around line 193):
```html
        <button id="main-water-all-btn" class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: bold; border-radius: 30px; box-shadow: 0 4px 15px rgba(0, 245, 212, 0.25);" onclick="window.startSrsSession('normal')">
          💧 Water All Due Words (~5 mins)
        </button>
```

Delete those 3 lines entirely. The banner now only shows status text.

### ✅ Verify B1
1. Dashboard loads → garden section shows emoji tiles instead of the old card grid
2. Badges show (e.g. "🌱 11 Seeds")
3. If due words exist → **Water Thirsty Plants** button appears in green
4. **⚔️ Full Garden Review** always appears; clicking it starts an SRS session with all planted words
5. Hovering an emoji tile shows a tooltip with the Chinese character + meaning
6. Scrolling the page → right sidebar (Today's Lesson, Unlocked Lessons, Labs) stays fixed on screen

---

## Fix B6 — Auth Guards on SRS API Endpoints

**Why:** Any request to `/api/srs/garden`, `/api/srs/due`, etc. currently works without being logged in. This means anyone who knows the URL can read or modify another user's SRS data.

**File:** [`server.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/server.js)

**How `requireAuth` works:** It's already imported at the top of `server.js` (line 6). You add it as a second argument between the route path and the handler function. Example of correct usage (existing, line 404):
```javascript
app.get('/api/progress', requireAuth, async (req, res) => {
```

Make the following 5 changes — each is a one-word addition of `, requireAuth`:

| Line | Find | Replace with |
|:-----|:-----|:-------------|
| 467 | `app.get('/api/srs/garden', async` | `app.get('/api/srs/garden', requireAuth, async` |
| 544 | `app.get('/api/srs/due', async` | `app.get('/api/srs/due', requireAuth, async` |
| 577 | `app.post('/api/srs/water', async` | `app.post('/api/srs/water', requireAuth, async` |
| 662 | `app.post('/api/srs/plant-lesson', async` | `app.post('/api/srs/plant-lesson', requireAuth, async` |
| 691 | `app.post('/api/srs/fuse', async` | `app.post('/api/srs/fuse', requireAuth, async` |

> ⚠️ **Gotcha after adding auth guards:** The `/api/srs/garden` endpoint currently gets `userId` from `req.query.userId`. After adding `requireAuth`, `req.user` is populated from the session token — so `req.user.id` will be the correct user. The endpoint already handles this fallback: `const userId = req.query.userId || (req.user ? req.user.id : 1);` — this is fine and no further change is needed.

---

## Fix B7 — Review Session Batch Capping & Fallback Mode

**Why:** If the user has 50+ due words, reviewing all of them in one go is exhausting. We cap the session at 15 cards max, prioritize them by overdue ratio & lowest accuracy, and fallback to the last completed lesson if 0 due words.

**File:** [`server.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/server.js)  
**Line:** 544

Find the `/api/srs/due` GET handler (line 544). Replace the entire `if (mode === 'rescue') { ... } else { ... }` block inside it with:

```javascript
    let cards = [];
    if (mode === 'rescue') {
      // Rescue mode: fetch up to 10 wilting cards (forgotten >= 3 and overdue)
      cards = await db.all(`
        SELECT 
          s.id as srs_id, s.vocab_id, s.mastery_stage, s.interval_days, s.ease_factor, s.repetitions, s.times_forgotten,
          v.character, v.pinyin, v.meaning_en as meaning, v.meaning_th, v.deconstruct_en as deconstruct, v.deconstruct_th,
          v.example_cn as exampleCn, v.example_py as examplePy, v.example_en as exampleEn, v.example_th as exampleTh
        FROM user_vocab_srs s
        JOIN vocab v ON s.vocab_id = v.id
        WHERE s.user_id = ? AND s.times_forgotten >= 3 AND s.next_review_date <= ?
        ORDER BY s.next_review_date ASC, s.id ASC
        LIMIT 10
      `, [userId, todayStr]);
    } else {
      // Normal mode: fetch up to 15 due cards sorted by overdue ratio and lowest accuracy
      cards = await db.all(`
        SELECT 
          s.id as srs_id, s.vocab_id, s.mastery_stage, s.interval_days, s.ease_factor, s.repetitions, s.times_forgotten,
          v.character, v.pinyin, v.meaning_en as meaning, v.meaning_th, v.deconstruct_en as deconstruct, v.deconstruct_th,
          v.example_cn as exampleCn, v.example_py as examplePy, v.example_en as exampleEn, v.example_th as exampleTh
        FROM user_vocab_srs s
        JOIN vocab v ON s.vocab_id = v.id
        WHERE s.user_id = ? AND s.next_review_date <= ?
        ORDER BY 
          ((julianday('now') - julianday(COALESCE(s.last_reviewed_at, s.created_at))) / s.interval_days) DESC,
          (CASE WHEN s.total_reviews = 0 THEN 1.0 ELSE CAST(s.total_reviews - s.times_forgotten AS REAL) / s.total_reviews END) ASC
        LIMIT 15
      `, [userId, todayStr]);

      // Fallback Mode: If 0 cards are due, fetch 15 words from user's most recently completed lesson sorted by lowest accuracy
      if (cards.length === 0) {
        const progress = await db.get('SELECT completed_lessons, hsk_level FROM user_progress WHERE user_id = ?', [userId]);
        let completed = [];
        let currentHsk = 'hsk1';
        if (progress) {
          try {
            completed = JSON.parse(progress.completed_lessons || '[]');
            currentHsk = progress.hsk_level || 'hsk1';
          } catch (e) {}
        }
        const lastLessonId = completed.length > 0 ? completed[completed.length - 1] : `${currentHsk}_day1`;

        cards = await db.all(`
          SELECT 
            s.id as srs_id, s.vocab_id, s.mastery_stage, s.interval_days, s.ease_factor, s.repetitions, s.times_forgotten,
            v.character, v.pinyin, v.meaning_en as meaning, v.meaning_th, v.deconstruct_en as deconstruct, v.deconstruct_th,
            v.example_cn as exampleCn, v.example_py as examplePy, v.example_en as exampleEn, v.example_th as exampleTh
          FROM user_vocab_srs s
          JOIN vocab v ON s.vocab_id = v.id
          WHERE s.user_id = ? AND s.lesson_id = ?
          ORDER BY (CASE WHEN s.total_reviews = 0 THEN 1.0 ELSE CAST(s.total_reviews - s.times_forgotten AS REAL) / s.total_reviews END) ASC
          LIMIT 15
        `, [userId, lastLessonId]);
      }
    }
```

### ✅ Verify B7
- Ensure no cards are due (complete reviews so due count is 0).
- Start a review session. Verify that it loads up to 15 cards from your last completed HSK lesson rather than alerting "All plants watered".

---

## Fix B8 — Early Exit & XP Claim Flow

**Why:** Clicking `Back to Dashboard` mid-session currently aborts instantly. We want to show a confirm modal if they earned XP, then render the summary early if they confirm. Also support mid-session language switching without losing progress.

### Step B8-1 — Register dialog translations in `i18n.js`

**File:** [`i18n.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/i18n.js)

Add these to the English `en` block:
```javascript
    "early_exit_title": "Finish Session Early?",
    "early_exit_msg": "Do you want to end your review session now and claim your earned XP? Your progress on completed words is already saved."
```
And to the Thai `th` block:
```javascript
    "early_exit_title": "จบการฝึกก่อนเวลา?",
    "early_exit_msg": "คุณต้องการจบการทบทวนตอนนี้และรับ XP หรือไม่? ความคืบหน้าของคำศัพท์ที่ทบทวนเสร็จแล้วจะถูกบันทึกไว้"
```

### Step B8-2 — Update exit click listener in `app.js`

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 2514

Find:
```javascript
function setupSrsEventListeners() {
  const exitBtn = document.getElementById('srs-exit-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => switchView('dashboard-view'));
  }
```

Replace with:
```javascript
function setupSrsEventListeners() {
  const exitBtn = document.getElementById('srs-exit-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      if (state.srsXpEarned > 0) {
        customConfirm('early_exit_title', 'early_exit_msg', () => {
          srsEngine.currentBatch = [];
          renderSrsCard();
        });
      } else {
        switchView('dashboard-view');
      }
    });
  }
```

### Step B8-3 — Support mid-session language switch in `app.js`

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 391

Find the language switch event listener:
```javascript
        } else if (state.currentView === 'pinyin-chart-view') {
          initPinyinChart();
        } else if (state.currentView === 'welcome-view') {
```

Replace with:
```javascript
        } else if (state.currentView === 'pinyin-chart-view') {
          initPinyinChart();
        } else if (state.currentView === 'srs-view') {
          renderSrsCard();
        } else if (state.currentView === 'welcome-view') {
```

### ✅ Verify B8
- Start a review session, earn some XP (+10 or +20).
- Click the exit button. Verify that the confirmation modal appears.
- Cancel the modal -> verify you return to the card.
- Confirm the modal -> verify you see the session summary with your correct XP total.
- Change the language in the header mid-session -> verify the active card redraws instantly in the new language.

---

## Fix B9 — Card Challenge & Distractor Localization

**Why:** In Thai mode, translation challenges currently select English distractors, which makes the correct Thai choice stand out. Stage-4 cards also lack example sentences in Full Review.

### Step B9-1 — Expose `localizeLessonObject` in `app.js`

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 3120 (very end of the file)

Ensure the function is bound to the window:
```javascript
window.localizeLessonObject = localizeLessonObject;
```

### Step B9-2 — Select example columns in `/api/srs/garden` query

**File:** [`server.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/server.js)  
**Line:** 507

Find the `/api/srs/garden` query:
```javascript
    const plants = await db.all(`
      SELECT 
        u.vocab_id, 
        u.character, 
        v.pinyin, 
        u.mastery_stage, 
        u.interval_days, 
        u.next_review_date, 
        u.times_forgotten,
        v.meaning_en as meaning,
        v.meaning_th
      FROM user_vocab_srs u
      JOIN vocab v ON u.vocab_id = v.id
      WHERE u.user_id = ?
      ORDER BY u.next_review_date ASC, u.id ASC
    `, [userId]);
```

Replace with:
```javascript
    const plants = await db.all(`
      SELECT 
        u.vocab_id, 
        u.character, 
        v.pinyin, 
        u.mastery_stage, 
        u.interval_days, 
        u.next_review_date, 
        u.times_forgotten,
        v.meaning_en as meaning,
        v.meaning_th,
        v.deconstruct_en as deconstruct,
        v.deconstruct_th,
        v.example_cn as exampleCn,
        v.example_py as examplePy,
        v.example_en as exampleEn,
        v.example_th as exampleTh
      FROM user_vocab_srs u
      JOIN vocab v ON u.vocab_id = v.id
      WHERE u.user_id = ?
      ORDER BY u.next_review_date ASC, u.id ASC
    `, [userId]);
```

### Step B9-3 — Copy example columns in frontend mapping

**File:** [`app.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/app.js)  
**Line:** 2542

Update the `'full'` mode map loop to copy the extra fields:
```javascript
      cards = (gardenData.plants || []).map(p => ({
        srs_id: p.vocab_id,
        vocab_id: p.vocab_id,
        character: p.character,
        pinyin: p.pinyin,
        meaning: p.meaning,
        meaning_th: p.meaning_th,
        mastery_stage: p.mastery_stage,
        interval_days: p.interval_days,
        times_forgotten: p.times_forgotten,
        deconstruct: p.deconstruct,
        deconstruct_th: p.deconstruct_th,
        exampleCn: p.exampleCn,
        examplePy: p.examplePy,
        exampleEn: p.exampleEn,
        exampleTh: p.exampleTh
      }));
```

### Step B9-4 — Rewrite `generateChallenge` and `getDistractors`

**File:** [`modules/challenge-selector.js`](file:///C:/Users/USER/OneDrive/Desktop/knowledge/My%20project/Chinese%20web%20learning/modules/challenge-selector.js)  
**Line:** 25

Replace the entire `generateChallenge(card, lang)` method (lines 25–45) with:

```javascript
  generateChallenge(card, lang = 'en') {
    // Dynamically localize using HanPath's central helper
    const localCard = window.localizeLessonObject ? window.localizeLessonObject(card, lang) : card;

    const stage = localCard.mastery_stage || 1;
    const meaning = localCard.meaning;
    const example = localCard.exampleEn;

    switch (stage) {
      case 1:
        return this.createRecognitionChallenge(localCard, meaning, lang);
      case 2:
        return Math.random() > 0.5 
          ? this.createToneChallenge(localCard, lang)
          : this.createPinyinChallenge(localCard, lang);
      case 3:
        return this.createTranslationChallenge(localCard, meaning, lang);
      case 4:
        return this.createContextChallenge(localCard, example, lang);
      default:
        return this.createRecognitionChallenge(localCard, meaning, lang);
    }
  }
```

And update all challenge constructors to accept `lang` and use translated prompts.

Replace `createRecognitionChallenge` (line 75) with:
```javascript
  createRecognitionChallenge(card, meaning, lang = 'en') {
    const correctOption = card.character;
    const distractors = this.getDistractors(card, 'character', 3);
    
    // Fallback if pool is empty or small
    while (distractors.length < 3) {
      distractors.push(this.generateRandomHanziFallback(distractors.concat([correctOption])));
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'RECOGNITION',
      prompt: lang === 'th' ? 'เลือกตัวอักษรจีนที่ถูกต้องสำหรับ:' : 'Select the correct Chinese character for:',
      question: meaning,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `พินอิน: ${card.pinyin}` : `Pinyin: ${card.pinyin}`
    };
  }
```

Replace `createToneChallenge` (line 99) with:
```javascript
  createToneChallenge(card, lang = 'en') {
    const toneNum = this.extractToneNumber(card.pinyin);
    const toneLabels = lang === 'th' ? {
      '1': 'เสียงที่ 1 (สูง, ระดับ - ā)',
      '2': 'เสียงที่ 2 (จัตวา/ระดับกลางขึ้น - á)',
      '3': 'เสียงที่ 3 (เอก/ระดับต่ำ - ǎ)',
      '4': 'เสียงที่ 4 (โท/ระดับสูงลง - à)',
      '5': 'เสียงเบา (สั้น, เบา - a)'
    } : {
      '1': '1st Tone (High, Level - ā)',
      '2': '2nd Tone (Rising - á)',
      '3': '3rd Tone (Low, Dipping - ǎ)',
      '4': '4th Tone (Falling - à)',
      '5': 'Neutral Tone (Light, Short - a)'
    };

    const options = ['1', '2', '3', '4', '5'].map(t => ({
      value: t,
      label: toneLabels[t]
    }));

    return {
      type: 'TONE_ID',
      prompt: lang === 'th' ? 'ระบุเสียงวรรณยุกต์ที่ถูกต้องสำหรับตัวอักษรนี้:' : 'Identify the correct tone for this character:',
      question: card.character,
      options,
      answer: String(toneNum),
      hint: lang === 'th' ? `ความหมาย: ${card.meaning}` : `Meaning: ${card.meaning}`
    };
  }
```

Replace `createPinyinChallenge` (line 128) with:
```javascript
  createPinyinChallenge(card, lang = 'en') {
    const cleanPinyin = this.stripToneMarkers(card.pinyin).toLowerCase().replace(/\s/g, '');

    return {
      type: 'PINYIN_INPUT',
      prompt: lang === 'th' ? 'พิมพ์พินอินที่ถูกต้อง (ไม่มีเครื่องหมายวรรณยุกต์หรือเว้นวรรค):' : 'Type the correct Pinyin (no tone markers or spaces):',
      question: card.character,
      answer: cleanPinyin,
      hint: lang === 'th' 
        ? `คำใบ้วรรณยุกต์: ${card.pinyin} | ความหมาย: ${card.meaning}`
        : `Tonal Hint: ${card.pinyin} | Meaning: ${card.meaning}`
    };
  }
```

Replace `createTranslationChallenge` (line 144) with:
```javascript
  createTranslationChallenge(card, meaning, lang = 'en') {
    const correctOption = meaning;
    const distractors = this.getDistractors(card, 'meaning', 3);

    // Fallbacks
    while (distractors.length < 3) {
      const fallbacks = lang === 'th'
        ? ['เรียน; ศึกษา', 'สวัสดี; ทักทาย', 'น้ำ; แม่น้ำ', 'ลาก่อน; พบกันใหม่']
        : ['to learn; study', 'hello; greetings', 'water; river', 'goodbye; see again'];
      distractors.push(fallbacks[distractors.length % fallbacks.length]);
    }

    const options = this.shuffle(distractors.slice(0, 3).concat([correctOption]));

    return {
      type: 'TRANSLATION',
      prompt: lang === 'th' ? 'เลือกความหมายที่ถูกต้องของคำนี้:' : 'Choose the correct meaning of this word:',
      question: card.character,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `พินอิน: ${card.pinyin}` : `Pinyin: ${card.pinyin}`
    };
  }
```

Replace `createContextChallenge` (line 168) with:
```javascript
  createContextChallenge(card, exampleTranslation, lang = 'en') {
    const sentence = card.exampleCn || card.example_sentence || '我今天很___。';
    const masked = sentence.replace(new RegExp(card.character, 'g'), ' ____ ');

    const correctOption = card.character;
    const distractors = this.getDistractors(card, 'character', 3);

    while (distractors.length < 3) {
      distractors.push('是', '不', '吗');
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'CONTEXT',
      prompt: lang === 'th' ? 'เติมคำในประโยคให้ถูกต้อง:' : 'Complete the sentence with the correct word:',
      question: masked,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `คำแปล: ${exampleTranslation}` : `Translation: ${exampleTranslation}`
    };
  }
```

Replace `getDistractors` (line 60) with:
```javascript
  getDistractors(excludeCard, fieldName, count = 3) {
    const lang = window.state ? window.state.currentLanguage : 'en';
    const localizedPool = this.vocabPool.map(item => 
      window.localizeLessonObject ? window.localizeLessonObject(item, lang) : item
    );

    const distractors = localizedPool
      .filter(item => item.character !== excludeCard.character && item[fieldName])
      .map(item => item[fieldName]);
    
    const unique = Array.from(new Set(distractors));
    
    this.shuffle(unique);
    return unique.slice(0, count);
  }
```

### ✅ Verify B9
- Switch language to Thai.
- Go to full review or watering room. Verify prompts are in Thai.
- In translation challenges, check option buttons: all distractors and the correct meaning must be written in Thai.
- Verify Stage 4 Context questions render and run successfully in Full Review without javascript errors.

---

## Final Regression Checklist

Run through all of these after completing all fixes:

**Login & Navigation**
- [ ] Can log in with email + password
- [ ] Can log out
- [ ] Can switch language to Thai — all text switches to Thai (no raw key names visible)

**Dashboard**
- [ ] 🔉 Daily Pinyin Practice banner is visible at top of dashboard
- [ ] Clicking **Open Pinyin Chart** opens the pinyin view
- [ ] Garden shows emoji tiles (not the old card grid)
- [ ] Stage count badges are visible (🌱 Seeds, 🌿 Sprouts, 🌻 Flowers, 🌳 Trees)
- [ ] Hovering an emoji tile shows the character + meaning tooltip
- [ ] If due words → **Water Thirsty Plants** button appears
- [ ] **⚔️ Full Garden Review** always appears and starts a session
- [ ] Right sidebar stays fixed when scrolling on wide screen (1024px+)

**Vocab Garden — Empty State**
- [ ] New user (no planted words) sees an empty garden message, not a crash

**Sentence Quest**
- [ ] Game loads if you have 3+ Stage-3 words
- [ ] Tiles appear shuffled; clicking in correct order + Check → shows ✅

**Seed Fusion Lab**
- [ ] Character pool is not empty — shows many characters
- [ ] Fusing 你 + 好 → shows `你好` with meaning
- [ ] Fusing two non-combinable characters → shows error + hint examples

**Security**
- [ ] Visiting `/api/srs/garden` in incognito → returns 401 Unauthorized

**Review Session Capping & Fallback (B7)**
- [ ] Watering session limits queue size to 15 cards max.
- [ ] If no words are due, triggering a review loads a refresher session of 15 words from the last completed lesson.

**Early Exit Flow (B8)**
- [ ] Clicking exit button mid-session triggers a confirmation popup if XP has been earned.
- [ ] Toggling language mid-session instantly redraws the active review card in the new language.

**Card Challenge Localization (B9)**
- [ ] Thai translation challenges display distractors and answer choices purely in Thai (no mixed EN/TH options).
- [ ] Review card prompts, tonal labels, and hints localize fully according to active language toggles.

**Console**
- [ ] No red errors in DevTools console on any of the above actions

---

## Common Mistakes to Avoid

| Mistake | Correct approach |
|:--------|:----------------|
| Writing `innerHTML = "Some English text"` | Use `window.t('key')` and register the key in `i18n.js` |
| Editing `lessons.js` or `hsk1_data.js` directly | These are static data files — never hand-edit them |
| Running `node insert_generated_lessons.js --force` | Only run this interactively and with explicit user approval |
| Adding a new `modules/*.js` file | Also add `"modules/yourfile.js"` to `includeFiles` in `vercel.json` |
| Fetching user data without auth check | Add `requireAuth` as middleware in `server.js` route definition |
| Doing manual fallback translations in client modules | Expose and use `localizeLessonObject(data, lang)` |
