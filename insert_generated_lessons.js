const fs = require('fs');
const readline = require('readline');
const { getDb } = require('./database');

function askQuestion(query) {
    const rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => rlInterface.question(query, (ans) => {
        rlInterface.close();
        resolve(ans.trim().toLowerCase());
    }));
}

async function main() {
    const db = await getDb();
    
    if (!fs.existsSync('generated_lessons.jsonl')) {
        console.log('No generated_lessons.jsonl found.');
        return;
    }

    const isForce = process.argv.includes('--force') || process.argv.includes('-f');
    if (isForce) {
        console.warn("\n⚠️  WARNING: You have enabled the --force flag. This will overwrite and replace existing vocabulary, grammar, and dialogue records in the database.");
        if (!process.stdin.isTTY) {
            console.log("Non-interactive environment detected. Cannot prompt for confirmation. Aborting force overwrite.");
            return;
        }
        const answer = await askQuestion("Are you sure you want to proceed? (yes/no): ");
        if (answer !== 'yes' && answer !== 'y') {
            console.log("Operation aborted by user.\n");
            return;
        }
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
        
        // 1. Completeness and Existence checks
        let lesson_exists = false;
        let vocab_count = 0;
        try {
            const lesson_rs = await db.get("SELECT id FROM lessons WHERE id = ?", [lesson_id]);
            lesson_exists = !!lesson_rs;
            
            const vocab_rs = await db.get("SELECT COUNT(*) as count FROM vocab WHERE lesson_id = ?", [lesson_id]);
            vocab_count = vocab_rs ? vocab_rs.count : 0;
        } catch (dbErr) {
            console.error(`Database check failed for ${lesson_id}:`, dbErr.message);
            continue;
        }

        let shouldOverwrite = false;
        if (lesson_exists && vocab_count > 0) {
            if (isForce) {
                shouldOverwrite = true;
            } else {
                console.log(`[Skipped] Lesson ${lesson_id} already exists with ${vocab_count} words. Use --force or -f to overwrite.`);
                continue;
            }
        } else if (lesson_exists && vocab_count === 0) {
            console.log(`[Incomplete/Corrupted] Lesson ${lesson_id} exists but has 0 vocabulary words. Automatically self-healing...`);
            shouldOverwrite = true;
        }

        let tx = null;
        try {
            // Start transaction
            tx = await db.transaction();

            if (shouldOverwrite) {
                console.log(`Clearing existing records for ${lesson_id} to prepare overwrite...`);
                await tx.run("DELETE FROM dialogue_lines WHERE dialogue_id IN (SELECT id FROM dialogues WHERE lesson_id = ?)", [lesson_id]);
                await tx.run("DELETE FROM dialogues WHERE lesson_id = ?", [lesson_id]);
                await tx.run("DELETE FROM grammar_practice WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id = ?)", [lesson_id]);
                await tx.run("DELETE FROM grammar_examples WHERE grammar_id IN (SELECT id FROM grammar WHERE lesson_id = ?)", [lesson_id]);
                await tx.run("DELETE FROM grammar WHERE lesson_id = ?", [lesson_id]);
                await tx.run("DELETE FROM vocab WHERE lesson_id = ?", [lesson_id]);
                await tx.run("DELETE FROM lessons WHERE id = ?", [lesson_id]);
            }

            // 1. Insert Lesson
            await tx.run(
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
                    await tx.run(
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
                    await tx.run(
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
                    const grammar_id_rs = await tx.all("SELECT last_insert_rowid() AS id");
                    const grammar_id = grammar_id_rs[0].id;
                    
                    if (gram.examples) {
                        let eSort = 0;
                        for (const ex of gram.examples) {
                            await tx.run(
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
                        await tx.run(
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
                await tx.run("INSERT INTO dialogues (lesson_id, title_en, title_th) VALUES (?, ?, ?)", [lesson_id, dial.title, dial.title_th || null]);
                const dial_id_rs = await tx.all("SELECT last_insert_rowid() AS id");
                const dial_id = dial_id_rs[0].id;
                
                if (dial.lines) {
                    let dSort = 0;
                    for (const line of dial.lines) {
                        await tx.run(
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
            
            // Commit transaction
            await tx.commit();
            count++;
            console.log(`Inserted ${lesson_id} successfully.`);
        } catch (e) {
            // Rollback transaction on failure
            if (tx) {
                try {
                    await tx.rollback();
                } catch (rollbackErr) {
                    console.error("Rollback failed:", rollbackErr.message);
                }
            }
            console.error(`Error inserting ${lesson_id}, changes rolled back:`, e);
        }
    }
    
    console.log(`Successfully processed lessons. Imported/updated ${count} lessons.`);
    
    // Run the automated radical formula generator
    console.log("Triggering auto-generation of Radical Fusion Formulas...");
    const automateRadicals = require('./setup_radical_fusion_auto');
    await automateRadicals();
    console.log("Database update completely finished!");
}

main().catch(console.error);
