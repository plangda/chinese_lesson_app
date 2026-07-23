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
            console.log(`Clearing existing records for ${lesson_id} to ensure idempotency...`);
            // Clean up existing lesson data first (safe cascade)
            await db.run("DELETE FROM dialogue_lines WHERE dialogue_id IN (SELECT id FROM dialogues WHERE lesson_id = ?)", [lesson_id]);
            await db.run("DELETE FROM dialogues WHERE lesson_id = ?", [lesson_id]);
            await db.run("DELETE FROM grammar_practice WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id = ?)", [lesson_id]);
            await db.run("DELETE FROM grammar_examples WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id = ?)", [lesson_id]);
            await db.run("DELETE FROM grammar WHERE lesson_id = ?", [lesson_id]);
            await db.run("DELETE FROM vocab WHERE lesson_id = ?", [lesson_id]);
            await db.run("DELETE FROM lessons WHERE id = ?", [lesson_id]);

            // 1. Insert Lesson
            await db.run(
                "INSERT INTO lessons (id, hsk_level, day_number, title_en, title_th, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)",
                [
                    lesson_id, 
                    lesson_data.hsk_level, 
                    lesson_data.day_number, 
                    lesson_data.title || 'Unknown Theme', 
                    lesson_data.title_th || null, 
                    60
                ]
            );
            
            // 2. Insert Vocab
            if (lesson_data.vocab) {
                let sortOrder = 0;
                for (const word of lesson_data.vocab) {
                    await db.run(
                        `INSERT INTO vocab (
                            lesson_id, character, pinyin, meaning_en, meaning_th, 
                            deconstruct_en, deconstruct_th, example_cn, example_py, 
                            example_en, example_th, sort_order
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            lesson_id, 
                            word.character, 
                            word.pinyin, 
                            word.meaning, 
                            word.translation_th || '', 
                            word.deconstruct || '', 
                            word.deconstruct_th || '',
                            word.example_sentence || '', 
                            word.example_py || '', 
                            word.example_translation_en || '', 
                            word.example_translation_th || '', 
                            sortOrder++
                        ]
                    );
                }
            }
            
            // 3. Insert Grammar
            if (lesson_data.grammar) {
                let gSort = 0;
                for (const gram of lesson_data.grammar) {
                    await db.run(
                        "INSERT INTO grammar (lesson_id, title_en, title_th, explanation_en, explanation_th, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                        [
                            lesson_id, 
                            gram.title, 
                            gram.title_th || null, 
                            gram.explanation, 
                            gram.explanation_th || null, 
                            gSort++
                        ]
                    );
                    const grammar_id_rs = await db.all("SELECT last_insert_rowid() AS id");
                    const grammar_id = grammar_id_rs[0].id;
                    
                    if (gram.examples) {
                        let eSort = 0;
                        for (const ex of gram.examples) {
                            await db.run(
                                "INSERT INTO grammar_examples (grammar_id, cn, py, en, th, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                                [
                                    grammar_id, 
                                    ex.cn, 
                                    ex.py, 
                                    ex.en, 
                                    ex.th || null, 
                                    eSort++
                                ]
                            );
                        }
                    }
                    
                    if (gram.practice) {
                        const p = gram.practice;
                        await db.run(
                            "INSERT INTO grammar_practice (grammar_id, prompt_en, prompt_th, words, answer) VALUES (?, ?, ?, ?, ?)",
                            [
                                grammar_id, 
                                p.prompt, 
                                p.prompt_th || null, 
                                JSON.stringify(p.words || []), 
                                JSON.stringify(p.answer || [])
                            ]
                        );
                    }
                }
            }
            
            // 4. Insert Dialogue
            if (lesson_data.dialogue) {
                const dial = lesson_data.dialogue;
                await db.run("INSERT INTO dialogues (lesson_id, title_en, title_th) VALUES (?, ?, ?)", [lesson_id, dial.title, dial.title_th || null]);
                const dial_id_rs = await db.all("SELECT last_insert_rowid() AS id");
                const dial_id = dial_id_rs[0].id;
                
                if (dial.lines) {
                    let dSort = 0;
                    for (const line of dial.lines) {
                        await db.run(
                            "INSERT INTO dialogue_lines (dialogue_id, speaker, cn, py, en, th, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            [
                                dial_id, 
                                line.speaker || 'A', 
                                line.cn, 
                                line.py, 
                                line.en, 
                                line.th || null, 
                                dSort++
                            ]
                        );
                    }
                }
            }
            
            count++;
            console.log(`Inserted ${lesson_id} successfully.`);
        } catch (e) {
            console.error(`Error inserting ${lesson_id}:`, e);
        }
    }
    
    console.log(`Successfully imported ${count} lessons into standardized tables.`);
}

main().catch(console.error);
