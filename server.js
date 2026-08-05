const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDb } = require('./database');
const { router: authRouter, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// Global DB instance
let db;

// Ensure DB is initialized before handling any requests (Serverless pattern)
app.use(async (req, res, next) => {
  if (!db) {
    db = await getDb();
  }
  next();
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
    
    res.json({ success: true });
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
