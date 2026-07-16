/**
 * Chinese Web Learning - HSK 3.0 Curriculum Database (4-Stage Format)
 * Integrates HSK 3.0 vocabulary into the structured 4-stage daily lesson plan.
 */

const CHINESE_LESSONS = {
  // Pre-test is kept for diagnostic purposes to place users in HSK 1, 2, or 3
  preTestQuestions: [
    // HSK 1 Questions
    { id: "q1", level: 1, type: "vocab", question: "Which of the following means 'Hello'?", options: ["谢谢", "你好", "再见", "对不起"], answer: "你好", explanation: "你好 (nǐ hǎo) means Hello." },
    { id: "q2", level: 1, type: "pinyin", question: "What is the pinyin for '吃' (to eat)?", options: ["chī", "hē", "shū", "dà"], answer: "chī", explanation: "吃 is pronounced 'chī' and means to eat." },
    { id: "q3", level: 1, type: "grammar", question: "Which sentence is grammatically correct for 'I drink tea'?", options: ["我喝茶。", "茶喝我。", "我茶喝。", "茶我喝。"], answer: "我喝茶。", explanation: "Standard word order in Chinese is Subject-Verb-Object (SVO): 我 (I) + 喝 (drink) + 茶 (tea)." },
    
    // HSK 2 Questions
    { id: "q4", level: 2, type: "vocab", question: "Translate this word: '便宜'", options: ["Expensive", "Cheap", "Beautiful", "Delicious"], answer: "Cheap", explanation: "便宜 (piányi) means cheap." },
    { id: "q5", level: 2, type: "pinyin", question: "What is the pinyin for '帮助' (to help)?", options: ["bāngzhù", "bàozhǐ", "chànggē", "chuān"], answer: "bāngzhù", explanation: "帮助 is pronounced 'bāngzhù' and means to help." },
    { id: "q6", level: 2, type: "grammar", question: "Select the correct sentence for 'He likes to read newspapers':", options: ["他喜欢看报纸。", "看报纸他喜欢。", "他看报纸喜欢。", "喜欢他看报纸。"], answer: "他喜欢看报纸。", explanation: "Subject + 喜欢 (like) + Verb-Object: 他 (He) + 喜欢 (likes) + 看报纸 (to read newspapers)." },
    
    // HSK 3 Questions
    { id: "q7", level: 3, type: "vocab", question: "Which describes 'getting sick'?", options: ["生病", "生气", "生命", "生意"], answer: "生病", explanation: "生病 (shēngbìng) means to fall ill." },
    { id: "q8", level: 3, type: "pinyin", question: "What is the pinyin for '安静' (quiet)?", options: ["ānjìng", "āyí", "ǎi", "ā"], answer: "ānjìng", explanation: "安静 is pronounced 'ānjìng' and means quiet." },
    { id: "q9", level: 3, type: "grammar", question: "Complete the sentence to say 'He drank the tea': 他把茶___。", options: ["喝了", "喝", "茶了", "把喝了"], answer: "喝了", explanation: "In a 把 (bǎ) sentence, the structure is Subject + 把 + Object + Verb + Result: 他 (He) + 把 + 茶 (tea) + 喝了 (drank)." }
  ],

  lessons: {
    hsk1: [], // Placeholder, will be populated dynamically from hsk1_data.js
    hsk2: [
      {
        id: "hsk2_day1",
        title: "Day 1: Daily Activities & Hobbies",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "帮助", pinyin: "bāngzhù", meaning: "to help", deconstruct: "帮 (Help) + 助 (Assist).", exampleCn: "谢谢你的帮助。", examplePy: "Xièxie nǐ de bāngzhù.", exampleEn: "Thank you for your help." },
          { character: "报纸", pinyin: "bàozhǐ", meaning: "newspaper", deconstruct: "报 (Report) + 纸 (Paper).", exampleCn: "看报纸", examplePy: "Kàn bàozhǐ", exampleEn: "Read newspaper" },
          { character: "唱歌", pinyin: "chànggē", meaning: "to sing", deconstruct: "唱 (Sing) + 歌 (Song).", exampleCn: "我喜欢唱歌。", examplePy: "Wǒ xǐhuān chànggē.", exampleEn: "I like singing." },
          { character: "出", pinyin: "chū", meaning: "to go out", deconstruct: "Represents a plant growing out of the ground.", exampleCn: "出去", examplePy: "Chūqù", exampleEn: "Go out" },
          { character: "穿", pinyin: "chuān", meaning: "to wear", deconstruct: "穴 (Cave/Hole) + 牙 (Tooth/Tusk).", exampleCn: "穿衣服", examplePy: "Chuān yīfu", exampleEn: "Wear clothes" }
        ],
        grammar: [
          {
            title: "1. Expressing preferences with 喜欢 (xǐhuān)",
            explanation: "喜欢 is used to express liking something or liking to do something. Subject + 喜欢 + Noun/Verb.",
            examples: [
              { cn: "我喜欢唱歌。", py: "Wǒ xǐhuān chànggē.", en: "I like to sing." },
              { cn: "他喜欢看报纸。", py: "Tā xǐhuān kàn bàozhǐ.", en: "He likes reading the newspaper." }
            ],
            practice: {
              prompt: "Arrange the words to say 'I like to help people (人)'.",
              words: ["人", "我", "帮助", "喜欢"],
              answer: ["我", "喜欢", "帮助", "人"]
            }
          }
        ],
        dialogue: {
          title: "Hobbies and Free Time",
          lines: [
            { speaker: "A", cn: "你喜欢做什么？", py: "Nǐ xǐhuān zuò shénme?", en: "What do you like to do?" },
            { speaker: "B", cn: "我喜欢唱歌和看报纸。", py: "Wǒ xǐhuān chànggē hé kàn bàozhǐ.", en: "I like singing and reading newspapers." },
            { speaker: "A", cn: "很好！", py: "Hěn hǎo!", en: "Very good!" }
          ]
        },
        quiz: [
          { question: "What does '唱歌 (chànggē)' mean?", options: ["To dance", "To sing", "To eat", "To write"], answer: "To sing", explanation: "唱歌 means to sing a song." },
          { question: "How do you say 'newspaper'?", options: ["帮助", "穿", "出", "报纸"], answer: "报纸", explanation: "报纸 (bàozhǐ) is newspaper." },
          { question: "Fill in the blank: 我___看报纸. (I like reading newspapers)", options: ["去", "喜欢", "出", "穿"], answer: "喜欢", explanation: "喜欢 (xǐhuān) means to like." },
          { question: "Translate 'to wear':", options: ["穿", "出", "帮", "唱"], answer: "穿", explanation: "穿 (chuān) means to wear (clothes)." }
        ]
      },
      {
        id: "hsk2_day2",
        title: "Day 2: Weather & Transport",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "晴天", pinyin: "qíngtiān", meaning: "sunny day", deconstruct: "晴 (Clear) + 天 (Sky/Day).", exampleCn: "今天是个晴天。", examplePy: "Jīntiān shì gè qíngtiān.", exampleEn: "Today is a sunny day." },
          { character: "阴天", pinyin: "yīntiān", meaning: "cloudy day", deconstruct: "阴 (Overcast) + 天 (Sky/Day).", exampleCn: "明天是阴天吗？", examplePy: "Míngtiān shì yīntiān ma?", exampleEn: "Is tomorrow cloudy?" },
          { character: "下雨", pinyin: "xiàyǔ", meaning: "to rain", deconstruct: "下 (Down) + 雨 (Rain).", exampleCn: "外面在下雨。", examplePy: "Wàimiàn zài xiàyǔ.", exampleEn: "It is raining outside." },
          { character: "公共汽车", pinyin: "gōnggòng qìchē", meaning: "bus", deconstruct: "公共 (Public) + 汽车 (Car).", exampleCn: "我坐公共汽车去学校。", examplePy: "Wǒ zuò gōnggòng qìchē qù xuéxiào.", exampleEn: "I take the bus to school." },
          { character: "自行车", pinyin: "zìxíngchē", meaning: "bicycle", deconstruct: "自 (Self) + 行 (Go) + 车 (Vehicle).", exampleCn: "骑自行车很健康。", examplePy: "Qí zìxíngchē hěn jiànkāng.", exampleEn: "Riding a bicycle is very healthy." }
        ],
        grammar: [
          {
            title: "1. Making choices with 还是 (háishi)",
            explanation: "还是 is used to ask questions with alternatives (A or B?). Structure: Option A + 还是 + Option B?",
            examples: [
              { cn: "你坐公共汽车还是骑自行车？", py: "Nǐ zuò gōnggòng qìchē háishi qí zìxíngchē?", en: "Are you taking the bus or riding a bicycle?" },
              { cn: "今天是晴天还是阴天？", py: "Jīntiān shì qíngtiān háishi yīntiān?", en: "Is today sunny or cloudy?" }
            ],
            practice: {
              prompt: "Arrange the words to say: 'Sunny day or cloudy day?'",
              words: ["还是", "阴天", "晴天"],
              answer: ["晴天", "还是", "阴天"]
            }
          }
        ],
        dialogue: {
          title: "Planning Tomorrow's Journey",
          lines: [
            { speaker: "A", cn: "明天会下雨吗？", py: "Míngtiān huì xiàyǔ ma?", en: "Will it rain tomorrow?" },
            { speaker: "B", cn: "不会，明天是晴天。", py: "Bú huì, míngtiān shì qíngtiān.", en: "No, tomorrow will be sunny." },
            { speaker: "A", cn: "太好了！我们骑自行车去玩吧。", py: "Tài hǎo le! Wǒmen qí zìxíngchē qù wán ba.", en: "Great! Let's ride our bicycles out to play." },
            { speaker: "B", cn: "好啊，明天见！", py: "Hǎo a, míngtiān jiàn!", en: "Okay, see you tomorrow!" }
          ]
        },
        quiz: [
          { question: "What does '下雨 (xiàyǔ)' mean?", options: ["To snow", "To rain", "To blow wind", "To fog"], answer: "To rain", explanation: "下雨 means to rain." },
          { question: "How do you say 'bus' in Chinese?", options: ["自行车", "公共汽车", "火车", "飞机"], answer: "公共汽车", explanation: "公共汽车 (gōnggòng qìchē) means public bus." },
          { question: "Which particle is used for choices in questions ('or')?", options: ["或者", "和", "还是", "但"], answer: "还是", explanation: "还是 (háishi) is used for 'or' in questions." },
          { question: "What does '晴天 (qíngtiān)' mean?", options: ["Rainy day", "Sunny day", "Cloudy day", "Windy day"], answer: "Sunny day", explanation: "晴天 means sunny day." }
        ]
      },
      {
        id: "hsk2_day3",
        title: "Day 3: Food & Prices",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "便宜", pinyin: "piányi", meaning: "cheap", deconstruct: "便 (Convenient) + 宜 (Fitting).", exampleCn: "这里的衣服很便宜。", examplePy: "Zhèlǐ de yīfu hěn piányi.", exampleEn: "The clothes here are very cheap." },
          { character: "贵", pinyin: "guì", meaning: "expensive", deconstruct: "贝 (Shell/Money) at the bottom represents value.", exampleCn: "这家饭店太贵了。", examplePy: "Zhè jiā fàndiàn tài guì le.", exampleEn: "This restaurant is too expensive." },
          { character: "鸡蛋", pinyin: "jīdàn", meaning: "egg", deconstruct: "鸡 (Chicken) + 蛋 (Egg).", exampleCn: "我早餐吃一个鸡蛋。", examplePy: "Wǒ zǎocān chī yí gè jīdàn.", exampleEn: "I eat an egg for breakfast." },
          { character: "牛肉", pinyin: "niúròu", meaning: "beef", deconstruct: "牛 (Cow) + 肉 (Meat).", exampleCn: "他不吃牛肉。", examplePy: "Tā bù chī niúròu.", exampleEn: "He doesn't eat beef." },
          { character: "鱼", pinyin: "yú", meaning: "fish", deconstruct: "Pictograph of a fish with scales, head, and tail.", exampleCn: "水里有许多鱼。", examplePy: "Shuǐ lǐ yǒu xǔduō yú.", exampleEn: "There are many fish in the water." }
        ],
        grammar: [
          {
            title: "1. Making comparisons with 比 (bǐ)",
            explanation: "比 is used to state that one thing is more than another. Structure: A + 比 + B + Adjective.",
            examples: [
              { cn: "牛肉比鱼贵。", py: "Niúròu bǐ yú guì.", en: "Beef is more expensive than fish." },
              { cn: "这件衣服比那件便宜。", py: "Zhè jiàn yīfu bǐ nà jiàn piányi.", en: "This clothing is cheaper than that one." }
            ],
            practice: {
              prompt: "Arrange the words to say: 'Beef is cheaper than fish' (hypothetically!).",
              words: ["比", "便宜", "牛肉", "鱼"],
              answer: ["牛肉", "比", "鱼", "便宜"]
            }
          }
        ],
        dialogue: {
          title: "Shopping for Dinner",
          lines: [
            { speaker: "A", cn: "今天晚上吃什么？", py: "Jīntiān wǎnshang chī shénme?", en: "What are we eating tonight?" },
            { speaker: "B", cn: "我们买牛肉或者鱼吧。", py: "Wǒmen mǎi niúròu huòzhě yú ba.", en: "Let's buy beef or fish." },
            { speaker: "A", cn: "今天的鱼比牛肉便宜很多。", py: "Jīntiān de yú bǐ niúròu piányi hěn duō.", en: "Today's fish is much cheaper than beef." },
            { speaker: "B", cn: "那我们买鱼和一些鸡蛋吧。", py: "Nà wǒmen mǎi yú hé yìxiē jīdàn ba.", en: "Then let's buy fish and some eggs." }
          ]
        },
        quiz: [
          { question: "What is the character for 'cheap'?", options: ["贵", "便宜", "鸡蛋", "鱼"], answer: "便宜", explanation: "便宜 (piányi) means cheap." },
          { question: "What does '贵 (guì)' mean?", options: ["Cheap", "Expensive", "Beautiful", "Tasty"], answer: "Expensive", explanation: "贵 means expensive." },
          { question: "Complete the sentence: 苹果___西瓜大. (Apples are larger than watermelons... wait, reversed!)", options: ["和", "比", "是", "没"], answer: "比", explanation: "比 (bǐ) is used to draw comparisons." },
          { question: "What is '鸡蛋 (jīdàn)'?", options: ["Chicken meat", "Beef", "Egg", "Fish"], answer: "Egg", explanation: "鸡蛋 is egg (literally chicken egg)." }
        ]
      },
      {
        id: "hsk2_day4",
        title: "Day 4: Travel Planning",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "准备", pinyin: "zhǔnbèi", meaning: "to prepare", deconstruct: "准 (Standard) + 备 (Ready).", exampleCn: "我准备好了。", examplePy: "Wǒ zhǔnbèi hǎo le.", exampleEn: "I am prepared / ready." },
          { character: "旅游", pinyin: "lǚyóu", meaning: "to travel", deconstruct: "旅 (Trip) + 游 (Roam).", exampleCn: "他们去北京旅游。", examplePy: "Tāmen qù Běijīng lǚyóu.", exampleEn: "They go to Beijing to travel." },
          { character: "件", pinyin: "jiàn", meaning: "measure word for clothes/items", deconstruct: "人 (Person) + 牛 (Cow). Used for shirts, issues, etc.", exampleCn: "这件衣服很漂亮。", examplePy: "Zhè jiàn yīfu hěn piàoliang.", exampleEn: "This piece of clothing is very beautiful." },
          { character: "衣服", pinyin: "yīfu", meaning: "clothes", deconstruct: "衣 (Clothing) + 服 (Obey/Wear).", exampleCn: "我想买几件衣服。", examplePy: "Wǒ xiǎng mǎi jǐ jiàn yīfu.", exampleEn: "I want to buy some clothes." },
          { character: "运动", pinyin: "yùndòng", meaning: "sports / to exercise", deconstruct: "运 (Carry/Move) + 动 (Movement).", exampleCn: "你喜欢什么运动？", examplePy: "Nǐ xǐhuān shénme yùndòng?", exampleEn: "What sports do you like?" }
        ],
        grammar: [
          {
            title: "1. Completion or Change of State with 了 (le)",
            explanation: "了 indicates that an action is completed, or a state of affairs has changed. Subject + Verb + 了 (+ Object).",
            examples: [
              { cn: "我准备好了我的行李。", py: "Wǒ zhǔnbèi hǎo le wǒ de xíngli.", en: "I have prepared my luggage." },
              { cn: "我去旅游了。", py: "Wǒ qù lǚyóu le.", en: "I went traveling." }
            ],
            practice: {
              prompt: "Arrange the words to say: 'I bought clothes'.",
              words: ["了", "我", "衣服", "买"],
              answer: ["我", "买", "了", "衣服"]
            }
          }
        ],
        dialogue: {
          title: "Packing for Travel",
          lines: [
            { speaker: "A", cn: "你去旅游的衣服准备好了吗？", py: "Nǐ qù lǚyóu de yīfu zhǔnbèi hǎo le ma?", en: "Have you prepared the clothes for your trip?" },
            { speaker: "B", cn: "准备好了，我买了两件新衣服。", py: "Zhǔnbèi hǎo le, wǒ mǎi le liǎng jiàn xīn yīfu.", en: "Yes, I bought two pieces of new clothing." },
            { speaker: "A", cn: "外面在下雨，多穿一件衣服吧。", py: "Wài miàn zài xià yǔ, duō chuān yí jiàn yīfu ba.", en: "It is raining outside, wear one more piece of clothing." },
            { speaker: "B", cn: "好的，谢谢你！", py: "Hǎo de, xièxie nǐ!", en: "Okay, thank you!" }
          ]
        },
        quiz: [
          { question: "What is the measure word for '衣服 (yīfu)'?", options: ["个", "本", "只", "件"], answer: "件", explanation: "件 (jiàn) is the measure word for clothing items." },
          { question: "What does '准备 (zhǔnbèi)' mean?", options: ["To travel", "To wear", "To prepare", "To play"], answer: "To prepare", explanation: "准备 means to prepare or make ready." },
          { question: "Translate 'sports' or 'to exercise':", options: ["旅游", "运动", "衣服", "准备"], answer: "运动", explanation: "运动 (yùndòng) means sports or physical exercise." },
          { question: "Translate '旅游 (lǚyóu)':", options: ["To swim", "To travel", "To run", "To climb"], answer: "To travel", explanation: "旅游 means to travel." }
        ]
      },
      {
        id: "hsk2_day5",
        title: "Day 5: Study & Classroom",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "考试", pinyin: "kǎoshì", meaning: "exam / test", deconstruct: "考 (Examine) + 试 (Try/Test).", exampleCn: "明天的考试很重要。", examplePy: "Míngtiān de kǎoshì hěn zhòngyào.", exampleEn: "Tomorrow's exam is very important." },
          { character: "学习", pinyin: "xuéxí", meaning: "to study / learn", deconstruct: "学 (Learn) + 习 (Practice/Habit).", exampleCn: "我在学习汉语。", examplePy: "Wǒ zài xuéxí Hànyǔ.", exampleEn: "I am studying Chinese." },
          { character: "教室", pinyin: "jiàoshì", meaning: "classroom", deconstruct: "教 (Teach) + 室 (Room).", exampleCn: "学生们在教室里。", examplePy: "Xuéshengmen zài jiàoshì lǐ.", exampleEn: "The students are in the classroom." },
          { character: "懂", pinyin: "dǒng", meaning: "to understand / comprehend", deconstruct: "忄 (Heart) + 董 (Supervise). To understand in one's heart.", exampleCn: "你听懂了吗？", examplePy: "Nǐ tīng dǒng le ma?", exampleEn: "Did you understand what you heard?" },
          { character: "题", pinyin: "tí", meaning: "question / problem / topic", deconstruct: "是 (Is) + 页 (Page).", exampleCn: "这道题很难。", examplePy: "Zhè dào tí hěn nán.", exampleEn: "This question is very difficult." }
        ],
        grammar: [
          {
            title: "1. Resultative Complement with 懂 (dǒng)",
            explanation: "懂 can follow a verb (like 听 or 看) to show that the action resulted in understanding. Verb + 懂.",
            examples: [
              { cn: "我听懂了老师的话。", py: "Wǒ tīng dǒng le lǎoshī de huà.", en: "I understood the teacher's words." },
              { cn: "你看懂这道题了吗？", py: "Nǐ kàn dǒng zhè dào tí le ma?", en: "Did you understand this problem by looking at it?" }
            ],
            practice: {
              prompt: "Arrange the words to say: 'I read and understood' (looked and understood).",
              words: ["了", "懂", "我", "看"],
              answer: ["我", "看", "懂", "了"]
            }
          }
        ],
        dialogue: {
          title: "Preparing for the Exam",
          lines: [
            { speaker: "A", cn: "你准备好明天的考试了吗？", py: "Nǐ zhǔnbèi hǎo míngtiān de kǎoshì le ma?", en: "Are you ready for tomorrow's exam?" },
            { speaker: "B", cn: "还没有，我在教室里学习呢。", py: "Hái méi yǒu, wǒ zài jiàoshì lǐ xuéxí ne.", en: "Not yet, I am studying in the classroom." },
            { speaker: "A", cn: "这道题你懂了吗？", py: "Zhè dào tí nǐ dǒng le ma?", en: "Do you understand this question?" },
            { speaker: "B", cn: "懂了，谢谢你的帮助！", py: "Dǒng le, xièxie nǐ de bāngzhù!", en: "Yes, thank you for your help!" }
          ]
        },
        quiz: [
          { question: "What does '考试 (kǎoshì)' mean?", options: ["Classroom", "Lesson", "Exam", "Homework"], answer: "Exam", explanation: "考试 means exam or test." },
          { question: "How do you say 'classroom'?", options: ["教室", "办公室", "学校", "宿舍"], answer: "教室", explanation: "教室 (jiàoshì) means classroom." },
          { question: "What is the resultative complement showing comprehension?", options: ["好", "完", "懂", "到"], answer: "懂", explanation: "懂 (dǒng) means to understand." },
          { question: "Translate '题 (tí)':", options: ["Answer", "Question/Problem", "Title", "Paper"], answer: "Question/Problem", explanation: "题 means a question or problem." }
        ]
      }
    ],
    hsk3: [
      {
        id: "hsk3_day1",
        title: "Day 1: Expressions & Emotion",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "阿姨", pinyin: "āyí", meaning: "aunt / stepmother / maid", deconstruct: "阿 (Prefix) + 姨 (Aunt).", exampleCn: "阿姨，您好。", examplePy: "Āyí, nín hǎo.", exampleEn: "Hello, aunt." },
          { character: "啊", pinyin: "a", meaning: "ah / particle showing elation, doubt", deconstruct: "口 (Mouth) + 阿. Used for exclamation.", exampleCn: "好啊！", examplePy: "Hǎo a!", exampleEn: "Okay! / Great!" },
          { character: "矮", pinyin: "ǎi", meaning: "short (height)", deconstruct: "矢 (Arrow) + 委 (Entrust). Indicates shortness.", exampleCn: "他很矮。", examplePy: "Tā hěn ǎi.", exampleEn: "He is short." },
          { character: "安静", pinyin: "ānjìng", meaning: "quiet / peaceful", deconstruct: "安 (Safe) + 静 (Quiet).", exampleCn: "这里很安静。", examplePy: "Zhèlǐ hěn ānjìng.", exampleEn: "It is very quiet here." },
          { character: "把", pinyin: "bǎ", meaning: "to hold / particle marking object", deconstruct: "打 (hand) + 巴.", exampleCn: "把书给我。", examplePy: "Bǎ shū gěi wǒ.", exampleEn: "Give the book to me." }
        ],
        grammar: [
          {
            title: "1. The 把 (bǎ) Sentence Structure",
            explanation: "The 把 structure is used to focus on the result or influence of an action on an object. Subject + 把 + Object + Verb + Result/Direction.",
            examples: [
              { cn: "请把书给我。", py: "Qǐng bǎ shū gěi wǒ.", en: "Please give the book to me. (lit. Please take the book and give it to me.)" },
              { cn: "他把水喝了。", py: "Tā bǎ shuǐ hē le.", en: "He drank the water." }
            ],
            practice: {
              prompt: "Arrange the words to say 'He drank (喝了) the tea (茶)'.",
              words: ["茶", "把", "他", "喝了"],
              answer: ["他", "把", "茶", "喝了"]
            }
          }
        ],
        dialogue: {
          title: "Asking for Quiet",
          lines: [
            { speaker: "A", cn: "请安静！", py: "Qǐng ānjìng!", en: "Please be quiet!" },
            { speaker: "B", cn: "对不起，阿姨。", py: "Duìbuqǐ, āyí.", en: "Sorry, auntie." },
            { speaker: "A", cn: "把门关上。谢谢。", py: "Bǎ mén guān shàng. Xièxie.", en: "Close the door. Thank you." },
            { speaker: "B", cn: "好啊。", py: "Hǎo a.", en: "Okay." }
          ]
        },
        quiz: [
          { question: "What does '安静 (ānjìng)' mean?", options: ["Angry", "Quiet", "Short", "Beautiful"], answer: "Quiet", explanation: "安静 means quiet or peaceful." },
          { question: "Which particle is used to mark the object receiving an action?", options: ["的", "了", "啊", "把"], answer: "把", explanation: "把 (bǎ) is the object marker." },
          { question: "How do you address an older woman respectfully?", options: ["妹妹", "阿姨", "妈妈", "老师"], answer: "阿姨", explanation: "阿姨 (āyí) is a polite term for aunt or older woman." },
          { question: "What does '矮 (ǎi)' mean?", options: ["Tall", "Short", "Fat", "Thin"], answer: "Short", explanation: "矮 means short in height." }
        ]
      },
      {
        id: "hsk3_day2",
        title: "Day 2: Health & Sickness",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "生病", pinyin: "shēngbìng", meaning: "to fall ill / get sick", deconstruct: "生 (Arouse/Live) + 病 (Sickness).", exampleCn: "我最近生病了。", examplePy: "Wǒ zuìjìn shēngbìng le.", exampleEn: "I fell ill recently." },
          { character: "感冒", pinyin: "gǎnmào", meaning: "to catch a cold", deconstruct: "感 (Feel/Affect) + 冒 (Risk/Cover).", exampleCn: "他感冒了，不能去上学。", examplePy: "Tā gǎnmào le, bù néng qù shàngxué.", exampleEn: "He caught a cold and cannot go to school." },
          { character: "舒服", pinyin: "shūfu", meaning: "comfortable / well", deconstruct: "舒 (Stretch/Relax) + 服 (Clothing/Wear).", exampleCn: "我感觉不舒服。", examplePy: "Wǒ gǎnjué bù shūfu.", exampleEn: "I feel unwell / uncomfortable." },
          { character: "药", pinyin: "yào", meaning: "medicine", deconstruct: "艹 (Grass) + 乐 (Joy/Music). Plants that bring relief.", exampleCn: "记得吃药。", examplePy: "Jìde chī yào.", exampleEn: "Remember to take your medicine." },
          { character: "身体", pinyin: "shēntǐ", meaning: "body / health", deconstruct: "身 (Body) + 体 (Structure).", exampleCn: "祝你身体健康。", examplePy: "Zhù nǐ shēntǐ jiànkāng.", exampleEn: "Wish you good health." }
        ],
        grammar: [
          {
            title: "1. Expressing recommendations with 应该 (yīnggāi)",
            explanation: "应该 means 'should' or 'ought to'. Structure: Subject + 应该 + Verb + Object.",
            examples: [
              { cn: "你生病了，应该吃药。", py: "Nǐ shēngbìng le, yīnggāi chī yào.", en: "You are sick, you should take medicine." },
              { cn: "你不舒服，应该在家休息。", py: "Nǐ bù shūfu, yīnggāi zài jiā xiūxi.", en: "You feel unwell, you should rest at home." }
            ],
            practice: {
              prompt: "Arrange the words to say: 'You should rest'.",
              words: ["休息", "你", "应该"],
              answer: ["你", "应该", "休息"]
            }
          }
        ],
        dialogue: {
          title: "Caring for a Sick Friend",
          lines: [
            { speaker: "A", cn: "你怎么了？身体不舒服吗？", py: "Nǐ zěnme le? Shēntǐ bù shūfu ma?", en: "What's wrong? Do you feel unwell?" },
            { speaker: "B", cn: "对，我感冒了，头很疼。", py: "Duì, wǒ gǎnmào le, tóu hěn téng.", en: "Yes, I caught a cold and my head hurts." },
            { speaker: "A", cn: "你生病了，应该吃药和休息。", py: "Nǐ shēngbìng le, yīnggāi chī yào hé xiūxi.", en: "You are sick, you should take medicine and rest." },
            { speaker: "B", cn: "好的，我一会儿就去吃药。", py: "Hǎo de, wǒ yíhuìr jiù qù chī yào.", en: "Okay, I will take the medicine in a bit." }
          ]
        },
        quiz: [
          { question: "What is '感冒 (gǎnmào)' in English?", options: ["To fall ill", "To catch a cold", "To cough", "To have a fever"], answer: "To catch a cold", explanation: "感冒 means to catch a cold." },
          { question: "How do you translate 'medicine'?", options: ["药", "病", "疼", "感"], answer: "药", explanation: "药 (yào) means medicine." },
          { question: "Complete: 你不舒服，___去医院. (You feel unwell, you should go to the hospital)", options: ["能够", "应该", "可以", "会"], answer: "基层", answer: "应该", explanation: "应该 (yīnggāi) means should." },
          { question: "What does '舒服 (shūfu)' mean?", options: ["Sick", "Comfortable/Well", "Tired", "Busy"], answer: "Comfortable/Well", explanation: "舒服 means comfortable, or physically well." }
        ]
      },
      {
        id: "hsk3_day3",
        title: "Day 3: Renting an Apartment",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "房子", pinyin: "fángzi", meaning: "house / apartment", deconstruct: "房 (House) + 子 (Suffix).", exampleCn: "我想租一套房子。", examplePy: "Wǒ xiǎng zū yí tào fángzi.", exampleEn: "I want to rent an apartment." },
          { character: "租", pinyin: "zū", meaning: "to rent", deconstruct: "禾 (Grain) + 且 (Also/Stack). Originally paying rent in grain.", exampleCn: "这里的房子很便宜。", examplePy: "Zhèlǐ de fángzi hěn piányi.", exampleEn: "The apartments here are cheap." },
          { character: "方便", pinyin: "fāngbiàn", meaning: "convenient", deconstruct: "方 (Direction/Square) + 便 (Convenient).", exampleCn: "住在这里交通很方便。", examplePy: "Zhù zài zhèlǐ jiāotōng hěn fāngbiàn.", exampleEn: "Living here is very convenient for transport." },
          { character: "附近", pinyin: "fùjìn", meaning: "nearby / neighborhood", deconstruct: "阜 (Mound) + 斤 (Axe/Measure).", exampleCn: "学校附近有一家超市。", examplePy: "Xuéxiào fùjìn yǒu yì jiā chāoshì.", exampleEn: "There is a supermarket near the school." },
          { character: "电梯", pinyin: "diàntī", meaning: "elevator", deconstruct: "电 (Electricity) + 梯 (Stairs/Ladder). Electric stairs.", exampleCn: "这个楼有电梯吗？", examplePy: "Zhège lóu yǒu diàntī ma?", exampleEn: "Does this building have an elevator?" }
        ],
        grammar: [
          {
            title: "1. Describing relative distance with 离 (lí)",
            explanation: "离 is used to express the distance from one place to another. Structure: Place A + 离 + Place B + Adjective (e.g. 很近 / 很远).",
            examples: [
              { cn: "我家离公司很近。", py: "Wǒ jiā lí gōngsī hěn jìn.", en: "My home is very close to the company." },
              { cn: "超市离学校远吗？", py: "Chāoshì lí xuéxiào yuǎn ma?", en: "Is the supermarket far from the school?" }
            ],
            practice: {
              prompt: "Arrange the words to say: 'Subway station (地铁站) is close to here'.",
              words: ["离", "地铁站", "很近", "这里"],
              answer: ["地铁站", "离", "这里", "很近"]
            }
          }
        ],
        dialogue: {
          title: "Looking at an Apartment",
          lines: [
            { speaker: "A", cn: "你想租什么样的房子？", py: "Nǐ xiǎng zū shényang de fángzi?", en: "What kind of apartment do you want to rent?" },
            { speaker: "B", cn: "我想租公司附近的房子，上下班方便。", py: "Wǒ xiǎng zū gōngsī fùjìn de fángzi, shàngxiàbān fāngbiàn.", en: "I want to rent an apartment near the office so commuting is convenient." },
            { speaker: "A", cn: "我附近有一套，楼里有电梯。", py: "Wǒ fùjìn yǒu yí tào, lóu lǐ yǒu diàntī.", en: "I have one nearby; the building has an elevator." },
            { speaker: "B", cn: "太好了！离地铁站近吗？", py: "Tài hǎo le! Lí dìtiězhàn jìn ma?", en: "Great! Is it close to the subway station?" }
          ]
        },
        quiz: [
          { question: "What does '租 (zū)' mean?", options: ["To buy", "To sell", "To rent", "To build"], answer: "To rent", explanation: "租 means to rent (e.g. an apartment or car)." },
          { question: "How do you say 'elevator'?", options: ["电梯", "房子", "附近", "地铁"], answer: "电梯", explanation: "电梯 (diàntī) is elevator." },
          { question: "Which word denotes 'convenient'?", options: ["便宜", "安静", "舒服", "方便"], answer: "方便", explanation: "方便 (fāngbiàn) means convenient." },
          { question: "Translate '附近 (fùjìn)':", options: ["Far away", "Inside", "Nearby", "Outside"], answer: "Nearby", explanation: "附近 means nearby or in the vicinity." }
        ]
      },
      {
        id: "hsk3_day4",
        title: "Day 4: Office Work",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "会议", pinyin: "huìyì", meaning: "meeting / conference", deconstruct: "会 (Assemble) + 议 (Discuss).", exampleCn: "我们要开一个重要会议。", examplePy: "Wǒmen yào kāi yí gè zhòngyào huìyì.", exampleEn: "We need to hold an important meeting." },
          { character: "经理", pinyin: "jīnglǐ", meaning: "manager", deconstruct: "经 (Manage) + 理 (Govern).", exampleCn: "经理在办公室等你。", examplePy: "Jīnglǐ zài bàngōngshì děng nǐ.", exampleEn: "The manager is waiting for you in the office." },
          { character: "决定", pinyin: "juédìng", meaning: "to decide / decision", deconstruct: "决 (Determine) + 定 (Set/Fix).", exampleCn: "我已经做出了决定。", examplePy: "Wǒ yǐjīng zuò chū le juédìng.", exampleEn: "I have already made a decision." },
          { character: "解决", pinyin: "jiějué", meaning: "to solve / resolve", deconstruct: "解 (Untie/Explain) + 决 (Determine).", exampleCn: "我们必须解决这个问题。", examplePy: "Wǒmen bìxū jiějué zhège wèntí.", exampleEn: "We must solve this problem." },
          { character: "影响", pinyin: "yǐngxiǎng", meaning: "to influence / affect", deconstruct: "影 (Shadow) + 响 (Sound).", exampleCn: "别影响他工作。", examplePy: "Bié yǐngxiǎng tā gōngzuò.", exampleEn: "Don't affect his work." }
        ],
        grammar: [
          {
            title: "1. Expressing exceptions with 除了...以外 (chúle...yǐwài)",
            explanation: "除了...以外 means 'except for' or 'besides'. Structure: 除了 + Noun + 以外, Subject + 都 / 也 + Verb.",
            examples: [
              { cn: "除了经理以外，大家都在会议室了。", py: "Chúle jīnglǐ yǐwài, dàjiā dōu zài huìyìshì le.", en: "Except for the manager, everyone is in the meeting room." },
              { cn: "除了汉语以外，他也会说英语。", py: "Chúle Hànyǔ yǐwài, tā yě huì shuō Yīngyǔ.", en: "Besides Chinese, he can also speak English." }
            ],
            practice: {
              prompt: "Arrange the words to say: 'Except for him, we all go'.",
              words: ["除了", "都去", "他以外", "我们"],
              answer: ["除了", "他以外", "我们", "都去"]
            }
          }
        ],
        dialogue: {
          title: "Discussing the Project",
          lines: [
            { speaker: "A", cn: "经理，下午的会议几点开始？", py: "Jīnglǐ, xiàwǔ de huìyì jǐ diǎn kāishǐ?", en: "Manager, what time does the afternoon meeting start?" },
            { speaker: "B", cn: "三点。我们要在会议上决定怎么解决这个问题。", py: "Sān diǎn. Wǒmen yào zài huìyì shàng juédìng zěnme jiějué zhège wèntí.", en: "Three o'clock. We need to decide how to resolve this issue during the meeting." },
            { speaker: "A", cn: "这个问题会影响项目进度吗？", py: "Zhège wèntí huì yǐngxiǎng xiàngmù jìndù ma?", en: "Will this issue affect the project timeline?" },
            { speaker: "B", cn: "有点影响，所以我们要快点解决。", py: "Yǒudiǎn yǐngxiǎng, suǒyǐ wǒmen yào kuài diǎn jiějué.", en: "Slightly, which is why we must solve it quickly." }
          ]
        },
        quiz: [
          { question: "What does '经理 (jīnglǐ)' mean?", options: ["Teacher", "Manager", "Doctor", "Driver"], answer: "Manager", explanation: "经理 means manager." },
          { question: "Translate 'to solve' or 'resolve':", options: ["解决", "决定", "影响", "会议"], answer: "解决", explanation: "解决 means to solve or settle." },
          { question: "Which structure means 'except for' or 'besides'?", options: ["虽然...但是...", "除了...以外", "不仅...而且...", "因为...所以..."], answer: "除了...以外", explanation: "除了...以外 is used for expressing exceptions/additions." },
          { question: "What does '影响 (yǐngxiǎng)' mean?", options: ["To explain", "To influence/affect", "To decide", "To meeting"], answer: "To influence/affect", explanation: "影响 means to influence, affect, or interfere." }
        ]
      },
      {
        id: "hsk3_day5",
        title: "Day 5: Concessions & Trip Planning",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "打算", pinyin: "dǎsuàn", meaning: "to plan / intend", deconstruct: "打 (Strike) + 算 (Calculate/Reckon).", exampleCn: "你暑假有什么打算？", examplePy: "Nǐ shǔjià yǒu shénme dǎsuàn?", exampleEn: "What are your plans for the summer vacation?" },
          { character: "地图", pinyin: "dìtú", meaning: "map", deconstruct: "地 (Earth) + 图 (Drawing/Picture).", exampleCn: "请在地图上找这个地方。", examplePy: "Qǐng zài dìtú shang zhǎo zhège dìfang.", exampleEn: "Please look for this place on the map." },
          { character: "行李箱", pinyin: "xínglixiāng", meaning: "suitcase / luggage trunk", deconstruct: "行李 (Luggage) + 箱 (Box/Chest).", exampleCn: "把衣服放进行李箱里。", examplePy: "Bǎ yīfu fàng jìn xínglixiāng lǐ.", exampleEn: "Put the clothes in the suitcase." },
          { character: "护照", pinyin: "hùzhào", meaning: "passport", deconstruct: "护 (Protect) + 照 (License/Reflect).", exampleCn: "出国旅游需要护照。", examplePy: "Chūguó lǚyóu xūyào hùzhào.", exampleEn: "Traveling abroad requires a passport." },
          { character: "虽然", pinyin: "suīrán", meaning: "although / even though", deconstruct: "虽 (Although) + 然 (Thus/So).", exampleCn: "虽然天黑了，但他还在工作。", examplePy: "Suīrán tiān hēi le, dàn tā hái zài gōngzuò.", exampleEn: "Although it's dark, he is still working." }
        ],
        grammar: [
          {
            title: "1. Concession structures with 虽然...但是... (suīrán...dànshì...)",
            explanation: "虽然...但是... means 'although... but...'. It connects two clauses expressing contrast. Structure: 虽然 + Clause A, 但是 + Clause B.",
            examples: [
              { cn: "虽然汉语很难，但是我很喜欢学。", py: "Suīrán Hànyǔ hěn nán, dànshì wǒ hěn xǐhuān xué.", en: "Although Chinese is hard, (but) I really like learning it." },
              { cn: "虽然在下雨，但是我们依然打算去旅游。", py: "Suīrán zài xiàyǔ, dànshì wǒmen yīrán dǎsuàn qù lǚyóu.", en: "Although it is raining, (but) we still plan to go traveling." }
            ],
            practice: {
              prompt: "Arrange the words to say: 'Although very expensive, I bought it'.",
              words: ["但是", "很贵", "虽然", "我买了"],
              answer: ["虽然", "很贵", "但是", "我买了"]
            }
          }
        ],
        dialogue: {
          title: "Packing the Suitcase",
          lines: [
            { speaker: "A", cn: "你出国旅游的行李箱准备好了吗？", py: "Nǐ chūguó lǚyóu de xínglixiāng zhǔnbèi hǎo le ma?", en: "Is your suitcase prepared for traveling abroad?" },
            { speaker: "B", cn: "准备好了，护照和地图都在里面。", py: "Zhǔnbèi hǎo le, hùzhào hé dìtú dōu zài lǐmiàn.", en: "Prepared, the passport and map are both inside." },
            { speaker: "A", cn: "虽然那个地方很方便，但还是多带点钱吧。", py: "Suīrán nàge dìfang hěn fāngbiàn, dàn háishi duō dài diǎn qián ba.", en: "Although that place is very convenient, you should still bring a bit more money." },
            { speaker: "B", cn: "好的，我正有这个打算。", py: "Hǎo de, wǒ zhèng yǒu zhège dǎsuàn.", en: "Okay, I intend to do exactly that." }
          ]
        },
        quiz: [
          { question: "What is '护照 (hùzhào)' in English?", options: ["Luggage", "Passport", "Map", "Ticket"], answer: "Passport", explanation: "护照 means passport." },
          { question: "How do you translate 'map'?", options: ["地图", "行李箱", "打算", "虽然"], answer: "地图", explanation: "地图 (dìtú) means map." },
          { question: "Which word means 'although'?", options: ["但是", "所以", "因为", "虽然"], answer: "虽然", explanation: "虽然 (suīrán) means although." },
          { question: "What is the meaning of '打算 (dǎsuàn)'?", options: ["To calculate", "To pack", "To plan / intend", "To travel"], answer: "To plan / intend", explanation: "打算 means to plan or intend to do something." }
        ]
      }
    ]
  }
};

// Merge dynamically generated HSK 1 Curriculum (500 words over 30 days)
if (typeof window !== 'undefined') {
  if (window.HSK1_CURRICULUM) {
    CHINESE_LESSONS.lessons.hsk1 = window.HSK1_CURRICULUM;
  }
  window.CHINESE_LESSONS = CHINESE_LESSONS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CHINESE_LESSONS;
}
