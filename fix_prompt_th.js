const fs = require('fs');
const readline = require('readline');
const { getDb } = require('./database');

// Hand-authored prompt_th for the 15 records whose auto-translation mangled or
// dropped the embedded Chinese practice sentence (see prior fix_grammar_practice.js).
// The Chinese sentence is kept byte-for-byte identical to prompt_en; only the
// English instructional wrapper is translated. grammar_id 361 had no embedded
// Chinese sentence and translated correctly already, so it's excluded here.
const FIXES = [
  { grammar_id: 320, prompt_th: "เติมคำในช่องว่างให้ถูกต้อง: 那是我___爸爸。" },
  { grammar_id: 321, prompt_th: "เติมคำในช่องว่างด้วยคำวัดที่ถูกต้อง: 他家有六___人。" },
  { grammar_id: 326, prompt_th: "เติมคำในช่องว่างด้วย 两 (liǎng) หรือ 二 (èr): 我有___个苹果，现在是___月。" },
  { grammar_id: 327, prompt_th: "เติมคำในช่องว่างด้วย 几 (jǐ) หรือ 多少 (duōshao): 你家有___个人？这个手机___钱？" },
  { grammar_id: 328, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'วันนี้อากาศดีมาก': ___天气很好。" },
  { grammar_id: 329, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'วันนี้เป็นวันพุธ': 今天___。" },
  { grammar_id: 340, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อถามว่า 'ร้านหนังสืออยู่ที่ไหน': 书店在___？" },
  { grammar_id: 341, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'ฉันดูทีวีที่บ้าน': 我___家看电视。" },
  { grammar_id: 348, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'ฉันได้ยินเสียงคนเรียกฉันทันที': 我突然___有人叫我。" },
  { grammar_id: 349, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'กรุณาอย่าคุยกันในห้องเรียน': 上课的时候请不要___。" },
  { grammar_id: 350, prompt_th: "เติมคำในช่องว่างด้วย '的' (de): 这是我___手机。" },
  { grammar_id: 351, prompt_th: "เติมคำในช่องว่างด้วยตัวแยกประเภทที่ถูกต้อง: 我有一___书。" },
  { grammar_id: 355, prompt_th: "กรอกข้อมูลในช่องว่างเพื่อพูดว่า 'ฉันอยากกินบะหมี่มาก': 我很___吃面条。" },
  { grammar_id: 360, prompt_th: "เติมคำในช่องว่างด้วย 会 (huì) หรือ 能 (néng): 我___游泳，你___教我吗？" },
  { grammar_id: 362, prompt_th: "เติมคำในช่องว่าง: 外面在下雪，天气太___了。 (ข้างนอกกำลังลงหิมะ อากาศ___เกินไป)" }
];

async function loadLessons() {
  const lessons = [];
  const fileStream = fs.createReadStream('generated_lessons.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    lessons.push(JSON.parse(line));
  }
  return lessons;
}

// grammar_id -> (lesson_id, title), same pairing used in fix_grammar_practice.js
// so each record maps unambiguously to its jsonl grammar entry.
const GRAMMAR_LOOKUP = {
  320: { lesson_id: 'hsk1_day3', title: "Possession with '的' (de)" },
  321: { lesson_id: 'hsk1_day3', title: "Using '口' (kǒu) as a Measure Word for Family Members" },
  326: { lesson_id: 'hsk1_day6', title: "Saying 'Two': 两 (liǎng) vs. 二 (èr)" },
  327: { lesson_id: 'hsk1_day6', title: "Asking 'How Many/How Much': 多少 (duōshao) vs. 几 (jǐ)" },
  328: { lesson_id: 'hsk1_day7', title: "表达“今天、昨天、明天” (Expressing 'Today, Yesterday, Tomorrow')" },
  329: { lesson_id: 'hsk1_day7', title: "询问与表达星期几 (Asking & Stating Days of the Week)" },
  340: { lesson_id: 'hsk1_day13', title: "指示地点：使用 '这', '那', '哪' (Indicating Location: Using 'zhè', 'nà', 'nǎ')" },
  341: { lesson_id: 'hsk1_day13', title: "'在' (zài) + 地点 (location) (Using 'zài' with locations)" },
  348: { lesson_id: 'hsk1_day17', title: "Resultative Complement: Verb + 见 (jiàn)" },
  349: { lesson_id: 'hsk1_day17', title: "说 (shuō) vs. 说话 (shuōhuà)" },
  350: { lesson_id: 'hsk1_day18', title: "The Possessive Particle '的 (de)'" },
  351: { lesson_id: 'hsk1_day18', title: "Classifiers (Measure Words)" },
  355: { lesson_id: 'hsk1_day20', title: "表达意愿和需求 (biǎodá yìyuàn hé xūqiú) - Expressing Wishes and Needs (想, 要, 不要)" },
  360: { lesson_id: 'hsk1_day23', title: "Difference between 会 (huì) and 能 (néng) in expressing abilities" },
  362: { lesson_id: 'hsk1_day24', title: "使用 “太…了” (tài…le) 来表达程度 (Expressing degree with “太…了”)" }
};

async function main() {
  const isApply = process.argv.includes('--apply');
  const lessons = await loadLessons();
  const byId = Object.fromEntries(lessons.map(l => [l.id, l]));

  const report = [];
  for (const fix of FIXES) {
    const lookup = GRAMMAR_LOOKUP[fix.grammar_id];
    const lesson = byId[lookup.lesson_id];
    if (!lesson) { report.push({ ok: false, msg: `${lookup.lesson_id} not found` }); continue; }

    const grammar = (lesson.grammar || []).find(g => g.title === lookup.title);
    if (!grammar || !grammar.practice) { report.push({ ok: false, msg: `grammar_id ${fix.grammar_id} (${lookup.lesson_id}): "${lookup.title}" not found` }); continue; }

    const oldTh = grammar.practice.prompt_th;
    grammar.practice.prompt_th = fix.prompt_th;
    report.push({ ok: true, grammar_id: fix.grammar_id, lesson_id: lookup.lesson_id, oldTh, newTh: fix.prompt_th });
  }

  console.log(`\n${'='.repeat(70)}\nPROMPT_TH FIX REPORT (${isApply ? 'APPLY' : 'DRY RUN'})\n${'='.repeat(70)}`);
  for (const r of report) {
    if (!r.ok) { console.log(`\n[SKIPPED] ${r.msg}`); continue; }
    console.log(`\n[${r.lesson_id}] grammar_id=${r.grammar_id}`);
    console.log(`  BEFORE: ${r.oldTh}`);
    console.log(`  AFTER:  ${r.newTh}`);
  }
  const failures = report.filter(r => !r.ok);
  console.log(`\n${'-'.repeat(70)}\n${report.length - failures.length}/${FIXES.length} matched. ${failures.length} skipped.`);

  if (isApply) {
    const out = lessons.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync('generated_lessons.jsonl', out, 'utf-8');
    console.log('\nWrote updated generated_lessons.jsonl.');

    const db = await getDb();
    for (const fix of FIXES) {
      const result = await db.run('UPDATE grammar_practice SET prompt_th = ? WHERE grammar_id = ?', [fix.prompt_th, fix.grammar_id]);
      console.log(`[db applied] grammar_id=${fix.grammar_id} (rows affected: ${result.rowsAffected})`);
    }
    console.log('\nDone.');
  } else {
    console.log('\nDry run only — no files or database changes made. Re-run with --apply to write.');
  }
}

main().catch(console.error);
