/**
 * Chinese Web Learning - Curriculum & Pre-Test Database
 * Contains Pre-Test questions and 4 days of structured lessons for HSK 1, HSK 2, and HSK 3.
 */

const CHINESE_LESSONS = {
  preTestQuestions: [
    // --- HSK 1 Questions (1-4) ---
    {
      id: "q1",
      level: 1,
      type: "vocab",
      question: "Which of the following means 'Hello'?",
      options: ["谢谢 (xièxie)", "你好 (nǐ hǎo)", "再见 (zàijiàn)", "对不起 (duìbuqǐ)"],
      answer: "你好 (nǐ hǎo)",
      explanation: "'你好 (nǐ hǎo)' literally translates to 'You good', which is the standard way to say 'Hello' in Chinese."
    },
    {
      id: "q2",
      level: 1,
      type: "vocab",
      question: "Translate this word: '猫 (māo)'",
      options: ["Dog", "Cat", "Bird", "Fish"],
      answer: "Cat",
      explanation: "猫 (māo) means cat. It is written with the claw/beast radical (犭)."
    },
    {
      id: "q3",
      level: 1,
      type: "grammar",
      question: "Choose the correct character to make it a question: '你喜欢喝茶___？' (Do you like drinking tea?)",
      options: ["吗 (ma)", "呢 (ne)", "吧 (ba)", "的 (de)"],
      answer: "吗 (ma)",
      explanation: "'吗 (ma)' is a question particle placed at the end of a declarative sentence to turn it into a yes/no question."
    },
    {
      id: "q4",
      level: 1,
      type: "reading",
      question: "Read this sentence: '我有一个妹妹。' What does the speaker have?",
      options: ["An older brother", "An older sister", "A younger sister", "A younger brother"],
      answer: "A younger sister",
      explanation: "'妹妹 (mèimei)' means younger sister. '我 (wǒ)' means I, '有一个 (yǒu yí gè)' means have one."
    },

    // --- HSK 2 Questions (5-8) ---
    {
      id: "q5",
      level: 2,
      type: "vocab",
      question: "What is the English meaning of '便宜 (piányi)'?",
      options: ["Expensive", "Cheap", "Beautiful", "Delicious"],
      answer: "Cheap",
      explanation: "'便宜 (piányi)' means cheap/inexpensive. Its antonym is '贵 (guì)' (expensive)."
    },
    {
      id: "q6",
      level: 2,
      type: "grammar",
      question: "Select the correct structure: '他___跑___快。' (He runs very fast.)",
      options: ["得 / 跑", "跑 / 得", "的 / 跑", "跑 / 的"],
      answer: "跑 / 得",
      explanation: "Verb + 得 (de) + Adjective is used to describe the state or ability of an action. '他跑得快 (Tā pǎo de kuài)' is correct."
    },
    {
      id: "q7",
      level: 2,
      type: "listening",
      question: "Listen to the Chinese pronunciation (Audio option in-app). Which word matches 'To prepare'?",
      options: ["介绍 (jièshào)", "帮助 (bāngzhù)", "准备 (zhǔnbèi)", "运动 (yùndòng)"],
      answer: "准备 (zhǔnbèi)",
      explanation: "'准备 (zhǔnbèi)' means to prepare or get ready. '介绍' is to introduce, '帮助' is to help, '运动' is exercise."
    },
    {
      id: "q8",
      level: 2,
      type: "reading",
      question: "Read this passage: '虽然外面下着大雨，但是他还是去跑步了。' What did he do despite the heavy rain?",
      options: ["He went to buy an umbrella", "He stayed home and slept", "He went running", "He drove to work"],
      answer: "He went running",
      explanation: "'虽然...但是...' means 'Although... but...'. '虽然外面下着大雨 (Although it was raining hard outside), 但是他还是去跑步了 (but he still went running).'"
    },

    // --- HSK 3 Questions (9-12) ---
    {
      id: "q9",
      level: 3,
      type: "vocab",
      question: "Which of the following describes 'getting sick'?",
      options: ["生病 (shēngbìng)", "生气 (shēngqì)", "生命 (shēngmìng)", "生意 (shēngyi)"],
      answer: "生病 (shēngbìng)",
      explanation: "'生病 (shēngbìng)' means to fall ill or get sick. '生气' is angry, '生命' is life, '生意' is business."
    },
    {
      id: "q10",
      level: 3,
      type: "grammar",
      question: "Complete the sentence: '除了苹果以外，他___喜欢吃香蕉。' (Besides apples, he also likes eating bananas.)",
      options: ["都 (dōu)", "也 (yě)", "还 (hái)", "只 (zhǐ)"],
      answer: "还 (hái)",
      explanation: "The structure '除了...以外，还...' means 'Besides..., also...'. (If it were '都', it would mean 'except for..., all...')."
    },
    {
      id: "q11",
      level: 3,
      type: "grammar",
      question: "Select the sentence with the correct passive structure (被字句):",
      options: [
        "我的手机被妹妹拿走了。 (Wǒ de shǒujī bèi mèimei ná zǒu le.)",
        "妹妹被我的手机拿走了。 (Mèimei bèi wǒ de shǒujī ná zǒu le.)",
        "我的手机妹妹被拿走了。 (Wǒ de shǒujī mèimei bèi ná zǒu le.)",
        "被我的手机妹妹拿走了。 (Bèi wǒ de shǒujī mèimei ná zǒu le.)"
      ],
      answer: "我的手机被妹妹拿走了。 (Wǒ de shǒujī bèi mèimei ná zǒu le.)",
      explanation: "Passive voice (被 structure): Receiver of Action + 被 + Doer + Verb + Result. 'My phone (receiver) was taken away by younger sister (doer).'"
    },
    {
      id: "q12",
      level: 3,
      type: "reading",
      question: "Read this: '我对中国历史非常感兴趣，打算明年去北京参观故宫。' What is the speaker's plan for next year?",
      options: [
        "To study history in a university",
        "To visit the Forbidden City in Beijing",
        "To start a business in Beijing",
        "To buy books about Chinese history"
      ],
      answer: "To visit the Forbidden City in Beijing",
      explanation: "'打算 (dǎsuàn)' means plan. '明年 (míngnián)' is next year, '去北京参观故宫 (go to Beijing to visit the Forbidden City/Palace Museum).'"
    }
  ],

  lessons: {
    hsk1: [
      // HSK 1 - Day 1
      {
        id: "hsk1_day1",
        title: "Day 1: Greetings & Saying Goodbye",
        level: "HSK 1 (Beginner)",
        duration: "60 min",
        vocab: [
          { character: "你", pinyin: "nǐ", meaning: "you", deconstruct: "工 (Person) + 尔 (You). The person radical represents human connection; combined with 尔, it means 'you'.", exampleCn: "你好！", examplePy: "Nǐ hǎo!", exampleEn: "Hello!" },
          { character: "好", pinyin: "hǎo", meaning: "good / well", deconstruct: "女 (Woman) + 子 (Child). A woman holding a child signifies goodness, harmony, and positivity.", exampleCn: "他很好。", examplePy: "Tā hěn hǎo.", exampleEn: "He is very well." },
          { character: "您", pinyin: "nín", meaning: "you (polite)", deconstruct: "你 (You) + 心 (Heart). Placing 'heart' under 'you' represents respect and politeness.", exampleCn: "老师，您好！", examplePy: "Lǎoshī, nín hǎo!", exampleEn: "Teacher, hello!" },
          { character: "谢谢", pinyin: "xièxie", meaning: "to thank / thanks", deconstruct: "讠 (Speech) + 射 (Shoot) + 寸 (Inch). Words of gratitude spoken from the heart.", exampleCn: "谢谢你！", examplePy: "Xièxie nǐ!", exampleEn: "Thank you!" },
          { character: "再见", pinyin: "zàijiàn", meaning: "goodbye / see you again", deconstruct: "再 (Again) + 见 (See). Literally 'again see', meaning goodbye or see you again.", exampleCn: "爸爸，再见。", examplePy: "Bàba, zàijiàn.", exampleEn: "Goodbye, Dad." }
        ],
        grammar: [
          {
            title: "1. Basic Greetings: 你 + 好",
            explanation: "In Chinese, the most common greeting is formed by combining the pronoun '你' (you) and the adjective '好' (good). Placing '好' after a pronoun is the standard way to greet someone.",
            examples: [
              { cn: "你好！", py: "Nǐ hǎo!", en: "Hello!" },
              { cn: "您好！", py: "Nín hǎo!", en: "Hello! (polite, used for elders/superiors)" }
            ],
            practice: {
              prompt: "Arrange the words to say 'Hello, teacher!'",
              words: ["好", "您", "老师", "谢谢"],
              answer: ["老师", "您", "好"]
            }
          },
          {
            title: "2. The Adverb 很 (hěn) as a connector",
            explanation: "When using an adjective to describe a subject (e.g. 'He is good'), Chinese does NOT use the verb 'to be' (是). Instead, the adverb '很' (very) is used as a linking word between the noun and adjective. In simple sentences, it loses its meaning of 'very' and just functions grammatically.",
            examples: [
              { cn: "我很好。", py: "Wǒ hěn hǎo.", en: "I am fine / good." },
              { cn: "他很好。", py: "Tā hěn hǎo.", en: "He is fine / good." }
            ],
            practice: {
              prompt: "Arrange the words to say 'I am very good.'",
              words: ["好", "很", "是", "我"],
              answer: ["我", "很", "好"]
            }
          }
        ],
        dialogue: {
          title: "Meeting for the first time (初次见面)",
          lines: [
            { speaker: "A (李华)", cn: "你好！", py: "Nǐ hǎo!", en: "Hello!" },
            { speaker: "B (大卫)", cn: "你好！", py: "Nǐ hǎo!", en: "Hello!" },
            { speaker: "A (李华)", cn: "你身体好吗？", py: "Nǐ shēntǐ hǎo ma?", en: "How are you? (lit: Is your body well?)" },
            { speaker: "B (大卫)", cn: "我很好，谢谢你！你呢？", py: "Wǒ hěn hǎo, xièxie nǐ! Nǐ ne?", en: "I'm very well, thank you! And you?" },
            { speaker: "A (李华)", cn: "我也很好。再见！", py: "Wǒ yě hěn hǎo. Zàijiàn!", en: "I am also very well. Goodbye!" },
            { speaker: "B (大卫)", cn: "再见！", py: "Zàijiàn!", en: "Goodbye!" }
          ]
        },
        quiz: [
          {
            question: "What is the polite form of 'you' in Chinese?",
            options: ["你 (nǐ)", "您 (nín)", "好 (hǎo)", "我 (wǒ)"],
            answer: "您 (nín)",
            explanation: "'您 (nín)' is the respectful form of 'you', used to address teachers, elders, or clients."
          },
          {
            question: "How do you say 'Thank you' in Chinese?",
            options: ["再见 (zàijiàn)", "没关系 (méi guānxi)", "谢谢 (xièxie)", "对不起 (duìbuqǐ)"],
            answer: "谢谢 (xièxie)",
            explanation: "谢谢 (xièxie) means thank you. The first 'xiè' is falling tone, the second is neutral."
          },
          {
            question: "What word is usually used to link a subject and an adjective instead of '是'?",
            options: ["很 (hěn)", "吗 (ma)", "呢 (ne)", "不 (bù)"],
            answer: "很 (hěn)",
            explanation: "In Chinese, simple subject-adjective sentences use '很' as a connector (e.g., 我很好)."
          },
          {
            question: "What does '再见' mean?",
            options: ["Hello", "Sorry", "Please", "Goodbye"],
            answer: "Goodbye",
            explanation: "'再见 (zàijiàn)' literally means 'Again see' or 'See you again'."
          }
        ]
      },
      // HSK 1 - Day 2
      {
        id: "hsk1_day2",
        title: "Day 2: Numbers & Basic Dates",
        level: "HSK 1 (Beginner)",
        duration: "60 min",
        vocab: [
          { character: "一", pinyin: "yī", meaning: "one", deconstruct: "一 (One). A single horizontal stroke representing the number one.", exampleCn: "一个苹果。", examplePy: "Yí gè píngguǒ.", exampleEn: "One apple." },
          { character: "五", pinyin: "wǔ", meaning: "five", deconstruct: "五 (Five). Originally represented an intersection of heaven and earth, now standard for five.", exampleCn: "五个人。", examplePy: "Wǔ gè rén.", exampleEn: "Five people." },
          { character: "十", pinyin: "shí", meaning: "ten", deconstruct: "十 (Ten). A cross representing the intersection of two lines, representing completeness or ten.", exampleCn: "十个学生。", examplePy: "Shí gè xuéshēng.", exampleEn: "Ten students." },
          { character: "月", pinyin: "yuè", meaning: "month / moon", deconstruct: "月 (Moon/Month). A pictograph of a crescent moon, representing the moon or a month.", exampleCn: "一月一日。", examplePy: "Yī yuè yī rì.", exampleEn: "January 1st." },
          { character: "号", pinyin: "hào", meaning: "number / day of the month", deconstruct: "口 (Mouth) + 丂 (Breath). Represents designation, numbering, or a specific day.", exampleCn: "今天五号。", examplePy: "Jīntiān wǔ hào.", exampleEn: "Today is the 5th." }
        ],
        grammar: [
          {
            title: "1. Stating Months in Chinese",
            explanation: "Unlike English, which has specific names for months (January, February...), Chinese simply uses numbers 1-12 followed by the word '月' (yuè).",
            examples: [
              { cn: "一月", py: "yī yuè", en: "January (lit: 1st month)" },
              { cn: "十二月", py: "shí'èr yuè", en: "December (lit: 12th month)" }
            ],
            practice: {
              prompt: "Arrange the characters to spell 'October'",
              words: ["十", "月", "一", "二"],
              answer: ["十", "月"]
            }
          },
          {
            title: "2. Stating Dates: Month + Day",
            explanation: "Dates are written from largest to smallest unit: Year (年 - nián) + Month (月 - yuè) + Day (号/日 - hào/rì). In spoken Chinese, '号' (hào) is used, while '日' (rì) is used in formal writing.",
            examples: [
              { cn: "五月十号", py: "wǔ yuè shí hào", en: "May 10th" },
              { cn: "十二月二十五号", py: "shí'èr yuè èrshíwǔ hào", en: "December 25th" }
            ],
            practice: {
              prompt: "Arrange words for 'January 5th'",
              words: ["五", "号", "一", "月"],
              answer: ["一", "月", "五", "号"]
            }
          }
        ],
        dialogue: {
          title: "Asking about the date (问日期)",
          lines: [
            { speaker: "A (小明)", cn: "今天几月几号？", py: "Jīntiān jǐ yuè jǐ hào?", en: "What date is it today? (lit: Today how many month how many day?)" },
            { speaker: "B (丽丽)", cn: "今天八月五号。", py: "Jīntiān bā yuè wǔ hào.", en: "Today is August 5th." },
            { speaker: "A (小明)", cn: "明天是八月六号吗？", py: "Míngtiān  shì bā yuè liù hào ma?", en: "Is tomorrow August 6th?" },
            { speaker: "B (丽丽)", cn: "对，明天是八月六号。我的生日！", py: "Duì, míngtiān shì bā yuè liù hào. Wǒ de shēngrì!", en: "Yes, tomorrow is August 6th. My birthday!" }
          ]
        },
        quiz: [
          {
            question: "How do you write 'December' in Chinese characters?",
            options: ["十月 (shí yuè)", "二月 (èr yuè)", "十二月 (shí'èr yuè)", "十二号 (shí'èr hào)"],
            answer: "十二月 (shí'èr yuè)",
            explanation: "December is the 12th month, so it is written as 12 (十二) + month (月)."
          },
          {
            question: "What does '号 (hào)' represent in dates?",
            options: ["Month", "Year", "Week", "Day of the month"],
            answer: "Day of the month",
            explanation: "'号 (hào)' is used in spoken Chinese to designate the day of the month."
          },
          {
            question: "What is '五月五号'?",
            options: ["May 5th", "April 5th", "May 15th", "August 5th"],
            answer: "May 5th",
            explanation: "五 (5) 月 (month) = May, and 五 (5) 号 (day) = 5th."
          },
          {
            question: "What is the number '15' in Chinese characters?",
            options: ["五十 (wǔshí)", "一五 (yī wǔ)", "十五 (shíwǔ)", "十五月 (shíwǔ yuè)"],
            answer: "十五 (shíwǔ)",
            explanation: "15 is represented as ten (十) and five (五), which is 十五 (shíwǔ)."
          }
        ]
      },
      // HSK 1 - Day 3
      {
        id: "hsk1_day3",
        title: "Day 3: People & Family",
        level: "HSK 1 (Beginner)",
        duration: "60 min",
        vocab: [
          { character: "爸爸", pinyin: "bàba", meaning: "father / dad", deconstruct: "父 (Father) + 巴 (Cling). 父 represents a hand holding a rod (authority), standard for father.", exampleCn: "我爸爸是医生。", examplePy: "Wǒ bàba shì yīshēng.", exampleEn: "My dad is a doctor." },
          { character: "妈妈", pinyin: "māma", meaning: "mother / mom", deconstruct: "女 (Woman) + 马 (Horse). 女 represents female, and 马 provides the phonetic sound 'mǎ'.", exampleCn: "我妈妈喜欢猫。", examplePy: "Wǒ māma xǐhuān māo.", exampleEn: "My mom likes cats." },
          { character: "家", pinyin: "jiā", meaning: "family / home", deconstruct: "宀 (Roof) + 豕 (Pig). A pig under a roof. Historically, having livestock inside represented home and wealth.", exampleCn: "我家在北京。", examplePy: "Wǒ jiā zài Běijīng.", exampleEn: "My home is in Beijing." },
          { character: "有", pinyin: "yǒu", meaning: "to have / there is", deconstruct: "𠂇 (Hand) + 月 (Meat). A hand holding a piece of meat, symbolizing possession or 'to have'.", exampleCn: "我有一个哥哥。", examplePy: "Wǒ yǒu yí gè gēge.", exampleEn: "I have an older brother." },
          { character: "个", pinyin: "gè", meaning: "general measure word", deconstruct: "个 (Individual). A pictograph of a single bamboo leaf, representing a general measure word.", exampleCn: "三个人。", examplePy: "Sān gè rén.", exampleEn: "Three people." }
        ],
        grammar: [
          {
            title: "1. The Verb 有 (yǒu) for Possession",
            explanation: "To express ownership or possession, use the verb '有' (yǒu) which means 'to have'. Its negative form is ALWAYS '没有' (méiyǒu). You can never say '不有'.",
            examples: [
              { cn: "我有三个姐姐。", py: "Wǒ yǒu sān gè jiějie.", en: "I have three older sisters." },
              { cn: "我没有猫。", py: "Wǒ méiyǒu māo.", en: "I do not have a cat." }
            ],
            practice: {
              prompt: "Arrange the words to say 'He does not have a book.'",
              words: ["没有", "书", "他", "有"],
              answer: ["他", "没有", "书"]
            }
          },
          {
            title: "2. The general measure word 个 (gè)",
            explanation: "In Chinese, you cannot simply say 'number + noun' (like 'three people'). You must insert a 'measure word' between them: Number + Measure Word + Noun. '个' (gè) is the most common and versatile measure word.",
            examples: [
              { cn: "四个人", py: "sì gè rén", en: "four people" },
              { cn: "一个家", py: "yí gè jiā", en: "a family / a home" }
            ],
            practice: {
              prompt: "Arrange words for 'five older brothers'",
              words: ["个", "五", "哥哥", "妈妈"],
              answer: ["五", "个", "哥哥"]
            }
          }
        ],
        dialogue: {
          title: "Talking about family (谈论家庭)",
          lines: [
            { speaker: "A (小华)", cn: "你家有几口人？", py: "Nǐ jiā yǒu jǐ kǒu rén?", en: "How many people are there in your family? (lit: Your family has how many mouths of people?)" },
            { speaker: "B (约翰)", cn: "我家有四口人。爸爸、妈妈、一个妹妹和我。", py: "Wǒ jiā yǒu sì kǒu rén. Bàba, māma, yí gè mèimei hé wǒ.", en: "My family has four people. Father, mother, a younger sister, and me." },
            { speaker: "A (小华)", cn: "你有狗吗？", py: "Nǐ yǒu gǒu ma?", en: "Do you have a dog?" },
            { speaker: "B (约翰)", cn: "我没有狗，我有一只猫。", py: "Wǒ méiyǒu gǒu, wǒ yǒu yì zhī māo.", en: "I don't have a dog, I have a cat." }
          ]
        },
        quiz: [
          {
            question: "What is the correct negative form of '有 (yǒu)'?",
            options: ["不有 (bù yǒu)", "没有 (méiyǒu)", "别有 (bié yǒu)", "无 (wú)"],
            answer: "没有 (méiyǒu)",
            explanation: "The negative particle '没' is used to negate '有', forming '没有'."
          },
          {
            question: "Translate: '妈妈' (māma)",
            options: ["Father", "Sister", "Mother", "Brother"],
            answer: "Mother",
            explanation: "妈妈 (māma) is mother."
          },
          {
            question: "Which represents the correct structure for counting items?",
            options: ["Number + Noun", "Measure Word + Number + Noun", "Number + Measure Word + Noun", "Noun + Number"],
            answer: "Number + Measure Word + Noun",
            explanation: "The standard counting structure in Chinese is Number (e.g. 三) + Measure Word (e.g. 个) + Noun (e.g. 人)."
          },
          {
            question: "What is '家 (jiā)'?",
            options: ["Shop", "Home / Family", "School", "Country"],
            answer: "Home / Family",
            explanation: "家 (jiā) refers to both home/house and family."
          }
        ]
      },
      // HSK 1 - Day 4
      {
        id: "hsk1_day4",
        title: "Day 4: Food & Drink",
        level: "HSK 1 (Beginner)",
        duration: "60 min",
        vocab: [
          { character: "吃", pinyin: "chī", meaning: "to eat", deconstruct: "口 (Mouth) + 乞 (Beg). 口 represents using the mouth to eat, and 乞 is phonetic.", exampleCn: "吃米饭。", examplePy: "Chī mǐfàn.", exampleEn: "Eat cooked rice." },
          { character: "喝", pinyin: "hē", meaning: "to drink", deconstruct: "口 (Mouth) + 曷 (Why/How). 口 represents using the mouth to drink, and 曷 provides the phonetic guide.", exampleCn: "喝热水。", examplePy: "Hē rèshuǐ.", exampleEn: "Drink hot water." },
          { character: "茶", pinyin: "chá", meaning: "tea", deconstruct: "艹 (Grass) + 人 (Person) + 木 (Wood). Leaves of a plant (tea leaves) picked by a person from a tree.", exampleCn: "喝绿茶。", examplePy: "Hē lǜchá.", exampleEn: "Drink green tea." },
          { character: "米饭", pinyin: "mǐfàn", meaning: "cooked rice", deconstruct: "米 (Rice) + 饭 (Food/Meal). 米 is raw rice grains; 饭 is 饣 (Food) + 反 (Phonetic). Cooked rice.", exampleCn: "我喜欢吃米饭。", examplePy: "Wǒ xǐhuān chī mǐfàn.", exampleEn: "I like to eat rice." },
          { character: "苹果", pinyin: "píngguǒ", meaning: "apple", deconstruct: "苹 (Duckweed) + 果 (Fruit). 果 is a pictograph of fruit on a tree. Together, apple.", exampleCn: "买红苹果。", examplePy: "Mǎi hóng píngguǒ.", exampleEn: "Buy red apples." }
        ],
        grammar: [
          {
            title: "1. Expressing likes: 喜欢 (xǐhuān)",
            explanation: "The verb '喜欢' (xǐhuān) means 'to like'. It can be followed directly by a noun or another verb (like 'to eat' or 'to drink').",
            examples: [
              { cn: "我喜欢茶。", py: "Wǒ xǐhuān chá.", en: "I like tea." },
              { cn: "他喜欢吃苹果。", py: "Tā xǐhuān chī píngguǒ.", en: "He likes to eat apples." }
            ],
            practice: {
              prompt: "Arrange the words to say 'She likes to drink tea.'",
              words: ["喝", "茶", "喜欢", "她"],
              answer: ["她", "喜欢", "喝", "茶"]
            }
          },
          {
            title: "2. The Question Particle 吗 (ma)",
            explanation: "To turn a statement into a question, simply add the particle '吗' (ma) at the very end of the sentence. The word order remains identical to the statement.",
            examples: [
              { cn: "你吃米饭吗？", py: "Nǐ chī mǐfàn ma?", en: "Do you eat rice?" },
              { cn: "你喜欢喝茶吗？", py: "Nǐ xǐhuān hē chá ma?", en: "Do you like drinking tea?" }
            ],
            practice: {
              prompt: "Arrange words for 'Do you like apples?'",
              words: ["苹果", "喜欢", "吗", "你"],
              answer: ["你", "喜欢", "苹果", "吗"]
            }
          }
        ],
        dialogue: {
          title: "In a restaurant (在餐馆)",
          lines: [
            { speaker: "A (服务员)", cn: "你好！你想吃什么？", py: "Nǐ hǎo! Nǐ xiǎng chī shénme?", en: "Hello! What would you like to eat?" },
            { speaker: "B (大卫)", cn: "我喜欢吃米饭。有米饭吗？", py: "Wǒ xǐhuān chī mǐfàn. Yǒu mǐfàn ma?", en: "I like eating rice. Do you have rice?" },
            { speaker: "A (服务员)", cn: "有米饭。你想喝茶吗？", py: "Yǒu mǐfàn. Nǐ xiǎng hē chá ma?", en: "Yes, we have rice. Would you like to drink tea?" },
            { speaker: "B (大卫)", cn: "谢谢，我喜欢喝茶。请给我一杯茶。", py: "Xièxie, wǒ xǐhuān hē chá. Qǐng gěi wǒ yì bēi chá.", en: "Thank you, I like drinking tea. Please give me a cup of tea." }
          ]
        },
        quiz: [
          {
            question: "Which verb matches 'to drink'?",
            options: ["吃 (chī)", "喝 (hē)", "买 (mǎi)", "看 (kàn)"],
            answer: "喝 (hē)",
            explanation: "喝 (hē) means to drink. 吃 (chī) means to eat."
          },
          {
            question: "Translate: '米饭' (mǐfàn)",
            options: ["Bread", "Noodles", "Cooked Rice", "Vegetables"],
            answer: "Cooked Rice",
            explanation: "'米饭 (mǐfàn)' is cooked rice. '米' is raw rice, '饭' is food/meal."
          },
          {
            question: "Where do you place the question particle '吗 (ma)' in a sentence?",
            options: ["At the beginning", "Before the verb", "After the subject", "At the very end"],
            answer: "At the very end",
            explanation: "The particle '吗' is always placed at the end of declarative sentences to construct yes/no questions."
          },
          {
            question: "What is '苹果' (píngguǒ)?",
            options: ["Banana", "Apple", "Orange", "Grape"],
            answer: "Apple",
            explanation: "苹果 (píngguǒ) means apple."
          }
        ]
      }
    ],
    hsk2: [
      // HSK 2 - Day 1
      {
        id: "hsk2_day1",
        title: "Day 1: Daily Routines & Time",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "起床", pinyin: "qǐchuáng", meaning: "to get up (from bed)", deconstruct: "起 (Rise) + 床 (Bed). 起 is 走 (Walk) + 己 (Self); 床 is 广 (Shelter) + 木 (Wood). Rising from bed.", exampleCn: "我早上六点起床。", examplePy: "Wǒ zǎoshang liù diǎn qǐchuáng.", exampleEn: "I get up at 6 AM." },
          { character: "跑步", pinyin: "pǎobù", meaning: "to run / jog", deconstruct: "跑 (Run) + 步 (Step). 跑 is ⻊ (Foot) + 包 (Phonetic); 步 represents two feet taking steps.", exampleCn: "他喜欢去公园跑步。", examplePy: "Tā xǐhuān qù gōngyuán pǎobù.", exampleEn: "He likes running in the park." },
          { character: "上班", pinyin: "shàngbān", meaning: "to go to work", deconstruct: "上 (Go up) + 班 (Shift). 班 represents jade pieces separated and shared among workers on a shift.", exampleCn: "她每天八点半上班。", examplePy: "Tā měitiān bā diǎn bàn shàngbān.", exampleEn: "She goes to work at 8:30 every day." },
          { character: "生病", pinyin: "shēngbìng", meaning: "to fall ill", deconstruct: "生 (Life) + 病 (Sickness). 病 has the 疒 (Sickness/Pain) radical, indicating physical illness.", exampleCn: "他今天生病了，没去上班。", examplePy: "Tā jīntiān shēngbìng le, méi qù shàngbān.", exampleEn: "He fell ill today and didn't go to work." },
          { character: "药", pinyin: "yào", meaning: "medicine", deconstruct: "艹 (Grass/Herb) + 乐 (Joy/Music). Herbs/plants (艹) used as medicine to bring relief and comfort (乐).", exampleCn: "记得吃药。", examplePy: "Jìde chī yào.", exampleEn: "Remember to take your medicine." }
        ],
        grammar: [
          {
            title: "1. Time Word Placement",
            explanation: "In Chinese, time expressions (e.g. 'tomorrow', 'at 8 o'clock') must be placed either BEFORE the subject or immediately AFTER the subject, but always BEFORE the verb. You cannot place them at the end of the sentence like in English.",
            examples: [
              { cn: "我七点吃药。", py: "Wǒ qī diǎn chī yào.", en: "I take medicine at 7." },
              { cn: "今天他生病了。", py: "Jīntiān tā shēngbìng le.", en: "Today he got sick." }
            ],
            practice: {
              prompt: "Arrange: 'He goes to work at eight o'clock.'",
              words: ["上班", "他", "八点", "吃"],
              answer: ["他", "八点", "上班"]
            }
          },
          {
            title: "2. Verb duplication for casual action",
            explanation: "Duplicating a verb (e.g. 看看, 跑跑步) softens the tone, suggesting doing the action casually, briefly, or for trial/pleasure.",
            examples: [
              { cn: "我去跑跑步。", py: "Wǒ qù pǎo pǎobù.", en: "I'm going for a little jog." },
              { cn: "你看客气什么，看看这本书吧。", py: "Nǐ kàn kèqi shénme, kànkan zhè běn shū ba.", en: "Have a quick look at this book." }
            ],
            practice: {
              prompt: "Arrange: 'I want to have a look.'",
              words: ["想", "我", "看看", "去"],
              answer: ["我", "想", "看看"]
            }
          }
        ],
        dialogue: {
          title: "Talking about health (谈论身体健康)",
          lines: [
            { speaker: "A (同事)", cn: "你今天怎么没去跑步？", py: "Nǐ jīntiān zěnme méi qù pǎobù?", en: "Why didn't you go running today?" },
            { speaker: "B (小张)", cn: "我生病了，头疼，没起床。", py: "Wǒ shēngbìng le, tóuténg, méi qǐchuáng.", en: "I got sick, have a headache, and didn't get out of bed." },
            { speaker: "A (同事)", cn: "看医生了吗？吃药了没有？", py: "Kàn yīshēng le ma? Chī yào le méiyǒu?", en: "Did you see a doctor? Have you taken medicine?" },
            { speaker: "B (小张)", cn: "吃了，医生让我多休息。我今天不上班了。", py: "Chī le, yīshēng ràng wǒ duō xiūxi. Wǒ jīntiān bù shàngbān le.", en: "Yes, the doctor asked me to rest more. I'm not going to work today." }
          ]
        },
        quiz: [
          {
            question: "Where should the time word '八点 (8 o'clock)' be placed in '我上班' (I go to work)?",
            options: ["我上班八点", "八点我上班 / 我八点上班", "我上班在八点", "我八点上班在"],
            answer: "八点我上班 / 我八点上班",
            explanation: "Time words must be placed before the verb, either before or after the subject."
          },
          {
            question: "Translate 'to take medicine' into Chinese characters:",
            options: ["吃药 (chī yào)", "买药 (mǎi yào)", "吃米饭 (chī mǐfàn)", "看医生 (kàn yīshēng)"],
            answer: "吃药 (chī yào)",
            explanation: "In Chinese, we use the verb '吃 (chī - to eat)' with medicine '药 (yào)'. So '吃药' is to take medicine."
          },
          {
            question: "What does '起床 (qǐchuáng)' mean?",
            options: ["To sleep", "To go to bed", "To get out of bed / wake up", "To cook food"],
            answer: "To get out of bed / wake up",
            explanation: "'起 (qǐ)' means to rise, '床 (chuáng)' means bed. So 起床 is getting out of bed."
          },
          {
            question: "What is the meaning of duplication in '看看 (kànkan)'?",
            options: ["Doing it continuously", "Doing it casually / briefly", "Forcing someone to do it", "Doing it in the past"],
            answer: "Doing it casually / briefly",
            explanation: "Verb duplication indicates doing something casually, for a short time, or trying it out."
          }
        ]
      },
      // HSK 2 - Day 2
      {
        id: "hsk2_day2",
        title: "Day 2: Weather & Transport",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "晴天", pinyin: "qíngtiān", meaning: "sunny day", deconstruct: "晴 (Sunny) + 天 (Sky). 晴 has 日 (Sun) + 青 (Blue/Green). A clear sunny day.", exampleCn: "今天是个晴天。", examplePy: "Jīntiān  shì gè qíngtiān.", exampleEn: "Today is a sunny day." },
          { character: "阴天", pinyin: "yīntiān", meaning: "cloudy day / overcast", deconstruct: "阴 (Cloudy) + 天 (Sky). 阴 has 阝 (Mound) + 月 (Shadow). Represents shade or clouds.", exampleCn: "外面是阴天，可能会下雨。", examplePy: "Wàimiàn  shì yīntiān, kěnéng huì xià yǔ.", exampleEn: "It is cloudy outside, it might rain." },
          { character: "自行车", pinyin: "zìxíngchē", meaning: "bicycle / bike", deconstruct: "自 (Self) + 行 (Go/Move) + 车 (Vehicle). Self-propelled wheeled vehicle, i.e., bicycle.", exampleCn: "我骑自行车去学校。", examplePy: "Wǒ qí zìxíngchē qù xuéxiào.", exampleEn: "I ride a bicycle to school." },
          { character: "公共汽车", pinyin: "gōnggòng qìchē", meaning: "bus", deconstruct: "公共 (Public) + 汽车 (Car). 汽 (Steam/Gas) + 车 (Vehicle). Public automobile/bus.", exampleCn: "坐公共汽车很方便。", examplePy: "Zuò gōnggòng qìchē hěn fāngbiàn.", exampleEn: "Taking the bus is very convenient." },
          { character: "便宜", pinyin: "piányi", meaning: "cheap / inexpensive", deconstruct: "便 (Convenient) + 宜 (Suitable). 便 has 亻 (Person); 宜 has 宀 (Roof). Suitable and convenient price.", exampleCn: "这件衣服很便宜。", examplePy: "Zhè jiàn yīfu hěn piányi.", exampleEn: "This piece of clothing is very cheap." }
        ],
        grammar: [
          {
            title: "1. Describing Modes of Transport: 骑 (qí) vs. 坐 (zuò)",
            explanation: "For transport, we use '骑' (qí - to straddle/ride) for two-wheeled vehicles (bicycles, motorcycles) and horses. We use '坐' (zuò - to sit/ride in) for cars, buses, trains, and planes.",
            examples: [
              { cn: "我骑自行车上班。", py: "Wǒ qí zìxíngchē shàngbān.", en: "I ride a bike to work." },
              { cn: "他坐公共汽车去机场。", py: "Tā zuò gōnggòng qìchē qù jīchǎng.", en: "He takes a bus to the airport." }
            ],
            practice: {
              prompt: "Arrange: 'I take the bus to school.'",
              words: ["公共汽车", "坐", "我", "去学校"],
              answer: ["我", "坐", "公共汽车", "去学校"]
            }
          },
          {
            title: "2. The potential auxiliary 会 (huì) for probability",
            explanation: "Besides meaning 'to know how to do something', '会' (huì) can indicate that an event is likely to happen in the future (similar to 'will' or 'might' in English).",
            examples: [
              { cn: "明天会下雨吗？", py: "Míngtiān huì xià yǔ ma?", en: "Will it rain tomorrow?" },
              { cn: "今天不会是晴天。", py: "Jīntiān bú huì  shì qíngtiān.", en: "Today will not be sunny." }
            ],
            practice: {
              prompt: "Arrange: 'He will come tomorrow.'",
              words: ["会", "明天", "来", "他"],
              answer: ["他", "明天", "会", "来"]
            }
          }
        ],
        dialogue: {
          title: "Going to work (去上班的路上)",
          lines: [
            { speaker: "A (阿亮)", cn: "今天天气怎么样？是晴天吗？", py: "Jīntiān tiānqì zěnme yàng? Shì qíngtiān ma?", en: "How is the weather today? Is it sunny?" },
            { speaker: "B (阿丽)", cn: "不是，今天是阴天，下午可能会下雨。", py: "Bú  shì, jīntiān  shì yīntiān, xiàwǔ kěnéng huì xià yǔ.", en: "No, today is cloudy, and it might rain this afternoon." },
            { speaker: "A (阿亮)", cn: "那你怎么去公司？骑自行车吗？", py: "Nà nǐ zěnme qù gōngsī? Qí zìxíngchē ma?", en: "Then how are you going to the office? Riding a bicycle?" },
            { speaker: "B (阿丽)", cn: "我不骑自行车。我坐公共汽车，公共汽车票很便宜。", py: "Wǒ bù qí zìxíngchē. Wǒ zuò gōnggòng qìchē, gōnggòng qìchē piào hěn piányi.", en: "I don't ride a bike. I take the bus; the bus ticket is very cheap." }
          ]
        },
        quiz: [
          {
            question: "Which verb is used for riding a bicycle?",
            options: ["坐 (zuò)", "骑 (qí)", "打 (dǎ)", "开 (kāi)"],
            answer: "骑 (qí)",
            explanation: "骑 (qí) means to straddle/ride and is used for bicycles, motorcycles, and horses."
          },
          {
            question: "Translate: '阴天' (yīntiān)",
            options: ["Sunny day", "Rainy day", "Cloudy day / Overcast", "Snowy day"],
            answer: "Cloudy day / Overcast",
            explanation: "'阴 (yīn)' represents shadow/yin/cloudy, and '天 (tiān)' is day/sky. So 阴天 is an overcast or cloudy day."
          },
          {
            question: "What does '会 (huì)' mean in: '明天会下雪'?",
            options: ["Knows how to", "Can speak", "Will / Is likely to", "Must"],
            answer: "Will / Is likely to",
            explanation: "Here, '会' expresses likelihood or future probability: 'Tomorrow it will snow'."
          },
          {
            question: "What is '便宜' (piányi)?",
            options: ["Fast", "Slow", "Expensive", "Cheap"],
            answer: "Cheap",
            explanation: "便宜 (piányi) means cheap or inexpensive."
          }
        ]
      },
      // HSK 2 - Day 3
      {
        id: "hsk2_day3",
        title: "Day 3: Hobbies & Sport",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "旅游", pinyin: "lǚyóu", meaning: "to travel", deconstruct: "旅 (Travel) + 游 (Wander). 旅 is a banner for a group of soldiers; 游 is 氵 (Water) + 斿 (Float). Wander around.", exampleCn: "我喜欢去中国旅游。", examplePy: "Wǒ xǐhuān qù Zhōngguó lǚyóu.", exampleEn: "I like to travel to China." },
          { character: "唱歌", pinyin: "chànggē", meaning: "to sing a song", deconstruct: "唱 (Sing) + 歌 (Song). 唱 has 口 (Mouth) + 昌 (Phonetic); 歌 has 哥 + 欠 (Breath). Opening mouth to emit musical notes.", exampleCn: "她唱歌唱得非常好听。", examplePy: "Tā chànggē chàng de fēicháng hǎotīng.", exampleEn: "She sings very beautifully." },
          { character: "跳舞", pinyin: "tiàowǔ", meaning: "to dance", deconstruct: "跳 (Jump) + 舞 (Dance). 跳 has ⻊ (Foot); 舞 is a pictograph of a dancer holding tassels. Expressive movement of feet and body.", exampleCn: "我不会跳舞。", examplePy: "Wǒ bú huì tiàowǔ.", exampleEn: "I cannot dance." },
          { character: "运动", pinyin: "yùndòng", meaning: "sports / to exercise", deconstruct: "运 (Transport/Move) + 动 (Move/Action). 运 has 辶 (Walk); 动 has 力 (Strength). Moving with physical effort.", exampleCn: "每天运动身体好。", examplePy: "Měitiān  yùndòng shēntǐ hǎo.", exampleEn: "Exercising every day is good for health." },
          { character: "足球", pinyin: "zúqiú", meaning: "soccer / football", deconstruct: "足 (Foot) + 球 (Ball). 足 represents foot/leg; 球 has 王 (Jade/Jewel) + 求 (Phonetic). Ball game played with feet.", exampleCn: "踢足球。", examplePy: "Tī zúqiú.", exampleEn: "Play soccer." }
        ],
        grammar: [
          {
            title: "1. Expressing capability: 会 (huì) vs. 能 (néng)",
            explanation: "'会' indicates a skill learned through study/practice (e.g. speaking a language, swimming). '能' indicates physical ability, capacity, or permission in a specific situation.",
            examples: [
              { cn: "我会唱歌，但今天感冒了，不能唱。", py: "Wǒ huì chànggē, dàn jīntiān gǎnmào le, bù néng chàng.", en: "I know how to sing, but I have a cold today and cannot sing." }
            ],
            practice: {
              prompt: "Arrange: 'I can speak Chinese.'",
              words: ["说", "我会", "汉语", "能"],
              answer: ["我会", "说", "汉语"]
            }
          },
          {
            title: "2. The degree particle 得 (de)",
            explanation: "Used after a verb to link it with an adverb of degree (like Very Good, Extremely Well). Structure: Verb + 得 + Adverb + Adjective. If the verb takes an object, the verb must be repeated.",
            examples: [
              { cn: "他跑得快。", py: "Tā pǎo de kuài.", en: "He runs fast." },
              { cn: "她唱歌唱得很好。", py: "Tā chànggē chàng de hěn hǎo.", en: "She sings very well." }
            ],
            practice: {
              prompt: "Arrange: 'He writes characters very well.'",
              words: ["写字", "写得", "很好", "他"],
              answer: ["他", "写字", "写得", "很好"]
            }
          }
        ],
        dialogue: {
          title: "Weekend plans (周末的打算)",
          lines: [
            { speaker: "A (莉莉)", cn: "你周末有什么运动计划？", py: "Nǐ zhōumò yǒu shénme yùndòng jìhuà?", en: "Do you have any exercise plans for the weekend?" },
            { speaker: "B (大卫)", cn: "我和朋友去踢足球。你呢？", py: "Wǒ hé péngyou qù tī zúqiú. Nǐ ne?", en: "I'm going to play soccer with friends. How about you?" },
            { speaker: "A (莉莉)", cn: "我喜欢唱歌和跳舞。我打算和妹妹去唱歌。", py: "Wǒ xǐhuān chànggē hé tiàowǔ. Wǒ dǎsuàn hé mèimei qù chànggē.", en: "I like singing and dancing. I plan to sing with my sister." },
            { speaker: "B (大卫)", cn: "你唱歌唱得真好！祝你们玩得开心！", py: "Nǐ chànggē chàng de zhēn hǎo! Zhù nǐmen wán de kāixīn!", en: "You sing really well! Have a great time!" }
          ]
        },
        quiz: [
          {
            question: "Which character means 'to travel'?",
            options: ["唱歌 (chànggē)", "跳舞 (tiàowǔ)", "旅游 (lǚyóu)", "运动 (yùndòng)"],
            answer: "旅游 (lǚyóu)",
            explanation: "旅游 (lǚyóu) means to travel."
          },
          {
            question: "How do you correctly say 'She swims very fast'?",
            options: ["她游泳得快 (Tā yóuyǒng de kuài)", "她游泳游得快 (Tā yóuyǒng yóu de kuài)", "她快游泳 (Tā kuài yóuyǒng)", "她得游泳快 (Tā de yóuyǒng kuài)"],
            answer: "她游泳游得快 (Tā yóuyǒng yóu de kuài)",
            explanation: "Since '游泳' is a verb-object compound, the verb '游' must be repeated before adding '得快'."
          },
          {
            question: "What is '足球 (zúqiú)'?",
            options: ["Basketball", "Tennis", "Soccer / Football", "Swimming"],
            answer: "Soccer / Football",
            explanation: "足 (zú) means foot, and 球 (qiú) means ball. So 足球 is football/soccer."
          },
          {
            question: "What is the difference between '会' and '能' for 'speaking Chinese'?",
            options: [
              "There is no difference",
              "会 is a learned skill; 能 is physical capability/permission",
              "能 is a learned skill; 会 is physical capability",
              "会 is only used in writing"
            ],
            answer: "会 is a learned skill; 能 is physical capability/permission",
            explanation: "We use '会' to show we learned Chinese. We use '能' if we have the physical voice or temporary permission to speak it right now."
          }
        ]
      },
      // HSK 2 - Day 4
      {
        id: "hsk2_day4",
        title: "Day 4: Shopping & Prices",
        level: "HSK 2 (Elementary)",
        duration: "60 min",
        vocab: [
          { character: "买", pinyin: "mǎi", meaning: "to buy", deconstruct: "买 (Buy). Originally a net buying cowries (money), now simplified to buying goods.", exampleCn: "你想买什么？", examplePy: "Nǐ xiǎng mǎi shénme?", exampleEn: "What do you want to buy?" },
          { character: "卖", pinyin: "mài", meaning: "to sell", deconstruct: "卖 (Sell). Notice the cross '十' on top of '买' (Buy), representing putting goods out for sale.", exampleCn: "这里不卖自行车。", examplePy: "Zhèlǐ bú mài zìxíngchē.", exampleEn: "They don't sell bicycles here." },
          { character: "衣服", pinyin: "yīfu", meaning: "clothes / clothing", deconstruct: "衣 (Clothes) + 服 (Garment). 衣 is a pictograph of a high-collar jacket; 服 has 月 (Body) + 卩 + 又.", exampleCn: "买新衣服。", examplePy: "Mǎi xīn yīfu.", exampleEn: "Buy new clothes." },
          { character: "贵", pinyin: "guì", meaning: "expensive", deconstruct: "贵 (Expensive). 贝 (Cowrie shell/Money) at the bottom. A high-value item.", exampleCn: "太贵了，便宜一点吧。", examplePy: "Tài guì le, piányi  yìdiǎn ba.", exampleEn: "Too expensive, make it cheaper." },
          { character: "百", pinyin: "bǎi", meaning: "hundred", deconstruct: "百 (Hundred). A line (一) over 白 (White), representing the number one hundred.", exampleCn: "两百块钱。", examplePy: "Liǎng bǎi kuài qián.", exampleEn: "Two hundred yuan." }
        ],
        grammar: [
          {
            title: "1. The Exclamatory Structure: 太 + Adj + 了 (tài... le)",
            explanation: "Used to express an extreme state or exclamation, typically translated as 'Too...' or 'Extremely...'. Often carries a slightly negative tone but can also be positive.",
            examples: [
              { cn: "太贵了！", py: "Tài guì le!", en: "Too expensive!" },
              { cn: "太好了！", py: "Tài hǎo le!", en: "Great! / Extremely good!" }
            ],
            practice: {
              prompt: "Arrange: 'The weather is too hot!'",
              words: ["天气", "太", "热了", "很"],
              answer: ["天气", "太", "热了"]
            }
          },
          {
            title: "2. Asking for discounts: Adj + 一点儿 (yìdiǎnr)",
            explanation: "Placing '一点儿' (or '一点') after an adjective acts as a comparative meaning 'a little bit more...'. Frequently used in negotiations or requests.",
            examples: [
              { cn: "便宜一点吧。", py: "Piányi  yìdiǎn ba.", en: "Make it a bit cheaper, please." },
              { cn: "快一点！", py: "Kuài  yìdiǎn!", en: "Hurry up! / A bit faster!" }
            ],
            practice: {
              prompt: "Arrange: 'Please speak a bit slower.'",
              words: ["慢一点", "请", "说", "你"],
              answer: ["请", "说", "慢一点"]
            }
          }
        ],
        dialogue: {
          title: "Buying clothes (买衣服)",
          lines: [
            { speaker: "A (顾客)", cn: "你好，这件红色衣服多少钱？", py: "Nǐ hǎo, zhè jiàn hóngsè yīfu duōshao qián?", en: "Hello, how much is this red clothing?" },
            { speaker: "B (售货员)", cn: "这件衣服三百块钱。", py: "Zhè jiàn  yīfu sān bǎi kuài qián.", en: "This piece of clothing is 300 yuan." },
            { speaker: "A (顾客)", cn: "太贵了！能便宜一点吗？两百块可以吗？", py: "Tài guì le! Néng piányi  yìdiǎn ma? Liǎng bǎi kuài kěyǐ ma?", en: "Too expensive! Can it be a bit cheaper? Is 200 yuan okay?" },
            { speaker: "B (售货员)", cn: "两百块太便宜了。两百五十块卖给你吧。", py: "Liǎng bǎi kuài tài piányi le. Liǎng bǎi wǔshí kuài mài gěi nǐ ba.", en: "200 is too cheap. I'll sell it to you for 250 yuan." }
          ]
        },
        quiz: [
          {
            question: "What is the difference between '买' (mǎi) and '卖' (mài)?",
            options: [
              "买 is expensive; 卖 is cheap",
              "买 means to buy (third tone); 卖 means to sell (fourth tone)",
              "They are the exact same word",
              "买 is for food; 卖 is for clothes"
            ],
            answer: "买 means to buy (third tone); 卖 means to sell (fourth tone)",
            explanation: "买 (mǎi, 3rd tone) is to buy. 卖 (mài, 4th tone) is to sell. Notice 卖 has a small cross '十' top radical."
          },
          {
            question: "How do you translate 'Too expensive!'?",
            options: ["很贵 (hěn guì)", "便宜一点 (piányi  yìdiǎn)", "太贵了 (tài guì le)", "一百块 (yī bǎi kuài)"],
            answer: "太贵了 (tài guì le)",
            explanation: "太...了 (tài... le) forms exclamations. 太贵了 means 'too expensive!'."
          },
          {
            question: "What is '百' (bǎi)?",
            options: ["Ten", "Hundred", "Thousand", "Million"],
            answer: "Hundred",
            explanation: "百 (bǎi) represents hundred (e.g. 三百 = 300)."
          },
          {
            question: "What is the meaning of '便宜一点吧'?",
            options: ["Please sell this", "Can I pay in cash?", "Can you make it a bit cheaper?", "I want the expensive one"],
            answer: "Can you make it a bit cheaper?",
            explanation: "便宜 (cheap) + 一点 (a little) + 吧 (suggestion particle) is a classic negotiating phrase meaning 'make it a bit cheaper'."
          }
        ]
      }
    ],
    hsk3: [
      // HSK 3 - Day 1
      {
        id: "hsk3_day1",
        title: "Day 1: Workplace & Decisions",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "打算", pinyin: "dǎsuàn", meaning: "plan / to intend", exampleCn: "你毕业后有什么打算？", examplePy: "Nǐ bìyè hòu  yǒu shénme dǎsuàn?", exampleEn: "What are your plans after graduation?" },
          { character: "经理", pinyin: "jīnglǐ", meaning: "manager", exampleCn: "经理找你有事。", examplePy: "Jīnglǐ zhǎo nǐ  yǒu shì.", exampleEn: "The manager is looking for you for something." },
          { character: "会议", pinyin: "huìyì", meaning: "meeting / conference", exampleCn: "下午两点有个重要会议。", examplePy: "Xiàwǔ liǎng diǎn  yǒu gè zhòngyào huìyì.", exampleEn: "There is an important meeting at 2 PM." },
          { character: "决定", pinyin: "juédìng", meaning: "decision / to decide", exampleCn: "我决定明天去北京。", examplePy: "Wǒ juédìng míngtiān qù Běijīng.", exampleEn: "I decided to go to Beijing tomorrow." },
          { character: "习惯", pinyin: "xíguàn", meaning: "habit / to get used to", exampleCn: "我已经习惯了早起。", examplePy: "Wǒ  yǐjīng xíguàn le zǎoqǐ.", exampleEn: "I'm already used to waking up early." }
        ],
        grammar: [
          {
            title: "1. The Grammar structure: 虽然...但是... (suīrán... dànshì...)",
            explanation: "Means 'Although... but...'. In Chinese, even if you write '虽然' at the beginning of the clause, you MUST include '表达转折' like '但是' or '可是' (but) in the second clause.",
            examples: [
              { cn: "虽然汉语很难，但是我很喜欢学。", py: "Suīrán Hànyǔ hěn nán, dànshì wǒ hěn xǐhuān xué.", en: "Although Chinese is hard, (but) I really like learning it." }
            ],
            practice: {
              prompt: "Arrange: 'Although he is tired, he still works.'",
              words: ["虽然他很累", "但是", "去工作", "他还"],
              answer: ["虽然他很累", "表达转折", "但是", "他还", "去工作"]
            }
          },
          {
            title: "2. Double aspect particle: 了...了 (le... le)",
            explanation: "When '了' is placed after the verb and also at the end of the sentence, it indicates that the action has been going on for a duration of time and is STILL continuing now.",
            examples: [
              { cn: "我学了一年汉语了。", py: "Wǒ xué le yì nián Hànyǔ le.", en: "I have studied Chinese for a year (and I'm still studying it)." },
              { cn: "他在北京住了三年了。", py: "Tā zài Běijīng zhù le sān nián le.", en: "He has lived in Beijing for three years (and still lives there)." }
            ],
            practice: {
              prompt: "Arrange: 'He has worked for five hours.'",
              words: ["工作了", "五个小时了", "他", "在"],
              answer: ["他", "工作了", "五个小时了"]
            }
          }
        ],
        dialogue: {
          title: "A meeting with the manager (跟经理的谈话)",
          lines: [
            { speaker: "A (李秘书)", cn: "王经理，下午两点有个关于项目决定的会议，您打算参加吗？", py: "Wáng jīnglǐ, xiàwǔ liǎng diǎn  yǒu gè guānyú xiàngmù juédìng de huìyì, nín dǎsuàn cānjiā ma?", en: "Manager Wang, there is a meeting regarding project decisions at 2 PM. Do you plan to attend?" },
            { speaker: "B (王经理)", cn: "虽然我下午有很多文件要看，但是这个会议很重要，我会准时参加。", py: "Suīrán wǒ xiàwǔ  yǒu hěn duō wénjiàn yào kàn, dànshì zhè gè huìyì hěn zhòngyào, wǒ huì zhǔnshí cānjiā.", en: "Although I have many documents to review this afternoon, (but) this meeting is very important, I will attend on time." },
            { speaker: "A (李秘书)", cn: "好的，我已经准备好了所有材料。您对这个新团队习惯了吗？", py: "Hǎo de, wǒ  yǐjīng zhǔnbèi hǎo le suǒyǒu cáiliào. Nín duì zhè gè xīn tuánduì xíguàn le ma?", en: "Great, I've prepared all the materials. Have you gotten used to this new team?" },
            { speaker: "B (王经理)", cn: "习惯了，他们工作很努力。我做出了继续合作的决定。", py: "Xíguàn le, tāmen gōngzuò hěn nǔlì. Wǒ zuò chū le jìxù hézuò de juédìng.", en: "I'm used to them; they work hard. I have made the decision to continue our cooperation." }
          ]
        },
        quiz: [
          {
            question: "Which of the following means 'Although... but...'?",
            options: [
              "因为...所以... (yīnwèi... suǒyǐ...)",
              "虽然...但是... (suīrán... dànshì...)",
              "不但...而且... (búdàn... érqiě...)",
              "如果...就... (rúguǒ... jiù...)"
            ],
            answer: "虽然...但是... (suīrán... dànshì...)",
            explanation: "'虽然...但是...' is the standard correlative conjunction for concession ('Although... but...')."
          },
          {
            question: "What does '打算' (dǎsuàn) mean?",
            options: ["To finish", "To guess", "To clean", "To plan / plan"],
            answer: "To plan / plan",
            explanation: "'打算' can be a verb ('to plan/intend') or a noun ('plan/intention')."
          },
          {
            question: "What is indicated by having '了' both after the verb and at the end of a sentence?",
            options: [
              "The action was completed in the past",
              "The action is ongoing and continues into the present",
              "The action will happen in the future",
              "The action was cancelled"
            ],
            answer: "The action is ongoing and continues into the present",
            explanation: "Verb + 了 + Duration + Object + 了 signals that the action started in the past and is still ongoing."
          },
          {
            question: "Translate: '经理' (jīnglǐ)",
            options: ["Secretary", "President", "Manager", "Colleague"],
            answer: "Manager",
            explanation: "'经理 (jīnglǐ)' translates to manager."
          }
        ]
      },
      // HSK 3 - Day 2
      {
        id: "hsk3_day2",
        title: "Day 2: Health & Hospital",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "感冒", pinyin: "gǎnmào", meaning: "to catch a cold / flu", deconstruct: "感 (Feel/Emotion) + 冒 (Emit/Risk). 感 has 心 (Heart); 冒 is ⺜ (Cover) + 目 (Eye). Feeling affected by elements.", exampleCn: "我感冒了，流鼻涕。", examplePy: "Wǒ gǎnmào le, liú bítì.", exampleEn: "I caught a cold, and have a runny nose." },
          { character: "发烧", pinyin: "fāshāo", meaning: "to have a fever", deconstruct: "发 (Send out) + 烧 (Burn). 发 is sending forth; 烧 has 火 (Fire) + 尧 (Phonetic). Body burning with heat.", exampleCn: "他发烧到三十九度。", examplePy: "Tā fāshāo dào sānshíjiǔ dù.", exampleEn: "He has a fever of 39 degrees." },
          { character: "检查", pinyin: "jiǎnchá", meaning: "to examine / check up", deconstruct: "检 (Examine) + 查 (Investigate). Both characters have 木 (Wood) as a radical, historically referring to wooden labels and files inspected for accuracy.", exampleCn: "医生帮我检查了身体。", examplePy: "Yīshēng bāng wǒ jiǎnchá le shēntǐ.", exampleEn: "The doctor checked my body." },
          { character: "健康", pinyin: "jiànkāng", meaning: "health / healthy", deconstruct: "健 (Strong) + 康 (Peace/Health). 健 has 亻 (Person) + 建 (Build); 康 represents peaceful well-being. A robust body in peace.", exampleCn: "祝你身体健康！", examplePy: "Zhù nǐ shēntǐ jiànkāng!", exampleEn: "Wish you good health!" },
          { character: "舒服", pinyin: "shūfu", meaning: "comfortable / feeling well", deconstruct: "舒 (Stretch/Relax) + 服 (Garment/Adapt). 舒 has 舍 (House) + 予 (Give); 服 has 月 (Body) + 又. Body relaxed and fitting well.", exampleCn: "我今天身体不舒服。", examplePy: "Wǒ jīntiān shēntǐ bù shūfu.", exampleEn: "I don't feel well today." }
        ],
        grammar: [
          {
            title: "1. The Grammar Structure: 除了...以外，都/还... (chúle... yǐwài, dōu/hái...)",
            explanation: "This structure has two opposite meanings depending on the adverb that follows:\n1. '除了...以外，都...' = 'Except for..., all...'\n2. '除了...以外，还...' = 'Besides..., also...'",
            examples: [
              { cn: "除了大卫以外，大家都在教室里。", py: "Chúle Dàwèi yǐwài, dàjiā dōu zài jiàoshì lǐ.", en: "Except for David, everyone is in the classroom." },
              { cn: "除了英语以外，他还会说汉语。", py: "Chúle Yīngyǔ yǐwài,  tā hái huì shuō Hànyǔ.", en: "Besides English, he also knows how to speak Chinese." }
            ],
            practice: {
              prompt: "Arrange: 'Besides tea, I also like coffee.'",
              words: ["我", "除了茶以外", "还喜欢", "喝咖啡"],
              answer: ["除了茶以外", "我", "还喜欢", "喝咖啡"]
            }
          },
          {
            title: "2. Indicating Change: The sentence-final 了 (le)",
            explanation: "When placed at the end of a sentence, '了' can indicate a change of state, or the realization of a new situation. It means 'now' or 'no longer' (in negative sentences).",
            examples: [
              { cn: "下雨了。", py: "Xià yǔ le.", en: "It is raining now (it wasn't raining before)." },
              { cn: "我没有钱了。", py: "Wǒ méiyǒu qián le.", en: "I don't have money anymore." }
            ],
            practice: {
              prompt: "Arrange: 'I don't go running anymore.'",
              words: ["跑步了", "不去", "我", "运动"],
              answer: ["我", "不去", "跑步了"]
            }
          }
        ],
        dialogue: {
          title: "At the clinic (在诊所)",
          lines: [
            { speaker: "A (医生)", cn: "你今天哪里不舒服？", py: "Nǐ jīntiān nǎlǐ bù shūfu?", en: "Where do you feel unwell today?" },
            { speaker: "B (小林)", cn: "我昨天开始感冒，现在发烧，全身没力气。", py: "Wǒ zuótiān kāishǐ gǎnmào, xiànzài fāshāo, quánshēn méi lìqi.", en: "I caught a cold starting yesterday, now I have a fever, and my whole body has no energy." },
            { speaker: "A (医生)", cn: "我帮你检查一下。张开嘴，说'啊'。", py: "Wǒ bāng nǐ jiǎnchá yíxià. Zhāng kāi zuǐ, shuō 'a'.", en: "Let me check you. Open your mouth and say 'Ah'." },
            { speaker: "B (小林)", cn: "医生，我的身体健康有什么严重问题吗？", py: "Yīshēng, wǒ de shēntǐ jiànkāng  yǒu shénme yánzhòng wèntí ma?", en: "Doctor, is there any serious problem with my health?" },
            { speaker: "A (医生)", cn: "没有，只是普通感冒。除了吃药以外，还要多喝热水，多睡觉。", py: "Méiyǒu, zhǐshì pǔtōng gǎnmào. Chúle chī yào yǐwài, hái yào duō hē rèshuǐ, duō shuìjiào.", en: "No, just a common cold. Besides taking medicine, you also need to drink more hot water and sleep more." }
          ]
        },
        quiz: [
          {
            question: "What is the meaning of '除了...以外，还...'?",
            options: ["Except for..., all...", "Besides..., also...", "Although..., but...", "Because..., therefore..."],
            answer: "Besides..., also...",
            explanation: "When paired with '还 (hái - also/still)', this structure is additive, meaning 'Besides..., also...'"
          },
          {
            question: "What does '发烧' (fāshāo) mean?",
            options: ["To cough", "To sneeze", "To have a fever", "To break a bone"],
            answer: "To have a fever",
            explanation: "'发' is to emit/develop, '烧' is to burn/heat. So 发烧 is to have a fever."
          },
          {
            question: "What is indicated by sentence-final '了' in '下雨了'?",
            options: ["Past completion", "Future necessity", "A change of state / new situation", "A continuous habit"],
            answer: "A change of state / new situation",
            explanation: "It indicates a change: it is raining now (whereas it was not raining previously)."
          },
          {
            question: "Translate: '检查' (jiǎnchá)",
            options: ["To cure", "To examine / check", "To operations", "To feel pain"],
            answer: "To examine / check",
            explanation: "'检查' means to check, examine, or inspect."
          }
        ]
      },
      // HSK 3 - Day 3
      {
        id: "hsk3_day3",
        title: "Day 3: Hobbies & Interest",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "感兴趣", pinyin: "gǎn xìngqù", meaning: "to be interested in", deconstruct: "感 (Feel) + 兴趣 (Interest). 兴 has ⺠ + 𠔁; 趣 has 走 (Walk) + 取 (Take). Feeling an attraction towards a topic.", exampleCn: "我对画画很感兴趣。", examplePy: "Wǒ duì huàhuà hěn gǎn xìngqù.", exampleEn: "I am very interested in drawing." },
          { character: "音乐", pinyin: "yīnyuè", meaning: "music", deconstruct: "音 (Sound) + 乐 (Music/Joy). 音 is a mouth blowing a flute; 乐 is a pictograph of a musical instrument. Sound of joy.", exampleCn: "听古典音乐。", examplePy: "Tīng gǔdiǎn yīnyuè.", exampleEn: "Listen to classical music." },
          { character: "爱好", pinyin: "àihào", meaning: "hobby / interest", deconstruct: "爱 (Love) + 好 (Good). 爱 has 爪 + 心 (Heart) + 友 (Friend);好 is 女 + 子. What you love and find good.", exampleCn: "他的爱好是看电影。", examplePy: "Tā de àihào  shì kàn diànyǐng.", exampleEn: "His hobby is watching movies." },
          { character: "游戏", pinyin: "yóuxì", meaning: "game", deconstruct: "游 (Wander) + 戏 (Play/Drama). 游 is 氵 + 斿; 戏 has 又 (Hand) + 戈 (Spear). Wandering, active play.", exampleCn: "玩电脑游戏。", examplePy: "Wán diànnǎo yóuxì.", exampleEn: "Play computer games." },
          { character: "比赛", pinyin: "bǐsài", meaning: "competition / match", deconstruct: "比 (Compare) + 赛 (Compete). 比 is two people standing together comparing; 赛 has 贝 (Money/Prize). Competing for a prize.", exampleCn: "今晚有一场足球比赛。", examplePy: "Jīnwǎn  yǒu yì cháng zúqiú bǐsài.", exampleEn: "There is a soccer match tonight." }
        ],
        grammar: [
          {
            title: "1. Expressing Interest: 对...感兴趣 (duì... gǎn xìngqù)",
            explanation: "To say you are interested in something, you use the preposition '对' (duì - toward) + the object of interest + '感兴趣' (gǎn xìngqù). You can add an intensity word like '非常' or '很' before '感兴趣'.",
            examples: [
              { cn: "我对中国音乐很感兴趣。", py: "Wǒ duì Zhōngguó yīnyuè hěn gǎn xìngqù.", en: "I am very interested in Chinese music." },
              { cn: "他对打游戏不感兴趣。", py: "Tā duì dǎ yóuxì bù gǎn xìngqù.", en: "He is not interested in playing games." }
            ],
            practice: {
              prompt: "Arrange: 'He is very interested in soccer.'",
              words: ["对足球", "感兴趣", "他", "非常"],
              answer: ["他", "对足球", "非常", "感兴趣"]
            }
          },
          {
            title: "2. The Comparative structure: 跟...一样 (gēn... yíyàng)",
            explanation: "Used to indicate that two things are identical or similar. Structure: A + 跟 (gēn - with) + B + 一样 (yíyàng - same) + Adjective (optional, to show they share the same degree of a quality).",
            examples: [
              { cn: "我的爱好跟他的爱好一样。", py: "Wǒ de àihào gēn tā de àihào yíyàng.", en: "My hobby is the same as his." },
              { cn: "今天跟昨天一样热。", py: "Jīntiān gēn zuótiān yíyàng rè.", en: "Today is as hot as yesterday." }
            ],
            practice: {
              prompt: "Arrange: 'This game is the same as that one.'",
              words: ["跟那个游戏", "一样", "这个游戏", "好玩"],
              answer: ["这个游戏", "跟那个游戏", "一样"]
            }
          }
        ],
        dialogue: {
          title: "Talking about hobbies (谈论兴趣爱好)",
          lines: [
            { speaker: "A (阿杰)", cn: "大卫，你的爱好是什么？", py: "Dàwèi, nǐ de àihào  shì shénme?", en: "David, what is your hobby?" },
            { speaker: "B (大卫)", cn: "我喜欢听音乐和玩电脑游戏。你呢？", py: "Wǒ xǐhuān tīng yīnyuè hé wán diànnǎo yóuxì. Nǐ ne?", en: "I like listening to music and playing computer games. What about you?" },
            { speaker: "A (阿杰)", cn: "我对游戏不感兴趣，我喜欢看体育比赛。今晚有足球比赛，我们一起看吧。", py: "Wǒ duì yóuxì bù gǎn xìngqù, wǒ xǐhuān kàn tǐyù bǐsài. Jīnwǎn  yǒu zúqiú bǐsài, wǒmen yìqǐ kàn ba.", en: "I'm not interested in games; I like watching sports matches. There is a football match tonight, let's watch it together." },
            { speaker: "B (大卫)", cn: "好啊！我的爱好跟你的爱好一样，我也非常喜欢足球！", py: "Hǎo a! Wǒ de àihào gēn nǐ de àihào yíyàng, wǒ yě fēicháng xǐhuān zúqiú!", en: "Sure! My hobby is the same as yours, I also love soccer very much!" }
          ]
        },
        quiz: [
          {
            question: "How do you say 'I am interested in art'?",
            options: [
              "我感兴趣艺术 (Wǒ gǎn xìngqù  yìshù)",
              "我对艺术很感兴趣 (Wǒ duì  yìshù hěn gǎn xìngqù)",
              "我跟艺术一样感兴趣 (Wǒ gēn  yìshù yíyàng gǎn xìngqù)",
              "艺术对我感兴趣 (Yìshù duì wǒ gǎn xìngqù)"
            ],
            answer: "我对艺术很感兴趣 (Wǒ duì  yìshù hěn gǎn xìngqù)",
            explanation: "The correct structure is Subject + 对 + Topic + Adverb + 感兴趣."
          },
          {
            question: "What is '比赛' (bǐsài)?",
            options: ["Hobby", "Music", "Game", "Competition / Match"],
            answer: "Competition / Match",
            explanation: "'比赛 (bǐsài)' refers to a competition, tournament, or match."
          },
          {
            question: "Translate '跟...一样 (gēn... yíyàng)':",
            options: ["Different from...", "Although..., same", "Same as / As... as...", "Because..."],
            answer: "Same as / As... as...",
            explanation: "'跟...一样' indicates equality or similarity (e.g. A is the same as B)."
          },
          {
            question: "What is '音乐' (yīnyuè)?",
            options: ["Movie", "Book", "Music", "Drawing"],
            answer: "Music",
            explanation: "音乐 (yīnyuè) means music."
          }
        ]
      },
      // HSK 3 - Day 4
      {
        id: "hsk3_day4",
        title: "Day 4: Travel & Social situations",
        level: "HSK 3 (Intermediate)",
        duration: "60 min",
        vocab: [
          { character: "行李箱", pinyin: "xínglixiāng", meaning: "suitcase / luggage", deconstruct: "行 (Go) + 李 (Plum/Bag) + 箱 (Box/Trunk). 箱 has ⺮ (Bamboo) + 相. A container for traveling items.", exampleCn: "把行李箱放进车里。", examplePy: "Bǎ xínglixiāng fàng jìn chē lǐ.", exampleEn: "Put the suitcase in the car." },
          { character: "护照", pinyin: "hùzhào", meaning: "passport", deconstruct: "护 (Protect) + 照 (Shine/Reflect). 护 has 扌 (Hand) + 户 (Door); 照 has 昭 + 灬 (Fire). Protective credential.", exampleCn: "别忘了带护照和机票。", examplePy: "Bié wàng le dài hùzhào hé jīpiào.", exampleEn: "Don't forget to bring your passport and plane ticket." },
          { character: "安全", pinyin: "ānquán", meaning: "safe / safety", deconstruct: "安 (Safe/Quiet) + 全 (Whole). 安 is a woman (女) under a roof (宀); 全 is a king (王) under a cover (人). Total safety.", exampleCn: "祝你一路平安，注意安全。", examplePy: "Zhù nǐ yílù píng'ān, zhùyì ānquán.", exampleEn: "Have a safe trip and pay attention to safety." },
          { character: "介绍", pinyin: "jièshào", meaning: "to introduce", deconstruct: "介 (Between) + 绍 (Connect). 介 is a person standing between; 绍 has 纟 (Thread) + 召. Introduce to connect people.", exampleCn: "让我来介绍一下新同事。", examplePy: "Ràng wǒ lái jièshào yíxià xīn tóngshì.", exampleEn: "Let me introduce the new colleague." },
          { character: "欢迎", pinyin: "huānyíng", meaning: "to welcome", deconstruct: "欢 (Joy) + 迎 (Greet). 欢 has 又 + 欠 (Yawn/Breath); 迎 has 辶 (Walk) + 卬. Welcoming someone with joy.", exampleCn: "欢迎你来到北京！", examplePy: "Huānyíng nǐ lái dào Běijīng!", exampleEn: "Welcome to Beijing!" }
        ],
        grammar: [
          {
            title: "1. The passive voice structural particle 被 (bèi)",
            explanation: "Used to form passive sentences. Structure: Receiver + 被 (bèi) + Doer + Verb + Other element (like '了' or result). The doer can sometimes be omitted.",
            examples: [
              { cn: "我的护照被小偷偷走了。", py: "Wǒ de hùzhào bèi xiǎotōu tōu zǒu le.", en: "My passport was stolen by a thief." },
              { cn: "行李箱被拿走了。", py: "Xínglixiāng bèi ná zǒu le.", en: "The suitcase was taken away." }
            ],
            practice: {
              prompt: "Arrange: 'My phone was broken by younger sister.'",
              words: ["被妹妹", "弄坏了", "我的手机", "他"],
              answer: ["我的手机", "被妹妹", "弄坏了"]
            }
          },
          {
            title: "2. The imperative construction 别 (bié) / 不要 (búyào) + Verb",
            explanation: "Used to tell someone not to do something. Equivalent to 'Don't' or 'Stop'. You can add '了' at the end of the sentence to mean 'Don't do it anymore'.",
            examples: [
              { cn: "别忘了带钥匙。", py: "Bié wàng le dài yàoshi.", en: "Don't forget to bring the keys." },
              { cn: "别哭了，注意安全。", py: "Bié kū le, zhùyì ānquán.", en: "Don't cry anymore, pay attention to safety." }
            ],
            practice: {
              prompt: "Arrange: 'Don't speak anymore.'",
              words: ["说了", "别", "你", "听"],
              answer: ["别", "说了"]
            }
          }
        ],
        dialogue: {
          title: "Arriving at the airport (在机场迎接)",
          lines: [
            { speaker: "A (李明)", cn: "大卫！欢迎你来到中国！我是李明，你的中方伙伴。", py: "Dàwèi! Huānyíng nǐ lái dào Zhōngguó! Wǒ  shì Lǐ Míng, nǐ de Zhōngfāng huǒbàn.", en: "David! Welcome to China! I am Li Ming, your Chinese partner." },
            { speaker: "B (大卫)", cn: "你好，李明！非常高兴认识你。谢谢你来接我。", py: "Nǐ hǎo, Lǐ Míng! Fēicháng gāoxìng rènshí nǐ. Xièxie nǐ lái jiē wǒ.", en: "Hello, Li Ming! Extremely glad to meet you. Thank you for coming to pick me up." },
            { speaker: "A (李明)", cn: "不用客气。你的行李箱都在这里了吗？别丢了护照。", py: "Bú  yòng kèqi. Nǐ de xínglixiāng dōu zài zhèlǐ le ma? Bié diū le hùzhào.", en: "You're welcome. Is all your luggage here? Don't lose your passport." },
            { speaker: "B (大卫)", cn: "行李都在。护照在我的口袋里，很安全。请问，我们要怎么去酒店？", py: "Xíngli dōu zài. Hùzhào zài wǒ de kǒudài lǐ, hěn ānquán. Qǐngwèn, wǒmen yào zěnme qù jiǔdiàn?", en: "All luggage is here. My passport is in my pocket, very safe. Excuse me, how are we going to the hotel?" },
            { speaker: "A (李明)", cn: "我的车就在外面。走吧，注意安全。", py: "Wǒ de chē jiù zài wài-miàn. Zǒu ba, zhùyì ānquán.", en: "My car is just outside. Let's go, watch your safety." }
          ]
        },
        quiz: [
          {
            question: "How do you form a passive sentence in Chinese?",
            options: [
              "Using the particle 吗 (ma)",
              "Using the preposition 被 (bèi) before the doer of the action",
              "Repeating the verb twice",
              "Using the adverb 很 (hěn)"
            ],
            answer: "Using the preposition 被 (bèi) before the doer of the action",
            explanation: "The character '被 (bèi)' is used to introduce the agent of the action in a passive sentence."
          },
          {
            question: "What does '别忘了' (bié wàng le) mean?",
            options: ["Please remember", "Do not forget", "Already forgotten", "Never mind"],
            answer: "Do not forget",
            explanation: "'别' means don't, and '忘' means forget. So '别忘了' means 'Don't forget!'."
          },
          {
            question: "Translate: '护照' (hùzhào)",
            options: ["Luggage", "Ticket", "Passport", "Key"],
            answer: "Passport",
            explanation: "'护照 (hùzhào)' is passport. '机票' is plane ticket."
          },
          {
            question: "What does '欢迎' (huānyíng) mean?",
            options: ["To thank", "To introduce", "To welcome", "To travel"],
            answer: "To welcome",
            explanation: "欢迎 (huānyíng) means to welcome."
          }
        ]
      }
    ]
  }
};

// Export if in Node context, otherwise attach to window
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = CHINESE_LESSONS;
} else {
  window.CHINESE_LESSONS = CHINESE_LESSONS;
}
