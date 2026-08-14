const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./database');
const { router: authRouter, requireAuth, optionalAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// Global DB instance
let db;

// SRS Table Initialization Helper
async function initSrsTable(database) {
  try {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS user_vocab_srs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        vocab_id INTEGER NOT NULL,
        lesson_id TEXT NOT NULL,
        character TEXT NOT NULL,
        mastery_stage INTEGER DEFAULT 1,
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review_date TEXT NOT NULL,
        last_reviewed_at DATETIME,
        total_reviews INTEGER DEFAULT 0,
        times_forgotten INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, vocab_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_srs_due ON user_vocab_srs(user_id, next_review_date);
    `);
  } catch (err) {
    console.error("SRS Table initialization warning:", err.message);
  }
}

// Timezone Helper (Computes UTC+7 Bangkok Date String YYYY-MM-DD)
function getBkkDateString(offsetDays = 0) {
  const d = new Date(Date.now() + (7 * 3600 * 1000) + (offsetDays * 86400 * 1000));
  return d.toISOString().split('T')[0];
}

// Helper: Auto-plant historical words from completed lessons if SRS table is empty or out of sync
async function syncUserHistoricalSrs(database, userId, userLevel = 'hsk1', completedLessons = []) {
  try {
    if (!completedLessons || completedLessons.length === 0) {
      await database.run('DELETE FROM user_vocab_srs WHERE user_id = ?', [userId]);
      return;
    }
    const tomorrowStr = getBkkDateString(1);
    
    // Single bulk SQL insertion for all words across completed lessons
    const placeholders = completedLessons.map(() => '?').join(',');
    await database.run(`
      INSERT OR IGNORE INTO user_vocab_srs
      (user_id, vocab_id, lesson_id, character, mastery_stage, interval_days, next_review_date)
      SELECT ?, id, lesson_id, character, 1, 1, ?
      FROM vocab
      WHERE lesson_id IN (${placeholders})
    `, [userId, tomorrowStr, ...completedLessons]);

    // Purge any user_vocab_srs rows that belong to uncompleted lessons
    await database.run(`
      DELETE FROM user_vocab_srs
      WHERE user_id = ? AND lesson_id NOT IN (${placeholders})
    `, [userId, ...completedLessons]);
  } catch (err) {
    console.error("Historical SRS sync warning:", err.message);
  }
}

// Ensure DB is initialized before handling any requests (Serverless pattern)
app.use(async (req, res, next) => {
  try {
    if (!db) {
      db = await getDb();
    }
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// API Routes
app.use('/api/auth', authRouter);

// Get Pinyin matrix data
app.get('/api/pinyin_matrix', (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'pinyin_data.json'), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load pinyin data' });
  }
});
app.get('/api/lessons', async (req, res) => {
  try {
    const level = req.query.level || 'hsk1';
    const lessons = await db.all('SELECT id, hsk_level, day_number, title_en as title, title_th, duration_minutes FROM lessons WHERE hsk_level = ? AND day_number > 0 ORDER BY day_number ASC', [level]);
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a full lesson by ID, structured like the old hsk1_data.js format
app.get('/api/lessons/:id', async (req, res) => {
  try {
    const lessonId = req.params.id;
    const lesson = await db.get('SELECT id, hsk_level, day_number, title_en as title, title_th, duration_minutes FROM lessons WHERE id = ?', [lessonId]);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Fetch relations with alias mapping to preserve frontend model expectations
    const vocab = await db.all('SELECT id, lesson_id, character, pinyin, meaning_en as meaning, meaning_th, deconstruct_en as deconstruct, deconstruct_th, example_cn as exampleCn, example_py as examplePy, example_en as exampleEn, example_th FROM vocab WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
    
    // Process grammar and nested examples/practice
    const rawGrammar = await db.all('SELECT id, lesson_id, title_en as title, title_th, explanation_en as explanation, explanation_th, sort_order FROM grammar WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
    const grammar = [];
    for (const g of rawGrammar) {
      const examples = await db.all('SELECT cn, py, en, th FROM grammar_examples WHERE grammar_id = ? ORDER BY sort_order ASC', [g.id]);
      const practice = await db.get('SELECT prompt_en as prompt, prompt_th, words, answer FROM grammar_practice WHERE grammar_id = ?', [g.id]);
      
      const gItem = {
        title: g.title,
        title_th: g.title_th,
        explanation: g.explanation,
        explanation_th: g.explanation_th,
        examples: examples
      };
      
      if (practice) {
        gItem.practice = {
          prompt: practice.prompt,
          prompt_th: practice.prompt_th,
          words: JSON.parse(practice.words),
          answer: JSON.parse(practice.answer)
        };
      }
      grammar.push(gItem);
    }
    
    // Dialogue
    const dialogueRaw = await db.get('SELECT id, title_en as title, title_th FROM dialogues WHERE lesson_id = ?', [lessonId]);
    let dialogue = null;
    if (dialogueRaw) {
      const lines = await db.all('SELECT speaker, cn, py, en, th FROM dialogue_lines WHERE dialogue_id = ? ORDER BY sort_order ASC', [dialogueRaw.id]);
      dialogue = {
        title: dialogueRaw.title,
        title_th: dialogueRaw.title_th,
        lines: lines
      };
    }
    
    // Construct final JSON exactly like the old window.HSK1_CURRICULUM format (legacy quizzes omitted)
    const fullLesson = {
      id: lesson.id,
      title: lesson.title,
      title_th: lesson.title_th,
      vocab: vocab,
      grammar: grammar,
      dialogue: dialogue,
      quiz: []
    };
    
    res.json(fullLesson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full curriculum endpoint (simulates the old `window.HSK1_CURRICULUM`)
app.get('/api/curriculum/:level', async (req, res) => {
  try {
    const level = req.params.level;
    console.log("Fetching curriculum for level:", level);
    const lessons = await db.all('SELECT id, hsk_level, day_number, title_en as title, title_th, duration_minutes FROM lessons WHERE hsk_level = ? AND day_number > 0 ORDER BY day_number ASC', [level]);
    console.log("Found lessons:", lessons.length);
    if (lessons.length === 0) return res.json([]);

    const lessonIds = lessons.map(l => l.id);
    const placeholders = lessonIds.map(() => '?').join(',');

    // Bulk fetch vocab
    console.log("Fetching vocab for lessons...");
    const allVocab = await db.all(`SELECT lesson_id, character, pinyin, meaning_en as meaning, meaning_th, deconstruct_en as deconstruct, deconstruct_th, example_cn as exampleCn, example_py as examplePy, example_en as exampleEn, example_th FROM vocab WHERE lesson_id IN (${placeholders}) ORDER BY sort_order ASC`, lessonIds);
    console.log("Vocab fetched:", allVocab.length);
    
    // Bulk fetch grammar
    const allGrammar = await db.all(`SELECT id, lesson_id, title_en as title, title_th, explanation_en as explanation, explanation_th FROM grammar WHERE lesson_id IN (${placeholders}) ORDER BY sort_order ASC`, lessonIds);
    const grammarIds = allGrammar.map(g => g.id);
    let allGrammarExamples = [];
    let allGrammarPractice = [];
    
    if (grammarIds.length > 0) {
        const gPlaceholders = grammarIds.map(() => '?').join(',');
        allGrammarExamples = await db.all(`SELECT grammar_id, cn, py, en, th FROM grammar_examples WHERE grammar_id IN (${gPlaceholders}) ORDER BY sort_order ASC`, grammarIds);
        allGrammarPractice = await db.all(`SELECT grammar_id, prompt_en as prompt, prompt_th, words, answer FROM grammar_practice WHERE grammar_id IN (${gPlaceholders})`, grammarIds);
    }

    // Bulk fetch dialogues
    console.log("Fetching dialogues...");
    const allDialogues = await db.all(`SELECT id, lesson_id, title_en as title, title_th FROM dialogues WHERE lesson_id IN (${placeholders})`, lessonIds);
    const dialogueIds = allDialogues.map(d => d.id);
    let allDialogueLines = [];
    
    if (dialogueIds.length > 0) {
        const dPlaceholders = dialogueIds.map(() => '?').join(',');
        console.log("Fetching dialogue lines...");
        allDialogueLines = await db.all(`SELECT dialogue_id, speaker, cn, py, en, th FROM dialogue_lines WHERE dialogue_id IN (${dPlaceholders}) ORDER BY sort_order ASC`, dialogueIds);
    }

    console.log("Assembling curriculum...");
    const curriculum = lessons.map(lesson => {
      const lid = lesson.id;
      
      const lessonVocab = allVocab.filter(v => v.lesson_id === lid).map(({lesson_id, ...rest}) => rest);
      
      const lessonGrammarRaw = allGrammar.filter(g => g.lesson_id === lid);
      const lessonGrammar = lessonGrammarRaw.map(g => {
        const examples = allGrammarExamples.filter(ex => ex.grammar_id === g.id).map(({grammar_id, ...rest}) => rest);
        const practiceRow = allGrammarPractice.find(p => p.grammar_id === g.id);
        const gItem = { title: g.title, title_th: g.title_th, explanation: g.explanation, explanation_th: g.explanation_th, examples: examples };
        if (practiceRow) {
          gItem.practice = { prompt: practiceRow.prompt, prompt_th: practiceRow.prompt_th, words: JSON.parse(practiceRow.words), answer: JSON.parse(practiceRow.answer) };
        }
        return gItem;
      });

      const lessonDialogueRaw = allDialogues.find(d => d.lesson_id === lid);
      let dialogue = null;
      if (lessonDialogueRaw) {
        const lines = allDialogueLines.filter(l => l.dialogue_id === lessonDialogueRaw.id).map(({dialogue_id, ...rest}) => rest);
        dialogue = { title: lessonDialogueRaw.title, title_th: lessonDialogueRaw.title_th, lines: lines };
      }

      return {
        id: lesson.id,
        title: lesson.title,
        title_th: lesson.title_th,
        vocab: lessonVocab,
        grammar: lessonGrammar,
        dialogue: dialogue,
        quiz: []
      };
    });

    res.json(curriculum);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:userId/progress', async (req, res) => {
  try {
    const userId = req.params.userId;
    const progressFilePath = path.join(__dirname, 'student_progress.json');
    let progress;

    // 1. Try to read from student_progress.json first to sync with local file state
    let fileProgress = null;
    try {
      await fs.promises.access(progressFilePath);
      const fileContent = await fs.promises.readFile(progressFilePath, 'utf8');
      if (fileContent.trim()) {
        fileProgress = JSON.parse(fileContent);
      }
    } catch (fileErr) {
      // File does not exist or cannot be read, which is fine
    }

    // 2. Query database progress
    progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);

    if (fileProgress) {
      // Sync file progress to database
      const hsk_level = fileProgress.userLevel || 'hsk1';
      const score = fileProgress.score || 0;
      const time_spent_minutes = fileProgress.timeSpentMinutes || 0;
      const streak_count = fileProgress.streakCount || 0;
      const last_study_date = fileProgress.lastStudyDate || null;
      const completed_lessons = JSON.stringify(fileProgress.completedLessons || []);
      const reminder_time = fileProgress.reminderTime || '09:00';
      const has_taken_placement_test = fileProgress.hasTakenPlacementTest ? 1 : (fileProgress.completedLessons && fileProgress.completedLessons.length > 0 ? 1 : 0);
      const last_reminder_date = fileProgress.lastReminderDate || null;

      if (!progress) {
        // Insert progress from file
        await db.run(`
          INSERT INTO user_progress (user_id, hsk_level, score, time_spent_minutes, streak_count, last_study_date, completed_lessons, reminder_time, has_taken_placement_test, last_reminder_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, hsk_level, score, time_spent_minutes, streak_count, last_study_date, completed_lessons, reminder_time, has_taken_placement_test, last_reminder_date]);
      } else {
        // Update progress in database from file
        await db.run(`
          UPDATE user_progress 
          SET hsk_level = ?, score = ?, time_spent_minutes = ?, streak_count = ?, last_study_date = ?, completed_lessons = ?, reminder_time = ?, has_taken_placement_test = ?, last_reminder_date = ?
          WHERE user_id = ?
        `, [hsk_level, score, time_spent_minutes, streak_count, last_study_date, completed_lessons, reminder_time, has_taken_placement_test, last_reminder_date, userId]);
      }
      // Re-fetch the updated DB progress
      progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    } else {
      // If no file exists but DB has progress, write DB progress to file
      if (!progress) {
        // Create empty profile in DB
        await db.run('INSERT INTO user_progress (user_id) VALUES (?)', [userId]);
        progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
      }
      
      const newFileProgress = {
        userLevel: progress.hsk_level,
        streakCount: progress.streak_count || 0,
        score: progress.score || 0,
        timeSpentMinutes: progress.time_spent_minutes || 0,
        lastStudyDate: progress.last_study_date || null,
        reminderTime: progress.reminder_time || '09:00',
        completedLessons: JSON.parse(progress.completed_lessons || '[]'),
        hasTakenPlacementTest: progress.has_taken_placement_test === 1,
        lastReminderDate: progress.last_reminder_date || null
      };
      try {
        await fs.promises.writeFile(progressFilePath, JSON.stringify(newFileProgress, null, 2), 'utf8');
      } catch (err) {
        // Ignore file write errors in production (read-only filesystem)
        if (!process.env.VERCEL) console.error("Local file write failed:", err.message);
      }
    }

    // Map snake_case database fields to camelCase client properties
    const clientProgress = {
      userLevel: progress.hsk_level,
      streakCount: progress.streak_count || 0,
      score: progress.score || 0,
      timeSpentMinutes: progress.time_spent_minutes || 0,
      lastStudiedDate: progress.last_study_date || null,
      reminderTime: progress.reminder_time || '09:00',
      completedLessons: JSON.parse(progress.completed_lessons || '[]'),
      hasTakenPlacementTest: progress.has_taken_placement_test === 1,
      lastReminderDate: progress.last_reminder_date || null
    };

    res.json(clientProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/:userId/progress', async (req, res) => {
  try {
    const userId = req.params.userId;
    const body = req.body;
    const progressFilePath = path.join(__dirname, 'student_progress.json');
    
    await db.run(`
      UPDATE user_progress 
      SET hsk_level = ?, score = ?, time_spent_minutes = ?, streak_count = ?, last_study_date = ?, completed_lessons = ?, reminder_time = ?, has_taken_placement_test = ?, last_reminder_date = ?
      WHERE user_id = ?
    `, [
      body.userLevel || 'hsk1',
      body.score || 0,
      body.timeSpentMinutes || 0,
      body.streakCount || 0,
      body.lastStudiedDate || null,
      JSON.stringify(body.completedLessons || []),
      body.reminderTime || '09:00',
      body.hasTakenPlacementTest ? 1 : 0,
      body.lastReminderDate || null,
      userId
    ]);

    // Also write to student_progress.json
    const fileProgress = {
      userLevel: body.userLevel || 'hsk1',
      streakCount: body.streakCount || 0,
      score: body.score || 0,
      timeSpentMinutes: body.timeSpentMinutes || 0,
      lastStudyDate: body.lastStudiedDate || null,
      reminderTime: body.reminderTime || '09:00',
      completedLessons: body.completedLessons || [],
      hasTakenPlacementTest: body.hasTakenPlacementTest || false,
      lastReminderDate: body.lastReminderDate || null
    };
    try {
      await fs.promises.writeFile(progressFilePath, JSON.stringify(fileProgress, null, 2), 'utf8');
    } catch (err) {
      if (!process.env.VERCEL) console.error("Local file write failed:", err.message);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Progress Endpoints
app.get('/api/progress', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);

    if (!progress) {
      // Create empty profile in DB if it doesn't exist
      await db.run('INSERT INTO user_progress (user_id) VALUES (?)', [userId]);
      progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    }

    // Map snake_case database fields to camelCase client properties
    const clientProgress = {
      userLevel: progress.hsk_level,
      streakCount: progress.streak_count || 0,
      score: progress.score || 0,
      timeSpentMinutes: progress.time_spent_minutes || 0,
      lastStudiedDate: progress.last_study_date || null,
      reminderTime: progress.reminder_time || '09:00',
      completedLessons: JSON.parse(progress.completed_lessons || '[]'),
      hasTakenPlacementTest: progress.has_taken_placement_test === 1,
      lastReminderDate: progress.last_reminder_date || null
    };

    res.json(clientProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/progress', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body;
    
    await db.run(`
      UPDATE user_progress 
      SET hsk_level = ?, score = ?, time_spent_minutes = ?, streak_count = ?, last_study_date = ?, completed_lessons = ?, reminder_time = ?, has_taken_placement_test = ?, last_reminder_date = ?
      WHERE user_id = ?
    `, [
      body.userLevel || 'hsk1',
      body.score || 0,
      body.timeSpentMinutes || 0,
      body.streakCount || 0,
      body.lastStudiedDate || null,
      JSON.stringify(body.completedLessons || []),
      body.reminderTime || '09:00',
      body.hasTakenPlacementTest ? 1 : 0,
      body.lastReminderDate || null,
      userId
    ]);
    
    // Auto-sync historical completed lessons into SRS table when progress is updated
    await syncUserHistoricalSrs(db, userId, body.userLevel || 'hsk1', body.completedLessons || []);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VOCAB GARDEN (SRS) API ENDPOINTS
// ==========================================

// GET /api/srs/garden - Fetch garden summary stats & progress bar
app.get('/api/srs/garden', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || (req.user ? req.user.id : 1);
    
    // 1. Fetch user progress to perform historical backfill if needed
    let progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    if (!progress) {
      await db.run('INSERT INTO user_progress (user_id) VALUES (?)', [userId]);
      progress = await db.get('SELECT * FROM user_progress WHERE user_id = ?', [userId]);
    }
    
    const hskLevel = progress.hsk_level || 'hsk1';
    const completedLessons = JSON.parse(progress.completed_lessons || '[]');
    
    // Auto-sync historical completed lessons into SRS table ONLY if user has no planted cards yet
    const existingCards = await db.get('SELECT COUNT(id) as cnt FROM user_vocab_srs WHERE user_id = ?', [userId]);
    if (!existingCards || existingCards.cnt === 0) {
      await syncUserHistoricalSrs(db, userId, hskLevel, completedLessons);
    }

    const todayStr = getBkkDateString(0);

    // 2. Fetch single-query aggregation for user's garden
    const stats = await db.get(`
      SELECT 
        COUNT(id) as total_planted,
        SUM(CASE WHEN mastery_stage = 1 THEN 1 ELSE 0 END) as seeds_count,
        SUM(CASE WHEN mastery_stage = 2 THEN 1 ELSE 0 END) as sprouts_count,
        SUM(CASE WHEN mastery_stage = 3 THEN 1 ELSE 0 END) as flowers_count,
        SUM(CASE WHEN mastery_stage = 4 THEN 1 ELSE 0 END) as trees_count,
        SUM(CASE WHEN next_review_date <= ? THEN 1 ELSE 0 END) as thirsty_due_count,
        SUM(CASE WHEN times_forgotten >= 3 THEN 1 ELSE 0 END) as wilting_count
      FROM user_vocab_srs
      WHERE user_id = ?
    `, [todayStr, userId]);

    // 3. Determine level target total
    const targetMap = { hsk1: 300, hsk2: 500, hsk3: 1000 };
    const levelTargetTotal = targetMap[hskLevel] || 300;
    const totalPlanted = stats ? (stats.total_planted || 0) : 0;
    const progressPercentage = Math.min(100, Math.round((totalPlanted / levelTargetTotal) * 100));

    // 4. Fetch the actual plants in the garden (join with vocab to get pinyin & meaning)
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

    res.json({
      totalPlanted,
      levelTargetTotal,
      progressPercentage,
      stages: {
        seeds: stats ? (stats.seeds_count || 0) : 0,
        sprouts: stats ? (stats.sprouts_count || 0) : 0,
        flowers: stats ? (stats.flowers_count || 0) : 0,
        trees: stats ? (stats.trees_count || 0) : 0
      },
      thirstyDueCount: stats ? (stats.thirsty_due_count || 0) : 0,
      wiltingCount: stats ? (stats.wilting_count || 0) : 0,
      plants
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/srs/due - Fetch up to 15 due cards for watering session (or rescue mode), with fallback refresher
app.get('/api/srs/due', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId || (req.user ? req.user.id : 1);
    const mode = req.query.mode || 'normal';
    const todayStr = getBkkDateString(0);

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

    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/srs/water - Process student review game result & update SM-2 parameters
app.post('/api/srs/water', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId || (req.user ? req.user.id : 1);
    const { vocabId, attemptsCount = 1, hintsUsed = false } = req.body;

    if (!vocabId) {
      return res.status(400).json({ error: 'vocabId is required' });
    }

    // Fetch existing SRS record
    let row = await db.get('SELECT * FROM user_vocab_srs WHERE user_id = ? AND vocab_id = ?', [userId, vocabId]);
    if (!row) {
      const vocabRow = await db.get('SELECT lesson_id, character FROM vocab WHERE id = ?', [vocabId]);
      if (!vocabRow) return res.status(444).json({ error: 'Vocab not found' });
      await db.run(`
        INSERT INTO user_vocab_srs (user_id, vocab_id, lesson_id, character, mastery_stage, interval_days, next_review_date)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `, [userId, vocabId, vocabRow.lesson_id, vocabRow.character, getBkkDateString(1)]);
      row = await db.get('SELECT * FROM user_vocab_srs WHERE user_id = ? AND vocab_id = ?', [userId, vocabId]);
    }

    // Evaluate system grade
    let systemGrade;
    if (attemptsCount === 1 && !hintsUsed) {
      systemGrade = 'PERFECT';
    } else if (attemptsCount === 2 || hintsUsed) {
      systemGrade = 'GOT_IT';
    } else {
      systemGrade = 'MISSED';
    }

    let newStage = row.mastery_stage || 1;
    let newEase = row.ease_factor || 2.5;
    let newInterval = row.interval_days || 1;
    let newReps = row.repetitions || 0;
    let timesForgotten = row.times_forgotten || 0;

    if (systemGrade === 'MISSED') {
      newStage = 1;
      newInterval = 1;
      newReps = 0;
      newEase = Math.max(1.3, newEase - 0.2);
      timesForgotten += 1;
    } else if (systemGrade === 'GOT_IT') {
      newStage = Math.min(4, newStage + 1);
      newInterval = Math.max(1, Math.round(newInterval * 1.5));
      newReps += 1;
    } else { // PERFECT
      newStage = Math.min(4, newStage + 1);
      newEase = Math.min(3.2, newEase + 0.15);
      newInterval = Math.max(1, Math.round(newInterval * newEase * 1.3));
      newReps += 1;
    }

    const nextReviewDate = getBkkDateString(newInterval);

    await db.run(`
      UPDATE user_vocab_srs
      SET mastery_stage = ?,
          ease_factor = ?,
          interval_days = ?,
          repetitions = ?,
          next_review_date = ?,
          last_reviewed_at = CURRENT_TIMESTAMP,
          total_reviews = total_reviews + 1,
          times_forgotten = ?
      WHERE user_id = ? AND vocab_id = ?
    `, [newStage, newEase, newInterval, newReps, nextReviewDate, timesForgotten, userId, vocabId]);

    const xpEarned = systemGrade === 'PERFECT' ? 20 : (systemGrade === 'GOT_IT' ? 10 : 5);

    res.json({
      success: true,
      systemGrade,
      newStage,
      intervalDays: newInterval,
      nextReviewDate,
      xpEarned
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/srs/plant-lesson - Auto-plant all words from a completed daily lesson
app.post('/api/srs/plant-lesson', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId || (req.user ? req.user.id : 1);
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    const tomorrowStr = getBkkDateString(1);
    const vocabList = await db.all('SELECT id, lesson_id, character FROM vocab WHERE lesson_id = ?', [lessonId]);

    let plantedCount = 0;
    for (const v of vocabList) {
      await db.run(`
        INSERT OR IGNORE INTO user_vocab_srs
        (user_id, vocab_id, lesson_id, character, mastery_stage, interval_days, next_review_date)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `, [userId, v.id, v.lesson_id, v.character, tomorrowStr]);
      plantedCount++;
    }

    res.json({ success: true, plantedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/srs/fusion/anchors — Returns the list of available anchor radicals
app.get('/api/srs/fusion/anchors', requireAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const levelStr = req.query.level || '1';
    const level = parseInt(levelStr.replace('hsk', ''), 10) || 1;
    
    // Group by symbol to prevent duplicate tabs across HSK levels, and join with radicals table
    const anchors = await db.all(`
      SELECT 
        f.anchor_id as id, 
        f.anchor_symbol as symbol, 
        MIN(f.hsk_level) as hsk_level,
        COUNT(f.id) as total_discoveries,
        SUM(CASE WHEN ud.id IS NOT NULL THEN 1 ELSE 0 END) as user_discovered,
        SUM(CASE WHEN uv.id IS NOT NULL THEN 1 ELSE 0 END) as user_learned,
        r.meaning_en as name_en,
        r.meaning_th as name_th,
        r.icon
      FROM radical_fusion_formulas f
      LEFT JOIN user_radical_discoveries ud ON ud.formula_id = f.id AND ud.user_id = ?
      LEFT JOIN user_vocab_srs uv ON f.vocab_id = uv.vocab_id AND uv.user_id = ?
      LEFT JOIN radicals r ON f.anchor_symbol = r.symbol
      WHERE f.hsk_level <= ?
      GROUP BY f.anchor_id, f.anchor_symbol
      ORDER BY user_learned DESC, hsk_level ASC, user_discovered DESC, total_discoveries DESC
    `, [userId, userId, level]);
    
    // Ensure fallbacks for missing radicals (in case a radical formula is added before the radical dictionary is updated)
    anchors.forEach(a => {
      if (!a.name_en) {
        a.name_en = a.symbol;
        a.name_th = a.symbol;
        a.icon = '🧩';
      }
    });

    res.json({ anchors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/srs/fusion/components — Returns valid components for an anchor
app.get('/api/srs/fusion/components', requireAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { anchor } = req.query;
    if (!anchor) return res.status(400).json({ error: 'anchor query param is required' });

    const levelStr = req.query.level || '1';
    const level = parseInt(levelStr.replace('hsk', ''), 10) || 1;

    const components = await db.all(`
      SELECT 
        f.id as formula_id,
        f.component_symbol as symbol,
        f.result_character as result,
        (CASE WHEN ud.id IS NOT NULL THEN 1 ELSE 0 END) as discovered,
        (CASE WHEN uv.id IS NOT NULL THEN 1 ELSE 0 END) as has_learned
      FROM radical_fusion_formulas f
      LEFT JOIN user_radical_discoveries ud ON ud.formula_id = f.id AND ud.user_id = ?
      LEFT JOIN user_vocab_srs uv ON uv.vocab_id = f.vocab_id AND uv.user_id = ?
      WHERE (f.anchor_id = ? OR f.anchor_symbol = ?) AND f.hsk_level <= ?
      ORDER BY discovered ASC, has_learned DESC
    `, [userId, userId, anchor, anchor, level]);
    
    res.json({ anchor, components });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/srs/fusion/combine - Attempt to fuse
app.post('/api/srs/fusion/combine', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId || (req.user ? req.user.id : 1);
    const { formula_id } = req.body;

    if (!formula_id) {
      return res.status(400).json({ error: 'formula_id is required' });
    }

    const formula = await db.get('SELECT * FROM radical_fusion_formulas WHERE id = ?', [formula_id]);
    if (!formula) return res.status(404).json({ error: 'Formula not found' });

    // Track discovery
    try {
      await db.run('INSERT INTO user_radical_discoveries (user_id, formula_id) VALUES (?, ?)', [userId, formula_id]);
    } catch (e) {
      // Ignore unique constraint error if already discovered
    }

    // Prepare response data
    let wordData = {
      id: formula.vocab_id || null,
      character: formula.result_character,
      pinyin: '',
      meaning: '',
      meaning_th: '',
      deconstruct: formula.deconstruct_en || 'No deconstruction details available.',
      deconstruct_th: formula.deconstruct_th || ''
    };

    if (formula.vocab_id) {
      const vocab = await db.get('SELECT * FROM vocab WHERE id = ?', [formula.vocab_id]);
      if (vocab) {
        wordData.pinyin = vocab.pinyin;
        wordData.meaning = vocab.meaning_en || vocab.meaning;
        wordData.meaning_th = vocab.meaning_th;
        wordData.deconstruct = vocab.deconstruct_en || vocab.deconstruct || wordData.deconstruct;
        wordData.deconstruct_th = vocab.deconstruct_th || wordData.deconstruct_th;

        // Auto-plant
        const existing = await db.get('SELECT id FROM user_vocab_srs WHERE user_id = ? AND vocab_id = ?', [userId, formula.vocab_id]);
        if (!existing) {
          const tomorrowStr = getBkkDateString(1);
          await db.run(`
            INSERT INTO user_vocab_srs (user_id, vocab_id, lesson_id, character, mastery_stage, interval_days, next_review_date)
            VALUES (?, ?, ?, ?, 1, 1, ?)
          `, [userId, formula.vocab_id, vocab.lesson_id, formula.result_character, tomorrowStr]);
        }
      }
    }

    res.json({ success: true, word: wordData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// OFFICIAL HSK 1-3 MOCK EXAM ENDPOINTS
// ==========================================

// GET /api/mock-exams/summary - Get level availability & user's best scores
app.get('/api/mock-exams/summary', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const stats = await db.all(`
      SELECT hsk_level, COUNT(id) as total_questions 
      FROM mock_exam_questions 
      GROUP BY hsk_level
    `);
    const history = userId ? await db.all(`
      SELECT hsk_level, MAX(total_score) as best_score, MAX(passed) as has_passed, MAX(created_at) as last_taken
      FROM user_exam_results
      WHERE user_id = ?
      GROUP BY hsk_level
    `, [userId]) : [];

    const levelMap = {
      hsk1: { level: 'hsk1', name: 'HSK 1', questionsTarget: 40, timeLimitMinutes: 35, maxScore: 200, passScore: 120 },
      hsk2: { level: 'hsk2', name: 'HSK 2', questionsTarget: 55, timeLimitMinutes: 45, maxScore: 200, passScore: 120 },
      hsk3: { level: 'hsk3', name: 'HSK 3', questionsTarget: 80, timeLimitMinutes: 85, maxScore: 300, passScore: 180 }
    };

    const result = Object.keys(levelMap).map(lvl => {
      const info = levelMap[lvl];
      const qStat = stats.find(s => s.hsk_level === lvl);
      const hStat = history.find(h => h.hsk_level === lvl);
      return {
        ...info,
        availableQuestions: qStat ? qStat.total_questions : 0,
        bestScore: hStat ? hStat.best_score : null,
        hasPassed: hStat ? hStat.has_passed === 1 : false,
        lastTaken: hStat ? hStat.last_taken : null
      };
    });

    res.json({ levels: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mock-exams/:level - Fetch questions for an exam session
app.get('/api/mock-exams/:level', optionalAuth, async (req, res) => {
  try {
    const level = req.params.level;
    const questions = await db.all(`
      SELECT 
        id, hsk_level, section, question_type, 
        prompt_cn, prompt_py, prompt_en, prompt_th, 
        audio_url, image_url, options_json, correct_answer,
        explanation_en, explanation_th, target_vocab_ids, target_grammar_ids
      FROM mock_exam_questions
      WHERE hsk_level = ?
      ORDER BY section ASC, id ASC
    `, [level]);

    const parsed = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options_json || '[]'),
      targetVocabIds: JSON.parse(q.target_vocab_ids || '[]'),
      targetGrammarIds: JSON.parse(q.target_grammar_ids || '[]')
    }));

    res.json({ level, questions: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mock-exams/submit - Submit answers, grade, auto-plant missed words, and return report card
app.post('/api/mock-exams/submit', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 1;
    const { hskLevel, timeSpentSeconds, answers } = req.body;

    if (!hskLevel || !answers) {
      return res.status(400).json({ error: 'Missing required exam data' });
    }

    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      return res.status(400).json({ error: 'No answers submitted' });
    }

    const placeholders = questionIds.map(() => '?').join(',');
    const dbQuestions = await db.all(`
      SELECT id, hsk_level, section, correct_answer, target_vocab_ids, target_grammar_ids, explanation_en, explanation_th
      FROM mock_exam_questions
      WHERE id IN (${placeholders})
    `, questionIds);

    let listeningCorrect = 0, listeningTotal = 0;
    let readingCorrect = 0, readingTotal = 0;
    let writingCorrect = 0, writingTotal = 0;
    const missedVocabIds = [];
    const missedGrammarIds = [];

    dbQuestions.forEach(q => {
      const userAns = (answers[q.id] || '').trim();
      const isCorrect = userAns.toLowerCase() === (q.correct_answer || '').trim().toLowerCase();
      
      if (q.section === 'listening') {
        listeningTotal++;
        if (isCorrect) listeningCorrect++;
      } else if (q.section === 'writing') {
        writingTotal++;
        if (isCorrect) writingCorrect++;
      } else {
        readingTotal++;
        if (isCorrect) readingCorrect++;
      }

      if (!isCorrect) {
        const vIds = JSON.parse(q.target_vocab_ids || '[]');
        missedVocabIds.push(...vIds);
        const gIds = JSON.parse(q.target_grammar_ids || '[]');
        missedGrammarIds.push(...gIds);
      }
    });

    const isHsk3 = hskLevel === 'hsk3';
    const maxScore = isHsk3 ? 300 : 200;
    const passThreshold = isHsk3 ? 180 : 120;

    const listeningScore = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
    const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;
    const writingScore = writingTotal > 0 ? Math.round((writingCorrect / writingTotal) * 100) : 0;
    const totalScore = isHsk3 ? (listeningScore + readingScore + writingScore) : (listeningScore + readingScore);
    const passed = totalScore >= passThreshold ? 1 : 0;

    // Auto-plant missed vocabulary into user's SRS garden with times_forgotten += 3 (Wilting Rescue Box)
    const uniqueMissedVocabIds = Array.from(new Set(missedVocabIds));
    if (uniqueMissedVocabIds.length > 0) {
      const tomorrowStr = getBkkDateString(1);
      for (const vId of uniqueMissedVocabIds) {
        const vocab = await db.get('SELECT id, character, lesson_id FROM vocab WHERE id = ?', [vId]);
        if (vocab) {
          const existing = await db.get('SELECT id, times_forgotten FROM user_vocab_srs WHERE user_id = ? AND vocab_id = ?', [userId, vId]);
          if (existing) {
            await db.run(`
              UPDATE user_vocab_srs 
              SET times_forgotten = times_forgotten + 3, next_review_date = ?, mastery_stage = 1
              WHERE id = ?
            `, [tomorrowStr, existing.id]);
          } else {
            await db.run(`
              INSERT INTO user_vocab_srs (user_id, vocab_id, lesson_id, character, mastery_stage, interval_days, next_review_date, times_forgotten)
              VALUES (?, ?, ?, ?, 1, 1, ?, 3)
            `, [userId, vocab.id, vocab.lesson_id, vocab.character, tomorrowStr]);
          }
        }
      }
    }

    const weaknessSummary = {
      listeningAccuracy: listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 100,
      readingAccuracy: readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 100,
      writingAccuracy: writingTotal > 0 ? Math.round((writingCorrect / writingTotal) * 100) : 100,
      missedVocabCount: uniqueMissedVocabIds.length,
      missedGrammarCount: Array.from(new Set(missedGrammarIds)).length
    };

    await db.run(`
      INSERT INTO user_exam_results
      (user_id, hsk_level, listening_score, reading_score, writing_score, total_score, passed, time_spent_seconds, weakness_summary_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      hskLevel,
      listeningScore,
      readingScore,
      writingScore,
      totalScore,
      passed,
      timeSpentSeconds || 0,
      JSON.stringify(weaknessSummary)
    ]);

    let missedVocabWords = [];
    if (uniqueMissedVocabIds.length > 0) {
      const vPlaceholders = uniqueMissedVocabIds.map(() => '?').join(',');
      const missedVocabRows = await db.all(`
        SELECT id, character, pinyin, meaning_en, meaning_th 
        FROM vocab 
        WHERE id IN (${vPlaceholders})
      `, uniqueMissedVocabIds);
      missedVocabWords = missedVocabRows.map(r => ({
        id: r.id,
        character: r.character,
        pinyin: r.pinyin,
        meaning: r.meaning_en,
        meaning_th: r.meaning_th
      }));
    }

    res.json({
      passed: passed === 1,
      totalScore,
      maxScore,
      passThreshold,
      listeningScore,
      readingScore,
      writingScore: isHsk3 ? writingScore : null,
      weaknessSummary,
      missedVocabWords,
      plantedCount: uniqueMissedVocabIds.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server locally (Vercel will ignore this and use module.exports)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
