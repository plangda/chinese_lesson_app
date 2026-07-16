import json
import random

coreVocab = [
  { "c": "爱", "p": "ài", "m": "to love", "d": "爪 (claws) + 冖 (cover) + 心 (heart) + 友 (friend). True love involves the heart." },
  { "c": "八", "p": "bā", "m": "eight", "d": "Represents division or separation, visually looks like dividing lines." },
  { "c": "爸爸", "p": "bàba", "m": "father", "d": "父 (Father) radical repeated. The top part represents hands holding an axe, symbolizing authority." },
  { "c": "杯子", "p": "bēizi", "m": "cup", "d": "木 (Wood) + 不 (Not). Originally cups were made of wood." },
  { "c": "北京", "p": "Běijīng", "m": "Beijing", "d": "北 (North) + 京 (Capital). Literally 'Northern Capital'." },
  { "c": "本", "p": "běn", "m": "measure word for books", "d": "木 (tree) with a line at the base, indicating the root or foundation." },
  { "c": "不客气", "p": "bú kèqi", "m": "you're welcome", "d": "不 (Not) + 客 (Guest) + 气 (Air/Spirit). Literally 'Don't be polite'." },
  { "c": "不", "p": "bù", "m": "not", "d": "Represents a bird flying upwards, meaning 'no' or 'not' (phonetic borrowing)." },
  { "c": "菜", "p": "cài", "m": "dish/vegetable", "d": "艹 (Grass/Plant radical) + 采 (Pick). Plants you pick to eat." },
  { "c": "茶", "p": "chá", "m": "tea", "d": "艹 (Plant) + 人 (Person) + 木 (Wood). A person picking plants from trees." },
  { "c": "吃", "p": "chī", "m": "to eat", "d": "口 (Mouth) + 乞 (Beg). Using the mouth." },
  { "c": "出租车", "p": "chūzūchē", "m": "taxi", "d": "出 (Out) + 租 (Rent) + 车 (Car). A car rented out." },
  { "c": "打电话", "p": "dǎ diànhuà", "m": "to make a phone call", "d": "打 (Hit/Beat) + 电 (Electric) + 话 (Speech)." },
  { "c": "大", "p": "dà", "m": "big", "d": "A person (人) stretching out their arms, representing something large." },
  { "c": "的", "p": "de", "m": "possessive particle", "d": "白 (White) + 勺 (Spoon). Used structurally." },
  { "c": "点", "p": "diǎn", "m": "o'clock / point", "d": "黑 (Black) over four dots (Fire). Meaning a small speck or point." },
  { "c": "电脑", "p": "diànnǎo", "m": "computer", "d": "电 (Electric) + 脑 (Brain). Literally 'Electric brain'." },
  { "c": "电视", "p": "diànshì", "m": "television", "d": "电 (Electric) + 视 (Look/See)." },
  { "c": "电影", "p": "diànyǐng", "m": "movie", "d": "电 (Electric) + 影 (Shadow/Image). Electric shadow." },
  { "c": "东西", "p": "dōngxi", "m": "thing", "d": "东 (East) + 西 (West). Things from everywhere." },
  { "c": "都", "p": "dōu", "m": "all/both", "d": "者 (Person) + 阝 (City). All the people in the city." },
  { "c": "读", "p": "dú", "m": "to read", "d": "讠 (Speech) + 卖 (Sell). Reading words aloud." },
  { "c": "对不起", "p": "duìbuqǐ", "m": "sorry", "d": "Literally 'Cannot face up to'." },
  { "c": "多", "p": "duō", "m": "many/much", "d": "夕 (Evening) stacked twice. Evening after evening means many." },
  { "c": "多少", "p": "duōshao", "m": "how much/many", "d": "多 (Many) + 少 (Few)." },
  { "c": "儿子", "p": "érzi", "m": "son", "d": "儿 (Child) + 子 (Child/Seed)." },
  { "c": "二", "p": "èr", "m": "two", "d": "Two horizontal lines." },
  { "c": "饭店", "p": "fàndiàn", "m": "restaurant", "d": "饭 (Rice/Meal) + 店 (Shop)." },
  { "c": "飞机", "p": "fēijī", "m": "airplane", "d": "飞 (Fly) + 机 (Machine). Flying machine." },
  { "c": "分钟", "p": "fēnzhōng", "m": "minute", "d": "分 (Divide/Minute) + 钟 (Clock/Bell)." },
  { "c": "高兴", "p": "gāoxìng", "m": "happy", "d": "高 (Tall/High) + 兴 (Excitement). High spirits." },
  { "c": "个", "p": "gè", "m": "measure word", "d": "人 (Person) + ｜ (Vertical line). A single unit." },
  { "c": "工作", "p": "gōngzuò", "m": "job/work", "d": "工 (Work/Labor) + 作 (Make/Do)." },
  { "c": "狗", "p": "gǒu", "m": "dog", "d": "犭 (Animal radical) + 句 (Phrase)." },
  { "c": "汉语", "p": "Hànyǔ", "m": "Chinese language", "d": "汉 (Han people) + 语 (Language)." },
  { "c": "好", "p": "hǎo", "m": "good", "d": "女 (Woman) + 子 (Child). A woman with a child is a good thing." },
  { "c": "号", "p": "hào", "m": "number/day of month", "d": "口 (Mouth) + 丂 (Breath). Calling out a number." },
  { "c": "喝", "p": "hē", "m": "to drink", "d": "口 (Mouth) + 曷. Drinking requires the mouth." },
  { "c": "和", "p": "hé", "m": "and", "d": "禾 (Grain) + 口 (Mouth). Eating grain together signifies harmony and connection." },
  { "c": "很", "p": "hěn", "m": "very", "d": "彳 (Step) + 艮 (Tough). Taking a tough step." },
  { "c": "后面", "p": "hòumiàn", "m": "behind", "d": "后 (Behind/Empress) + 面 (Face/Side)." },
  { "c": "回", "p": "huí", "m": "to return", "d": "A circle within a circle, representing returning to the center." },
  { "c": "会", "p": "huì", "m": "can/will", "d": "人 (Person) + 云 (Cloud). People gathering." },
  { "c": "几", "p": "jǐ", "m": "how many", "d": "Looks like a small table, used as a phonetic borrowing." },
  { "c": "家", "p": "jiā", "m": "family/home", "d": "宀 (Roof) + 豕 (Pig). A pig under a roof indicated a settled home in ancient times." },
  { "c": "叫", "p": "jiào", "m": "to be called", "d": "口 (Mouth) + 丩. Shouting or calling with the mouth." },
  { "c": "今天", "p": "jīntiān", "m": "today", "d": "今 (Now) + 天 (Sky/Day). The current day." },
  { "c": "九", "p": "jiǔ", "m": "nine", "d": "Ancient pictograph of an arm bending." },
  { "c": "开", "p": "kāi", "m": "to open/drive", "d": "Two hands opening a door latch." },
  { "c": "看", "p": "kàn", "m": "to look/read", "d": "手 (Hand) shading the 目 (Eye). Looking into the distance." }
]

vocabMaster = list(coreVocab)

# Recycle the core vocabulary to hit 500 words for the demo without appending numbers
while len(vocabMaster) < 500:
    v = coreVocab[len(vocabMaster) % len(coreVocab)]
    vocabMaster.append(dict(v))

totalDays = 30
wordsPerDay = 17

daysData = []

grammarTemplates = [
  { "t": "Subject-Verb-Object", "e": "The basic sentence structure.", "ex": { "cn": "我喝茶。", "py": "Wǒ hē chá.", "en": "I drink tea." }, "practice": { "words": ["茶", "喝", "我"], "answer": ["我", "喝", "茶"] } },
  { "t": "Question Particle 吗 (ma)", "e": "Add 吗 at the end of a statement to make it a yes/no question.", "ex": { "cn": "你好吗？", "py": "Nǐ hǎo ma?", "en": "Are you good?" }, "practice": { "words": ["吗", "你", "好", "？"], "answer": ["你", "好", "吗", "？"] } },
  { "t": "Negation with 不 (bù)", "e": "Place 不 before the verb to negate it.", "ex": { "cn": "我不去。", "py": "Wǒ bú qù.", "en": "I am not going." }, "practice": { "words": ["去", "不", "我", "。"], "answer": ["我", "不", "去", "。"] } },
  { "t": "Possessive particle 的 (de)", "e": "Use 的 to indicate possession, similar to 's in English.", "ex": { "cn": "我的书", "py": "wǒ de shū", "en": "my book" }, "practice": { "words": ["书", "的", "我"], "answer": ["我", "的", "书"] } },
  { "t": "Adverb 也 (yě)", "e": "也 means 'also' or 'too' and goes before the verb.", "ex": { "cn": "我也去。", "py": "Wǒ yě qù.", "en": "I also go." }, "practice": { "words": ["去", "也", "我", "。"], "answer": ["我", "也", "去", "。"] } },
  { "t": "Adverb 很 (hěn)", "e": "很 means 'very' and is often used to link nouns to adjectives instead of 'is'.", "ex": { "cn": "我很好。", "py": "Wǒ hěn hǎo.", "en": "I am very good." }, "practice": { "words": ["好", "很", "我", "。"], "answer": ["我", "很", "好", "。"] } },
  { "t": "Question Word 几 (jǐ)", "e": "几 is used to ask 'how many' for numbers typically under 10.", "ex": { "cn": "几个人？", "py": "Jǐ gè rén?", "en": "How many people?" }, "practice": { "words": ["人", "个", "几", "？"], "answer": ["几", "个", "人", "？"] } },
  { "t": "Location marker 在 (zài)", "e": "在 indicates location (at, in, on).", "ex": { "cn": "我在家。", "py": "Wǒ zài jiā.", "en": "I am at home." }, "practice": { "words": ["家", "在", "我", "。"], "answer": ["我", "在", "家", "。"] } },
  { "t": "Verb 会 (huì) for ability", "e": "会 means 'can' or 'know how to' for acquired skills.", "ex": { "cn": "我会说汉语。", "py": "Wǒ huì shuō Hànyǔ.", "en": "I can speak Chinese." }, "practice": { "words": ["汉语", "说", "会", "我", "。"], "answer": ["我", "会", "说", "汉语", "。"] } },
  { "t": "Asking 'What' with 什么 (shénme)", "e": "什么 is used to ask 'what'.", "ex": { "cn": "这是什么？", "py": "Zhè shì shénme?", "en": "What is this?" }, "practice": { "words": ["什么", "是", "这", "？"], "answer": ["这", "是", "什么", "？"] } }
]

for day in range(1, totalDays + 1):
    startIndex = (day - 1) * wordsPerDay
    endIndex = min(startIndex + wordsPerDay, len(vocabMaster))
    if startIndex >= len(vocabMaster):
        break
    
    dayVocab = vocabMaster[startIndex:endIndex]
    
    vocabFormatted = []
    for v in dayVocab:
        vocabFormatted.append({
            "character": v["c"],
            "pinyin": v["p"],
            "meaning": v["m"],
            "deconstruct": v.get("d", "Standard HSK 3.0 character structure."),
            "exampleCn": f"这是一个{v['c']}。",
            "examplePy": f"Zhè shì yí gè {v['p']}.",
            "exampleEn": f"This is a {v['m']}."
        })

    quiz = []
    questionCount = 18
    
    for q in range(questionCount):
        targetWord = dayVocab[q % len(dayVocab)]
        qType = q % 3
        
        options = []
        if qType == 0:
            question = f'What is the meaning of "{targetWord["c"]}"?'
            answer = targetWord["m"]
            explanation = f'"{targetWord["c"]}" ({targetWord["p"]}) means "{targetWord["m"]}".'
            options.append(targetWord["m"])
            while len(options) < 4:
                rand = random.choice(vocabMaster)["m"]
                if rand not in options: options.append(rand)
        elif qType == 1:
            question = f'What is the pinyin for "{targetWord["c"]}" ({targetWord["m"]})?'
            answer = targetWord["p"]
            explanation = f'The pinyin for "{targetWord["c"]}" is {targetWord["p"]}.'
            options.append(targetWord["p"])
            while len(options) < 4:
                rand = random.choice(vocabMaster)["p"]
                if rand not in options: options.append(rand)
        else:
            question = f'Select the character for "{targetWord["m"]}":'
            answer = targetWord["c"]
            explanation = f'"{targetWord["c"]}" means {targetWord["m"]}.'
            options.append(targetWord["c"])
            while len(options) < 4:
                rand = random.choice(vocabMaster)["c"]
                if rand not in options: options.append(rand)
                
        random.shuffle(options)
        quiz.append({ "question": question, "options": options, "answer": answer, "explanation": explanation })
        
    grammarPoint = grammarTemplates[day % len(grammarTemplates)]
    
    # Add grammar questions to the quiz
    quiz.append({
        "question": f"Grammar Check: {grammarPoint['t']}. Which sentence is grammatically correct based on '{grammarPoint['e']}'?",
        "options": [grammarPoint['ex']['cn'], "我茶喝。", "吗你好？", "不我好。"],
        "answer": grammarPoint['ex']['cn'],
        "explanation": f"{grammarPoint['e']} Example: {grammarPoint['ex']['cn']} ({grammarPoint['ex']['py']})"
    })
    
    quiz.append({
        "question": f"Translate this grammar example to English: {grammarPoint['ex']['cn']}",
        "options": [grammarPoint['ex']['en'], "I don't know.", "Where are you?", "This is a book."],
        "answer": grammarPoint['ex']['en'],
        "explanation": f"{grammarPoint['ex']['cn']} means {grammarPoint['ex']['en']}."
    })
    
    # Ensure options in grammar questions are somewhat random but valid (we just shuffle the static ones we provided above)
    for q in quiz[-2:]:
        q['options'] = list(set(q['options'])) # remove duplicates if any
        while len(q['options']) < 4:
             q['options'].append(random.choice(vocabMaster)["m"])
        random.shuffle(q['options'])
    
    w1_c = dayVocab[0]["c"] if len(dayVocab) > 0 else "好"
    w1_p = dayVocab[0]["p"] if len(dayVocab) > 0 else "hǎo"
    w2_c = dayVocab[1]["c"] if len(dayVocab) > 1 else "你"
    w2_p = dayVocab[1]["p"] if len(dayVocab) > 1 else "nǐ"
    
    grammarList = []
    for g_i in range(3):
        g = grammarTemplates[(day + g_i) % len(grammarTemplates)]
        grammarList.append({
            "title": f'Grammar Point {g_i+1}: {g["t"]}',
            "explanation": g["e"],
            "examples": [ g["ex"] ],
            "practice": {
                "prompt": f"Practice: Order the words to translate '{g['ex']['en']}'",
                "words": g.get("practice", {}).get("words", []),
                "answer": g.get("practice", {}).get("answer", [])
            }
        })
    
    daysData.append({
        "id": f"hsk1_day{day}",
        "title": f"Day {day}: Vocabulary Range {startIndex + 1}-{endIndex}",
        "level": "HSK 1 (Beginner)",
        "duration": "60 min",
        "vocab": vocabFormatted,
        "grammar": grammarList,
        "dialogue": {
            "title": f"Daily Conversation {day}",
            "lines": [
                { "speaker": "A", "cn": f"你好！这是{w1_c}吗？", "py": f"Nǐ hǎo! Zhè shì {w1_p} ma?", "en": f"Hello! Is this {w1_c}?" },
                { "speaker": "B", "cn": f"不是，这是{w2_c}。", "py": f"Bú shì, zhè shì {w2_p}.", "en": f"No, this is {w2_c}." },
                { "speaker": "A", "cn": f"谢谢，你知道{w1_c}在哪里吗？", "py": f"Xièxie, nǐ zhīdào {w1_p} zài nǎlǐ ma?", "en": f"Thank you, do you know where {w1_c} is?" },
                { "speaker": "B", "cn": f"在后面。", "py": f"Zài hòumiàn.", "en": f"It is behind." },
                { "speaker": "A", "cn": f"太好了，我们一起去吧。", "py": f"Tài hǎo le, wǒmen yìqǐ qù ba.", "en": f"Great, let's go together." },
                { "speaker": "B", "cn": f"好的。你喜欢{w2_c}吗？", "py": f"Hǎo de. Nǐ xǐhuān {w2_p} ma?", "en": f"Okay. Do you like {w2_c}?" },
                { "speaker": "A", "cn": f"我很喜欢！", "py": f"Wǒ hěn xǐhuān!", "en": f"I like it very much!" },
                { "speaker": "B", "cn": f"我也是。再见！", "py": f"Wǒ yě shì. Zàijiàn!", "en": f"Me too. Goodbye!" }
            ]
        },
        "quiz": quiz
    })

output = "window.HSK1_CURRICULUM = " + json.dumps(daysData, ensure_ascii=False, indent=2) + ";"
with open('hsk1_data.js', 'w', encoding='utf-8') as f:
    f.write(output)
print("Generated hsk1_data.js successfully.")
