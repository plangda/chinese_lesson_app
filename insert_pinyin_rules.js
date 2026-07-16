const { getDb } = require('./database');

async function insertPinyinRules() {
  const db = await getDb();
  const lessonId = 'hsk1_day0';
  
  try {
    // Check if lesson exists
    const existing = await db.get('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!existing) {
        console.log("Inserting Lesson 0...");
        await db.run(
            'INSERT INTO lessons (id, hsk_level, day_number, title, duration_minutes) VALUES (?, ?, ?, ?, ?)',
            [lessonId, 'hsk1', 0, 'Day 0: Pinyin & Tones', 15]
        );
    }
    
    // Clear old grammar if any
    await db.run('DELETE FROM grammar WHERE lesson_id = ?', [lessonId]);
    
    const grammarRules = [
      {
        title: "The Four Tones",
        explanation: "Mandarin Chinese has four main tones plus a neutral tone. The meaning of a word changes depending on the tone!\n- **1st Tone (mā)**: High and flat.\n- **2nd Tone (má)**: Rising, like a question.\n- **3rd Tone (mǎ)**: Dips down and comes back up.\n- **4th Tone (mà)**: Sharp and falling, like a command.\n- **Neutral Tone (ma)**: Short and light."
      },
      {
        title: "Third Tone Sandhi",
        explanation: "When two 3rd tones appear back-to-back, the first one changes to a 2nd tone. For example, **nǐ hǎo** (both 3rd tones) is pronounced as **ní hǎo**. You still write the pinyin as nǐ hǎo, but you pronounce it with a rising tone!"
      },
      {
        title: "Tone Change for 'Yi' (一) and 'Bu' (不)",
        explanation: "**Yi (一 - One)** is normally 1st tone. But before a 4th tone, it changes to 2nd tone (yí gè). Before any other tone, it changes to 4th tone (yì bēi).\n\n**Bu (不 - Not)** is normally 4th tone. But before another 4th tone, it changes to 2nd tone (bú shì)."
      },
      {
        title: "The 'ü' Rule",
        explanation: "The 'ü' sound (like 'ee' but with rounded lips) loses its dots when it comes after the initials **j, q, x, and y**. So, `ju`, `qu`, `xu`, and `yu` are actually pronounced with the 'ü' sound, NOT the regular 'u' sound!"
      }
    ];
    
    for (let i = 0; i < grammarRules.length; i++) {
        const rule = grammarRules[i];
        const grammarId = `${lessonId}_g${i+1}`;
        console.log(`Inserting grammar: ${rule.title}`);
        await db.run(
            'INSERT INTO grammar (lesson_id, title, explanation, sort_order) VALUES (?, ?, ?, ?)',
            [lessonId, rule.title, rule.explanation, i]
        );
    }
    
    console.log("Successfully inserted Pinyin Rules!");
  } catch (err) {
    console.error("Error inserting pinyin rules:", err);
  }
}

insertPinyinRules();
