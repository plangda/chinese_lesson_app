const { getDb } = require('./database');

async function run() {
  try {
    const db = await getDb();
    
    console.log('Creating radicals table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS radicals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        pinyin TEXT,
        meaning_en TEXT,
        meaning_th TEXT,
        icon TEXT
      );
    `);

    await db.exec(`DELETE FROM radicals;`);
    
    const radicals = [
      { symbol: '氵', pinyin: 'shuǐ', en: 'Water', th: 'น้ำ', icon: '🌊' },
      { symbol: '木', pinyin: 'mù', en: 'Wood/Tree', th: 'ไม้/ต้นไม้', icon: '🌲' },
      { symbol: '女', pinyin: 'nǚ', en: 'Woman', th: 'ผู้หญิง', icon: '👩' },
      { symbol: '亻', pinyin: 'rén', en: 'Person', th: 'คน', icon: '👨' },
      { symbol: '口', pinyin: 'kǒu', en: 'Mouth', th: 'ปาก', icon: '👄' },
      { symbol: '日', pinyin: 'rì', en: 'Sun', th: 'พระอาทิตย์', icon: '☀️' },
      { symbol: '讠', pinyin: 'yán', en: 'Speech', th: 'คำพูด', icon: '💬' },
      { symbol: '忄', pinyin: 'xīn', en: 'Heart (Vertical)', th: 'หัวใจ (แนวตั้ง)', icon: '❤️' },
      { symbol: '心', pinyin: 'xīn', en: 'Heart', th: 'หัวใจ', icon: '❤️' },
      { symbol: '艹', pinyin: 'cǎo', en: 'Grass', th: 'หญ้า', icon: '🌿' },
      { symbol: '扌', pinyin: 'shǒu', en: 'Hand', th: 'มือ', icon: '✋' },
      { symbol: '门', pinyin: 'mén', en: 'Door', th: 'ประตู', icon: '🚪' },
      { symbol: '辶', pinyin: 'chuò', en: 'Walk', th: 'เดิน', icon: '🚶' },
      { symbol: '火', pinyin: 'huǒ', en: 'Fire', th: 'ไฟ', icon: '🔥' },
      { symbol: '灬', pinyin: 'huǒ', en: 'Fire (Bottom)', th: 'ไฟ (ด้านล่าง)', icon: '🔥' },
      { symbol: '土', pinyin: 'tǔ', en: 'Earth/Soil', th: 'ดิน', icon: '🌍' },
      { symbol: '目', pinyin: 'mù', en: 'Eye', th: 'ตา', icon: '👁️' },
      { symbol: '月', pinyin: 'yuè', en: 'Moon/Flesh', th: 'พระจันทร์/เนื้อ', icon: '🌙' },
      { symbol: '金', pinyin: 'jīn', en: 'Gold/Metal', th: 'ทอง/โลหะ', icon: '🥇' },
      { symbol: '钅', pinyin: 'jīn', en: 'Gold/Metal (Left)', th: 'ทอง/โลหะ (ซ้าย)', icon: '🥇' },
      { symbol: '雨', pinyin: 'yǔ', en: 'Rain', th: 'ฝน', icon: '🌧️' },
      { symbol: '纟', pinyin: 'sī', en: 'Silk', th: 'ไหม', icon: '🧵' }
    ];

    let count = 0;
    for (const r of radicals) {
      await db.run(
        `INSERT INTO radicals (symbol, pinyin, meaning_en, meaning_th, icon) VALUES (?, ?, ?, ?, ?)`,
        [r.symbol, r.pinyin, r.en, r.th, r.icon]
      );
      count++;
    }
    
    console.log(`Successfully seeded ${count} true radicals into the database table!`);
  } catch (e) {
    console.error('Error during setup:', e);
  } finally {
    process.exit(0);
  }
}

run();
