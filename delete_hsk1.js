const { getDb } = require('./database');

async function main() {
    const db = await getDb();
    const rows = await db.all("SELECT id FROM lessons WHERE hsk_level = 'hsk1'");
    if (rows.length > 0) {
        console.log(`Deleting ${rows.length} HSK1 lessons...`);
        for (const r of rows) {
            // Get child IDs
            const grammars = await db.all("SELECT id FROM grammar WHERE lesson_id = ?", [r.id]);
            for (const g of grammars) {
                await db.run("DELETE FROM grammar_examples WHERE grammar_id = ?", [g.id]);
                await db.run("DELETE FROM grammar_practice WHERE grammar_id = ?", [g.id]);
            }
            
            const dialogues = await db.all("SELECT id FROM dialogues WHERE lesson_id = ?", [r.id]);
            for (const d of dialogues) {
                await db.run("DELETE FROM dialogue_lines WHERE dialogue_id = ?", [d.id]);
            }

            // Now delete main entities
            await db.run("DELETE FROM vocab WHERE lesson_id = ?", [r.id]);
            await db.run("DELETE FROM grammar WHERE lesson_id = ?", [r.id]);
            await db.run("DELETE FROM dialogues WHERE lesson_id = ?", [r.id]);
        }
        await db.run("DELETE FROM lessons WHERE hsk_level = 'hsk1'");
        console.log('Deleted successfully.');
    } else {
        console.log('No HSK1 lessons found.');
    }
}
main().catch(console.error);
