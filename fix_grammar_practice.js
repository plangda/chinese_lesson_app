const fs = require('fs');
const readline = require('readline');
const { getDb } = require('./database');

// Each entry: matched to a specific grammar_id (DB) and lesson_id + title (jsonl).
// `words`/`answer` are only set when the original data structure was broken
// (mismatched with the drag-into-blank UI); otherwise the original words/answer
// are kept and only the missing example sentence is added to `prompt`.
const FIXES = [
  {
    grammar_id: 320, lesson_id: 'hsk1_day3', title: "Possession with '的' (de)",
    prompt: "Fill in the blank with the correct word: 那是我___爸爸。"
  },
  {
    grammar_id: 321, lesson_id: 'hsk1_day3', title: "Using '口' (kǒu) as a Measure Word for Family Members",
    prompt: "Fill in the blank with the correct measure word: 他家有六___人。"
  },
  {
    grammar_id: 326, lesson_id: 'hsk1_day6', title: "Saying 'Two': 两 (liǎng) vs. 二 (èr)",
    prompt: "Fill in the blanks with 两 (liǎng) or 二 (èr): 我有___个苹果，现在是___月。"
  },
  {
    grammar_id: 327, lesson_id: 'hsk1_day6', title: "Asking 'How Many/How Much': 多少 (duōshao) vs. 几 (jǐ)",
    prompt: "Fill in the blanks with 几 (jǐ) or 多少 (duōshao): 你家有___个人？这个手机___钱？"
  },
  {
    grammar_id: 328, lesson_id: 'hsk1_day7', title: "表达“今天、昨天、明天” (Expressing 'Today, Yesterday, Tomorrow')",
    prompt: "Fill in the blank to say 'Today the weather is very good': ___天气很好。"
  },
  {
    grammar_id: 329, lesson_id: 'hsk1_day7', title: "询问与表达星期几 (Asking & Stating Days of the Week)",
    prompt: "Fill in the blank to say 'Today is Wednesday': 今天___。"
  },
  {
    grammar_id: 340, lesson_id: 'hsk1_day13', title: "指示地点：使用 '这', '那', '哪' (Indicating Location: Using 'zhè', 'nà', 'nǎ')",
    prompt: "Fill in the blank to ask 'Where is the bookstore?': 书店在___？"
  },
  {
    grammar_id: 341, lesson_id: 'hsk1_day13', title: "'在' (zài) + 地点 (location) (Using 'zài' with locations)",
    prompt: "Fill in the blank to say 'I watch TV at home': 我___家看电视。"
  },
  {
    grammar_id: 348, lesson_id: 'hsk1_day17', title: "Resultative Complement: Verb + 见 (jiàn)",
    prompt: "Fill in the blank to say 'I suddenly heard someone calling me': 我突然___有人叫我。"
  },
  {
    grammar_id: 349, lesson_id: 'hsk1_day17', title: "说 (shuō) vs. 说话 (shuōhuà)",
    prompt: "Fill in the blank to say 'Please don't talk in class': 上课的时候请不要___。"
  },
  {
    grammar_id: 350, lesson_id: 'hsk1_day18', title: "The Possessive Particle '的 (de)'",
    prompt: "Fill in the blank with '的' (de): 这是我___手机。",
    words: ["的", "是", "有"], answer: ["的"]
  },
  {
    grammar_id: 351, lesson_id: 'hsk1_day18', title: "Classifiers (Measure Words)",
    prompt: "Fill in the blank with the correct classifier: 我有一___书。",
    words: ["本", "件", "把"], answer: ["本"]
  },
  {
    grammar_id: 355, lesson_id: 'hsk1_day20', title: "表达意愿和需求 (biǎodá yìyuàn hé xūqiú) - Expressing Wishes and Needs (想, 要, 不要)",
    prompt: "Fill in the blank to say 'I really want to eat noodles': 我很___吃面条。"
  },
  {
    grammar_id: 360, lesson_id: 'hsk1_day23', title: "Difference between 会 (huì) and 能 (néng) in expressing abilities",
    prompt: "Fill in the blanks with 会 (huì) or 能 (néng): 我___游泳，你___教我吗？"
  },
  {
    grammar_id: 361, lesson_id: 'hsk1_day23', title: "Using 可以 (kěyǐ) to ask for and give permission.",
    prompt: "Rearrange the words to ask 'Excuse me, may I come in?'",
    words: ["请问", "可以", "进来", "吗"], answer: ["请问", "可以", "进来", "吗"]
  },
  {
    grammar_id: 362, lesson_id: 'hsk1_day24', title: "使用 “太…了” (tài…le) 来表达程度 (Expressing degree with “太…了”)",
    prompt: "Fill in the blank: 外面在下雪，天气太___了。 (It's snowing outside, the weather is too ___.)",
    words: ["热", "冷", "好"], answer: ["冷"]
  }
];

async function translateToThai(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=th&dt=t&q=${encodeURIComponent(text)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await res.json();
      return data[0].map(seg => seg[0]).join('');
    } catch (e) {
      console.log(`    [translate error, attempt ${attempt + 1}/3] ${e.message}`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return '';
}

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

async function main() {
  const isApply = process.argv.includes('--apply');
  const lessons = await loadLessons();
  const byId = Object.fromEntries(lessons.map(l => [l.id, l]));

  const db = await getDb();
  const report = [];

  for (const fix of FIXES) {
    const lesson = byId[fix.lesson_id];
    if (!lesson) {
      report.push({ ok: false, msg: `${fix.lesson_id} not found in generated_lessons.jsonl` });
      continue;
    }
    const grammar = (lesson.grammar || []).find(g => g.title === fix.title);
    if (!grammar || !grammar.practice) {
      report.push({ ok: false, msg: `${fix.lesson_id}: grammar titled "${fix.title}" (or its practice) not found` });
      continue;
    }

    const oldPrompt = grammar.practice.prompt;
    const promptTh = await translateToThai(fix.prompt);

    grammar.practice.prompt = fix.prompt;
    grammar.practice.prompt_th = promptTh;
    if (fix.words) grammar.practice.words = fix.words;
    if (fix.answer) grammar.practice.answer = fix.answer;
    delete grammar.practice.blanks;
    delete grammar.practice.answer_key;

    report.push({
      ok: true,
      grammar_id: fix.grammar_id,
      lesson_id: fix.lesson_id,
      title: fix.title,
      oldPrompt,
      newPrompt: fix.prompt,
      newWords: fix.words || null,
      newAnswer: fix.answer || null
    });
  }

  console.log(`\n${'='.repeat(70)}\nGRAMMAR PRACTICE FIX REPORT (${isApply ? 'APPLY' : 'DRY RUN'})\n${'='.repeat(70)}`);
  for (const r of report) {
    if (!r.ok) {
      console.log(`\n[SKIPPED] ${r.msg}`);
      continue;
    }
    console.log(`\n[${r.lesson_id}] grammar_id=${r.grammar_id} "${r.title}"`);
    console.log(`  BEFORE prompt: ${r.oldPrompt}`);
    console.log(`  AFTER  prompt: ${r.newPrompt}`);
    if (r.newWords) console.log(`  AFTER  words:  ${JSON.stringify(r.newWords)}`);
    if (r.newAnswer) console.log(`  AFTER  answer: ${JSON.stringify(r.newAnswer)}`);
  }

  const failures = report.filter(r => !r.ok);
  console.log(`\n${'-'.repeat(70)}\n${report.length - failures.length}/${FIXES.length} fixes matched successfully. ${failures.length} skipped.`);

  if (isApply) {
    // Write updated jsonl
    const out = lessons.map(l => JSON.stringify(l)).join('\n') + '\n';
    fs.writeFileSync('generated_lessons.jsonl', out, 'utf-8');
    console.log(`\nWrote updated generated_lessons.jsonl.`);

    // Patch DB
    for (const fix of FIXES) {
      const words = fix.words ? JSON.stringify(fix.words) : null;
      const answer = fix.answer ? JSON.stringify(fix.answer) : null;
      const lesson = byId[fix.lesson_id];
      const grammar = lesson && (lesson.grammar || []).find(g => g.title === fix.title);
      if (!grammar) continue;

      let sql, args;
      if (words && answer) {
        sql = `UPDATE grammar_practice SET prompt_en = ?, prompt_th = ?, words = ?, answer = ? WHERE grammar_id = ?`;
        args = [grammar.practice.prompt, grammar.practice.prompt_th, words, answer, fix.grammar_id];
      } else {
        sql = `UPDATE grammar_practice SET prompt_en = ?, prompt_th = ? WHERE grammar_id = ?`;
        args = [grammar.practice.prompt, grammar.practice.prompt_th, fix.grammar_id];
      }
      const result = await db.run(sql, args);
      console.log(`[db applied] grammar_id=${fix.grammar_id} (rows affected: ${result.rowsAffected})`);
    }
    console.log('\nDone. All 16 records patched in jsonl and database.');
  } else {
    console.log('\nDry run only — no files or database changes made. Re-run with --apply to write.');
  }
}

main().catch(console.error);
