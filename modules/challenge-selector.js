/**
 * Challenge Selector Module
 * Dynamically generates active cognitive micro-challenges based on SRS mastery stages.
 */

export class ChallengeSelector {
  constructor() {
    this.vocabPool = [];
  }

  /**
   * Set the global vocabulary pool used to extract distractor options
   * @param {Array} pool Array of vocab items
   */
  setVocabularyPool(pool) {
    this.vocabPool = pool;
  }

  /**
   * Generates a challenge object for a given vocab card
   * @param {Object} card 
   * @param {string} lang 'th' | 'en'
   * @returns {Object} { type: string, question: string, options: Array, answer: string, hint: string }
   */
  generateChallenge(card, lang = 'en') {
    const stage = card.mastery_stage || 1;
    const meaning = lang === 'th' ? (card.meaning_th || card.meaning) : (card.meaning || card.meaning_en);
    const example = lang === 'th' ? (card.exampleTh || card.exampleEn) : (card.exampleEn || card.example_en);

    switch (stage) {
      case 1:
        return this.createRecognitionChallenge(card, meaning);
      case 2:
        // Randomly split between Tone Identification and Pinyin typing
        return Math.random() > 0.5 
          ? this.createToneChallenge(card)
          : this.createPinyinChallenge(card);
      case 3:
        return this.createTranslationChallenge(card, meaning);
      case 4:
        return this.createContextChallenge(card, example);
      default:
        return this.createRecognitionChallenge(card, meaning);
    }
  }

  /**
   * Helper to shuffle arrays
   */
  shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }

  /**
   * Gets random distractors from the vocabulary pool
   * @param {Object} excludeCard 
   * @param {string} fieldName 
   * @param {number} count 
   */
  getDistractors(excludeCard, fieldName, count = 3) {
    const distractors = this.vocabPool
      .filter(item => item.character !== excludeCard.character && item[fieldName])
      .map(item => item[fieldName]);
    
    // De-duplicate
    const unique = Array.from(new Set(distractors));
    
    this.shuffle(unique);
    return unique.slice(0, count);
  }

  /**
   * STAGE 1: Recognition -> Meaning is shown, pick correct Hanzi
   */
  createRecognitionChallenge(card, meaning) {
    const correctOption = card.character;
    const distractors = this.getDistractors(card, 'character', 3);
    
    // Fallback if pool is empty or small
    while (distractors.length < 3) {
      distractors.push(this.generateRandomHanziFallback(distractors.concat([correctOption])));
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'RECOGNITION',
      prompt: `Select the correct Chinese character for:`,
      question: meaning,
      options,
      answer: correctOption,
      hint: `Pinyin: ${card.pinyin}`
    };
  }

  /**
   * STAGE 2 (Phonology A): Tone Identification
   */
  createToneChallenge(card) {
    // Extract tone (1-4) from pinyin
    const toneNum = this.extractToneNumber(card.pinyin);
    const toneLabels = {
      '1': '1st Tone (High, Level - ā)',
      '2': '2nd Tone (Rising - á)',
      '3': '3rd Tone (Low, Dipping - ǎ)',
      '4': '4th Tone (Falling - à)',
      '5': 'Neutral Tone (Light, Short - a)'
    };

    const options = ['1', '2', '3', '4', '5'].map(t => ({
      value: t,
      label: toneLabels[t]
    }));

    return {
      type: 'TONE_ID',
      prompt: `Identify the correct tone for this character:`,
      question: card.character,
      options,
      answer: String(toneNum),
      hint: `Meaning: ${card.meaning}`
    };
  }

  /**
   * STAGE 2 (Phonology B): Pinyin Input challenge
   */
  createPinyinChallenge(card) {
    // Correct pinyin without tone markers (e.g. nǐ -> ni)
    const cleanPinyin = this.stripToneMarkers(card.pinyin).toLowerCase().replace(/\s/g, '');

    return {
      type: 'PINYIN_INPUT',
      prompt: `Type the correct Pinyin (no tone markers or spaces):`,
      question: card.character,
      answer: cleanPinyin,
      hint: `Tonal Hint: ${card.pinyin} | Meaning: ${card.meaning}`
    };
  }

  /**
   * STAGE 3: Meaning -> Hanzi is shown, pick correct translation
   */
  createTranslationChallenge(card, meaning) {
    const correctOption = meaning;
    const distractors = this.getDistractors(card, 'meaning', 3);

    // Fallbacks
    while (distractors.length < 3) {
      distractors.push('to learn; study', 'hello; greetings', 'water; river', 'goodbye; see again');
    }

    const options = this.shuffle(distractors.slice(0, 3).concat([correctOption]));

    return {
      type: 'TRANSLATION',
      prompt: `Choose the correct meaning of this word:`,
      question: card.character,
      options,
      answer: correctOption,
      hint: `Pinyin: ${card.pinyin}`
    };
  }

  /**
   * STAGE 4: Context -> Fill-in-the-blank sentence completion
   */
  createContextChallenge(card, exampleTranslation) {
    const sentence = card.exampleCn || card.example_sentence || '我今天很___。';
    
    // Mask target word in sentence
    const masked = sentence.replace(new RegExp(card.character, 'g'), ' ____ ');

    const correctOption = card.character;
    const distractors = this.getDistractors(card, 'character', 3);

    while (distractors.length < 3) {
      distractors.push('是', '不', '吗');
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'CONTEXT',
      prompt: `Complete the sentence with the correct word:`,
      question: masked,
      options,
      answer: correctOption,
      hint: `Translation: ${exampleTranslation}`
    };
  }

  /**
   * Cleans pinyin string of diacritics
   */
  stripToneMarkers(pinyin) {
    return pinyin
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ü/g, 'v'); // standard pinyin typing convention
  }

  /**
   * Identifies the tone number (1-5) from pinyin
   */
  extractToneNumber(pinyin) {
    // Map of accents to tone numbers
    const toneMap = {
      'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
      'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
      'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
      'à': 4, 'è': 4, 'í': 4, 'ò': 4, 'ù': 4, 'ǜ': 4
    };

    for (const char of pinyin) {
      if (toneMap[char]) return toneMap[char];
    }
    // Check for explicit trailing digits (e.g. ni3)
    const match = pinyin.match(/\d/);
    if (match) return parseInt(match[0]);

    return 5; // Neutral tone fallback
  }

  /**
   * Generates a random character fallback to prevent script failures
   */
  generateRandomHanziFallback(excludeList) {
    const list = ['人', '口', '日', '月', '水', '火', '山', '田', '木', '中'];
    const filtered = list.filter(c => !excludeList.includes(c));
    return filtered[Math.floor(Math.random() * filtered.length)] || '字';
  }
}

export const challengeSelector = new ChallengeSelector();
