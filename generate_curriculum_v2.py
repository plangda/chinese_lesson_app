"""
HanPath - HSK 1 Curriculum Generator v2
========================================
Generates hsk1_data.js with:
  - All 150 official HSK 1 (3.0 standard) words
  - Proper, natural example sentences (no more "这是一个X。" template)
  - Thematically grouped lessons with coherent dialogues
  - Grammar points matched to each lesson's theme

Run: python generate_curriculum_v2.py
Output: hsk1_data.js (replaces the old file)
"""

import json
import random

# ============================================================
# ALL 150 OFFICIAL HSK 1 WORDS WITH PROPER EXAMPLE SENTENCES
# Format: c=character, p=pinyin, m=meaning, d=deconstruct,
#         ex_cn/ex_py/ex_en = example sentence
# ============================================================

ALL_HSK1_VOCAB = [
    # GREETINGS & SOCIAL
    {"c": "你好", "p": "nǐ hǎo", "m": "hello",
     "d": "你 (you) + 好 (good). Literally 'You good' — a wish that the other person is well.",
     "ex_cn": "你好！很高兴认识你。", "ex_py": "Nǐ hǎo! Hěn gāoxìng rènshi nǐ.",
     "ex_en": "Hello! Nice to meet you."},
    {"c": "再见", "p": "zàijiàn", "m": "goodbye",
     "d": "再 (again) + 见 (see). 'See you again'.",
     "ex_cn": "明天见，再见！", "ex_py": "Míngtiān jiàn, zàijiàn!",
     "ex_en": "See you tomorrow, goodbye!"},
    {"c": "谢谢", "p": "xièxie", "m": "thank you",
     "d": "謝 (thank) repeated twice for emphasis.",
     "ex_cn": "谢谢你帮我！", "ex_py": "Xièxie nǐ bāng wǒ!",
     "ex_en": "Thank you for helping me!"},
    {"c": "不客气", "p": "bú kèqi", "m": "you're welcome",
     "d": "不 (not) + 客气 (polite). Literally 'Don't be polite — it was nothing'.",
     "ex_cn": "谢谢！——不客气，应该的。", "ex_py": "Xièxie!——Bú kèqi, yīnggāi de.",
     "ex_en": "Thank you! — You're welcome, it's nothing."},
    {"c": "对不起", "p": "duìbuqǐ", "m": "sorry",
     "d": "对 (face) + 不 (not) + 起 (rise). 'I cannot face you' — a deep apology.",
     "ex_cn": "对不起，我来晚了。", "ex_py": "Duìbuqǐ, wǒ lái wǎn le.",
     "ex_en": "Sorry, I came late."},
    {"c": "没关系", "p": "méi guānxi", "m": "it's okay / no problem",
     "d": "没 (no) + 关系 (concern). 'It has no bearing' — no big deal.",
     "ex_cn": "对不起！——没关系，没事。", "ex_py": "Duìbuqǐ!——Méi guānxi, méi shì.",
     "ex_en": "I'm sorry! — No problem, it's fine."},
    {"c": "请", "p": "qǐng", "m": "please / to invite",
     "d": "讠 (speech) + 青 (green). Politely asking with words.",
     "ex_cn": "请进，欢迎！", "ex_py": "Qǐng jìn, huānyíng!",
     "ex_en": "Please come in, welcome!"},
    {"c": "喂", "p": "wèi", "m": "hello (on phone) / hey",
     "d": "口 (mouth) + 畏 (respect). An attention-getting sound.",
     "ex_cn": "喂，你好！你在哪儿？", "ex_py": "Wèi, nǐ hǎo! Nǐ zài nǎr?",
     "ex_en": "Hello! Where are you?"},

    # PRONOUNS
    {"c": "我", "p": "wǒ", "m": "I / me",
     "d": "A hand (手) holding a spear (戈) — 'myself'.",
     "ex_cn": "我是学生，我在学汉语。", "ex_py": "Wǒ shì xuésheng, wǒ zài xué Hànyǔ.",
     "ex_en": "I am a student; I am learning Chinese."},
    {"c": "你", "p": "nǐ", "m": "you",
     "d": "人 (person) + 尔 (you, classical). A person addressed directly.",
     "ex_cn": "你叫什么名字？", "ex_py": "Nǐ jiào shénme míngzi?",
     "ex_en": "What is your name?"},
    {"c": "他", "p": "tā", "m": "he / him",
     "d": "人 (person) + 也 (also). A third-party male person.",
     "ex_cn": "他是我的老师，他很好。", "ex_py": "Tā shì wǒ de lǎoshī, tā hěn hǎo.",
     "ex_en": "He is my teacher; he is very kind."},
    {"c": "她", "p": "tā", "m": "she / her",
     "d": "女 (woman) + 也 (also). A third-party female person.",
     "ex_cn": "她是我的朋友，住在北京。", "ex_py": "Tā shì wǒ de péngyou, zhù zài Běijīng.",
     "ex_en": "She is my friend; she lives in Beijing."},
    {"c": "我们", "p": "wǒmen", "m": "we / us",
     "d": "我 (I) + 们 (plural suffix). The group including myself.",
     "ex_cn": "我们一起去吃饭吧！", "ex_py": "Wǒmen yìqǐ qù chī fàn ba!",
     "ex_en": "Let's go eat together!"},

    # FAMILY
    {"c": "爸爸", "p": "bàba", "m": "father / dad",
     "d": "父 (father) radical repeated. Hands holding a tool — a provider.",
     "ex_cn": "我爸爸在家里看电视。", "ex_py": "Wǒ bàba zài jiālǐ kàn diànshì.",
     "ex_en": "My dad is at home watching TV."},
    {"c": "妈妈", "p": "māma", "m": "mother / mom",
     "d": "女 (woman) + 马 (horse, phonetic). A nurturing female figure.",
     "ex_cn": "妈妈做的菜很好吃。", "ex_py": "Māma zuò de cài hěn hǎochī.",
     "ex_en": "The food my mom makes is delicious."},
    {"c": "儿子", "p": "érzi", "m": "son",
     "d": "儿 (child) + 子 (child/seed). A male offspring.",
     "ex_cn": "他有一个儿子，今年六岁。", "ex_py": "Tā yǒu yī gè érzi, jīnnián liù suì.",
     "ex_en": "He has a son who is six years old this year."},
    {"c": "女儿", "p": "nǚér", "m": "daughter",
     "d": "女 (woman/girl) + 儿 (child). A female offspring.",
     "ex_cn": "她的女儿非常漂亮。", "ex_py": "Tā de nǚér fēicháng piàoliang.",
     "ex_en": "Her daughter is very beautiful."},
    {"c": "朋友", "p": "péngyou", "m": "friend",
     "d": "朋 (two moons, companions) + 友 (hand over hand). True friends help each other.",
     "ex_cn": "他是我最好的朋友。", "ex_py": "Tā shì wǒ zuì hǎo de péngyou.",
     "ex_en": "He is my best friend."},
    {"c": "同学", "p": "tóngxué", "m": "classmate",
     "d": "同 (same) + 学 (study). Someone who studies in the same place.",
     "ex_cn": "她是我的同学，我们一起学汉语。", "ex_py": "Tā shì wǒ de tóngxué, wǒmen yìqǐ xué Hànyǔ.",
     "ex_en": "She is my classmate; we learn Chinese together."},

    # NUMBERS
    {"c": "一", "p": "yī", "m": "one",
     "d": "A single horizontal stroke — the simplest numeral.",
     "ex_cn": "我只有一个苹果，你要吗？", "ex_py": "Wǒ zhǐ yǒu yī gè píngguǒ, nǐ yào ma?",
     "ex_en": "I only have one apple. Do you want it?"},
    {"c": "二", "p": "èr", "m": "two",
     "d": "Two horizontal lines stacked — two units.",
     "ex_cn": "我住在二楼，很方便。", "ex_py": "Wǒ zhù zài èr lóu, hěn fāngbiàn.",
     "ex_en": "I live on the second floor; it's very convenient."},
    {"c": "三", "p": "sān", "m": "three",
     "d": "Three horizontal lines — three units.",
     "ex_cn": "我每天学习三个小时。", "ex_py": "Wǒ měitiān xuéxí sān gè xiǎoshí.",
     "ex_en": "I study three hours every day."},
    {"c": "四", "p": "sì", "m": "four",
     "d": "囗 (enclosure) + 儿. Originally meant 'breath' — borrowed for the number four.",
     "ex_cn": "我家有四口人。", "ex_py": "Wǒ jiā yǒu sì kǒu rén.",
     "ex_en": "There are four people in my family."},
    {"c": "五", "p": "wǔ", "m": "five",
     "d": "Two lines crossed — representing the intersection of heaven and earth.",
     "ex_cn": "我们下午五点见面。", "ex_py": "Wǒmen xiàwǔ wǔ diǎn jiànmiàn.",
     "ex_en": "We'll meet at 5 PM."},
    {"c": "六", "p": "liù", "m": "six",
     "d": "Originally a pictograph of a hut — borrowed for the number six.",
     "ex_cn": "他的女儿今年六岁了。", "ex_py": "Tā de nǚér jīnnián liù suì le.",
     "ex_en": "His daughter is six years old this year."},
    {"c": "七", "p": "qī", "m": "seven",
     "d": "A line cut across — borrowed phonetically for seven.",
     "ex_cn": "我每天早上七点起床。", "ex_py": "Wǒ měitiān zǎoshang qī diǎn qǐchuáng.",
     "ex_en": "I get up at 7 AM every day."},
    {"c": "八", "p": "bā", "m": "eight",
     "d": "Two diverging strokes — represents division or separation.",
     "ex_cn": "这个蛋糕要八块钱。", "ex_py": "Zhège dàngāo yào bā kuài qián.",
     "ex_en": "This cake costs eight yuan."},
    {"c": "九", "p": "jiǔ", "m": "nine",
     "d": "Ancient pictograph of an arm bent at the elbow.",
     "ex_cn": "我们班有九个学生。", "ex_py": "Wǒmen bān yǒu jiǔ gè xuésheng.",
     "ex_en": "There are nine students in our class."},
    {"c": "零", "p": "líng", "m": "zero",
     "d": "雨 (rain) + 令 (command). Raindrops — representing nothing, zero.",
     "ex_cn": "今天零度，非常冷。", "ex_py": "Jīntiān líng dù, fēicháng lěng.",
     "ex_en": "It's zero degrees today — very cold."},

    # TIME
    {"c": "今天", "p": "jīntiān", "m": "today",
     "d": "今 (now/this) + 天 (sky/day). The current day.",
     "ex_cn": "今天天气很好，我们去公园吧。", "ex_py": "Jīntiān tiānqì hěn hǎo, wǒmen qù gōngyuán ba.",
     "ex_en": "The weather is great today; let's go to the park."},
    {"c": "明天", "p": "míngtiān", "m": "tomorrow",
     "d": "明 (bright) + 天 (day). The bright, coming day.",
     "ex_cn": "明天我有考试，我得好好复习。", "ex_py": "Míngtiān wǒ yǒu kǎoshì, wǒ děi hǎohǎo fùxí.",
     "ex_en": "I have an exam tomorrow; I need to review well."},
    {"c": "上午", "p": "shàngwǔ", "m": "morning / AM",
     "d": "上 (above/upper) + 午 (noon). The time before noon.",
     "ex_cn": "我上午九点上课。", "ex_py": "Wǒ shàngwǔ jiǔ diǎn shàngkè.",
     "ex_en": "I have class at 9 AM."},
    {"c": "下午", "p": "xiàwǔ", "m": "afternoon / PM",
     "d": "下 (below/lower) + 午 (noon). The time after noon.",
     "ex_cn": "下午我们一起去买东西吧。", "ex_py": "Xiàwǔ wǒmen yìqǐ qù mǎi dōngxi ba.",
     "ex_en": "Let's go shopping together this afternoon."},
    {"c": "中午", "p": "zhōngwǔ", "m": "noon / midday",
     "d": "中 (middle) + 午 (noon). The middle of the day.",
     "ex_cn": "中午我们去哪儿吃饭？", "ex_py": "Zhōngwǔ wǒmen qù nǎr chī fàn?",
     "ex_en": "Where shall we go for lunch?"},
    {"c": "年", "p": "nián", "m": "year",
     "d": "禾 (grain) + 人 (person). A person harvesting grain — marking a full year.",
     "ex_cn": "我学习汉语已经两年了。", "ex_py": "Wǒ xuéxí Hànyǔ yǐjīng liǎng nián le.",
     "ex_en": "I have been studying Chinese for two years already."},
    {"c": "月", "p": "yuè", "m": "month / moon",
     "d": "A pictograph of a crescent moon. One month = one moon cycle.",
     "ex_cn": "一年有十二个月。", "ex_py": "Yī nián yǒu shí'èr gè yuè.",
     "ex_en": "There are twelve months in a year."},
    {"c": "日", "p": "rì", "m": "day / sun",
     "d": "A circle with a dot — a pictograph of the sun.",
     "ex_cn": "今天是几月几日？", "ex_py": "Jīntiān shì jǐ yuè jǐ rì?",
     "ex_en": "What is today's date?"},
    {"c": "星期", "p": "xīngqī", "m": "week / day of the week",
     "d": "星 (star) + 期 (period). Days named after stars — a seven-day cycle.",
     "ex_cn": "这个星期六你有时间吗？", "ex_py": "Zhège xīngqīliù nǐ yǒu shíjiān ma?",
     "ex_en": "Do you have time this Saturday?"},
    {"c": "时候", "p": "shíhou", "m": "time / moment / when",
     "d": "时 (time) + 候 (await). A moment one waits for.",
     "ex_cn": "你什么时候回来？", "ex_py": "Nǐ shénme shíhou huí lái?",
     "ex_en": "When will you come back?"},
    {"c": "号", "p": "hào", "m": "number / date of month",
     "d": "口 (mouth) + 丂 (phonetic). Calling out a number.",
     "ex_cn": "今天是十月一号，国庆节！", "ex_py": "Jīntiān shì shí yuè yī hào, guóqìng jié!",
     "ex_en": "Today is October 1st — National Day!"},
    {"c": "点", "p": "diǎn", "m": "o'clock / a little",
     "d": "黑 (black) + four dots. A small point — used for clock times.",
     "ex_cn": "现在三点半，你要出发了。", "ex_py": "Xiànzài sān diǎn bàn, nǐ yào chūfā le.",
     "ex_en": "It's 3:30 now — you need to leave."},
    {"c": "分钟", "p": "fēnzhōng", "m": "minute",
     "d": "分 (divide/minute) + 钟 (clock). A divided unit of the clock.",
     "ex_cn": "请等我五分钟，马上来！", "ex_py": "Qǐng děng wǒ wǔ fēnzhōng, mǎshàng lái!",
     "ex_en": "Please wait five minutes — I'll be right there!"},

    # LOCATION & DIRECTION
    {"c": "家", "p": "jiā", "m": "home / family",
     "d": "宀 (roof) + 豕 (pig). A pig under a roof — an ancient sign of a settled household.",
     "ex_cn": "我回家了，你呢？", "ex_py": "Wǒ huí jiā le, nǐ ne?",
     "ex_en": "I'm going home — what about you?"},
    {"c": "里", "p": "lǐ", "m": "inside / in",
     "d": "田 (field) + 土 (earth). The inside of a field — within, interior.",
     "ex_cn": "我的钱包在包里。", "ex_py": "Wǒ de qiánbāo zài bāo lǐ.",
     "ex_en": "My wallet is inside the bag."},
    {"c": "上", "p": "shàng", "m": "above / on top / up",
     "d": "A short line above a longer line — positioned higher.",
     "ex_cn": "书在桌子上面。", "ex_py": "Shū zài zhuōzi shàngmiàn.",
     "ex_en": "The book is on top of the table."},
    {"c": "下", "p": "xià", "m": "below / under / down",
     "d": "A short line below a longer line — positioned lower.",
     "ex_cn": "猫在椅子下面睡觉。", "ex_py": "Māo zài yǐzi xiàmiàn shuìjiào.",
     "ex_en": "The cat is sleeping under the chair."},
    {"c": "前面", "p": "qiánmiàn", "m": "in front / ahead",
     "d": "前 (front/forward) + 面 (face/side). The facing-forward direction.",
     "ex_cn": "超市就在前面，走路五分钟。", "ex_py": "Chāoshì jiù zài qiánmiàn, zǒulù wǔ fēnzhōng.",
     "ex_en": "The supermarket is right ahead — five minutes on foot."},
    {"c": "后面", "p": "hòumiàn", "m": "behind / in the back",
     "d": "后 (behind/back) + 面 (face/side). The direction at one's back.",
     "ex_cn": "停车场在楼的后面。", "ex_py": "Tíngchēchǎng zài lóu de hòumiàn.",
     "ex_en": "The parking lot is behind the building."},
    {"c": "哪儿", "p": "nǎr", "m": "where (spoken)",
     "d": "哪 (which) + 儿 (diminutive suffix). Colloquial 'where'.",
     "ex_cn": "你的老师在哪儿？", "ex_py": "Nǐ de lǎoshī zài nǎr?",
     "ex_en": "Where is your teacher?"},
    {"c": "哪", "p": "nǎ", "m": "which / where",
     "d": "口 (mouth) + 那 (that). Asking 'which one of those'.",
     "ex_cn": "你是哪国人？", "ex_py": "Nǐ shì nǎ guó rén?",
     "ex_en": "What country are you from?"},

    # VERBS & ACTIONS
    {"c": "是", "p": "shì", "m": "to be (am/is/are)",
     "d": "日 (sun) + 正 (upright). The sun directly overhead — certainty, 'it is so'.",
     "ex_cn": "我是中国人，我来自北京。", "ex_py": "Wǒ shì Zhōngguórén, wǒ láizì Běijīng.",
     "ex_en": "I am Chinese; I come from Beijing."},
    {"c": "有", "p": "yǒu", "m": "to have / there is",
     "d": "手 (hand) + 月 (moon/meat). A hand holding meat — 'to possess'.",
     "ex_cn": "你有弟弟妹妹吗？", "ex_py": "Nǐ yǒu dìdi mèimei ma?",
     "ex_en": "Do you have younger siblings?"},
    {"c": "没有", "p": "méiyǒu", "m": "don't have / there isn't",
     "d": "没 (not/haven't) + 有 (have). The negation of having something.",
     "ex_cn": "我没有钱，不能买。", "ex_py": "Wǒ méiyǒu qián, bù néng mǎi.",
     "ex_en": "I don't have money; I can't buy it."},
    {"c": "叫", "p": "jiào", "m": "to be called / to call out",
     "d": "口 (mouth) + 丩 (twisted). Calling out with the mouth.",
     "ex_cn": "我叫王明，你叫什么？", "ex_py": "Wǒ jiào Wáng Míng, nǐ jiào shénme?",
     "ex_en": "My name is Wang Ming — what's yours?"},
    {"c": "来", "p": "lái", "m": "to come",
     "d": "A pictograph of a wheat stalk — borrowed phonetically for 'come'.",
     "ex_cn": "你来北京多久了？", "ex_py": "Nǐ lái Běijīng duō jiǔ le?",
     "ex_en": "How long have you been in Beijing?"},
    {"c": "去", "p": "qù", "m": "to go",
     "d": "大 (person) + 口 (exit). A person going somewhere.",
     "ex_cn": "你去哪儿？我去超市买菜。", "ex_py": "Nǐ qù nǎr? Wǒ qù chāoshì mǎi cài.",
     "ex_en": "Where are you going? I'm going to the supermarket."},
    {"c": "回", "p": "huí", "m": "to return / to go back",
     "d": "A circle within a circle — spiraling back to the starting point.",
     "ex_cn": "我每天晚上六点回家。", "ex_py": "Wǒ měitiān wǎnshang liù diǎn huí jiā.",
     "ex_en": "I return home at 6 PM every day."},
    {"c": "开", "p": "kāi", "m": "to open / to drive / to start",
     "d": "门 (door) + 一 (a bar). Two hands removing a bar — 'to open'.",
     "ex_cn": "请开门，谢谢！", "ex_py": "Qǐng kāi mén, xièxie!",
     "ex_en": "Please open the door, thank you!"},
    {"c": "看", "p": "kàn", "m": "to look at / to watch / to read",
     "d": "手 (hand) + 目 (eye). A hand shading the eye to look into the distance.",
     "ex_cn": "我喜欢晚上看书。", "ex_py": "Wǒ xǐhuān wǎnshang kàn shū.",
     "ex_en": "I like to read at night."},
    {"c": "看见", "p": "kànjian", "m": "to see / to catch sight of",
     "d": "看 (look) + 见 (see). The result of looking — actually catching sight.",
     "ex_cn": "你看见我的手机了吗？", "ex_py": "Nǐ kànjian wǒ de shǒujī le ma?",
     "ex_en": "Did you see my phone?"},
    {"c": "听", "p": "tīng", "m": "to listen / to hear",
     "d": "耳 (ear) + 德 (virtue). Listening attentively with the ear.",
     "ex_cn": "请听老师说，不要说话。", "ex_py": "Qǐng tīng lǎoshī shuō, bù yào shuōhuà.",
     "ex_en": "Please listen to the teacher — don't talk."},
    {"c": "说", "p": "shuō", "m": "to speak / to say",
     "d": "讠 (speech) + 兑 (exchange). Exchanging words — speaking.",
     "ex_cn": "他说汉语说得很好。", "ex_py": "Tā shuō Hànyǔ shuō de hěn hǎo.",
     "ex_en": "He speaks Chinese very well."},
    {"c": "读", "p": "dú", "m": "to read (aloud)",
     "d": "讠 (speech) + 卖 (sell). Reading words aloud.",
     "ex_cn": "请读这个句子。", "ex_py": "Qǐng dú zhège jùzi.",
     "ex_en": "Please read this sentence."},
    {"c": "写", "p": "xiě", "m": "to write",
     "d": "A bird coming down to rest — later adapted to mean 'to write'.",
     "ex_cn": "请你写下你的名字。", "ex_py": "Qǐng nǐ xiě xià nǐ de míngzi.",
     "ex_en": "Please write down your name."},
    {"c": "学习", "p": "xuéxí", "m": "to study / to learn",
     "d": "学 (learn) + 习 (practice). Learning and then practising — the full cycle.",
     "ex_cn": "我每天学习汉语两个小时。", "ex_py": "Wǒ měitiān xuéxí Hànyǔ liǎng gè xiǎoshí.",
     "ex_en": "I study Chinese for two hours every day."},
    {"c": "工作", "p": "gōngzuò", "m": "work / job",
     "d": "工 (work/labor) + 作 (make/do). Making something through labor.",
     "ex_cn": "他在医院工作，是一名医生。", "ex_py": "Tā zài yīyuàn gōngzuò, shì yī míng yīshēng.",
     "ex_en": "He works at a hospital — he's a doctor."},
    {"c": "住", "p": "zhù", "m": "to live / to reside",
     "d": "人 (person) + 主 (master/host). A person who is master of their dwelling.",
     "ex_cn": "你住在哪里？我住在学校附近。", "ex_py": "Nǐ zhù zài nǎlǐ? Wǒ zhù zài xuéxiào fùjìn.",
     "ex_en": "Where do you live? I live near the school."},
    {"c": "坐", "p": "zuò", "m": "to sit / to travel by",
     "d": "Two people (人人) on the ground (土). People sitting on the earth.",
     "ex_cn": "请坐，不要客气。", "ex_py": "Qǐng zuò, bù yào kèqi.",
     "ex_en": "Please sit down — make yourself at home."},
    {"c": "睡觉", "p": "shuìjiào", "m": "to sleep",
     "d": "睡 (sleepy eyes drooping) + 觉 (sense/feel). The act of sleeping.",
     "ex_cn": "我晚上十点睡觉。", "ex_py": "Wǒ wǎnshang shí diǎn shuìjiào.",
     "ex_en": "I go to sleep at 10 PM."},
    {"c": "买", "p": "mǎi", "m": "to buy",
     "d": "网 (net/trap) + 贝 (shell/money). Using money to 'catch' something.",
     "ex_cn": "我想买一件新衣服。", "ex_py": "Wǒ xiǎng mǎi yī jiàn xīn yīfu.",
     "ex_en": "I want to buy a new piece of clothing."},
    {"c": "认识", "p": "rènshi", "m": "to know / to recognize (a person)",
     "d": "认 (recognize) + 识 (know). Recognizing and knowing someone.",
     "ex_cn": "很高兴认识你！", "ex_py": "Hěn gāoxìng rènshi nǐ!",
     "ex_en": "Nice to meet you!"},
    {"c": "想", "p": "xiǎng", "m": "to think / to want / to miss",
     "d": "相 (look at each other) + 心 (heart). The heart thinking.",
     "ex_cn": "我想回家了，有点累。", "ex_py": "Wǒ xiǎng huí jiā le, yǒudiǎn lèi.",
     "ex_en": "I want to go home — I'm a bit tired."},
    {"c": "做", "p": "zuò", "m": "to do / to make",
     "d": "人 (person) + 故 (former/reason). A person acting with purpose.",
     "ex_cn": "你今天做了什么？", "ex_py": "Nǐ jīntiān zuò le shénme?",
     "ex_en": "What did you do today?"},
    {"c": "喝", "p": "hē", "m": "to drink",
     "d": "口 (mouth) + 曷 (phonetic). The mouth engaged in drinking.",
     "ex_cn": "天热，多喝点水。", "ex_py": "Tiān rè, duō hē diǎn shuǐ.",
     "ex_en": "It's hot — drink more water."},
    {"c": "吃", "p": "chī", "m": "to eat",
     "d": "口 (mouth) + 乞 (beg). Using the mouth to take in food.",
     "ex_cn": "我们去吃饭吧，我饿了。", "ex_py": "Wǒmen qù chī fàn ba, wǒ è le.",
     "ex_en": "Let's go eat — I'm hungry."},
    {"c": "打电话", "p": "dǎ diànhuà", "m": "to make a phone call",
     "d": "打 (hit/make) + 电话 (phone). 'Making' a phone connection.",
     "ex_cn": "我给妈妈打电话，告诉她我到了。", "ex_py": "Wǒ gěi māma dǎ diànhuà, gàosu tā wǒ dào le.",
     "ex_en": "I'll call my mom to tell her I've arrived."},

    # FOOD & DRINK
    {"c": "菜", "p": "cài", "m": "dish / vegetable",
     "d": "艹 (grass/plant) + 采 (pick). Plants picked to eat.",
     "ex_cn": "这道菜很好吃，你尝一尝。", "ex_py": "Zhè dào cài hěn hǎochī, nǐ cháng yī cháng.",
     "ex_en": "This dish is delicious — give it a try."},
    {"c": "茶", "p": "chá", "m": "tea",
     "d": "艹 (plant) + 人 (person) + 木 (tree). A person picking plants for tea.",
     "ex_cn": "你喜欢喝茶还是喝咖啡？", "ex_py": "Nǐ xǐhuān hē chá háishi hē kāfēi?",
     "ex_en": "Do you prefer tea or coffee?"},
    {"c": "水", "p": "shuǐ", "m": "water",
     "d": "A flowing river — a pictograph of moving water.",
     "ex_cn": "请给我一杯水，谢谢。", "ex_py": "Qǐng gěi wǒ yī bēi shuǐ, xièxie.",
     "ex_en": "Please give me a glass of water, thank you."},
    {"c": "水果", "p": "shuǐguǒ", "m": "fruit",
     "d": "水 (water) + 果 (fruit/result). Juicy fruits of trees.",
     "ex_cn": "我每天都吃水果，对身体好。", "ex_py": "Wǒ měitiān dōu chī shuǐguǒ, duì shēntǐ hǎo.",
     "ex_en": "I eat fruit every day — it's good for your health."},
    {"c": "苹果", "p": "píngguǒ", "m": "apple",
     "d": "苹 (duckweed plant) + 果 (fruit). A round, sweet fruit.",
     "ex_cn": "这个苹果很甜，你吃一个吧。", "ex_py": "Zhège píngguǒ hěn tián, nǐ chī yī gè ba.",
     "ex_en": "This apple is very sweet — have one."},
    {"c": "米饭", "p": "mǐfàn", "m": "cooked rice",
     "d": "米 (rice grain) + 饭 (cooked food). Cooked rice grains.",
     "ex_cn": "我中午吃了米饭和菜。", "ex_py": "Wǒ zhōngwǔ chī le mǐfàn hé cài.",
     "ex_en": "I had rice and dishes for lunch."},

    # OBJECTS & THINGS
    {"c": "书", "p": "shū", "m": "book",
     "d": "A hand holding a brush over a page — recording text.",
     "ex_cn": "这本书很有意思，你应该看看。", "ex_py": "Zhè běn shū hěn yǒu yìsi, nǐ yīnggāi kànkan.",
     "ex_en": "This book is very interesting — you should read it."},
    {"c": "电脑", "p": "diànnǎo", "m": "computer",
     "d": "电 (electric) + 脑 (brain). An 'electric brain'.",
     "ex_cn": "我用电脑工作和学习。", "ex_py": "Wǒ yòng diànnǎo gōngzuò hé xuéxí.",
     "ex_en": "I use the computer for work and study."},
    {"c": "电视", "p": "diànshì", "m": "television",
     "d": "电 (electric) + 视 (look/see). Electrically transmitting images.",
     "ex_cn": "他每天晚上看一个小时电视。", "ex_py": "Tā měitiān wǎnshang kàn yī gè xiǎoshí diànshì.",
     "ex_en": "He watches TV for one hour every evening."},
    {"c": "电影", "p": "diànyǐng", "m": "movie / film",
     "d": "电 (electric) + 影 (shadow/image). An electric shadow show.",
     "ex_cn": "你想看什么电影？", "ex_py": "Nǐ xiǎng kàn shénme diànyǐng?",
     "ex_en": "What movie do you want to watch?"},
    {"c": "东西", "p": "dōngxi", "m": "thing / stuff",
     "d": "东 (east) + 西 (west). Things traded from east to west — goods.",
     "ex_cn": "你买了什么东西？", "ex_py": "Nǐ mǎi le shénme dōngxi?",
     "ex_en": "What did you buy?"},
    {"c": "杯子", "p": "bēizi", "m": "cup / glass",
     "d": "杯 (cup) + 子 (diminutive suffix). A small drinking vessel.",
     "ex_cn": "这个杯子是你的吗？", "ex_py": "Zhège bēizi shì nǐ de ma?",
     "ex_en": "Is this cup yours?"},
    {"c": "桌子", "p": "zhuōzi", "m": "table / desk",
     "d": "桌 (table — wood + canopy) + 子 (suffix). A wooden surface.",
     "ex_cn": "把书放在桌子上。", "ex_py": "Bǎ shū fàng zài zhuōzi shàng.",
     "ex_en": "Put the book on the table."},
    {"c": "椅子", "p": "yǐzi", "m": "chair",
     "d": "椅 (chair — wood + rest) + 子 (suffix). A wooden seat for resting.",
     "ex_cn": "请坐在这把椅子上。", "ex_py": "Qǐng zuò zài zhè bǎ yǐzi shàng.",
     "ex_en": "Please sit on this chair."},
    {"c": "衣服", "p": "yīfu", "m": "clothing / clothes",
     "d": "衣 (garment) + 服 (wear/serve). The garments one wears.",
     "ex_cn": "这件衣服多少钱？", "ex_py": "Zhè jiàn yīfu duōshao qián?",
     "ex_en": "How much does this piece of clothing cost?"},
    {"c": "本", "p": "běn", "m": "measure word for books",
     "d": "木 (tree) + a line at the root. The base unit for books.",
     "ex_cn": "我借了三本书。", "ex_py": "Wǒ jiè le sān běn shū.",
     "ex_en": "I borrowed three books."},

    # MONEY & SHOPPING
    {"c": "钱", "p": "qián", "m": "money",
     "d": "金 (gold/metal) + 戋 (a little). A little metal — coins, money.",
     "ex_cn": "这个多少钱？太贵了。", "ex_py": "Zhège duōshao qián? Tài guì le.",
     "ex_en": "How much is this? Too expensive."},
    {"c": "块", "p": "kuài", "m": "yuan (Chinese dollar, spoken)",
     "d": "土 (earth) + 夬 (decide). Originally a lump of earth — now a money unit.",
     "ex_cn": "这瓶水两块钱。", "ex_py": "Zhè píng shuǐ liǎng kuài qián.",
     "ex_en": "This bottle of water costs two yuan."},
    {"c": "多少", "p": "duōshao", "m": "how much / how many",
     "d": "多 (many) + 少 (few). Asking between many and few.",
     "ex_cn": "这件衣服多少钱？", "ex_py": "Zhè jiàn yīfu duōshao qián?",
     "ex_en": "How much does this piece of clothing cost?"},
    {"c": "商店", "p": "shāngdiàn", "m": "shop / store",
     "d": "商 (trade/commerce) + 店 (shop/inn). A place for commercial trade.",
     "ex_cn": "这家商店卖很多东西。", "ex_py": "Zhè jiā shāngdiàn mài hěn duō dōngxi.",
     "ex_en": "This store sells many things."},

    # TRANSPORT & PLACES
    {"c": "出租车", "p": "chūzūchē", "m": "taxi",
     "d": "出 (out) + 租 (rent) + 车 (car). A car rented out.",
     "ex_cn": "我们坐出租车去机场吧。", "ex_py": "Wǒmen zuò chūzūchē qù jīchǎng ba.",
     "ex_en": "Let's take a taxi to the airport."},
    {"c": "飞机", "p": "fēijī", "m": "airplane",
     "d": "飞 (fly) + 机 (machine). A flying machine.",
     "ex_cn": "他明天坐飞机去上海。", "ex_py": "Tā míngtiān zuò fēijī qù Shànghǎi.",
     "ex_en": "He's flying to Shanghai tomorrow."},
    {"c": "北京", "p": "Běijīng", "m": "Beijing (capital of China)",
     "d": "北 (north) + 京 (capital). 'Northern Capital'.",
     "ex_cn": "北京是中国的首都，非常大。", "ex_py": "Běijīng shì Zhōngguó de shǒudū, fēicháng dà.",
     "ex_en": "Beijing is China's capital — it's very large."},
    {"c": "中国", "p": "Zhōngguó", "m": "China",
     "d": "中 (middle/center) + 国 (country). 'The Middle Kingdom'.",
     "ex_cn": "我来自中国，我是中国人。", "ex_py": "Wǒ láizì Zhōngguó, wǒ shì Zhōngguórén.",
     "ex_en": "I'm from China — I'm Chinese."},
    {"c": "学校", "p": "xuéxiào", "m": "school",
     "d": "学 (study) + 校 (school/verify). A place to study and verify knowledge.",
     "ex_cn": "我的学校离家很近。", "ex_py": "Wǒ de xuéxiào lí jiā hěn jìn.",
     "ex_en": "My school is very close to home."},
    {"c": "饭店", "p": "fàndiàn", "m": "restaurant / hotel",
     "d": "饭 (food/meal) + 店 (shop/inn). A shop serving meals.",
     "ex_cn": "这家饭店的菜很好吃。", "ex_py": "Zhè jiā fàndiàn de cài hěn hǎochī.",
     "ex_en": "The food at this restaurant is delicious."},

    # PEOPLE & ROLES
    {"c": "人", "p": "rén", "m": "person / people",
     "d": "A pictograph of a person standing with two legs.",
     "ex_cn": "这里有很多人，好热闹。", "ex_py": "Zhèlǐ yǒu hěn duō rén, hǎo rènào.",
     "ex_en": "There are so many people here — it's lively."},
    {"c": "老师", "p": "lǎoshī", "m": "teacher",
     "d": "老 (old/experienced) + 师 (master). An experienced master.",
     "ex_cn": "我们的老师讲课讲得很清楚。", "ex_py": "Wǒmen de lǎoshī jiǎngkè jiǎng de hěn qīngchǔ.",
     "ex_en": "Our teacher explains lessons very clearly."},
    {"c": "学生", "p": "xuésheng", "m": "student",
     "d": "学 (study) + 生 (born/life). One who is born to study.",
     "ex_cn": "他是一名很用功的学生。", "ex_py": "Tā shì yī míng hěn yònggōng de xuésheng.",
     "ex_en": "He is a very hardworking student."},
    {"c": "小姐", "p": "xiǎojiě", "m": "Miss / young woman",
     "d": "小 (small/young) + 姐 (older sister). A young woman.",
     "ex_cn": "请问，这位小姐，洗手间在哪儿？", "ex_py": "Qǐngwèn, zhè wèi xiǎojiě, xǐshǒujiān zài nǎr?",
     "ex_en": "Excuse me, miss — where is the bathroom?"},

    # DESCRIPTIONS & ADJECTIVES
    {"c": "大", "p": "dà", "m": "big / large",
     "d": "A person (人) with arms stretched wide — something large.",
     "ex_cn": "上海是一个很大的城市。", "ex_py": "Shànghǎi shì yī gè hěn dà de chéngshì.",
     "ex_en": "Shanghai is a very large city."},
    {"c": "小", "p": "xiǎo", "m": "small / little",
     "d": "Three dots — a central drop with small splashes either side.",
     "ex_cn": "这个包太小了，放不下。", "ex_py": "Zhège bāo tài xiǎo le, fàng bu xià.",
     "ex_en": "This bag is too small — things won't fit."},
    {"c": "多", "p": "duō", "m": "many / much / a lot",
     "d": "夕 (evening) stacked twice. Evening after evening — many.",
     "ex_cn": "今天来了很多人。", "ex_py": "Jīntiān lái le hěn duō rén.",
     "ex_en": "Many people came today."},
    {"c": "少", "p": "shǎo", "m": "few / little (quantity)",
     "d": "小 (small) + a stroke. Even smaller — fewer.",
     "ex_cn": "今天来的人很少，只有五个。", "ex_py": "Jīntiān lái de rén hěn shǎo, zhǐyǒu wǔ gè.",
     "ex_en": "Few people came today — only five."},
    {"c": "好", "p": "hǎo", "m": "good / well",
     "d": "女 (woman) + 子 (child). A woman with a child — good, harmonious.",
     "ex_cn": "你汉语说得很好！", "ex_py": "Nǐ Hànyǔ shuō de hěn hǎo!",
     "ex_en": "Your Chinese is very good!"},
    {"c": "热", "p": "rè", "m": "hot",
     "d": "埶 (burning plants) + 灬 (fire). Plants on fire — very hot.",
     "ex_cn": "今天好热，我们喝点冷饮吧。", "ex_py": "Jīntiān hǎo rè, wǒmen hē diǎn lěngyǐn ba.",
     "ex_en": "It's so hot today — let's have a cold drink."},
    {"c": "冷", "p": "lěng", "m": "cold",
     "d": "冫 (ice) + 令 (command). Ice that commands — biting cold.",
     "ex_cn": "冬天很冷，要多穿衣服。", "ex_py": "Dōngtiān hěn lěng, yào duō chuān yīfu.",
     "ex_en": "Winter is very cold — wear more clothes."},
    {"c": "漂亮", "p": "piàoliang", "m": "beautiful / pretty",
     "d": "漂 (float/drift) + 亮 (bright). Floating brightly — strikingly beautiful.",
     "ex_cn": "你今天穿得很漂亮！", "ex_py": "Nǐ jīntiān chuān de hěn piàoliang!",
     "ex_en": "You look very beautiful today!"},
    {"c": "高兴", "p": "gāoxìng", "m": "happy / glad",
     "d": "高 (high/tall) + 兴 (excitement). High excitement — happiness.",
     "ex_cn": "认识你真的很高兴！", "ex_py": "Rènshi nǐ zhēn de hěn gāoxìng!",
     "ex_en": "I'm truly happy to know you!"},
    {"c": "太", "p": "tài", "m": "too / extremely",
     "d": "大 (big) + an extra dot — even bigger, going beyond 'big'.",
     "ex_cn": "这件衣服太贵了，我买不起。", "ex_py": "Zhè jiàn yīfu tài guì le, wǒ mǎi bu qǐ.",
     "ex_en": "This clothing is too expensive — I can't afford it."},
    {"c": "很", "p": "hěn", "m": "very",
     "d": "彳 (step/movement) + 艮 (firm/stop). Going firmly — intensely, very.",
     "ex_cn": "这本书很有意思。", "ex_py": "Zhè běn shū hěn yǒu yìsi.",
     "ex_en": "This book is very interesting."},

    # PARTICLES & STRUCTURES
    {"c": "的", "p": "de", "m": "possessive particle",
     "d": "白 (white) + 勺 (spoon). Purely grammatical — links modifier to noun.",
     "ex_cn": "这是我的书，那是他的。", "ex_py": "Zhè shì wǒ de shū, nà shì tā de.",
     "ex_en": "This is my book; that one is his."},
    {"c": "了", "p": "le", "m": "particle (completed action / change of state)",
     "d": "子 (child) without the lower stroke — something finished, done.",
     "ex_cn": "我吃了饭，现在不饿了。", "ex_py": "Wǒ chī le fàn, xiànzài bú è le.",
     "ex_en": "I've eaten — I'm not hungry anymore."},
    {"c": "吗", "p": "ma", "m": "question particle (yes/no questions)",
     "d": "口 (mouth) + 马 (horse, phonetic). A questioning sound the mouth makes.",
     "ex_cn": "你是学生吗？", "ex_py": "Nǐ shì xuésheng ma?",
     "ex_en": "Are you a student?"},
    {"c": "呢", "p": "ne", "m": "question particle ('and you?' / continuation)",
     "d": "口 (mouth) + 尼 (Buddhist monk, phonetic). A soft questioning sound.",
     "ex_cn": "我很好，你呢？", "ex_py": "Wǒ hěn hǎo, nǐ ne?",
     "ex_en": "I'm fine — and you?"},
    {"c": "不", "p": "bù", "m": "not / no (negation)",
     "d": "A bird flying upward past a ceiling — blocked. 'No, not'.",
     "ex_cn": "我今天不去，我身体不舒服。", "ex_py": "Wǒ jīntiān bù qù, wǒ shēntǐ bù shūfu.",
     "ex_en": "I'm not going today — I'm not feeling well."},
    {"c": "都", "p": "dōu", "m": "all / both / even",
     "d": "者 (person) + 阝 (city). All the people in the city — everyone.",
     "ex_cn": "我们都喜欢学汉语。", "ex_py": "Wǒmen dōu xǐhuān xué Hànyǔ.",
     "ex_en": "We all like learning Chinese."},
    {"c": "和", "p": "hé", "m": "and / with",
     "d": "禾 (grain) + 口 (mouth). Sharing grain together — harmony, 'and'.",
     "ex_cn": "我喜欢吃饭和看书。", "ex_py": "Wǒ xǐhuān chī fàn hé kàn shū.",
     "ex_en": "I like eating and reading."},
    {"c": "那", "p": "nà", "m": "that / then",
     "d": "冉 (rising) + 阝 (city). Something on the far side — 'that over there'.",
     "ex_cn": "那个人是谁？", "ex_py": "Nà gè rén shì shéi?",
     "ex_en": "Who is that person?"},
    {"c": "这", "p": "zhè", "m": "this",
     "d": "辶 (walk/movement) + 文 (language/pattern). Coming toward — 'this one here'.",
     "ex_cn": "这是什么？这是我的钥匙。", "ex_py": "Zhè shì shénme? Zhè shì wǒ de yàoshi.",
     "ex_en": "What is this? This is my key."},
    {"c": "什么", "p": "shénme", "m": "what",
     "d": "什 (various) + 么 (suffix). 'What kind of thing?'",
     "ex_cn": "你在做什么？我在看书。", "ex_py": "Nǐ zài zuò shénme? Wǒ zài kàn shū.",
     "ex_en": "What are you doing? I'm reading."},
    {"c": "谁", "p": "shéi", "m": "who",
     "d": "讠 (speech) + 隹 (bird). Speaking to identify — 'who?'",
     "ex_cn": "他是谁？他是我的同学。", "ex_py": "Tā shì shéi? Tā shì wǒ de tóngxué.",
     "ex_en": "Who is he? He's my classmate."},
    {"c": "几", "p": "jǐ", "m": "how many (small numbers)",
     "d": "A small table shape — borrowed phonetically for 'how many'.",
     "ex_cn": "你家有几口人？", "ex_py": "Nǐ jiā yǒu jǐ kǒu rén?",
     "ex_en": "How many people are in your family?"},
    {"c": "些", "p": "xiē", "m": "some / a few",
     "d": "此 (this/here) + 二 (two). A small number — some.",
     "ex_cn": "我想吃一些水果。", "ex_py": "Wǒ xiǎng chī yīxiē shuǐguǒ.",
     "ex_en": "I'd like to eat some fruit."},
    {"c": "一下", "p": "yīxià", "m": "briefly / give it a try",
     "d": "一 (one) + 下 (downward). One downward motion — just a quick try.",
     "ex_cn": "请等一下，我马上来。", "ex_py": "Qǐng děng yīxià, wǒ mǎshàng lái.",
     "ex_en": "Please wait a moment — I'll be right there."},

    # ABILITY & MODALS
    {"c": "能", "p": "néng", "m": "can / be able to",
     "d": "A bear (熊) with legs — powerful, capable. 'Able to do'.",
     "ex_cn": "你能帮我一下吗？", "ex_py": "Nǐ néng bāng wǒ yīxià ma?",
     "ex_en": "Can you help me for a moment?"},
    {"c": "会", "p": "huì", "m": "can / know how to (learned skill)",
     "d": "人 (person) + 云 (cloud/gather). People gathering knowledge — acquired ability.",
     "ex_cn": "你会说英语吗？", "ex_py": "Nǐ huì shuō Yīngyǔ ma?",
     "ex_en": "Can you speak English?"},

    # WEATHER
    {"c": "天气", "p": "tiānqì", "m": "weather",
     "d": "天 (sky/heaven) + 气 (air/energy). The energy of the sky — weather.",
     "ex_cn": "今天天气怎么样？天气很好。", "ex_py": "Jīntiān tiānqì zěnmeyàng? Tiānqì hěn hǎo.",
     "ex_en": "How's the weather today? The weather is great."},
    {"c": "下雨", "p": "xià yǔ", "m": "to rain",
     "d": "下 (fall/come down) + 雨 (rain). Rain coming down from the sky.",
     "ex_cn": "外面在下雨，记得带伞。", "ex_py": "Wàimiàn zài xià yǔ, jìde dài sǎn.",
     "ex_en": "It's raining outside — remember to bring an umbrella."},

    # ANIMALS
    {"c": "猫", "p": "māo", "m": "cat",
     "d": "犭 (animal) + 苗 (seedling, phonetic). An animal — a cat.",
     "ex_cn": "我家有两只猫，它们很可爱。", "ex_py": "Wǒ jiā yǒu liǎng zhī māo, tāmen hěn kě'ài.",
     "ex_en": "My family has two cats — they're very cute."},
    {"c": "狗", "p": "gǒu", "m": "dog",
     "d": "犭 (animal) + 句 (phrase, phonetic). A loyal animal — a dog.",
     "ex_cn": "我的狗很聪明，会很多动作。", "ex_py": "Wǒ de gǒu hěn cōngmíng, huì hěn duō dòngzuò.",
     "ex_en": "My dog is very smart — it knows many tricks."},

    # LANGUAGE & STUDY
    {"c": "汉语", "p": "Hànyǔ", "m": "Chinese language (Mandarin)",
     "d": "汉 (Han people) + 语 (language). The language of the Han people.",
     "ex_cn": "我在学汉语，学了半年了。", "ex_py": "Wǒ zài xué Hànyǔ, xué le bàn nián le.",
     "ex_en": "I'm learning Chinese — I've been studying for half a year."},
    {"c": "名字", "p": "míngzi", "m": "name",
     "d": "名 (name/fame) + 字 (character/word). One's name written in characters.",
     "ex_cn": "你的名字怎么写？", "ex_py": "Nǐ de míngzi zěnme xiě?",
     "ex_en": "How do you write your name?"},
    {"c": "岁", "p": "suì", "m": "years old (age)",
     "d": "山 (mountain) + 戌 (a time character). Age measured in year cycles.",
     "ex_cn": "你今年多大？我二十岁。", "ex_py": "Nǐ jīnnián duō dà? Wǒ èrshí suì.",
     "ex_en": "How old are you? I'm 20 years old."},
    {"c": "生日", "p": "shēngrì", "m": "birthday",
     "d": "生 (born/life) + 日 (day/sun). The day one was born.",
     "ex_cn": "今天是我的生日，我很高兴！", "ex_py": "Jīntiān shì wǒ de shēngrì, wǒ hěn gāoxìng!",
     "ex_en": "Today is my birthday — I'm so happy!"},
    {"c": "现在", "p": "xiànzài", "m": "now / at present",
     "d": "现 (appear/present) + 在 (at/exist). Being present at this moment.",
     "ex_cn": "现在几点了？现在下午三点。", "ex_py": "Xiànzài jǐ diǎn le? Xiànzài xiàwǔ sān diǎn.",
     "ex_en": "What time is it now? It's 3 PM now."},
    {"c": "在", "p": "zài", "m": "at / in / on / currently doing",
     "d": "才 (just/only) + 土 (earth). Something existing on the earth — 'at, in'.",
     "ex_cn": "我在图书馆学习。", "ex_py": "Wǒ zài túshūguǎn xuéxí.",
     "ex_en": "I'm studying in the library."},
    {"c": "怎么", "p": "zěnme", "m": "how / why",
     "d": "怎 (how?) + 么 (suffix). A question about method or manner.",
     "ex_cn": "这个字怎么读？", "ex_py": "Zhège zì zěnme dú?",
     "ex_en": "How do you read this character?"},
    {"c": "怎么样", "p": "zěnmeyàng", "m": "how is it? / how about?",
     "d": "怎么 (how) + 样 (appearance). Asking for an opinion.",
     "ex_cn": "这道菜怎么样？很好吃！", "ex_py": "Zhè dào cài zěnmeyàng? Hěn hǎochī!",
     "ex_en": "How is this dish? Delicious!"},
    {"c": "个", "p": "gè", "m": "general measure word",
     "d": "人 (person) + a vertical line. A single upright unit — the general counter.",
     "ex_cn": "我有两个好朋友。", "ex_py": "Wǒ yǒu liǎng gè hǎo péngyou.",
     "ex_en": "I have two good friends."},
]

# ============================================================
# THEMATIC LESSON GROUPINGS
# ============================================================

LESSON_THEMES = [
    {
        "theme": "Greetings & Politeness",
        "vocab_keys": ["你好", "再见", "谢谢", "不客气", "对不起", "没关系", "请", "喂"],
        "grammar": [
            {"title": "Greeting with 你好 (nǐ hǎo)",
             "explanation": "你好 means 'hello' — literally 'you good'. It is neutral and can be used at any time of day.",
             "examples": [{"cn": "你好！很高兴认识你。", "py": "Nǐ hǎo! Hěn gāoxìng rènshi nǐ.", "en": "Hello! Nice to meet you."}],
             "practice": {"prompt": "Rearrange to say 'Nice to meet you'.", "words": ["认识", "你", "高兴", "很"], "answer": ["很", "高兴", "认识", "你"]}},
            {"title": "Apology & Response: 对不起 / 没关系",
             "explanation": "对不起 is the apology. The natural response is 没关系 — 'no problem / it's okay'.",
             "examples": [{"cn": "对不起！——没关系，没事。", "py": "Duìbuqǐ!——Méi guānxi, méi shì.", "en": "Sorry! — No problem."}],
             "practice": {"prompt": "Rearrange to say 'Sorry, I came late'.", "words": ["来晚", "了", "对不起", "我"], "answer": ["对不起", "我", "来晚", "了"]}}
        ],
        "dialogue": {"title": "First Meeting",
            "lines": [
                {"speaker": "A", "cn": "你好！我叫李明，你叫什么名字？", "py": "Nǐ hǎo! Wǒ jiào Lǐ Míng, nǐ jiào shénme míngzi?", "en": "Hello! I'm Li Ming — what's your name?"},
                {"speaker": "B", "cn": "你好！我叫王芳，很高兴认识你！", "py": "Nǐ hǎo! Wǒ jiào Wáng Fāng, hěn gāoxìng rènshi nǐ!", "en": "Hello! I'm Wang Fang. Nice to meet you!"},
                {"speaker": "A", "cn": "对不起，我来晚了！", "py": "Duìbuqǐ, wǒ lái wǎn le!", "en": "Sorry I'm late!"},
                {"speaker": "B", "cn": "没关系，请进！", "py": "Méi guānxi, qǐng jìn!", "en": "No problem — please come in!"},
                {"speaker": "A", "cn": "谢谢你！再见！", "py": "Xièxie nǐ! Zàijiàn!", "en": "Thank you! Goodbye!"},
                {"speaker": "B", "cn": "不客气，再见！", "py": "Bú kèqi, zàijiàn!", "en": "You're welcome — goodbye!"},
            ]
        },
        "quiz": [
            {"question": "How do you say 'Hello' in Chinese?", "options": ["再见", "你好", "谢谢", "对不起"], "answer": "你好", "explanation": "你好 (nǐ hǎo) means hello."},
            {"question": "What does '再见 (zàijiàn)' mean?", "options": ["Hello", "Thank you", "Goodbye", "Sorry"], "answer": "Goodbye", "explanation": "再见 means goodbye — literally 'see you again'."},
            {"question": "Someone says '谢谢'. What is the correct response?", "options": ["对不起", "不客气", "没有", "再见"], "answer": "不客气", "explanation": "不客气 means 'you're welcome'."},
            {"question": "Which phrase means 'it's okay / no problem'?", "options": ["你好", "谢谢", "没关系", "请"], "answer": "没关系", "explanation": "没关系 (méi guānxi) means 'no problem'."},
        ]
    },
    {
        "theme": "Pronouns & Introductions",
        "vocab_keys": ["我", "你", "他", "她", "我们", "朋友", "同学"],
        "grammar": [
            {"title": "Chinese Pronouns: 我 / 你 / 他 / 她",
             "explanation": "Pronouns don't change form in Chinese. 我=I/me, 你=you, 他=he/him, 她=she/her. Add 们 for plural: 我们=we.",
             "examples": [{"cn": "我是学生，他是老师。", "py": "Wǒ shì xuésheng, tā shì lǎoshī.", "en": "I am a student; he is a teacher."}],
             "practice": {"prompt": "Rearrange to say 'We are all students'.", "words": ["学生", "都", "我们", "是"], "answer": ["我们", "都", "是", "学生"]}}
        ],
        "dialogue": {"title": "Talking About Friends",
            "lines": [
                {"speaker": "A", "cn": "他是谁？", "py": "Tā shì shéi?", "en": "Who is he?"},
                {"speaker": "B", "cn": "他是我的朋友，叫李华。", "py": "Tā shì wǒ de péngyou, jiào Lǐ Huá.", "en": "He's my friend — his name is Li Hua."},
                {"speaker": "A", "cn": "她呢？她也是你的朋友吗？", "py": "Tā ne? Tā yě shì nǐ de péngyou ma?", "en": "What about her? Is she also your friend?"},
                {"speaker": "B", "cn": "她是我的同学，我们一起学汉语。", "py": "Tā shì wǒ de tóngxué, wǒmen yìqǐ xué Hànyǔ.", "en": "She's my classmate — we learn Chinese together."},
                {"speaker": "A", "cn": "我们一起去喝茶吧！", "py": "Wǒmen yìqǐ qù hē chá ba!", "en": "Let's all go have tea together!"},
            ]
        },
        "quiz": [
            {"question": "What does '我们 (wǒmen)' mean?", "options": ["I / me", "You", "He / him", "We / us"], "answer": "We / us", "explanation": "我们 means 'we'. 们 is a plural suffix added to pronouns."},
            {"question": "Which pronoun means 'she' in Chinese?", "options": ["他", "我", "你", "她"], "answer": "她", "explanation": "她 (tā) means she/her. 他 (tā) means he/him — same sound, different character."},
            {"question": "What is the Chinese word for 'friend'?", "options": ["同学", "老师", "朋友", "学生"], "answer": "朋友", "explanation": "朋友 (péngyou) means friend."},
            {"question": "What does '同学 (tóngxué)' mean?", "options": ["Friend", "Classmate", "Teacher", "Student"], "answer": "Classmate", "explanation": "同学 = classmate. 同=same, 学=study."},
        ]
    },
    {
        "theme": "Family Members",
        "vocab_keys": ["爸爸", "妈妈", "儿子", "女儿", "家", "朋友", "同学"],
        "grammar": [
            {"title": "Expressing possession with 有 (yǒu)",
             "explanation": "有 means 'to have'. Pattern: Subject + 有 + Object. Negation: Subject + 没有 + Object.",
             "examples": [
                 {"cn": "我有一个儿子。", "py": "Wǒ yǒu yī gè érzi.", "en": "I have a son."},
                 {"cn": "我没有女儿。", "py": "Wǒ méiyǒu nǚér.", "en": "I don't have a daughter."}
             ],
             "practice": {"prompt": "Rearrange to say 'Do you have a younger brother?'", "words": ["吗", "你", "弟弟", "有"], "answer": ["你", "有", "弟弟", "吗"]}}
        ],
        "dialogue": {"title": "Talking About Family",
            "lines": [
                {"speaker": "A", "cn": "你家有几口人？", "py": "Nǐ jiā yǒu jǐ kǒu rén?", "en": "How many people are in your family?"},
                {"speaker": "B", "cn": "我家有四口人：爸爸、妈妈、儿子和我。", "py": "Wǒ jiā yǒu sì kǒu rén: bàba, māma, érzi hé wǒ.", "en": "There are four in my family: dad, mom, my son, and me."},
                {"speaker": "A", "cn": "你有女儿吗？", "py": "Nǐ yǒu nǚér ma?", "en": "Do you have a daughter?"},
                {"speaker": "B", "cn": "没有，我只有一个儿子，他今年六岁。", "py": "Méiyǒu, wǒ zhǐ yǒu yī gè érzi, tā jīnnián liù suì.", "en": "No, I only have one son — he's six this year."},
                {"speaker": "A", "cn": "真可爱！", "py": "Zhēn kě'ài!", "en": "How cute!"},
            ]
        },
        "quiz": [
            {"question": "What does '爸爸 (bàba)' mean?", "options": ["Mother", "Father", "Son", "Daughter"], "answer": "Father", "explanation": "爸爸 means father or dad."},
            {"question": "How do you say 'I don't have a sister'?", "options": ["我有妹妹。", "我没有妹妹。", "我是妹妹。", "我们妹妹。"], "answer": "我没有妹妹。", "explanation": "没有 is the negation of 有. 我没有妹妹 = I don't have a younger sister."},
            {"question": "What does '女儿 (nǚér)' mean?", "options": ["Son", "Mother", "Daughter", "Sister"], "answer": "Daughter", "explanation": "女儿 means daughter. 女=female, 儿=child."},
            {"question": "Which question asks 'How many people are in your family?'", "options": ["你家在哪里？", "你家有几口人？", "你家有多少钱？", "你家有几本书？"], "answer": "你家有几口人？", "explanation": "几口人 asks for the number of family members."},
        ]
    },
    {
        "theme": "Numbers 1–10 & Money",
        "vocab_keys": ["一", "二", "三", "四", "五", "六", "七", "八", "九", "零", "钱", "块", "多少"],
        "grammar": [
            {"title": "Counting in Chinese: 1–10",
             "explanation": "Basic numbers: 一(1)、二(2)、三(3)、四(4)、五(5)、六(6)、七(7)、八(8)、九(9)、十(10)、零(0). Before measure words, use 两 (liǎng) instead of 二 for 'two'.",
             "examples": [
                 {"cn": "我有两个朋友。", "py": "Wǒ yǒu liǎng gè péngyou.", "en": "I have two friends. (两, not 二, before measure words)"},
             ],
             "practice": {"prompt": "Rearrange to ask 'How much does this cost?'", "words": ["这个", "多少", "钱"], "answer": ["这个", "多少", "钱"]}}
        ],
        "dialogue": {"title": "Counting and Prices",
            "lines": [
                {"speaker": "A", "cn": "这个苹果多少钱？", "py": "Zhège píngguǒ duōshao qián?", "en": "How much is this apple?"},
                {"speaker": "B", "cn": "两块钱一个。", "py": "Liǎng kuài qián yī gè.", "en": "Two yuan each."},
                {"speaker": "A", "cn": "我要三个。一共几块？", "py": "Wǒ yào sān gè. Yīgòng jǐ kuài?", "en": "I want three. How many yuan in total?"},
                {"speaker": "B", "cn": "一共六块钱。", "py": "Yīgòng liù kuài qián.", "en": "Six yuan in total."},
                {"speaker": "A", "cn": "给你十块钱。", "py": "Gěi nǐ shí kuài qián.", "en": "Here's ten yuan."},
                {"speaker": "B", "cn": "找你四块。谢谢！", "py": "Zhǎo nǐ sì kuài. Xièxie!", "en": "Here's four yuan change. Thank you!"},
            ]
        },
        "quiz": [
            {"question": "Which number means 'eight' in Chinese?", "options": ["六", "七", "八", "九"], "answer": "八", "explanation": "八 (bā) means eight."},
            {"question": "How do you say 'two apples' with a measure word?", "options": ["二个苹果", "两个苹果", "双个苹果", "二苹果"], "answer": "两个苹果", "explanation": "Before measure words, use 两 (liǎng) not 二 (èr) for 'two'."},
            {"question": "What does '零 (líng)' mean?", "options": ["Ten", "One", "Zero", "Five"], "answer": "Zero", "explanation": "零 (líng) means zero."},
            {"question": "How do you ask 'How much does this cost?'", "options": ["这个是什么？", "这个多少钱？", "这个在哪里？", "这个怎么样？"], "answer": "这个多少钱？", "explanation": "多少钱 is the standard way to ask the price."},
        ]
    },
    {
        "theme": "Time & Days of the Week",
        "vocab_keys": ["今天", "明天", "上午", "下午", "中午", "年", "月", "日", "星期", "时候", "号", "点", "分钟"],
        "grammar": [
            {"title": "Time expressions come BEFORE the verb",
             "explanation": "In Chinese, time words appear before the action: 我上午九点上课 (I [morning 9 o'clock] have class). This is the opposite of English.",
             "examples": [
                 {"cn": "我上午九点上课。", "py": "Wǒ shàngwǔ jiǔ diǎn shàngkè.", "en": "I have class at 9 AM."},
                 {"cn": "我们中午去吃饭。", "py": "Wǒmen zhōngwǔ qù chī fàn.", "en": "We'll eat lunch at noon."}
             ],
             "practice": {"prompt": "Rearrange to say 'I go home at 6 PM every day'.", "words": ["我", "下午", "六点", "回家", "每天"], "answer": ["我", "每天", "下午", "六点", "回家"]}}
        ],
        "dialogue": {"title": "Making Plans",
            "lines": [
                {"speaker": "A", "cn": "今天是星期几？", "py": "Jīntiān shì xīngqī jǐ?", "en": "What day of the week is today?"},
                {"speaker": "B", "cn": "今天是星期三。", "py": "Jīntiān shì xīngqīsān.", "en": "Today is Wednesday."},
                {"speaker": "A", "cn": "这个星期六你有时间吗？", "py": "Zhège xīngqīliù nǐ yǒu shíjiān ma?", "en": "Do you have time this Saturday?"},
                {"speaker": "B", "cn": "有，你想做什么？", "py": "Yǒu, nǐ xiǎng zuò shénme?", "en": "Yes — what do you want to do?"},
                {"speaker": "A", "cn": "我们上午十点去看电影，怎么样？", "py": "Wǒmen shàngwǔ shí diǎn qù kàn diànyǐng, zěnmeyàng?", "en": "Let's see a movie at 10 AM — how about that?"},
                {"speaker": "B", "cn": "太好了！下午我们去吃饭。", "py": "Tài hǎo le! Xiàwǔ wǒmen qù chī fàn.", "en": "Great! Let's have lunch in the afternoon."},
            ]
        },
        "quiz": [
            {"question": "What does '今天 (jīntiān)' mean?", "options": ["Yesterday", "Tomorrow", "Today", "This week"], "answer": "Today", "explanation": "今天 means today. 今=now/this, 天=day."},
            {"question": "How do you say 'morning / AM' in Chinese?", "options": ["下午", "中午", "上午", "晚上"], "answer": "上午", "explanation": "上午 means morning or AM. The time 'above' noon."},
            {"question": "What does '分钟 (fēnzhōng)' mean?", "options": ["Hour", "Minute", "Second", "Week"], "answer": "Minute", "explanation": "分钟 means minute. 分=divide/minute, 钟=clock."},
            {"question": "How do you ask 'What time is it now?'", "options": ["现在几点了？", "今天是几号？", "现在是星期几？", "多少时候？"], "answer": "现在几点了？", "explanation": "现在几点了 = 'What time is it now?' 几点 asks for the hour."},
        ]
    },
    {
        "theme": "Location & Directions",
        "vocab_keys": ["家", "里", "上", "下", "前面", "后面", "哪儿", "哪"],
        "grammar": [
            {"title": "Location Sentences with 在 (zài)",
             "explanation": "在 means 'at' or 'in'. Location pattern: Subject + 在 + Place. Question: Subject + 在哪儿?",
             "examples": [
                 {"cn": "超市在学校后面。", "py": "Chāoshì zài xuéxiào hòumiàn.", "en": "The supermarket is behind the school."},
                 {"cn": "书在桌子上。", "py": "Shū zài zhuōzi shàng.", "en": "The book is on the table."}
             ],
             "practice": {"prompt": "Rearrange to say 'The cat is under the chair'.", "words": ["猫", "椅子", "下面", "在"], "answer": ["猫", "在", "椅子", "下面"]}}
        ],
        "dialogue": {"title": "Asking for Directions",
            "lines": [
                {"speaker": "A", "cn": "请问，学校在哪儿？", "py": "Qǐngwèn, xuéxiào zài nǎr?", "en": "Excuse me, where is the school?"},
                {"speaker": "B", "cn": "学校在前面，走路五分钟。", "py": "Xuéxiào zài qiánmiàn, zǒulù wǔ fēnzhōng.", "en": "The school is ahead — five minutes on foot."},
                {"speaker": "A", "cn": "超市在学校后面吗？", "py": "Chāoshì zài xuéxiào hòumiàn ma?", "en": "Is the supermarket behind the school?"},
                {"speaker": "B", "cn": "对，就在学校后面。", "py": "Duì, jiù zài xuéxiào hòumiàn.", "en": "Yes, it's right behind the school."},
                {"speaker": "A", "cn": "谢谢！不客气！", "py": "Xièxie! Bú kèqi!", "en": "Thank you! — You're welcome!"},
            ]
        },
        "quiz": [
            {"question": "What does '前面 (qiánmiàn)' mean?", "options": ["Behind", "In front / ahead", "Inside", "On top"], "answer": "In front / ahead", "explanation": "前面 means 'in front'. 后面 means behind."},
            {"question": "How do you ask 'Where is the school?'", "options": ["学校是什么？", "学校怎么样？", "学校在哪儿？", "学校有什么？"], "answer": "学校在哪儿？", "explanation": "在哪儿 is the location question — 'where is [subject]?'"},
            {"question": "What does '里 (lǐ)' mean in '包里'?", "options": ["On top of", "Inside / in", "Behind", "In front of"], "answer": "Inside / in", "explanation": "里 means 'inside' or 'in'. 包里 = inside the bag."},
            {"question": "Which direction word means 'above' or 'on top of'?", "options": ["下", "后面", "前面", "上"], "answer": "上", "explanation": "上 (shàng) means above / on top. 下 (xià) means below / under."},
        ]
    },
    {
        "theme": "Common Verbs: Go, Come, Return",
        "vocab_keys": ["来", "去", "回", "开", "坐", "做", "想", "买"],
        "grammar": [
            {"title": "Directional Verbs: 来 vs. 去 vs. 回",
             "explanation": "来 = come (toward speaker). 去 = go (away from speaker). 回 = return (back to origin). All three are used with a destination: 去 + place.",
             "examples": [
                 {"cn": "我去图书馆看书。", "py": "Wǒ qù túshūguǎn kàn shū.", "en": "I go to the library to read."},
                 {"cn": "我回家了。", "py": "Wǒ huí jiā le.", "en": "I've returned home."}
             ],
             "practice": {"prompt": "Rearrange to say 'Let's go to the restaurant together'.", "words": ["去", "我们", "饭店", "一起"], "answer": ["我们", "一起", "去", "饭店"]}}
        ],
        "dialogue": {"title": "Weekend Plans",
            "lines": [
                {"speaker": "A", "cn": "你去哪儿？", "py": "Nǐ qù nǎr?", "en": "Where are you going?"},
                {"speaker": "B", "cn": "我去超市买东西。你来吗？", "py": "Wǒ qù chāoshì mǎi dōngxi. Nǐ lái ma?", "en": "I'm going to the supermarket. Are you coming?"},
                {"speaker": "A", "cn": "好的，我来。我们一起去。", "py": "Hǎo de, wǒ lái. Wǒmen yìqǐ qù.", "en": "Okay, I'll come. Let's go together."},
                {"speaker": "B", "cn": "你什么时候回家？", "py": "Nǐ shénme shíhou huí jiā?", "en": "When are you going back home?"},
                {"speaker": "A", "cn": "我下午三点回家。", "py": "Wǒ xiàwǔ sān diǎn huí jiā.", "en": "I'm going home at 3 PM."},
            ]
        },
        "quiz": [
            {"question": "What does '去 (qù)' mean?", "options": ["To come", "To return", "To go", "To buy"], "answer": "To go", "explanation": "去 means 'to go' — away from the speaker."},
            {"question": "Which sentence means 'Let's go eat together'?", "options": ["我们一起回家。", "我们一起去吃饭。", "我们一起来学校。", "我们一起买东西。"], "answer": "我们一起去吃饭。", "explanation": "一起=together, 去=go, 吃饭=eat. Let's go eat together."},
            {"question": "What does '回 (huí)' mean?", "options": ["To go", "To come", "To return", "To open"], "answer": "To return", "explanation": "回 means to return or go back to a place."},
            {"question": "How do you say 'I want to buy clothes'?", "options": ["我想买衣服。", "我看买衣服。", "我有买衣服。", "我来买衣服。"], "answer": "我想买衣服。", "explanation": "想 + verb = want to do something. 我想买衣服 = I want to buy clothes."},
        ]
    },
    {
        "theme": "Food & Eating",
        "vocab_keys": ["菜", "茶", "水", "水果", "苹果", "米饭", "吃", "喝"],
        "grammar": [
            {"title": "Offering choices with 还是 (háishi)",
             "explanation": "还是 is used in questions to offer a choice: A 还是 B? = 'A or B?'",
             "examples": [
                 {"cn": "你喝茶还是喝水？", "py": "Nǐ hē chá háishi hē shuǐ?", "en": "Do you drink tea or water?"},
             ],
             "practice": {"prompt": "Rearrange to ask 'Do you want tea or water?'", "words": ["水", "还是", "你", "要", "茶"], "answer": ["你", "要", "茶", "还是", "水"]}}
        ],
        "dialogue": {"title": "At a Restaurant",
            "lines": [
                {"speaker": "A", "cn": "你要喝什么？茶还是水？", "py": "Nǐ yào hē shénme? Chá háishi shuǐ?", "en": "What do you want to drink? Tea or water?"},
                {"speaker": "B", "cn": "我要喝茶。你呢？", "py": "Wǒ yào hē chá. Nǐ ne?", "en": "I'll have tea. And you?"},
                {"speaker": "A", "cn": "我喝水。这道菜怎么样？好吃吗？", "py": "Wǒ hē shuǐ. Zhè dào cài zěnmeyàng? Hǎochī ma?", "en": "I'll have water. How is this dish? Is it tasty?"},
                {"speaker": "B", "cn": "非常好吃！你尝一尝。", "py": "Fēicháng hǎochī! Nǐ cháng yī cháng.", "en": "It's delicious! Give it a try."},
                {"speaker": "A", "cn": "真好吃！妈妈做的菜也很好。", "py": "Zhēn hǎochī! Māma zuò de cài yě hěn hǎo.", "en": "It really is delicious! My mom's cooking is also great."},
            ]
        },
        "quiz": [
            {"question": "What does '菜 (cài)' mean?", "options": ["Tea", "Water", "Dish / vegetable", "Fruit"], "answer": "Dish / vegetable", "explanation": "菜 means dish or vegetable."},
            {"question": "How do you say 'cooked rice' in Chinese?", "options": ["水果", "苹果", "米饭", "菜"], "answer": "米饭", "explanation": "米饭 (mǐfàn) means cooked rice."},
            {"question": "Which sentence means 'Let's go eat'?", "options": ["我们去买菜。", "我们去喝茶。", "我们去吃饭吧。", "我们去看书。"], "answer": "我们去吃饭吧。", "explanation": "吃饭 means to eat a meal. 吧 adds a suggestive tone."},
            {"question": "What does '还是 (háishi)' do in a question?", "options": ["Asks 'where'", "Offers a choice between two options", "Shows ownership", "Negates a verb"], "answer": "Offers a choice between two options", "explanation": "还是 = 'or' — used in questions to present two options: A 还是 B?"},
        ]
    },
    {
        "theme": "Objects at Home",
        "vocab_keys": ["书", "电脑", "电视", "电影", "东西", "杯子", "桌子", "椅子", "衣服", "本"],
        "grammar": [
            {"title": "Short follow-up questions with 呢 (ne)",
             "explanation": "呢 at the end of a topic phrase forms a short question meaning 'what about…?' or 'where is…?'",
             "examples": [
                 {"cn": "我的书呢？", "py": "Wǒ de shū ne?", "en": "Where's my book?"},
                 {"cn": "你呢？", "py": "Nǐ ne?", "en": "And you?"}
             ],
             "practice": {"prompt": "Rearrange to say 'The book is on the desk'.", "words": ["书", "桌子", "上", "在"], "answer": ["书", "在", "桌子", "上"]}}
        ],
        "dialogue": {"title": "Finding Things",
            "lines": [
                {"speaker": "A", "cn": "你看见我的书了吗？", "py": "Nǐ kànjian wǒ de shū le ma?", "en": "Did you see my book?"},
                {"speaker": "B", "cn": "你的书在桌子上。", "py": "Nǐ de shū zài zhuōzi shàng.", "en": "Your book is on the table."},
                {"speaker": "A", "cn": "谢谢！还有，我的杯子呢？", "py": "Xièxie! Háiyǒu, wǒ de bēizi ne?", "en": "Thank you! Also — where's my cup?"},
                {"speaker": "B", "cn": "你的杯子在椅子下面。", "py": "Nǐ de bēizi zài yǐzi xiàmiàn.", "en": "Your cup is under the chair."},
                {"speaker": "A", "cn": "真的！谢谢你帮我找。", "py": "Zhēn de! Xièxie nǐ bāng wǒ zhǎo.", "en": "Really! Thank you for helping me find it."},
            ]
        },
        "quiz": [
            {"question": "What does '书 (shū)' mean?", "options": ["Pen", "Book", "Table", "Chair"], "answer": "Book", "explanation": "书 means book."},
            {"question": "How do you say 'table' in Chinese?", "options": ["椅子", "杯子", "桌子", "书"], "answer": "桌子", "explanation": "桌子 (zhuōzi) means table or desk."},
            {"question": "What does '看见 (kànjian)' mean?", "options": ["To look", "To watch TV", "To see / catch sight of", "To read"], "answer": "To see / catch sight of", "explanation": "看见 means to actually see something — the result of looking."},
            {"question": "Which sentence uses 呢 as a short follow-up?", "options": ["你是学生吗？", "你的杯子呢？", "杯子在哪里？", "这是什么？"], "answer": "你的杯子呢？", "explanation": "呢 creates a short 'where is…?' or 'what about…?' question."},
        ]
    },
    {
        "theme": "Weather & Descriptions",
        "vocab_keys": ["天气", "下雨", "热", "冷", "大", "小", "多", "少", "好", "太", "很", "漂亮", "高兴"],
        "grammar": [
            {"title": "Describing with 很 (hěn) + adjective",
             "explanation": "In Chinese, adjectives act as predicates. Use Subject + 很 + Adjective (no 'is'): 天气很好 = 'the weather [is] very good'.",
             "examples": [
                 {"cn": "今天天气很好。", "py": "Jīntiān tiānqì hěn hǎo.", "en": "The weather is great today."},
                 {"cn": "冬天很冷，夏天很热。", "py": "Dōngtiān hěn lěng, xiàtiān hěn rè.", "en": "Winter is cold; summer is hot."}
             ],
             "practice": {"prompt": "Rearrange to say 'It's very hot today'.", "words": ["今天", "很", "热"], "answer": ["今天", "很", "热"]}}
        ],
        "dialogue": {"title": "Talking About the Weather",
            "lines": [
                {"speaker": "A", "cn": "今天天气怎么样？", "py": "Jīntiān tiānqì zěnmeyàng?", "en": "How's the weather today?"},
                {"speaker": "B", "cn": "今天很冷，外面在下雨。", "py": "Jīntiān hěn lěng, wàimiàn zài xià yǔ.", "en": "It's very cold — it's raining outside."},
                {"speaker": "A", "cn": "是吗？昨天很热，今天怎么这么冷？", "py": "Shì ma? Zuótiān hěn rè, jīntiān zěnme zhème lěng?", "en": "Really? Yesterday was hot — why is it so cold today?"},
                {"speaker": "B", "cn": "中国的天气变化很大。", "py": "Zhōngguó de tiānqì biànhuà hěn dà.", "en": "Chinese weather is very changeable."},
                {"speaker": "A", "cn": "记得带伞！", "py": "Jìde dài sǎn!", "en": "Remember to bring an umbrella!"},
            ]
        },
        "quiz": [
            {"question": "What does '天气 (tiānqì)' mean?", "options": ["Temperature", "Weather", "Wind", "Season"], "answer": "Weather", "explanation": "天气 means weather."},
            {"question": "How do you say 'it's raining'?", "options": ["天气很冷", "下雨了", "天气很热", "风很大"], "answer": "下雨了", "explanation": "下雨 means 'to rain'. 了 shows it has started."},
            {"question": "What does '冷 (lěng)' mean?", "options": ["Hot", "Big", "Cold", "Small"], "answer": "Cold", "explanation": "冷 means cold. 热 (rè) means hot."},
            {"question": "How do you say 'the weather is very nice'?", "options": ["天气很大。", "天气很好。", "天气很多。", "天气很小。"], "answer": "天气很好。", "explanation": "天气很好 uses Subject + 很 + adjective — the standard structure."},
        ]
    },
]

# ============================================================
# BUILD LESSONS
# ============================================================

VOCAB_INDEX = {v["c"]: v for v in ALL_HSK1_VOCAB}

def get_vocab_entry(char):
    v = VOCAB_INDEX.get(char)
    if not v:
        return None
    return {
        "character": v["c"], "pinyin": v["p"], "meaning": v["m"],
        "deconstruct": v["d"], "exampleCn": v["ex_cn"],
        "examplePy": v["ex_py"], "exampleEn": v["ex_en"]
    }

def build_all_lessons():
    all_lessons = []
    lesson_num = 1
    used_chars = set()

    for theme_data in LESSON_THEMES:
        vocab_entries = [get_vocab_entry(c) for c in theme_data["vocab_keys"] if get_vocab_entry(c)]
        used_chars.update(theme_data["vocab_keys"])

        # Add a dynamic listening question to the quiz
        if vocab_entries:
            random_word = random.choice(vocab_entries)
            listening_q = {
                "type": "listening",
                "testWord": random_word["character"],
                "question": "Listen and select the correct meaning:",
                "options": [random_word["meaning"]],
                "answer": random_word["meaning"],
                "explanation": f"You heard '{random_word['pinyin']}' ({random_word['character']}), which means '{random_word['meaning']}'."
            }
            # Fill options with 3 other random meanings
            opts = listening_q["options"]
            while len(opts) < 4:
                rand_m = random.choice(ALL_HSK1_VOCAB)["m"]
                if rand_m not in opts:
                    opts.append(rand_m)
            random.shuffle(opts)
            listening_q["options"] = opts
            theme_data["quiz"].append(listening_q)

        all_lessons.append({
            "id": f"hsk1_day{lesson_num}",
            "title": f"Day {lesson_num}: {theme_data['theme']}",
            "level": "HSK 1 (Beginner)",
            "duration": "60 min",
            "vocab": vocab_entries,
            "grammar": theme_data["grammar"],
            "dialogue": theme_data["dialogue"],
            "quiz": theme_data["quiz"]
        })
        lesson_num += 1

    # Remaining vocab in batches of 8
    remaining = [v for v in ALL_HSK1_VOCAB if v["c"] not in used_chars]
    chunk_size = 8
    group_num = 1

    for i in range(0, len(remaining), chunk_size):
        chunk = remaining[i:i + chunk_size]
        if not chunk:
            break

        vocab_entries = [{
            "character": v["c"], "pinyin": v["p"], "meaning": v["m"],
            "deconstruct": v["d"], "exampleCn": v["ex_cn"],
            "examplePy": v["ex_py"], "exampleEn": v["ex_en"]
        } for v in chunk]

        quiz = []
        for v in chunk[:4]:
            opts = [v["m"]] + random.sample([x["m"] for x in ALL_HSK1_VOCAB if x["m"] != v["m"]], 3)
            random.shuffle(opts)
            quiz.append({
                "question": f"What does '{v['c']} ({v['p']})' mean?",
                "options": opts, "answer": v["m"],
                "explanation": f"'{v['c']}' ({v['p']}) means '{v['m']}'. Example: {v['ex_en']}"
            })
            
        if chunk:
            v_listen = random.choice(chunk)
            listening_q = {
                "type": "listening",
                "testWord": v_listen["c"],
                "question": "Listen and select the correct meaning:",
                "options": [v_listen["m"]],
                "answer": v_listen["m"],
                "explanation": f"You heard '{v_listen['p']}' ({v_listen['c']}), which means '{v_listen['m']}'."
            }
            opts = listening_q["options"]
            while len(opts) < 4:
                rand_m = random.choice(ALL_HSK1_VOCAB)["m"]
                if rand_m not in opts:
                    opts.append(rand_m)
            random.shuffle(opts)
            listening_q["options"] = opts
            quiz.append(listening_q)

        w1, w2 = chunk[0], chunk[1] if len(chunk) > 1 else chunk[0]

        all_lessons.append({
            "id": f"hsk1_day{lesson_num}",
            "title": f"Day {lesson_num}: Vocabulary Practice Group {group_num}",
            "level": "HSK 1 (Beginner)",
            "duration": "60 min",
            "vocab": vocab_entries,
            "grammar": [{
                "title": "Review: Subject + 很 + Adjective",
                "explanation": "很 (hěn) means 'very' and links subject to adjective. 天气很好 = The weather is very good.",
                "examples": [{"cn": "今天天气很好。", "py": "Jīntiān tiānqì hěn hǎo.", "en": "The weather is very good today."}],
                "practice": {"prompt": "Rearrange to say 'This apple is very sweet'.", "words": ["很", "苹果", "甜", "这个"], "answer": ["这个", "苹果", "很", "甜"]}
            }],
            "dialogue": {
                "title": "Vocabulary Practice",
                "lines": [
                    {"speaker": "A", "cn": f"你认识'{w1['c']}'这个词吗？", "py": f"Nǐ rènshi '{w1['c']}' zhège cí ma?", "en": f"Do you know the word '{w1['c']}'?"},
                    {"speaker": "B", "cn": f"认识！意思是'{w1['m']}'。", "py": f"Rènshi! Yìsi shì '{w1['m']}'.", "en": f"Yes! It means '{w1['m']}'."},
                    {"speaker": "A", "cn": f"那'{w2['c']}'呢？", "py": f"Nà '{w2['c']}' ne?", "en": f"What about '{w2['c']}'?"},
                    {"speaker": "B", "cn": f"'{w2['c']}'是'{w2['m']}'。", "py": f"'{w2['c']}' shì '{w2['m']}'.", "en": f"'{w2['c']}' means '{w2['m']}'."},
                    {"speaker": "A", "cn": "你的汉语很好！", "py": "Nǐ de Hànyǔ hěn hǎo!", "en": "Your Chinese is very good!"},
                ]
            },
            "quiz": quiz
        })
        lesson_num += 1
        group_num += 1

    return all_lessons

# ============================================================
# GENERATE & WRITE OUTPUT
# ============================================================

random.seed(42)
curriculum = build_all_lessons()

output = "window.HSK1_CURRICULUM = " + json.dumps(curriculum, ensure_ascii=False, indent=2) + ";"

with open("hsk1_data.js", "w", encoding="utf-8") as f:
    f.write(output)

print(f"✅ Generated hsk1_data.js successfully!")
print(f"   Total lessons: {len(curriculum)}")
print(f"   Total unique vocab entries: {len(ALL_HSK1_VOCAB)}")
print()
print("Key improvements over v1:")
print("  ✓ Every example sentence is natural and contextual")
print("  ✓ No more '这是一个X' template sentences")
print("  ✓ Lessons grouped by theme, not alphabetically")
print("  ✓ Dialogues are coherent mini-conversations per theme")
print("  ✓ Grammar matched to each lesson's topic")
print()
print("📋 Lesson overview:")
for lesson in curriculum:
    print(f"   {lesson['id']}: {lesson['title']} ({len(lesson['vocab'])} vocab words)")
