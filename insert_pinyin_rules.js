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
      // ==========================================
      // TAB 2: Mouth & Airflow Guide (Sort 0 - 4)
      // ==========================================
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
      {
        title_en: "The 'ü' Vowel Sound & Mouth Position 👄",
        title_th: "การออกเสียงสระ 'ü' และรูปปาก 👄",
        explanation_en: "How to pronounce the **'ü'** sound correctly:\n1. Say and hold the **'ee'** sound (like in 'see').\n2. Without moving your tongue, **pucker your lips tightly into a tiny circle** (like blowing a kiss or whistling!).\n3. Keep the 'ee' sound going while your lips are rounded — that's the **'ü'** sound!",
        explanation_th: "วิธีออกเสียงสระ **'ü'** ให้ถูกต้องตามหลักกายภาพ:\n1. ออกเสียง **'อี'** ค้างไว้\n2. โดยที่ **ลิ้นยังคงอยู่ที่เดิม**, ให้ **ห่อริมฝีปากจู๋แน่นๆ เป็นวงกลมเล็ก** (เหมือนกำลังส่งจูบหรือเป่านกหวีด!)\n3. เปล่งเสียง 'อี' ออกมาขณะห่อปากจู๋ — จะได้เสียง **'ü'** ที่ถูกต้องทันที!"
      },

      // ==========================================
      // TAB 3: Tone & Phonetic Rules (Sort 5 - 12)
      // ==========================================
      {
        title_en: "Consonants & Basic Vowels 🅰️",
        title_th: "พยัญชนะและสระพื้นฐาน 🅰️",
        explanation_en: "Pinyin has **Initials** (Consonants) and **Finals** (Vowels).\n- **Basic Vowels:** a, o, e, i, u, ü\n- **Consonants:** b, p, m, f, d, t, n, l, g, k, h (and more below!).\nMost syllables start with a consonant and end with a vowel.",
        explanation_th: "พินอินประกอบด้วย **พยัญชนะต้น (Initials)** และ **สระ (Finals)**\n- **สระเดี่ยวพื้นฐาน:** a, o, e, i, u, ü\n- **พยัญชนะพื้นฐาน:** b, p, m, f, d, t, n, l, g, k, h\nพยางค์ส่วนใหญ่จะขึ้นต้นด้วยพยัญชนะและตามด้วยสระเสมอ!"
      },
      {
        title_en: "The Four Tones & Neutral Tone 🎢",
        title_th: "เสียงวรรณยุกต์ 4 เสียง และเสียงเบา 🎢",
        explanation_en: "Mandarin Chinese has four main tones plus a neutral tone. The meaning of a word changes depending on the tone!\n- **1st Tone (mā)**: High and flat (—).\n- **2nd Tone (má)**: Rising, like asking a question (/).\n- **3rd Tone (mǎ)**: Dips down low then curves up (\\/).\n- **4th Tone (mà)**: Sharp and falling, like a strong command (\\).\n- **Neutral Tone (ma)**: Short, light, and has **NO tone mark**!",
        explanation_th: "ภาษาจีนกลางมีเสียงวรรณยุกต์หลัก 4 เสียง และเสียงเบา ความหมายของคำจะเปลี่ยนไปตามระดับเสียงวรรณยุกต์!\n- **เสียงที่ 1 (mā)**: เสียงสูงและราบเรียบ (เทียบเท่าเสียงสามัญ: —)\n- **เสียงที่ 2 (má)**: เสียงชันขึ้น เหมือนถามคำถาม (เทียบเท่าเสียงจัตวา: /)\n- **เสียงที่ 3 (mǎ)**: เสียงต่ำลงแล้วโค้งขึ้น (เทียบเท่าเสียงเอก/กึ่งจัตวา: \\/)\n- **เสียงที่ 4 (mà)**: เสียงหนักและสั้นลงอย่างรวดเร็ว (เทียบเท่าเสียงโท: \\)\n- **เสียงเบา (ma)**: ออกเสียงสั้น เบา และ **ไม่มีเครื่องหมายวรรณยุกต์**!"
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
        title_en: "The 'ü' Dot Removal Rule (j, q, x, y) 😲",
        title_th: "กฎการตัดจุดของสระ 'ü' (j, q, x, y) 😲",
        explanation_en: "**The Dot Removal Rule:** The two dots on top of **'ü'** are dropped when combined with **j, q, x, and y** (`ju, qu, xu, yu`).\n\n💡 **Note:** When combined with **n** and **l**, the dots are **KEPT** (`nǚ, lǚ`) to avoid confusion with `nu` and `lu`!",
        explanation_th: "**กฎการละจุดของสระ 'ü':** สระ 'ü' จะ **ละจุดสองจุดข้างบนออก** เมื่อประสมกับพยัญชนะ **j, q, x และ y** (`ju, qu, xu, yu`)\n\n💡 **ข้อควรระวัง:** เมื่อประสมกับ **n** และ **l** จะ **ต้องคงจุดสองจุดไว้** เสมอ (`nǚ, lǚ`) เพื่อไม่ให้สับสนกับสระอูปกติ (`nu, lu`)!"
      },
      {
        title_en: "Vowel Contractions & Omitted Spelling Rules 📝",
        title_th: "กฎการลดรูปและละสระ 📝",
        explanation_en: "In standard Pinyin spelling rules, three main compound vowels are written in contracted forms when combined with consonants:\n- **iou** is written as **iu** (e.g. `liù` 六, `jiǔ` 九)\n- **uei** is written as **ui** (e.g. `duì` 对, `guǐ` 鬼)\n- **uen** is written as **un** (e.g. `lún` 轮, `chūn` 春)\n\n💡 Remember: Tone marks are placed on the **last vowel** in `iu` and `ui`!",
        explanation_th: "ตามหลักการเขียนพินอินมาตรฐาน สระผสม 3 ตัวนี้จะถูกลดรูปเมื่อมีพยัญชนะต้น:\n- **iou** เขียนลดรูปเป็น **iu** (เช่น `liù` 六, `jiǔ` 九)\n- **uei** เขียนลดรูปเป็น **ui** (เช่น `duì` 对, `guǐ` 鬼)\n- **uen** เขียนลดรูปเป็น **un** (เช่น `lún` 轮, `chūn` 春)\n\n💡 จำง่ายๆ: เครื่องหมายวรรณยุกต์จะใส่อยู่บน **สระตัวหลังสุด** เสมอในรูปย่อ `iu` และ `ui`!"
      },
      {
        title_en: "Tone Mark Placement Rules (a > o > e > i / u)",
        title_th: "กฎการใส่วรรณยุกต์บนสระ (a > o > e > i / u)",
        explanation_en: "Always place the tone mark on the main vowel in this order of priority: **a ➔ o ➔ e ➔ i / u**.\n- If **a** is present, mark **a** (e.g. `hǎo`).\n- Otherwise, mark **o** or **e** (e.g. `gōu`, `léi`).\n- If both **i** and **u** appear together (`iu` or `ui`), place the tone mark on the **SECOND (last)** vowel! (e.g. `liú`, `guǐ`).",
        explanation_th: "วางเครื่องหมายวรรณยุกต์ไว้บนสระหลักตามลำดับความสำคัญเสมอ: **a ➔ o ➔ e ➔ i / u**\n- ถ้ามี **a** ให้ใส่วรรณยุกต์บน **a** เสมอ (เช่น `hǎo`)\n- ถ้าไม่มี a ให้หา **o** หรือ **e** (เช่น `gōu`, `léi`)\n- ถ้าสระ **i** และ **u** อยู่คู่กัน (`iu` หรือ `ui`) ให้ใส่วรรณยุกต์บน **สระตัวหลังสุด** เสมอ! (เช่น `liú`, `guǐ`)"
      },
      {
        title_en: "The Pirate Sound (Erhua -r) 🏴‍☠️",
        title_th: "เสียงม้วนลิ้นท้ายคำ (Erhua -r) 🏴‍☠️",
        explanation_en: "Sometimes you'll see an **'r'** added to the end of a word, like `nǎr` (where) or `zhèr` (here). This is called 'Erhua'. Just curl your tongue back at the end of the word, like a pirate going 'Arrr'!",
        explanation_th: "บางครั้งจะเห็นตัว **'r'** หรือ **'er' (儿)** เติมท้ายคำ เช่น `nǎr` (ที่ไหน) หรือ `zhèr` (ที่นี่) เรียกว่า 'เอ๋อร์ฮว่า'\nวิธีออกเสียงคือให้ออกเสียงคำหน้าตามปกติ แล้วม้วนปลายลิ้นขึ้นในตอนท้าย (คล้ายเสียงโจรสลัด Arrr!)"
      },

      // ==========================================
      // TAB 5: Pinyin Typing Rules (Sort 13)
      // ==========================================
      {
        title_en: "Zero-Initials & IME Typing Rules ⌨️",
        title_th: "กฎการพิมพ์พินอินและอักษรนำศูนย์ (Zero-Initials ⌨️)",
        explanation_en: "Under standard typing rules, syllables without a consonant initial follow special spelling rules:\n- **Standalone Vowels:** `i` ➔ **yi**, `u` ➔ **wu**, `ü` ➔ **yu**\n- **Leading Vowels:** `ia` ➔ **ya**, `ie` ➔ **ye**, `ua` ➔ **wa**, `uo` ➔ **wo**, `üe` ➔ **yue**\n- **Apostrophe Separator ('):** Used to separate overlapping syllables, e.g. **Xī'ān** (西安) vs **xiān** (先).",
        explanation_th: "ตามมาตรฐานการพิมพ์ (IME) พยางค์ที่ไม่มีพยัญชนะต้นจะใช้กฎพิเศษ:\n- **สระเดี่ยวขึ้นต้น:** `i` ➔ **yi**, `u` ➔ **wu**, `ü` ➔ **yu**\n- **สระผสมขึ้นต้น:** `ia` ➔ **ya**, `ie` ➔ **ye**, `ua` ➔ **wa**, `uo` ➔ **wo**, `üe` ➔ **yue**\n- **เครื่องหมายแยกพยางค์ ('):** ใช้คั่นระหว่างสระที่ติดกัน เช่น **Xī'ān** (เมืองซีอาน) เพื่อไม่ให้สับสนกับ **xiān** (ก่อน/ล่วงหน้า)"
      }
    ];
    
    for (let i = 0; i < grammarRules.length; i++) {
        const rule = grammarRules[i];
        
        // Language Purity Guardrail Assertion
        const hasThaiInEn = /[\u0E00-\u0E7F]/.test(rule.title_en + rule.explanation_en);
        if (hasThaiInEn) {
          throw new Error(`🚨 GUARDRAIL ABORT: English field for rule '${rule.title_en}' contains Thai characters!`);
        }

        console.log(`Inserting grammar [${i}]: ${rule.title_en}`);
        await db.run(
            'INSERT INTO grammar (lesson_id, title_en, title_th, explanation_en, explanation_th, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [lessonId, rule.title_en, rule.title_th, rule.explanation_en, rule.explanation_th, i]
        );
    }
    
    console.log(`Successfully inserted comprehensive ${grammarRules.length} Pinyin Rules into Turso DB!`);
  } catch (err) {
    console.error("Error inserting pinyin rules:", err);
  }
}

insertPinyinRules();
