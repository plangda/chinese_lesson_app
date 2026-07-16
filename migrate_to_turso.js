require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.join(__dirname, 'hanpath.db');

async function migrate() {
  console.log('Connecting to local SQLite database...');
  const localDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('Connecting to Turso Cloud database...');
  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    console.log('Creating tables in Turso...');
    await tursoClient.executeMultiple(`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        hsk_level TEXT NOT NULL,
        day_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 60
      );

      CREATE TABLE IF NOT EXISTS vocab (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id TEXT REFERENCES lessons(id),
        character TEXT NOT NULL,
        pinyin TEXT NOT NULL,
        meaning TEXT NOT NULL,
        deconstruct TEXT,
        example_cn TEXT,
        example_py TEXT,
        example_en TEXT,
        sort_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS grammar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id TEXT REFERENCES lessons(id),
        title TEXT NOT NULL,
        explanation TEXT,
        sort_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS grammar_examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grammar_id INTEGER REFERENCES grammar(id),
        cn TEXT NOT NULL,
        py TEXT NOT NULL,
        en TEXT NOT NULL,
        sort_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS grammar_practice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grammar_id INTEGER REFERENCES grammar(id),
        prompt TEXT NOT NULL,
        words TEXT NOT NULL,
        answer TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dialogues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id TEXT REFERENCES lessons(id),
        title TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dialogue_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dialogue_id INTEGER REFERENCES dialogues(id),
        speaker TEXT NOT NULL,
        cn TEXT NOT NULL,
        py TEXT NOT NULL,
        en TEXT NOT NULL,
        sort_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id TEXT REFERENCES lessons(id),
        type TEXT DEFAULT 'text',
        testWord TEXT,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        answer TEXT NOT NULL,
        explanation TEXT NOT NULL,
        sort_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        user_id TEXT PRIMARY KEY,
        hsk_level TEXT DEFAULT 'hsk1',
        streak_count INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        time_spent_minutes INTEGER DEFAULT 0,
        last_study_date TEXT,
        reminder_time TEXT DEFAULT '09:00',
        completed_lessons TEXT DEFAULT '[]',
        has_taken_placement_test INTEGER DEFAULT 0,
        last_reminder_date TEXT
      );
    `);

    // Migrate lessons
    const lessons = await localDb.all('SELECT * FROM lessons');
    console.log('Migrating ' + lessons.length + ' lessons...');
    for (const l of lessons) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)',
        args: [l.id, l.hsk_level, l.day_number, l.title, l.duration_minutes]
      });
    }

    // Migrate vocab
    const vocab = await localDb.all('SELECT * FROM vocab');
    console.log('Migrating ' + vocab.length + ' vocab words...');
    for (const v of vocab) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO vocab (id, lesson_id, character, pinyin, meaning, deconstruct, example_cn, example_py, example_en, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [v.id, v.lesson_id, v.character, v.pinyin, v.meaning, v.deconstruct, v.example_cn, v.example_py, v.example_en, v.sort_order]
      });
    }

    // Migrate grammar
    const grammar = await localDb.all('SELECT * FROM grammar');
    console.log('Migrating ' + grammar.length + ' grammar points...');
    for (const g of grammar) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO grammar (id, lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?, ?)',
        args: [g.id, g.lesson_id, g.title, g.explanation, g.sort_order]
      });
    }

    // Migrate grammar_examples
    const grammar_examples = await localDb.all('SELECT * FROM grammar_examples');
    console.log('Migrating ' + grammar_examples.length + ' grammar examples...');
    for (const ge of grammar_examples) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO grammar_examples (id, grammar_id, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        args: [ge.id, ge.grammar_id, ge.cn, ge.py, ge.en, ge.sort_order]
      });
    }

    // Migrate grammar_practice
    const grammar_practice = await localDb.all('SELECT * FROM grammar_practice');
    console.log('Migrating ' + grammar_practice.length + ' grammar practices...');
    for (const gp of grammar_practice) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO grammar_practice (id, grammar_id, prompt, words, answer) VALUES (?, ?, ?, ?, ?)',
        args: [gp.id, gp.grammar_id, gp.prompt, gp.words, gp.answer]
      });
    }

    // Migrate dialogues
    const dialogues = await localDb.all('SELECT * FROM dialogues');
    console.log('Migrating ' + dialogues.length + ' dialogues...');
    for (const d of dialogues) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO dialogues (id, lesson_id, title) VALUES (?, ?, ?)',
        args: [d.id, d.lesson_id, d.title]
      });
    }

    // Migrate dialogue_lines
    const dialogue_lines = await localDb.all('SELECT * FROM dialogue_lines');
    console.log('Migrating ' + dialogue_lines.length + ' dialogue lines...');
    for (const dl of dialogue_lines) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO dialogue_lines (id, dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [dl.id, dl.dialogue_id, dl.speaker, dl.cn, dl.py, dl.en, dl.sort_order]
      });
    }

    // Migrate quizzes
    const quizzes = await localDb.all('SELECT * FROM quizzes');
    console.log('Migrating ' + quizzes.length + ' quizzes...');
    for (const q of quizzes) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO quizzes (id, lesson_id, type, testWord, question, options, answer, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [q.id, q.lesson_id, q.type, q.testWord, q.question, q.options, q.answer, q.explanation, q.sort_order]
      });
    }

    // Migrate user_progress
    const user_progress = await localDb.all('SELECT * FROM user_progress');
    console.log('Migrating ' + user_progress.length + ' user progress records...');
    for (const up of user_progress) {
      await tursoClient.execute({
        sql: 'INSERT OR IGNORE INTO user_progress (user_id, hsk_level, streak_count, score, time_spent_minutes, last_study_date, reminder_time, completed_lessons, has_taken_placement_test, last_reminder_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [up.user_id, up.hsk_level, up.streak_count, up.score, up.time_spent_minutes, up.last_study_date, up.reminder_time, up.completed_lessons, up.has_taken_placement_test, up.last_reminder_date]
      });
    }

    console.log('✅ Migration to Turso successfully completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
