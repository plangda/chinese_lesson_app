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
    if (!card) return null;
    // Dynamically localize using HanPath's central helper
    const localCard = window.localizeLessonObject ? window.localizeLessonObject(card, lang) : card;
    if (!localCard) return null;

    const stage = localCard.mastery_stage || 1;
    const meaning = localCard.meaning;
    const example = localCard.exampleEn;

    switch (stage) {
      case 1:
        return this.createRecognitionChallenge(localCard, meaning, lang);
      case 2:
        return Math.random() > 0.5 
          ? this.createToneChallenge(localCard, lang)
          : this.createPinyinChallenge(localCard, lang);
      case 3:
        return this.createTranslationChallenge(localCard, meaning, lang);
      case 4:
        return this.createContextChallenge(localCard, example, lang);
      default:
        return this.createRecognitionChallenge(localCard, meaning, lang);
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
    if (!excludeCard || !excludeCard.character) return [];
    if (!Array.isArray(this.vocabPool)) return [];

    // Determine language to localize distractors
    const lang = window.state ? window.state.currentLanguage : 'en';
    const localizedPool = this.vocabPool.map(item => 
      window.localizeLessonObject ? window.localizeLessonObject(item, lang) : item
    );

    const distractors = localizedPool
      .filter(item => item && item.character !== excludeCard.character && item[fieldName])
      .map(item => item[fieldName]);
    
    // De-duplicate
    const unique = Array.from(new Set(distractors));
    
    this.shuffle(unique);
    return unique.slice(0, count);
  }

  /**
   * STAGE 1: Recognition -> Meaning is shown, pick correct Hanzi
   */
  createRecognitionChallenge(card, meaning, lang = 'en') {
    const correctOption = card.character;
    const distractors = this.getDistractors(card, 'character', 3);
    
    // Fallback if pool is empty or small
    while (distractors.length < 3) {
      distractors.push(this.generateRandomHanziFallback(distractors.concat([correctOption])));
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'RECOGNITION',
      prompt: lang === 'th' ? 'เลือกตัวอักษรจีนที่ถูกต้องสำหรับ:' : 'Select the correct Chinese character for:',
      question: meaning,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `พินอิน: ${card.pinyin}` : `Pinyin: ${card.pinyin}`
    };
  }

  /**
   * STAGE 2 (Phonology B): Pinyin Identification
   */
  createPinyinChallenge(card, lang = 'en') {
    const correctOption = card.pinyin || '';
    const distractors = this.getDistractors(card, 'pinyin', 3);
    const fallbackList = ['mǎ', 'bā', 'hǎo', 'nǐ', 'xiè'];
    while (distractors.length < 3) {
      const fb = fallbackList.find(p => p !== correctOption && !distractors.includes(p));
      distractors.push(fb || 'yě');
    }
    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'PINYIN',
      prompt: lang === 'th' ? 'เลือกพินอินที่ถูกต้องสำหรับ:' : 'Select the correct Pinyin for:',
      question: card.character,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `ความหมาย: ${card.meaning_th || card.meaning}` : `Meaning: ${card.meaning}`
    };
  }

  /**
   * STAGE 3 (Meaning): Hanzi to Translation
   */
  createTranslationChallenge(card, meaning, lang = 'en') {
    const meaningField = lang === 'th' ? 'meaning_th' : 'meaning';
    const correctOption = (card[meaningField] || meaning || card.meaning || card.meaning_en || '');
    const distractors = this.getDistractors(card, meaningField, 3);

    const fallbackMeanings = lang === 'th' 
      ? ['สวัสดี', 'ขอบคุณ', 'ลาก่อน', 'ดี', 'กิน'] 
      : ['Hello', 'Thank you', 'Goodbye', 'Good', 'Eat'];

    while (distractors.length < 3) {
      const pick = fallbackMeanings.find(m => m !== correctOption && !distractors.includes(m));
      if (pick) distractors.push(pick);
      else distractors.push(lang === 'th' ? `ตัวเลือก ${distractors.length + 1}` : `Option ${distractors.length + 1}`);
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'TRANSLATION',
      prompt: lang === 'th' ? 'เลือกความหมายที่ถูกต้องสำหรับ:' : 'Select the correct meaning for:',
      question: card.character,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `พินอิน: ${card.pinyin}` : `Pinyin: ${card.pinyin}`
    };
  }

  /**
   * STAGE 4 (Context): Cloze Sentence Fill-in-the-Blank
   */
  createContextChallenge(card, example, lang = 'en') {
    const exampleCn = card.exampleCn || card.example_cn || '';
    const correctOption = card.character || '';
    
    let questionText = exampleCn;
    if (exampleCn && exampleCn.includes(correctOption)) {
      questionText = exampleCn.replace(correctOption, '_____');
    } else if (exampleCn) {
      questionText = `${exampleCn} ( _____ )`;
    } else {
      questionText = `_____ (${card.pinyin || ''})`;
    }

    const distractors = this.getDistractors(card, 'character', 3);
    while (distractors.length < 3) {
      distractors.push(this.generateRandomHanziFallback(distractors.concat([correctOption])));
    }

    const options = this.shuffle(distractors.concat([correctOption]));

    return {
      type: 'CONTEXT',
      prompt: lang === 'th' ? 'เติมคำในช่องว่างด้วยอักษรที่ถูกต้อง:' : 'Fill in the blank with the correct character:',
      question: questionText,
      options,
      answer: correctOption,
      hint: lang === 'th' ? `พินอิน: ${card.pinyin}` : `Pinyin: ${card.pinyin}`
    };
  }

  /**
   * STAGE 2 (Phonology A): Tone Identification (Supports Multi-Character Words)
   */
  /**
   * STAGE 2 (Phonology A): Tone Identification (Supports 1, 2, 3, 4+ Character Words Dynamically)
   */
  createToneChallenge(card, lang = 'en') {
    const chars = Array.from(card.character || '');
    const toneSequence = this.extractTonesFromPinyin(card.pinyin || '', chars.length);
    const answer = toneSequence.join('-');

    return {
      type: 'TONE_ID',
      prompt: lang === 'th' ? 'เลือกเสียงวรรณยุกต์ที่ถูกต้องสำหรับแต่ละอักษร:' : 'Identify the correct tone for each character:',
      question: card.character,
      chars,
      toneSequence,
      answer,
      hint: lang === 'th' ? `ความหมาย: ${card.meaning}` : `Meaning: ${card.meaning}`
    };
  }

  /**
   * Extracts an array of tone strings matching the character count for spaced or unspaced pinyin
   */
  extractTonesFromPinyin(pinyinStr, charCount = 1) {
    if (!pinyinStr) return Array(charCount).fill('5');

    // 1. Split by space first if space-separated
    const parts = pinyinStr.trim().split(/\s+/).filter(Boolean);
    if (parts.length === charCount) {
      return parts.map(s => String(this.extractToneNumber(s)));
    }

    // 2. Parse unspaced multi-syllable pinyin using standard Pinyin syllable regex
    const SYLLABLE_REGEX = /(?:[b-df-hj-np-rt-z]|zh|ch|sh)?[aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜv]+(?:ng?|r)?/gi;
    const matches = pinyinStr.match(SYLLABLE_REGEX) || [];

    if (matches.length > 0) {
      const tones = matches.map(s => String(this.extractToneNumber(s)));
      if (tones.length === charCount) return tones;
      if (tones.length > charCount) return tones.slice(0, charCount);
      while (tones.length < charCount) tones.push('5');
      return tones;
    }

    return Array(charCount).fill('5');
  }

  /**
   * Cleans pinyin string of diacritics
   */
  stripToneMarkers(pinyin) {
    if (!pinyin) return '';
    return pinyin
      .split('|')[0]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
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
      'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4
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
