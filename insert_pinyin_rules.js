const { getDb } = require('./database');

async function insertPinyinRules() {
  const db = await getDb();
  const lessonId = 'hsk1_day0';
  
  try {
    // Check if lesson exists
    const existing = await db.get('SELECT * FROM lessons WHERE id = ?', [lessonId]);
    if (!existing) {
        console.log("Inserting Lesson 0 into lessons table...");
        await db.run(
            'INSERT INTO lessons (id, hsk_level, day_number, title_en, title_th, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)',
            [lessonId, 'hsk1', 0, 'Day 0: Pinyin & Tones', 'บทที่ 0: ระบบพินอินและเสียงวรรณยุกต์', 15]
        );
    } else {
        await db.run(
            'UPDATE lessons SET title_en = ?, title_th = ?, duration_minutes = ? WHERE id = ?',
            ['Day 0: Pinyin & Tones', 'บทที่ 0: ระบบพินอินและเสียงวรรณยุกต์', 15, lessonId]
        );
    }
    
    // Clear old grammar if any
    await db.run('DELETE FROM grammar WHERE lesson_id = ?', [lessonId]);
    
    const grammarRules = [
      {
        title_en: "The Four Tones",
        title_th: "เสียงวรรณยุกต์ 4 เสียง",
        explanation_en: "Mandarin Chinese has four main tones plus a neutral tone. The meaning of a word changes depending on the tone!\n- **1st Tone (mā)**: High and flat.\n- **2nd Tone (má)**: Rising, like a question.\n- **3rd Tone (mǎ)**: Dips down and comes back up.\n- **4th Tone (mà)**: Sharp and falling, like a command.\n- **Neutral Tone (ma)**: Short and light.",
        explanation_th: "ภาษาจีนกลางมีเสียงวรรณยุกต์หลัก 4 เสียง และเสียงเบา 1 เสียง ความหมายของคำจะเปลี่ยนไปตามระดับเสียงวรรณยุกต์!\n- **เสียงที่ 1 (mā)**: เสียงสูงและราบเรียบ (เทียบเท่าเสียงสามัญ)\n- **เสียงที่ 2 (má)**: เสียงชันขึ้น เหมือนเวลาถามคำถาม (เทียบเท่าเสียงจัตวา)\n- **เสียงที่ 3 (mǎ)**: เสียงต่ำลงแล้วโค้งขึ้น (เทียบเท่าเสียงเอก/กึ่งจัตวา)\n- **เสียงที่ 4 (mà)**: เสียงหนักและสั้นลงอย่างรวดเร็ว เหมือนการออกคำสั่ง (เทียบเท่าเสียงโท)\n- **เสียงเบา (ma)**: ออกเสียงสั้นและเบากว่าปกติ"
      },
      {
        title_en: "Third Tone Sandhi",
        title_th: "การเปลี่ยนเสียงวรรณยุกต์ เสียง 3 (Third Tone Sandhi)",
        explanation_en: "When two 3rd tones appear back-to-back, the first one changes to a 2nd tone. For example, **nǐ hǎo** (both 3rd tones) is pronounced as **ní hǎo**. You still write the pinyin as nǐ hǎo, but you pronounce it with a rising tone!",
        explanation_th: "เมื่อมีเสียงวรรณยุกต์เสียงที่ 3 อยู่ติดกัน 2 คำ คำแรกจะเปลี่ยนการออกเสียงเป็น **เสียงที่ 2** (เสียงพุ่งขึ้น)\nตัวอย่างเช่น **nǐ hǎo** (เสียง 3 ทั้งคู่) ออกเสียงจริงเป็น **ní hǎo** แต่เวลาเขียนพินอินยังคงสัญลักษณ์ nǐ hǎo เดิมไว้!"
      },
      {
        title_en: "Tone Change for 'Yi' (一) and 'Bu' (不)",
        title_th: "การเปลี่ยนเสียงของ 'Yi' (一) และ 'Bu' (不)",
        explanation_en: "**Yi (一 - One)** is normally 1st tone. But before a 4th tone, it changes to 2nd tone (yí gè). Before any other tone, it changes to 4th tone (yì bēi).\n\n**Bu (不 - Not)** is normally 4th tone. But before another 4th tone, it changes to 2nd tone (bú shì).",
        explanation_th: "**Yi (一 - หนึ่ง)** ตามปกติเป็นเสียงที่ 1 แต่เมื่อนำหน้าคำที่เป็น **เสียงที่ 4** จะเปลี่ยนเป็นเสียงที่ 2 (เช่น yí gè) และเมื่อนำหน้าเสียงอื่น (1, 2, 3) จะเปลี่ยนเป็นเสียงที่ 4 (เช่น yì bēi)\n\n**Bu (不 - ไม่)** ตามปกติเป็นเสียงที่ 4 แต่เมื่อนำหน้าคำที่เป็น **เสียงที่ 4** จะเปลี่ยนเป็นเสียงที่ 2 (เช่น bú shì)"
      },
      {
        title_en: "The 'ü' Rule",
        title_th: "กฎการตัดจุดของสระ 'ü'",
        explanation_en: "The 'ü' sound (like 'ee' but with rounded lips) loses its dots when it comes after the initials **j, q, x, and y**. So, `ju`, `qu`, `xu`, and `yu` are actually pronounced with the 'ü' sound, NOT the regular 'u' sound!",
        explanation_th: "สระ 'ü' (ออกเสียง อี ทำปากจู๋) จะ **ละจุดสองจุดข้างบนออก** เมื่อประสมกับพยัญชนะ **j, q, x และ y**\nดังนั้นคำว่า `ju`, `qu`, `xu` และ `yu` จึงออกเสียงด้วยสระ 'ü' ไม่ใช่สระ 'u' (อู) ปกติ!"
      }
    ];
    
    for (let i = 0; i < grammarRules.length; i++) {
        const rule = grammarRules[i];
        console.log(`Inserting grammar: ${rule.title_en}`);
        await db.run(
            'INSERT INTO grammar (lesson_id, title_en, title_th, explanation_en, explanation_th, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [lessonId, rule.title_en, rule.title_th, rule.explanation_en, rule.explanation_th, i]
        );
    }
    
    console.log("Successfully inserted Pinyin Rules into Turso DB!");
  } catch (err) {
    console.error("Error inserting pinyin rules:", err);
  }
}

insertPinyinRules();
