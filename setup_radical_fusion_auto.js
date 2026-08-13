const { getDb } = require('./database');
const hanzi = require('hanzi');

async function automateRadicals() {
  try {
    hanzi.start();
    const db = await getDb();
    
    console.log('Automating Radical Fusions using hanzi package...');
    
    // Clear existing formulas
    await db.exec(`DELETE FROM radical_fusion_formulas;`);

    // Fetch all radicals from DB
    const radicalsList = await db.all(`SELECT * FROM radicals`);
    const radicalsSet = new Set(radicalsList.map(r => r.symbol));
    const radicalsMap = {};
    radicalsList.forEach(r => radicalsMap[r.symbol] = r);

    // Fetch all single-char vocab
    const vocabList = await db.all(`SELECT * FROM vocab WHERE length(character) = 1`);

    let count = 0;
    for (const v of vocabList) {
      // Decompose character
      const decomp = hanzi.decompose(v.character);
      if (!decomp || !decomp.components1 || decomp.components1.length !== 2) continue;

      const [c1, c2] = decomp.components1;

      // Ensure neither are raw strokes
      if (c1.match(/[㇀-㇯]/) || c2.match(/[㇀-㇯]/)) continue;

      let anchor = null;
      let comp = null;
      
      // Check which component is the recognized radical
      if (radicalsSet.has(c1)) {
        anchor = c1;
        comp = c2;
      } else if (radicalsSet.has(c2)) {
        anchor = c2;
        comp = c1;
      }

      if (anchor && comp) {
        // Try to get meaning for the component
        const compDefs = hanzi.definitionLookup(comp);
        let compMeaning = comp; // Fallback
        if (compDefs && compDefs.length > 0) {
           compMeaning = compDefs[0].definition.split('/')[0]; // Take first English meaning
           // Clean up formatting like (particle used for emphasis)
           compMeaning = compMeaning.replace(/\(.*?\)/g, '').trim(); 
        }
        if (!compMeaning) compMeaning = comp;

        // Extract HSK level from lesson_id (e.g. hsk1_lesson1)
        let hsk_level = 1;
        if (v.lesson_id) {
          const match = v.lesson_id.match(/hsk(\d+)/);
          if (match) hsk_level = parseInt(match[1]);
        }
        
        const rData = radicalsMap[anchor];
        // Create the localized strings
        const en_str = `${rData.meaning_en} ${anchor} + ${compMeaning} ${comp} = ${v.character}`;
        const th_str = `${rData.meaning_th} ${anchor} + ${compMeaning} ${comp} = ${v.character}`;

        await db.run(
          `INSERT INTO radical_fusion_formulas 
            (anchor_id, anchor_symbol, component_symbol, result_character, vocab_id, deconstruct_en, deconstruct_th, hsk_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [anchor, anchor, comp, v.character, v.id, en_str, th_str, hsk_level]
        );
        count++;
        // console.log(`Added: ${en_str}`);
      }
    }
    
    console.log(`Successfully automated ${count} true radical fusions!`);
  } catch (e) {
    console.error('Error during setup:', e);
  }
}

if (require.main === module) {
  automateRadicals().then(() => process.exit(0));
} else {
  module.exports = automateRadicals;
}
