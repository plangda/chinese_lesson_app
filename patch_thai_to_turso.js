#!/usr/bin/env node
/**
 * patch_thai_to_turso.js
 * ----------------------
 * Reads patched lesson data from generated_lessons.jsonl and pushes Thai translations
 * to Turso via targeted UPDATE SQL statements. Complements patch_thai_translations.py
 * (which handles LLM translation and JSONL cache updates).
 *
 * Usage:
 *   node patch_thai_to_turso.js           # push all lessons in state file
 *   node patch_thai_to_turso.js hsk1      # push hsk1 lessons only
 *   node patch_thai_to_turso.js hsk1 3    # push first 3 hsk1 lessons
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getDb } = require('./database');

const JSONL_PATH = 'generated_lessons.jsonl';
const STATE_PATH = 'patched_lessons_state.json';

async function loadLessons() {
  const lessons = {};
  if (!fs.existsSync(JSONL_PATH)) {
    return lessons;
  }
  const fileStream = fs.createReadStream(JSONL_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (data.id) {
        lessons[data.id] = data;
      }
    } catch (e) {
      // skip malformed lines
    }
  }
  return lessons;
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch (e) {
    return {};
  }
}

async function patchDbForLesson(db, lesson) {
  const lessonId = lesson.id;

  // Patch lessons table
  await db.run('UPDATE lessons SET title_th = ? WHERE id = ?', [
    lesson.title_th || '',
    lessonId,
  ]);

  // Patch vocab rows
  for (const v of lesson.vocab || []) {
    await db.run(
      'UPDATE vocab SET meaning_th = ?, deconstruct_th = ?, example_th = ? WHERE lesson_id = ? AND character = ?',
      [
        v.translation_th || '',
        v.deconstruct_th || '',
        v.example_translation_th || '',
        lessonId,
        v.character || '',
      ]
    );
  }

  // Patch grammar + examples + practice
  for (const g of lesson.grammar || []) {
    const grammarRows = await db.all(
      'SELECT id FROM grammar WHERE lesson_id = ? AND title_en = ?',
      [lessonId, g.title || '']
    );
    if (grammarRows && grammarRows.length > 0) {
      const grammarId = grammarRows[0].id;

      await db.run('UPDATE grammar SET title_th = ?, explanation_th = ? WHERE id = ?', [
        g.title_th || '',
        g.explanation_th || '',
        grammarId,
      ]);

      // Grammar examples
      const exRows = await db.all(
        'SELECT id FROM grammar_examples WHERE grammar_id = ? ORDER BY sort_order',
        [grammarId]
      );
      for (let i = 0; i < exRows.length; i++) {
        const exId = exRows[i].id;
        const examples = g.examples || [];
        const thVal = examples[i] ? examples[i].th || '' : '';
        await db.run('UPDATE grammar_examples SET th = ? WHERE id = ?', [thVal, exId]);
      }

      // Grammar practice
      const prac = g.practice || {};
      await db.run('UPDATE grammar_practice SET prompt_th = ? WHERE grammar_id = ?', [
        prac.prompt_th || '',
        grammarId,
      ]);
    }
  }

  // Patch dialogues + lines
  const dial = lesson.dialogue || {};
  const dialRows = await db.all('SELECT id FROM dialogues WHERE lesson_id = ?', [lessonId]);
  if (dialRows && dialRows.length > 0) {
    const dialId = dialRows[0].id;

    await db.run('UPDATE dialogues SET title_th = ? WHERE id = ?', [
      dial.title_th || '',
      dialId,
    ]);

    const lineRows = await db.all(
      'SELECT id FROM dialogue_lines WHERE dialogue_id = ? ORDER BY sort_order',
      [dialId]
    );
    const lines = dial.lines || [];
    for (let i = 0; i < lineRows.length; i++) {
      const lineId = lineRows[i].id;
      const thVal = lines[i] ? lines[i].th || '' : '';
      await db.run('UPDATE dialogue_lines SET th = ? WHERE id = ?', [thVal, lineId]);
    }
  }
}

async function main() {
  const filterLevel = process.argv[2] || null;
  const limitStr = process.argv[3];
  const limit = limitStr ? parseInt(limitStr, 10) : null;

  console.log('Loading lessons from JSONL...');
  const lessons = await loadLessons();
  console.log(`Loaded ${Object.keys(lessons).length} lessons.`);

  const state = loadState();
  console.log(`State file has ${Object.keys(state).length} patched lessons.`);

  // Filter lessons: only those in state file (that have been LLM-patched)
  const candidates = Object.entries(state)
    .filter(([lid]) => !filterLevel || lid.startsWith(filterLevel))
    .map(([lid]) => ({ id: lid, lesson: lessons[lid] }))
    .filter(({ lesson }) => lesson); // only if JSONL has the lesson

  console.log(`${candidates.length} lessons match filter` + (filterLevel ? ` (${filterLevel})` : '') + '.');

  if (candidates.length === 0) {
    console.log('No lessons to patch.');
    return;
  }

  const db = await getDb();
  let pushed = 0;

  for (const { id: lessonId, lesson } of candidates) {
    if (limit && pushed >= limit) {
      console.log(`Reached limit of ${limit}. Stopping.`);
      break;
    }

    console.log(`\n[${pushed + 1}/${candidates.length}] Pushing ${lessonId} to Turso...`);
    try {
      await patchDbForLesson(db, lesson);
      console.log(`  ✓ Turso updated for ${lessonId}`);
      pushed++;
    } catch (err) {
      console.error(`  ✗ Failed to patch ${lessonId}: ${err.message}`);
    }
  }

  console.log(`\nDone. Pushed ${pushed}/${candidates.length} lessons to Turso.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
