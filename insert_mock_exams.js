require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

const JSONL_PATH = path.join(__dirname, 'generated_mock_exams.jsonl');

async function insertMockExams() {
  if (!fs.existsSync(JSONL_PATH)) {
    console.log("No generated_mock_exams.jsonl file found. Generate questions first.");
    return;
  }

  console.log("Starting mock exam question bank seeding into Turso DB...");
  const db = await getDb();

  // Read JSONL file
  const lines = fs.readFileSync(JSONL_PATH, 'utf8').split('\n').filter(Boolean);
  let questions = [];
  for (const line of lines) {
    try {
      questions.push(JSON.parse(line));
    } catch (e) {}
  }

  if (questions.length === 0) {
    console.log("No valid question records found in JSONL file.");
    return;
  }

  // Fetch all database vocabulary to resolve target_vocab_words to vocab.id
  const vocabRows = await db.all('SELECT id, character FROM vocab');
  const charToIdMap = {};
  vocabRows.forEach(r => {
    charToIdMap[r.character] = r.id;
  });

  let insertedCount = 0;
  const tx = await db.transaction();

  try {
    // Clear existing mock exam questions to ensure clean state
    await tx.run('DELETE FROM mock_exam_questions');

    for (const q of questions) {
      const hskLevel = q.hsk_level || 'hsk1';
      const section = q.section || 'listening';
      const questionType = q.question_type || 'MCQ';
      const promptCn = q.prompt_cn || '';
      const promptPy = q.prompt_py || '';
      const promptEn = q.prompt_en || '';
      const promptTh = q.prompt_th || '';
      const audioUrl = q.audio_url || '';
      const imageUrl = q.image_url || '';
      
      let optionsArray = q.options_json || [];
      if (questionType === 'REORDER' && (!optionsArray || optionsArray.length === 0)) {
        optionsArray = promptCn.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean);
      }
      const optionsJson = JSON.stringify(optionsArray);
      const correctAnswer = q.correct_answer || '';
      const explanationEn = q.explanation_en || '';
      const explanationTh = q.explanation_th || '';

      // Resolve vocabulary IDs
      const words = q.target_vocab_words || [];
      const targetVocabIds = words.map(w => charToIdMap[w]).filter(Boolean);
      const targetVocabIdsJson = JSON.stringify(targetVocabIds);
      const targetGrammarIdsJson = JSON.stringify(q.target_grammar_ids || []);

      await tx.run(`
        INSERT INTO mock_exam_questions
        (hsk_level, section, question_type, prompt_cn, prompt_py, prompt_en, prompt_th, audio_url, image_url, options_json, correct_answer, explanation_en, explanation_th, target_vocab_ids, target_grammar_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        hskLevel,
        section,
        questionType,
        promptCn,
        promptPy,
        promptEn,
        promptTh,
        audioUrl,
        imageUrl,
        optionsJson,
        correctAnswer,
        explanationEn,
        explanationTh,
        targetVocabIdsJson,
        targetGrammarIdsJson
      ]);
      insertedCount++;
    }

    await tx.commit();
    console.log(`🎉 Successfully seeded ${insertedCount} mock exam questions into Turso Cloud DB!`);
  } catch (err) {
    await tx.rollback();
    console.error("❌ Seeding transaction failed and rolled back:", err.message);
  }
}

if (require.main === module) {
  insertMockExams();
}

module.exports = { insertMockExams };
