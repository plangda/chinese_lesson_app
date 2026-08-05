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
      // CATEGORY: Mouth & Airflow Guide (Tab 2) - Sort 0-3
      {
        title_en: "1. Retroflex Group: zh, ch, sh, r",
        title_th: "1. กลุ่มพยัญชนะม้วนลิ้น (Retroflex): zh, ch, sh, r",
        explanation_en: "The initials **zh, ch, sh, and r** require you to **curl the tip of your tongue backward** toward the roof of your mouth without touching it!\n- **zh**: Soft 'j' sound with tongue curled UP.\n- **ch**: 'ch' sound with tongue curled UP + strong puff of air.\n- **sh**: Soft 'sh' sound with tongue curled UP.\n- **r**: Voiced sound, like 'z' in 'pleasure' with tongue curled UP.",
        explanation_th: "พยัญชนะ **zh, ch, sh, r** เป็นกลุ่มเสียง **ม้วนลิ้น (Retroflex)** โดยการงอปลายลิ้นขึ้นไปหาเพดานปาก!\n- **zh**: คล้าย จ (งอปลายลิ้นขึ้นแตะเพดานปาก)\n- **ch**: คล้าย ช (ม้วนลิ้น + พ่นลมแรง)\n- **sh**: คล้าย ซ (ม้วนลิ้นให้ลมลอดผ่าน)\n- **r**: คล้าย ยผสมร (ม้วนลิ้น ออกเสียงสั่นในลำคอ ไม่รัวลิ้น!)"
      },
      {
        title_en: "2. Palatal Group: j, q, x",
        title_th: "2. กลุ่มพยัญชนะแบนลิ้นแตะฟันล่าง (Palatal): j, q, x",
        explanation_en: "For **j, q, and x**, keep your tongue **FLAT** with the tip resting behind your **LOWER front teeth**. Pull the corners of your lips back into a smile! 😊\n- **j**: Unaspirated, soft 'j' sound.\n- **q**: Aspirated, sharp 'ch' with a strong puff of air.\n- **x**: Soft 'sh/s' sound.",
        explanation_th: "พยัญชนะ **j, q, x** ให้ **แบนลิ้น** วางปลายลิ้นแตะไว้หลัง **ฟันล่าง** และยิ้มกว้าง 😊!\n- **j**: เสียง จิ (เบา ไม่พ่นลม)\n- **q**: เสียง ชิ (พ่นลมแรง)\n- **x**: เสียง ซิ (เสียงลมลอดผ่านซอกฟัน)"
      },
      {
        title_en: "3. Dental Sibilants: z, c, s",
        title_th: "3. กลุ่มพยัญชนะแบนลิ้นแตะหลังฟันบน (Dental): z, c, s",
        explanation_en: "For **z, c, and s**, keep your tongue **FLAT** (do NOT curl!) with the tip touching the back of your **UPPER front teeth**.\n- **z**: Unaspirated sound.\n- **c**: Aspirated with a strong puff of air.\n- **s**: Soft hiss sound.",
        explanation_th: "พยัญชนะ **z, c, s** ให้ **แบนลิ้น** (ห้ามม้วนลิ้นเด็ดขาด!) แล้วแตะปลายลิ้นที่หลัง **ฟันบน**\n- **z**: เสียง จึ (ไม่พ่นลม)\n- **c**: เสียง ชึ (พ่นลมแรง)\n- **s**: เสียง ซึ (เสียงซ่าผ่านซอกฟัน)"
      },
      {
        title_en: "Aspirated vs. Unaspirated Consonants 💨",
        title_th: "พยัญชนะพ่นลม vs ไม่พ่นลม (The Tissue Paper Test 💨)",
        explanation_en: "Chinese consonants are grouped into **Unaspirated (No Air)** vs. **Aspirated (Strong Air)** pairs:\n- **b** vs **p (💨)**\n- **d** vs **t (💨)**\n- **g** vs **k (💨)**\n- **j** vs **q (💨)**\n- **zh** vs **ch (💨)**\n- **z** vs **c (💨)**\n\n💡 **The Tissue Paper Test:** Hold a paper tissue in front of your mouth. Aspirated sounds (p, t, k, q, ch, c) will blow the tissue paper forward strongly!",
        explanation_th: "พยัญชนะจีนแบ่งเป็นคู่ **ไม่พ่นลม** กับ **พ่นลมแรง (Aspirated)**:\n- **b (ป)** คู่กับ **p (พ - พ่นลมแรง 💨)**\n- **d (ต)** คู่กับ **t (ท - พ่นลมแรง 💨)**\n- **g (ก)** คู่กับ **k (ค - พ่นลมแรง 💨)**\n- **j (จิ)** คู่กับ **q (ชิ - พ่นลมแรง 💨)**\n- **zh (จ-ม้วนลิ้น)** คู่กับ **ch (ช-ม้วนลิ้น พ่นลมแรง 💨)**\n- **z (จึ)** คู่กับ **c (ชึ - พ่นลมแรง 💨)**\n\n💡 **ทดสอบด้วยทิชชู (Tissue Paper Test):** ถือแผ่นทิชชูไว้หน้าปาก เมื่อออกเสียงกลุ่มพ่นลม (p, t, k, q, ch, c) แผ่นทิชชูจะขยับปลิวอย่างชัดเจน!"
      },

      // CATEGORY: Tone & General Rules (Tab 3) - Sort 4-7
      {
        title_en: "The Four Tones",
        title_th: "เสียงวรรณยุกต์ 4 เสียง",
        explanation_en: "Mandarin Chinese has four main tones plus a neutral tone. The meaning of a word changes depending on the tone!\n- **1st Tone (mā)**: High and flat (—).\n- **2nd Tone (má)**: Rising, like asking a question (/).\n- **3rd Tone (mǎ)**: Dips down low then curves up (\\/).\n- **4th Tone (mà)**: Sharp and falling, like a strong command (\\).\n- **Neutral Tone (ma)**: Short, light, and soft.",
        explanation_th: "ภาษาจีนกลางมีเสียงวรรณยุกต์หลัก 4 เสียง และเสียงเบา 1 เสียง ความหมายของคำจะเปลี่ยนไปตามระดับเสียงวรรณยุกต์!\n- **เสียงที่ 1 (mā)**: เสียงสูงและราบเรียบ (เทียบเท่าเสียงสามัญ: —)\n- **เสียงที่ 2 (má)**: เสียงชันขึ้น เหมือนถามคำถาม (เทียบเท่าเสียงจัตวา: /)\n- **เสียงที่ 3 (mǎ)**: เสียงต่ำลงแล้วโค้งขึ้น (เทียบเท่าเสียงเอก/กึ่งจัตวา: \\/)\n- **เสียงที่ 4 (mà)**: เสียงหนักและสั้นลงอย่างรวดเร็ว (เทียบเท่าเสียงโท: \\)\n- **เสียงเบา (ma)**: ออกเสียงสั้นและเบากว่าปกติ"
      },
      {
        title_en: "Third Tone Sandhi (3 + 3 ➔ 2 + 3)",
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
        explanation_en: "The 'ü' sound (like 'ee' with rounded lips) loses its two dots when it comes after the initials **j, q, x, and y**. So `ju`, `qu`, `xu`, and `yu` are actually pronounced with the 'ü' sound, NOT the regular 'u' sound!",
        explanation_th: "สระ 'ü' (ออกเสียง อี ทำปากจู๋) จะ **ละจุดสองจุดข้างบนออก** เมื่อประสมกับพยัญชนะ **j, q, x และ y**\nดังนั้นคำว่า `ju`, `qu`, `xu` และ `yu` จึงออกเสียงด้วยสระ 'ü' ไม่ใช่สระ 'u' (อู) ปกติ!"
      },

      // CATEGORY: Typing Rules (Tab 5) - Sort 8
      {
        title_en: "Pinyin Typing Rules & Zero-Initials ⌨️",
        title_th: "กฎการพิมพ์พินอินและอักษรนำศูนย์ (Zero-Initials ⌨️)",
        explanation_en: "Under standard HSK typing rules, syllables without a consonant initial follow special spelling rules:\n- **Standalone Vowels:** `i` ➔ **yi**, `u` ➔ **wu**, `ü` ➔ **yu**\n- **Leading Vowels:** `ia` ➔ **ya**, `ie` ➔ **ye**, `ua` ➔ **wa**, `uo` ➔ **wo**, `üe` ➔ **yue**\n- **Contractions:** `iou` ➔ **iu** (`liù`), `uei` ➔ **ui** (`duì`), `uen` ➔ **un** (`lún`)\n- **Apostrophe Separator ('):** Used to separate overlapping syllables, e.g. **Xī'ān** (西安) vs **xiān** (先).",
        explanation_th: "ตามมาตรฐานการพิมพ์ภาษาจีน (IME) พยางค์ที่ไม่มีพยัญชนะต้นจะใช้กฎพิเศษดังนี้:\n- **สระเดี่ยวขึ้นต้น:** `i` ➔ **yi**, `u` ➔ **wu**, `ü` ➔ **yu**\n- **สระผสมขึ้นต้น:** `ia` ➔ **ya**, `ie` ➔ **ye**, `ua` ➔ **wa**, `uo` ➔ **wo**, `üe` ➔ **yue**\n- **รูปย่อสระ:** `iou` ➔ **iu** (เช่น `liù`), `uei` ➔ **ui** (เช่น `duì`), `uen` ➔ **un** (เช่น `lún`)\n- **เครื่องหมายแยกพยางค์ ('):** ใช้คั่นระหว่างสระติดกัน เช่น **Xī'ān** (เมืองซีอาน) เพื่อไม่ให้สับสนกับ **xiān** (ก๋วยเตี๋ยว/ก่อน)"
      }
    ];
    
    for (let i = 0; i < grammarRules.length; i++) {
        const rule = grammarRules[i];
        
        // Language Purity Guardrail Assertion
        const hasThaiInEn = /[\u0E00-\u0E7F]/.test(rule.title_en + rule.explanation_en);
        if (hasThaiInEn) {
          throw new Error(`🚨 GUARDRAIL ABORT: English field for rule '${rule.title_en}' contains Thai characters!`);
        }

        console.log(`Inserting grammar: ${rule.title_en}`);
        await db.run(
            'INSERT INTO grammar (lesson_id, title_en, title_th, explanation_en, explanation_th, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [lessonId, rule.title_en, rule.title_th, rule.explanation_en, rule.explanation_th, i]
        );
    }
    
    console.log("Successfully inserted comprehensive 9 Pinyin Rules into Turso DB!");
  } catch (err) {
    console.error("Error inserting pinyin rules:", err);
  }
}

insertPinyinRules();
