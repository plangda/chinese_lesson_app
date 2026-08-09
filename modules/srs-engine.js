/**
 * SRS Engine Module
 * Manages Spaced Repetition logic (SM-2 updates) and interleaved card queue management
 */

export class SRSEngine {
  constructor() {
    this.currentQueue = [];
    this.currentBatch = [];
    this.batchSize = 5; // Interleaved mini-batch size (5 to 8 words)
    this.activeCardIndex = 0;
  }

  /**
   * Helper to get a date string offset in BKK time zone (YYYY-MM-DD)
   * @param {number} offsetDays 
   */
  getBkkDateString(offsetDays = 0) {
    const d = new Date();
    // BKK is UTC+7
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const bkkTime = new Date(utc + (3600000 * 7));
    if (offsetDays !== 0) {
      bkkTime.setDate(bkkTime.getDate() + offsetDays);
    }
    const yyyy = bkkTime.getFullYear();
    const mm = String(bkkTime.getMonth() + 1).padStart(2, '0');
    const dd = String(bkkTime.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Calculates local SM-2 updates on a card
   * @param {Object} card 
   * @param {string} systemGrade 'PERFECT' | 'GOT_IT' | 'MISSED'
   * @returns {Object} Updated SM-2 parameters
   */
  calculateSM2(card, systemGrade) {
    let newStage = card.mastery_stage || 1;
    let newEase = card.ease_factor || 2.5;
    let newInterval = card.interval_days || 1;
    let newReps = card.repetitions || 0;
    let timesForgotten = card.times_forgotten || 0;

    if (systemGrade === 'MISSED') {
      newStage = 1;
      newInterval = 1;
      newReps = 0;
      newEase = Math.max(1.3, newEase - 0.2);
      timesForgotten += 1;
    } else if (systemGrade === 'GOT_IT') {
      newStage = Math.min(4, newStage + 1);
      newInterval = Math.max(1, Math.round(newInterval * 1.5));
      newReps += 1;
    } else { // PERFECT
      newStage = Math.min(4, newStage + 1);
      newEase = Math.min(3.2, newEase + 0.15);
      newInterval = Math.max(1, Math.round(newInterval * newEase * 1.3));
      newReps += 1;
    }

    const nextReviewDate = this.getBkkDateString(newInterval);

    return {
      mastery_stage: newStage,
      ease_factor: newEase,
      interval_days: newInterval,
      repetitions: newReps,
      next_review_date: nextReviewDate,
      times_forgotten: timesForgotten,
      xpEarned: systemGrade === 'PERFECT' ? 20 : (systemGrade === 'GOT_IT' ? 10 : 5)
    };
  }

  /**
   * Initialize a new interleaved queue for a watering session
   * @param {Array} cards 
   * @param {number} batchSize 
   */
  initSession(cards, batchSize = 5) {
    // Clone cards to avoid direct mutation
    this.currentQueue = cards.map(c => ({
      ...c,
      sessionAttempts: 0,
      sessionHints: false,
      sessionCorrect: false
    }));
    this.batchSize = batchSize;
    this.fillBatch();
    this.activeCardIndex = 0;
  }

  /**
   * Refills the active learning batch from the queue
   */
  fillBatch() {
    this.currentBatch = [];
    // Grab the first N incomplete cards from the queue
    for (const card of this.currentQueue) {
      if (!card.sessionCorrect) {
        this.currentBatch.push(card);
        if (this.currentBatch.length >= this.batchSize) break;
      }
    }
  }

  /**
   * Gets the currently active card in the batch
   * @returns {Object|null}
   */
  getActiveCard() {
    if (this.currentBatch.length === 0) return null;
    return this.currentBatch[this.activeCardIndex];
  }

  /**
   * Processes the result of a challenge question on the active card
   * @param {boolean} isCorrect 
   * @param {boolean} hintsUsed 
   * @returns {Object} { cardSolved: boolean, systemGrade: string, nextCardAvailable: boolean }
   */
  recordResult(isCorrect, hintsUsed) {
    const card = this.getActiveCard();
    if (!card) return { cardSolved: false, nextCardAvailable: false };

    card.sessionAttempts += 1;
    if (hintsUsed) card.sessionHints = true;

    if (isCorrect) {
      card.sessionCorrect = true;
      
      // Calculate grade
      let systemGrade = 'PERFECT';
      if (card.sessionAttempts > 1 || card.sessionHints) {
        systemGrade = 'GOT_IT';
      }

      // Remove from active batch
      this.currentBatch.splice(this.activeCardIndex, 1);
      
      // Refill the batch to maintain batch size
      this.fillBatch();
      
      // Adjust pointer index
      if (this.currentBatch.length > 0) {
        this.activeCardIndex = this.activeCardIndex % this.currentBatch.length;
      }

      return {
        cardSolved: true,
        systemGrade,
        nextCardAvailable: this.currentBatch.length > 0
      };
    } else {
      // Wrong answer - keep in queue, cycle pointer to the next card in batch
      this.activeCardIndex = (this.activeCardIndex + 1) % this.currentBatch.length;
      
      return {
        cardSolved: false,
        systemGrade: 'MISSED',
        nextCardAvailable: true
      };
    }
  }

  /**
   * Check if the entire watering session is complete
   * @returns {boolean}
   */
  isSessionComplete() {
    return this.currentQueue.every(c => c.sessionCorrect);
  }

  /**
   * Get progress index fraction (e.g. "3 / 10")
   * @returns {string}
   */
  getSessionProgressString() {
    const completed = this.currentQueue.filter(c => c.sessionCorrect).length;
    return `${completed} of ${this.currentQueue.length}`;
  }
}

export const srsEngine = new SRSEngine();
