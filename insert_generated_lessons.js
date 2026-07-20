const fs = require('fs');
const readline = require('readline');
const { getDb } = require('./database');

async function main() {
    const db = await getDb();
    
    if (!fs.existsSync('generated_lessons.jsonl')) {
        console.log('No generated_lessons.jsonl found.');
        return;
    }

    const fileStream = fs.createReadStream('generated_lessons.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        const lesson_data = JSON.parse(line);
        const lesson_id = lesson_data.id;
        
        try {
            // 1. Insert Lesson
            await db.run(
                "INSERT OR REPLACE INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)",
                [lesson_id, lesson_data.hsk_level, lesson_data.day_number, lesson_data.title || 'Unknown Theme', 60]
            );
            
            // 2. Insert Vocab
            if (lesson_data.vocab) {
                let sortOrder = 0;
                for (const word of lesson_data.vocab) {
                    await db.run(
                        `INSERT INTO vocab (lesson_id, character, pinyin, meaning, deconstruct, example_cn, example_py, example_en, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [lesson_id, word.character, word.pinyin, word.meaning, word.deconstruct || '', 
                         word.example_cn || '', word.example_py || '', word.example_en || '', sortOrder++]
                    );
                }
            }
            
            // 3. Insert Grammar
            if (lesson_data.grammar) {
                let gSort = 0;
                for (const gram of lesson_data.grammar) {
                    await db.run(
                        "INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)",
                        [lesson_id, gram.title, gram.explanation, gSort++]
                    );
                    const grammar_id_rs = await db.all("SELECT last_insert_rowid() AS id");
                    const grammar_id = grammar_id_rs[0].id;
                    
                    if (gram.examples) {
                        let eSort = 0;
                        for (const ex of gram.examples) {
                            await db.run(
                                "INSERT INTO grammar_examples (grammar_id, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?)",
                                [grammar_id, ex.cn, ex.py, ex.en, eSort++]
                            );
                        }
                    }
                    
                    if (gram.practice) {
                        const p = gram.practice;
                        await db.run(
                            "INSERT INTO grammar_practice (grammar_id, prompt, words, answer) VALUES (?, ?, ?, ?)",
                            [grammar_id, p.prompt, JSON.stringify(p.words || []), JSON.stringify(p.answer || [])]
                        );
                    }
                }
            }
            
            // 4. Insert Dialogue
            if (lesson_data.dialogue) {
                const dial = lesson_data.dialogue;
                await db.run("INSERT INTO dialogues (lesson_id, title) VALUES (?, ?)", [lesson_id, dial.title]);
                const dial_id_rs = await db.all("SELECT last_insert_rowid() AS id");
                const dial_id = dial_id_rs[0].id;
                
                if (dial.lines) {
                    let dSort = 0;
                    for (const line of dial.lines) {
                        await db.run(
                            "INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                            [dial_id, line.speaker || 'A', line.cn, line.py, line.en, dSort++]
                        );
                    }
                }
            }
            
            // 5. Insert Quiz
            if (lesson_data.quiz) {
                let qSort = 0;
                for (const q of lesson_data.quiz) {
                    await db.run(
                        `INSERT INTO quizzes (lesson_id, type, testWord, question, options, answer, explanation, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [lesson_id, q.type || 'vocab', q.testWord || '', q.question || '', 
                         JSON.stringify(q.options || []), q.answer || '', q.explanation || '', qSort++]
                    );
                }
            }
            count++;
            console.log(`Inserted ${lesson_id}`);
        } catch (e) {
            console.error(`Error inserting ${lesson_id}:`, e);
        }
    }
    
    console.log(`Successfully imported ${count} lessons.`);
}

main().catch(console.error);
