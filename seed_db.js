const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');
const staticLessons = require('./lessons');

async function insertLesson(db, lesson, level, dayNumber) {
  // Insert Lesson
  await db.run(
    `INSERT INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)`,
    [lesson.id, level, dayNumber, lesson.title, 60]
  );
  
  // Insert Vocab
  for (let v = 0; v < lesson.vocab.length; v++) {
    const word = lesson.vocab[v];
    await db.run(
      `INSERT INTO vocab (lesson_id, character, pinyin, meaning, deconstruct, example_cn, example_py, example_en, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lesson.id, word.character, word.pinyin, word.meaning, word.deconstruct || '', word.exampleCn || '', word.examplePy || '', word.exampleEn || '', v]
    );
  }
  
  // Insert Grammar
  for (let g = 0; g < lesson.grammar.length; g++) {
    const gram = lesson.grammar[g];
    const result = await db.run(
      `INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)`,
      [lesson.id, gram.title, gram.explanation, g]
    );
    const grammarId = result.lastID;
    
    // Insert Grammar Examples
    if (gram.examples) {
      for (let x = 0; x < gram.examples.length; x++) {
        const ex = gram.examples[x];
        await db.run(
          `INSERT INTO grammar_examples (grammar_id, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [grammarId, ex.cn, ex.py, ex.en, x]
        );
      }
    }
    
    // Insert Grammar Practice
    if (gram.practice) {
      await db.run(
        `INSERT INTO grammar_practice (grammar_id, prompt, words, answer) VALUES (?, ?, ?, ?)`,
        [grammarId, gram.practice.prompt, JSON.stringify(gram.practice.words), JSON.stringify(gram.practice.answer)]
      );
    }
  }
  
  // Insert Dialogue
  if (lesson.dialogue && lesson.dialogue.title) {
    const result = await db.run(
      `INSERT INTO dialogues (lesson_id, title) VALUES (?, ?)`,
      [lesson.id, lesson.dialogue.title]
    );
    const dialogueId = result.lastID;
    
    for (let l = 0; l < lesson.dialogue.lines.length; l++) {
      const line = lesson.dialogue.lines[l];
      await db.run(
        `INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [dialogueId, line.speaker, line.cn, line.py, line.en, l]
      );
    }
  }
  
  // Insert Quiz
  if (lesson.quiz) {
    for (let q = 0; q < lesson.quiz.length; q++) {
      const quiz = lesson.quiz[q];
      await db.run(
        `INSERT INTO quizzes (lesson_id, type, testWord, question, options, answer, explanation, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [lesson.id, quiz.type || 'text', quiz.testWord || '', quiz.question, JSON.stringify(quiz.options), quiz.answer, quiz.explanation || '', q]
      );
    }
  }
}

async function seed() {
  const db = await getDb();
  
  // Clean existing tables (for development)
  await db.exec(`
    DELETE FROM grammar_practice;
    DELETE FROM grammar_examples;
    DELETE FROM grammar;
    DELETE FROM dialogue_lines;
    DELETE FROM dialogues;
    DELETE FROM quizzes;
    DELETE FROM vocab;
    DELETE FROM lessons;
  `);

  // 1. Read and seed HSK 1
  const dataPath = path.join(__dirname, 'hsk1_data.js');
  let rawData = fs.readFileSync(dataPath, 'utf-8');
  
  rawData = rawData.replace('window.HSK1_CURRICULUM = ', '').trim();
  if (rawData.endsWith(';')) {
    rawData = rawData.slice(0, -1);
  }
  const hsk1Curriculum = JSON.parse(rawData);
  console.log(`Seeding ${hsk1Curriculum.length} HSK 1 lessons into the database...`);
  for (let i = 0; i < hsk1Curriculum.length; i++) {
    await insertLesson(db, hsk1Curriculum[i], 'hsk1', i + 1);
  }

  // 2. Read and seed HSK 2
  const hsk2Curriculum = staticLessons.lessons.hsk2 || [];
  console.log(`Seeding ${hsk2Curriculum.length} HSK 2 lessons into the database...`);
  for (let i = 0; i < hsk2Curriculum.length; i++) {
    await insertLesson(db, hsk2Curriculum[i], 'hsk2', i + 1);
  }

  // 3. Read and seed HSK 3
  const hsk3Curriculum = staticLessons.lessons.hsk3 || [];
  console.log(`Seeding ${hsk3Curriculum.length} HSK 3 lessons into the database...`);
  for (let i = 0; i < hsk3Curriculum.length; i++) {
    await insertLesson(db, hsk3Curriculum[i], 'hsk3', i + 1);
  }
  
  console.log('Database seeded successfully!');
}

seed().catch(err => console.error(err));

