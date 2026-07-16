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

// Global DB instance
let db;

// Initialize DB connection
async function init() {
  db = await getDb();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

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
    const lessons = await db.all('SELECT * FROM lessons WHERE hsk_level = ? AND day_number > 0 ORDER BY day_number ASC', [level]);
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a full lesson by ID, structured like the old hsk1_data.js format
app.get('/api/lessons/:id', async (req, res) => {
  try {
    const lessonId = req.params.id;
    const lesson = await db.get('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Fetch relations
    const vocab = await db.all('SELECT * FROM vocab WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
    
    // Process grammar and nested examples/practice
    const rawGrammar = await db.all('SELECT * FROM grammar WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
    const grammar = [];
    for (const g of rawGrammar) {
      const examples = await db.all('SELECT cn, py, en, th FROM grammar_examples WHERE grammar_id = ? ORDER BY sort_order ASC', [g.id]);
      const practice = await db.get('SELECT prompt, words, answer FROM grammar_practice WHERE grammar_id = ?', [g.id]);
      
      const gItem = {
        title: g.title,
        explanation: g.explanation,
        examples: examples
      };
      
      if (practice) {
        gItem.practice = {
          prompt: practice.prompt,
          words: JSON.parse(practice.words),
          answer: JSON.parse(practice.answer)
        };
      }
      grammar.push(gItem);
    }
    
    // Dialogue
    const dialogueRaw = await db.get('SELECT id, title FROM dialogues WHERE lesson_id = ?', [lessonId]);
    let dialogue = null;
    if (dialogueRaw) {
      const lines = await db.all('SELECT speaker, cn, py, en, th FROM dialogue_lines WHERE dialogue_id = ? ORDER BY sort_order ASC', [dialogueRaw.id]);
      dialogue = {
        title: dialogueRaw.title,
        lines: lines
      };
    }
    
    // Quiz
    const quizzesRaw = await db.all('SELECT type, testWord, question, question_th, options, answer, explanation, explanation_th FROM quizzes WHERE lesson_id = ? ORDER BY sort_order ASC', [lessonId]);
    const quiz = quizzesRaw.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));
    
    // Construct final JSON exactly like the old window.HSK1_CURRICULUM format
    const fullLesson = {
      id: lesson.id,
      title: lesson.title,
      title_th: lesson.title_th,
      vocab: vocab,
      grammar: grammar,
      dialogue: dialogue,
      quiz: quiz
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
    const lessons = await db.all('SELECT id FROM lessons WHERE hsk_level = ? ORDER BY day_number ASC', [level]);
    
    // Fetch full data for each lesson.
    // In a real app we might paginate or only fetch active lesson, but to maintain
    // compatibility with the old app.js, we return everything at once.
    const curriculum = [];
    
    for (const l of lessons) {
      // (This is n+1 queries, but okay for trial/local usage. For prod, we'd use JOINs)
      const lesson = await db.get('SELECT * FROM lessons WHERE id = ?', [l.id]);
      const vocab = await db.all('SELECT character, pinyin, meaning, meaning_th, deconstruct, deconstruct_th, example_cn as exampleCn, example_py as examplePy, example_en as exampleEn, example_th FROM vocab WHERE lesson_id = ? ORDER BY sort_order ASC', [l.id]);
      
      const rawGrammar = await db.all('SELECT * FROM grammar WHERE lesson_id = ? ORDER BY sort_order ASC', [l.id]);
      const grammar = [];
      for (const g of rawGrammar) {
        const examples = await db.all('SELECT cn, py, en, th FROM grammar_examples WHERE grammar_id = ? ORDER BY sort_order ASC', [g.id]);
        const practice = await db.get('SELECT prompt, words, answer FROM grammar_practice WHERE grammar_id = ?', [g.id]);
        
        const gItem = { title: g.title, explanation: g.explanation, examples: examples };
        if (practice) {
          gItem.practice = { prompt: practice.prompt, words: JSON.parse(practice.words), answer: JSON.parse(practice.answer) };
        }
        grammar.push(gItem);
      }
      
      const dialogueRaw = await db.get('SELECT id, title FROM dialogues WHERE lesson_id = ?', [l.id]);
      let dialogue = null;
      if (dialogueRaw) {
        const lines = await db.all('SELECT speaker, cn, py, en, th FROM dialogue_lines WHERE dialogue_id = ? ORDER BY sort_order ASC', [dialogueRaw.id]);
        dialogue = { title: dialogueRaw.title, lines: lines };
      }
      
      const quizzesRaw = await db.all('SELECT type, testWord, question, question_th, options, answer, explanation, explanation_th FROM quizzes WHERE lesson_id = ? ORDER BY sort_order ASC', [l.id]);
      const quiz = quizzesRaw.map(q => ({ ...q, options: JSON.parse(q.options) }));
      
      curriculum.push({
        id: lesson.id,
        title: lesson.title,
      title_th: lesson.title_th,
        vocab: vocab,
        grammar: grammar,
        dialogue: dialogue,
        quiz: quiz
      });
    }
    
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
    if (fs.existsSync(progressFilePath)) {
      try {
        const fileContent = fs.readFileSync(progressFilePath, 'utf8');
        if (fileContent.trim()) {
          fileProgress = JSON.parse(fileContent);
        }
      } catch (fileErr) {
        console.error('Error reading student_progress.json:', fileErr);
      }
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
      
      fs.writeFileSync(progressFilePath, JSON.stringify(newFileProgress, null, 2), 'utf8');
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
    
    fs.writeFileSync(progressFilePath, JSON.stringify(fileProgress, null, 2), 'utf8');
    
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

init().catch(console.error);
