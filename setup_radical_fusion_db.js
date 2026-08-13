const { getDb } = require('./database');

async function run() {
  try {
    const db = await getDb();

    console.log('Re-seeding Radical Fusion Formulas with TRUE RADICALS only...');

    // 1. Clear existing formulas to re-seed cleanly
    await db.exec(`DELETE FROM radical_fusion_formulas;`);
    console.log('Cleared existing formulas.');

    // 2. Definitive list of True Radical Fusions for HSK1-3 (Anchor = Radical, Component = Other part, Result = Character)
    const trueRadicals = [
      // Water 氵 (shuǐ)
      { anchor: '氵', symbol: '氵', comp: '可', result: '河', hsk: 1, en: 'Water 氵 + Can 可 = 河 (River)', th: 'น้ำ 氵 + สามารถ 可 = 河 (แม่น้ำ)' },
      { anchor: '氵', symbol: '氵', comp: '每', result: '海', hsk: 2, en: 'Water 氵 + Each 每 = 海 (Sea)', th: 'น้ำ 氵 + แต่ละ 每 = 海 (ทะเล)' },
      { anchor: '氵', symbol: '氵', comp: '先', result: '洗', hsk: 2, en: 'Water 氵 + First 先 = 洗 (Wash)', th: 'น้ำ 氵 + ก่อน 先 = 洗 (ล้าง)' },
      { anchor: '氵', symbol: '氵', comp: '又', result: '汉', hsk: 1, en: 'Water 氵 + Right hand 又 = 汉 (Han)', th: 'น้ำ 氵 + มือขวา 又 = 汉 (ฮั่น)' }, 
      { anchor: '氵', symbol: '氵', comp: '去', result: '法', hsk: 3, en: 'Water 氵 + Go 去 = 法 (Law/Method)', th: 'น้ำ 氵 + ไป 去 = 法 (กฎหมาย/วิธี)' }, 
      { anchor: '氵', symbol: '氵', comp: '也', result: '池', hsk: 3, en: 'Water 氵 + Also 也 = 池 (Pond)', th: 'น้ำ 氵 + ก็ 也 = 池 (สระน้ำ)' }, 
      
      // Person 亻 (rén)
      { anchor: '亻', symbol: '亻', comp: '尔', result: '你', hsk: 1, en: 'Person 亻 + You 尔 = 你 (You)', th: 'คน 亻 + เธอ 尔 = 你 (คุณ)' },
      { anchor: '亻', symbol: '亻', comp: '也', result: '他', hsk: 1, en: 'Person 亻 + Also 也 = 他 (He)', th: 'คน 亻 + ก็ 也 = 他 (เขา)' },
      { anchor: '亻', symbol: '亻', comp: '门', result: '们', hsk: 1, en: 'Person 亻 + Door 门 = 们 (Plural suffix)', th: 'คน 亻 + ประตู 门 = 们 (พวก)' },
      { anchor: '亻', symbol: '亻', comp: '十', result: '什', hsk: 1, en: 'Person 亻 + Ten 十 = 什 (What)', th: 'คน 亻 + สิบ 十 = 什 (อะไร)' },
      { anchor: '亻', symbol: '亻', comp: '本', result: '体', hsk: 2, en: 'Person 亻 + Root 本 = 体 (Body)', th: 'คน 亻 + ราก 本 = 体 (ร่างกาย)' },
      { anchor: '亻', symbol: '亻', comp: '乍', result: '作', hsk: 1, en: 'Person 亻 + Suddenly 乍 = 作 (Do/Make)', th: 'คน 亻 + ทันที 乍 = 作 (ทำ)' },

      // Woman 女 (nǚ)
      { anchor: '女', symbol: '女', comp: '子', result: '好', hsk: 1, en: 'Woman 女 + Child 子 = 好 (Good)', th: 'ผู้หญิง 女 + เด็ก 子 = 好 (ดี)' },
      { anchor: '女', symbol: '女', comp: '马', result: '妈', hsk: 1, en: 'Woman 女 + Horse 马 = 妈 (Mother)', th: 'ผู้หญิง 女 + ม้า 马 = 妈 (แม่)' },
      { anchor: '女', symbol: '女', comp: '也', result: '她', hsk: 1, en: 'Woman 女 + Also 也 = เธอ (She)', th: 'ผู้หญิง 女 + ก็ 也 = เธอ (เธอ)' },
      { anchor: '女', symbol: '女', comp: '未', result: '妹', hsk: 2, en: 'Woman 女 + Not yet 未 = 妹 (Younger sister)', th: 'ผู้หญิง 女 + ยังไม่ 未 = 妹 (น้องสาว)' },
      { anchor: '女', symbol: '女', comp: '且', result: '姐', hsk: 2, en: 'Woman 女 + Moreover 且 = 姐 (Older sister)', th: 'ผู้หญิง 女 + ยิ่งกว่านั้น 且 = 姐 (พี่สาว)' },

      // Mouth 口 (kǒu)
      { anchor: '口', symbol: '口', comp: '乞', result: '吃', hsk: 1, en: 'Mouth 口 + Beg 乞 = 吃 (Eat)', th: 'ปาก 口 + ขอทาน 乞 = 吃 (กิน)' },
      { anchor: '口', symbol: '口', comp: '昌', result: '唱', hsk: 2, en: 'Mouth 口 + Prosper 昌 = 唱 (Sing)', th: 'ปาก 口 + เจริญ 昌 = 唱 (ร้องเพลง)' },
      { anchor: '口', symbol: '口', comp: '斤', result: '听', hsk: 1, en: 'Mouth 口 + Axe 斤 = 听 (Listen)', th: 'ปาก 口 + ขวาน 斤 = 听 (ฟัง)' },
      { anchor: '口', symbol: '口', comp: '马', result: '吗', hsk: 1, en: 'Mouth 口 + Horse 马 = 吗 (Question particle)', th: 'ปาก 口 + ม้า 马 = 吗 (ไหม)' },
      { anchor: '口', symbol: '口', comp: '尼', result: '呢', hsk: 1, en: 'Mouth 口 + Nun 尼 = 呢 (Question particle)', th: 'ปาก 口 + แม่ชี 尼 = 呢 (ล่ะ)' },
      { anchor: '口', symbol: '口', comp: '那', result: '哪', hsk: 1, en: 'Mouth 口 + That 那 = 哪 (Which)', th: 'ปาก 口 + นั้น 那 = 哪 (ไหน)' },

      // Sun 日 (rì)
      { anchor: '日', symbol: '日', comp: '寸', result: '时', hsk: 1, en: 'Sun 日 + Inch 寸 = 时 (Time)', th: 'พระอาทิตย์ 日 + นิ้ว 寸 = 时 (เวลา)' },
      { anchor: '日', symbol: '日', comp: '月', result: '明', hsk: 2, en: 'Sun 日 + Moon 月 = 明 (Bright/Clear)', th: 'พระอาทิตย์ 日 + พระจันทร์ 月 = 明 (สว่าง)' },
      { anchor: '日', symbol: '日', comp: '生', result: '星', hsk: 1, en: 'Sun 日 + Life 生 = 星 (Star)', th: 'พระอาทิตย์ 日 + ชีวิต 生 = 星 (ดาว)' },
      { anchor: '日', symbol: '日', comp: '免', result: '晚', hsk: 2, en: 'Sun 日 + Exempt 免 = 晚 (Evening/Late)', th: 'พระอาทิตย์ 日 + ยกเว้น 免 = 晚 (เย็น/สาย)' },

      // Wood/Tree 木 (mù)
      { anchor: '木', symbol: '木', comp: '木', result: '林', hsk: 2, en: 'Tree 木 + Tree 木 = 林 (Woods)', th: 'ต้นไม้ 木 + ต้นไม้ 木 = 林 (ป่า)' },
      { anchor: '木', symbol: '木', comp: '林', result: '森', hsk: 3, en: 'Tree 木 + Woods 林 = 森 (Forest)', th: 'ต้นไม้ 木 + ป่า 林 = 森 (ป่าทึบ)' },
      { anchor: '木', symbol: '木', comp: '子', result: '李', hsk: 1, en: 'Tree 木 + Child 子 = 李 (Plum/Surname)', th: 'ต้นไม้ 木 + เด็ก 子 = 李 (พลัม/แซ่หลี่)' },
      { anchor: '木', symbol: '木', comp: '寸', result: '村', hsk: 3, en: 'Tree 木 + Inch 寸 = 村 (Village)', th: 'ต้นไม้ 木 + นิ้ว 寸 = 村 (หมู่บ้าน)' },
      { anchor: '木', symbol: '木', comp: '对', result: '树', hsk: 3, en: 'Tree 木 + Right 对 = 树 (Tree)', th: 'ต้นไม้ 木 + ถูก 对 = 树 (ต้นไม้)' },

      // Heart 心/忄 (xīn)
      { anchor: '忄', symbol: '忄', comp: '亡', result: '忙', hsk: 2, en: 'Heart 忄 + Die 亡 = 忙 (Busy)', th: 'หัวใจ 忄 + ตาย 亡 = 忙 (ยุ่ง)' },
      { anchor: '忄', symbol: '忄', comp: '快', result: '快', hsk: 2, en: 'Heart 忄 + Decision 夬 = 快 (Fast/Happy)', th: 'หัวใจ 忄 + ตัดสินใจ 夬 = 快 (เร็ว/มีความสุข)' },
      { anchor: '忄', symbol: '忄', comp: '青', result: '情', hsk: 3, en: 'Heart 忄 + Green/Blue 青 = 情 (Feeling)', th: 'หัวใจ 忄 + เขียว/ฟ้า 青 = 情 (ความรู้สึก)' },
      { anchor: '心', symbol: '心', comp: '相', result: '想', hsk: 1, en: 'Heart 心 + Mutual 相 = 想 (Think/Want)', th: 'หัวใจ 心 + ซึ่งกันและกัน 相 = 想 (คิด/อยาก)' },
      { anchor: '心', symbol: '心', comp: '恩', result: '恩', hsk: 3, en: 'Heart 心 + Cause 因 = 恩 (Grace)', th: 'หัวใจ 心 + สาเหตุ 因 = 恩 (บุญคุณ)' },

      // Speech 讠 (yán)
      { anchor: '讠', symbol: '讠', comp: '兑', result: '说', hsk: 1, en: 'Speech 讠 + Exchange 兑 = 说 (Speak)', th: 'คำพูด 讠 + แลกเปลี่ยน 兑 = 说 (พูด)' },
      { anchor: '讠', symbol: '讠', comp: '青', result: '请', hsk: 1, en: 'Speech 讠 + Green/Blue 青 = 请 (Please/Invite)', th: 'คำพูด 讠 + เขียว/ฟ้า 青 = 请 (เชิญ/โปรด)' },
      { anchor: '讠', symbol: '讠', comp: '十', result: '计', hsk: 3, en: 'Speech 讠 + Ten 十 = 计 (Plan/Count)', th: 'คำพูด 讠 + สิบ 十 = 计 (แผน/นับ)' },
      { anchor: '讠', symbol: '讠', comp: '果', result: '课', hsk: 2, en: 'Speech 讠 + Fruit 果 = 课 (Class/Lesson)', th: 'คำพูด 讠 + ผลไม้ 果 = 课 (บทเรียน)' },
      { anchor: '讠', symbol: '讠', comp: '卖', result: '读', hsk: 1, en: 'Speech 讠 + Sell 卖 = 读 (Read)', th: 'คำพูด 讠 + ขาย 卖 = 读 (อ่าน)' }
    ];

    let count = 0;
    for (const seed of trueRadicals) {
      // Find vocab_id for result character if it exists in DB to link properly
      const vocabRow = await db.get(`SELECT id FROM vocab WHERE character = ? LIMIT 1`, [seed.result]);
      
      await db.run(
        `INSERT INTO radical_fusion_formulas 
          (anchor_id, anchor_symbol, component_symbol, result_character, vocab_id, deconstruct_en, deconstruct_th, hsk_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [seed.anchor, seed.symbol, seed.comp, seed.result, vocabRow ? vocabRow.id : null, seed.en, seed.th, seed.hsk]
      );
      count++;
    }
    
    console.log(`Successfully seeded ${count} TRUE radical fusions.`);
  } catch (e) {
    console.error('Error during setup:', e);
  } finally {
    process.exit(0);
  }
}

run();
