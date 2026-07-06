/**
 * HanPath - Core Application Engine
 * Manages state, diagnostic test, 1-hour study countdown,
 * Web Speech API text-to-speech, interactive exercises, and progress tracking.
 */

// Application State
const state = {
  userLevel: null,          // 'hsk1', 'hsk2', 'hsk3'
  completedLessons: [],     // Array of completed lesson IDs (e.g., ['hsk1_day1'])
  streakCount: 0,
  lastStudyDate: null,      // 'YYYY-MM-DD'
  score: 0,
  timeSpentMinutes: 0,
  
  // Navigation / Routing
  currentView: "welcome-view",
  currentLesson: null,
  currentPane: "vocab-pane",
  
  // Timer variables (60-minute lesson blocks = 3600 seconds)
  timerSeconds: 3600,
  timerInterval: null,
  timerPaused: false,
  
  // Vocabulary State
  vocabIndex: 0,
  cardFlipped: false,
  
  // Grammar State
  grammarPracticeAnswers: {}, // Maps index to user-selected word array
  
  // Dialogue State
  pinyinVisible: true,
  
  // Lesson Quiz State
  quizIndex: 0,
  quizScore: 0,
  quizAnswers: [],
  
  // Diagnostic Pre-Test State
  pretestIndex: 0,
  pretestScore: 0,
  pretestAnswers: [],
  
  // Daily reminder configurations
  reminderTime: "09:00",
  notificationGranted: false
};

// CSS Class mapping for timeline active/completed states
const timelineStages = ["vocab-pane", "grammar-pane", "dialogue-pane", "quiz-pane"];

// Speech Synthesis setup
let speechVoice = null;
function loadSpeechVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  const voices = speechSynthesis.getVoices();
  // Try to find a Chinese voice (Mandarin)
  speechVoice = voices.find(voice => voice.lang.includes('zh-CN') || voice.lang.includes('zh-')) || null;
}
if (typeof speechSynthesis !== 'undefined') {
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadSpeechVoices;
  }
  loadSpeechVoices();
}

/**
 * Text-to-Speech Helper
 * @param {string} text - Chinese text to speak
 */
function speakText(text) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel(); // Stop any active speech
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85; // Slightly slower for language learners
  
  if (speechVoice) {
    utterance.voice = speechVoice;
  }
  speechSynthesis.speak(utterance);
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  loadProgress();
  setupEventListeners();
  updateHeaderControls();
  
  // Switch to the appropriate starting view
  if (state.userLevel) {
    switchView("dashboard-view");
  } else {
    switchView("welcome-view");
  }
});

// Load progress from LocalStorage and sync with server
function loadProgress() {
  const saved = localStorage.getItem("hanpath_student_data");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      applyProgressState(parsed);
    } catch (e) {
      console.error("Error loading saved student progress from localStorage", e);
    }
  }
  
  // Fetch from server to sync
  fetch("/api/progress")
    .then(response => {
      if (response.ok) return response.json();
      throw new Error("Server response not ok");
    })
    .then(serverData => {
      if (serverData && Object.keys(serverData).length > 0) {
        applyProgressState(serverData);
        // Save back to localStorage to keep in sync
        localStorage.setItem("hanpath_student_data", JSON.stringify(serverData));
        updateHeaderControls();
        if (state.currentView === "dashboard-view") {
          renderDashboard();
        }
      }
    })
    .catch(err => {
      console.log("Could not sync with server, using local data:", err.message);
    });

  // Check notification permission status
  if (typeof Notification !== 'undefined') {
    state.notificationGranted = Notification.permission === "granted";
  }
}

function applyProgressState(data) {
  state.userLevel = data.userLevel || null;
  state.completedLessons = data.completedLessons || [];
  state.streakCount = data.streakCount || 0;
  state.lastStudyDate = data.lastStudyDate || null;
  state.score = data.score || 0;
  state.timeSpentMinutes = data.timeSpentMinutes || 0;
  state.reminderTime = data.reminderTime || "09:00";
  
  // Sync the reminder UI
  const timeInput = document.getElementById("reminder-time-input");
  if (timeInput && state.reminderTime) {
    timeInput.value = state.reminderTime;
  }
}

// Save progress to LocalStorage and Server
function saveProgress() {
  const dataToSave = {
    userLevel: state.userLevel,
    completedLessons: state.completedLessons,
    streakCount: state.streakCount,
    lastStudyDate: state.lastStudyDate,
    score: state.score,
    timeSpentMinutes: state.timeSpentMinutes,
    reminderTime: state.reminderTime
  };
  localStorage.setItem("hanpath_student_data", JSON.stringify(dataToSave));
  updateHeaderControls();
  
  // Send to server
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataToSave)
  }).catch(err => {
    console.error("Failed to sync progress with server:", err);
  });
}

// Update Top Bar & Badges
function updateHeaderControls() {
  // Level badge
  const levelBadge = document.getElementById("user-level-badge");
  if (levelBadge) {
    if (state.userLevel) {
      levelBadge.style.display = "block";
      levelBadge.textContent = state.userLevel.toUpperCase();
      levelBadge.className = `tag tag-${state.userLevel}`;
    } else {
      levelBadge.style.display = "none";
    }
  }
  
  // Streak counter
  const streakCountVal = document.getElementById("streak-count-val");
  if (streakCountVal) {
    streakCountVal.textContent = state.streakCount;
  }
  
  // Score display
  const scoreVal = document.getElementById("score-val");
  if (scoreVal) {
    scoreVal.textContent = state.score;
  }
}

// Centralized View Router
function switchView(viewId) {
  state.currentView = viewId;
  
  // Hide all sections
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });
  
  // Show target section
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
  }
  
  // Trigger sub-renderers if needed
  if (viewId === "dashboard-view") {
    renderDashboard();
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Pre-test triggers
  document.getElementById("start-pretest-btn").addEventListener("click", () => {
    switchView("pretest-view");
    initPretest();
  });
  
  document.getElementById("begin-test-now-btn").addEventListener("click", () => {
    document.getElementById("pretest-intro-screen").style.display = "none";
    document.getElementById("pretest-quiz-screen").style.display = "block";
    loadPretestQuestion();
  });
  
  document.getElementById("pretest-next-btn").addEventListener("click", nextPretestQuestion);
  document.getElementById("claim-placement-btn").addEventListener("click", () => {
    switchView("dashboard-view");
  });
  
  // Manual level buttons
  document.querySelectorAll(".manual-level-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const level = e.target.getAttribute("data-level");
      state.userLevel = level;
      saveProgress();
      switchView("dashboard-view");
    });
  });
  
  // Reminder configurator
  document.getElementById("set-reminder-btn").addEventListener("click", setupDailyReminders);
  
  // Settings level dropdown
  const selectLevel = document.getElementById("change-level-select");
  if (selectLevel) {
    selectLevel.addEventListener("change", (e) => {
      state.userLevel = e.target.value;
      saveProgress();
      renderDashboard();
    });
  }
  
  // Reset Progress trigger
  document.getElementById("reset-progress-btn").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset all your progress, streak, and level placement? This cannot be undone.")) {
      localStorage.removeItem("hanpath_student_data");
      state.userLevel = null;
      state.completedLessons = [];
      state.streakCount = 0;
      state.lastStudyDate = null;
      state.score = 0;
      state.timeSpentMinutes = 0;
      saveProgress();
      location.reload();
    }
  });
  
  // Timer buttons
  document.getElementById("timer-pause-btn").addEventListener("click", toggleTimer);
  
  // Lesson pane navigations (Back/Next/Timeline Steps)
  document.getElementById("pane-back-btn").addEventListener("click", paneGoBack);
  document.getElementById("pane-next-btn").addEventListener("click", paneGoNext);
  
  document.querySelectorAll(".timeline-step").forEach((step, idx) => {
    step.addEventListener("click", () => {
      // Allow navigation to completed sections, or the current section
      const targetPane = step.getAttribute("data-pane");
      switchLessonPane(targetPane);
    });
  });
  
  // Vocab interactive flashcard flips
  const flashcard = document.getElementById("vocab-flashcard");
  flashcard.addEventListener("click", () => {
    flashcard.classList.toggle("flipped");
    state.cardFlipped = flashcard.classList.contains("flipped");
  });
  
  // Vocab audio buttons
  document.getElementById("vocab-speak-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const word = window.CHINESE_LESSONS.lessons[state.userLevel][state.currentLessonIndex].vocab[state.vocabIndex];
    speakText(word.character);
  });
  
  document.getElementById("vocab-ex-speak-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const word = window.CHINESE_LESSONS.lessons[state.userLevel][state.currentLessonIndex].vocab[state.vocabIndex];
    speakText(word.exampleCn);
  });
  
  document.getElementById("vocab-prev-btn").addEventListener("click", vocabPrev);
  document.getElementById("vocab-next-btn").addEventListener("click", vocabNext);
  
  // Dialogue play all
  document.getElementById("dialogue-play-all-btn").addEventListener("click", playFullDialogue);
  
  // Dialogue Pinyin toggler
  document.getElementById("pinyin-visibility-toggle").addEventListener("click", () => {
    state.pinyinVisible = !state.pinyinVisible;
    const container = document.getElementById("dialogue-bubbles-container");
    if (state.pinyinVisible) {
      container.classList.remove("pinyin-toggle-hide");
    } else {
      container.classList.add("pinyin-toggle-hide");
    }
  });
  
  // Lesson quiz button
  document.getElementById("lesson-quiz-next-btn").addEventListener("click", nextLessonQuizQuestion);
  
  // Return from congrats to dashboard
  document.getElementById("finish-to-dashboard-btn").addEventListener("click", () => {
    switchView("dashboard-view");
  });

  // Writing mode switches
  document.getElementById("mode-animate-btn").addEventListener("click", () => switchWritingMode("animate"));
  document.getElementById("mode-trace-btn").addEventListener("click", () => switchWritingMode("trace"));
  document.getElementById("mode-freewrite-btn").addEventListener("click", () => switchWritingMode("freewrite"));

  // Writing controls
  document.getElementById("btn-writing-play").addEventListener("click", () => {
    if (writerInstance && currentWritingMode === "animate") {
      writerInstance.animateCharacter();
    }
  });

  document.getElementById("btn-writing-clear").addEventListener("click", () => {
    if (currentWritingMode === "freewrite") {
      clearFreeWriteCanvas();
    }
  });

  document.getElementById("btn-writing-reset").addEventListener("click", () => {
    if (writerInstance) {
      if (currentWritingMode === "animate") {
        writerInstance.animateCharacter();
      } else if (currentWritingMode === "trace") {
        writerInstance.quiz();
      }
    }
  });

  // Initialize free-write canvas drawing logic
  initFreeWriteCanvas();
}

// ----------------------------------------------------
// DIAGNOSTIC PRE-TEST CORE LOGIC
// ----------------------------------------------------
function initPretest() {
  state.pretestIndex = 0;
  state.pretestScore = 0;
  state.pretestAnswers = [];
  
  document.getElementById("pretest-intro-screen").style.display = "block";
  document.getElementById("pretest-quiz-screen").style.display = "none";
  document.getElementById("pretest-result-screen").style.display = "none";
}

function loadPretestQuestion() {
  const question = window.CHINESE_LESSONS.preTestQuestions[state.pretestIndex];
  
  // Update progress UI
  document.getElementById("pretest-question-number").textContent = `Question ${state.pretestIndex + 1} of 12`;
  document.getElementById("pretest-question-level").textContent = `HSK level benchmark: Level ${question.level}`;
  document.getElementById("pretest-progress-fill").style.width = `${((state.pretestIndex) / 12) * 100}%`;
  
  // Display Question
  const qText = document.getElementById("pretest-question-text");
  qText.textContent = question.question;
  
  // If it's a listening type question, add audio speaker trigger
  if (question.type === "listening") {
    qText.innerHTML = `👂 Listen to the word: <button id="pretest-audio-trigger-btn" class="audio-btn" style="width:36px; height:36px; font-size:0.85rem;">🔊</button><br><span style="font-size:0.9rem; color:var(--text-muted); font-weight: normal; margin-top:0.5rem; display:block;">Tap the speaker to hear the word pronounced before making your choice.</span>`;
    
    // Determine word to play based on answer options
    let testWord = "";
    if (question.id === "q7") testWord = "准备"; // HSK 2: To prepare
    
    document.getElementById("pretest-audio-trigger-btn").addEventListener("click", () => speakText(testWord));
    // Proactively speak once
    setTimeout(() => speakText(testWord), 500);
  }
  
  // Clear explanation and hide next button
  document.getElementById("pretest-explanation-box").style.display = "none";
  document.getElementById("pretest-next-btn").style.display = "none";
  
  // Populate options
  const optionsBox = document.getElementById("pretest-options-container");
  optionsBox.innerHTML = "";
  
  question.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectPretestAnswer(btn, opt));
    optionsBox.appendChild(btn);
  });
}

function selectPretestAnswer(button, selectedVal) {
  const question = window.CHINESE_LESSONS.preTestQuestions[state.pretestIndex];
  const optionsList = document.getElementById("pretest-options-container").querySelectorAll(".quiz-option");
  
  // Disable options so user cannot change answer
  optionsList.forEach(optBtn => {
    optBtn.disabled = true;
    if (optBtn.textContent === question.answer) {
      optBtn.classList.add("correct");
    }
  });
  
  const isCorrect = selectedVal === question.answer;
  if (isCorrect) {
    state.pretestScore++;
    button.classList.add("correct");
  } else {
    button.classList.add("incorrect");
  }
  
  state.pretestAnswers.push({ questionId: question.id, correct: isCorrect });
  
  // Show explanation
  const expBox = document.getElementById("pretest-explanation-box");
  const expText = document.getElementById("pretest-explanation-text");
  expText.textContent = question.explanation;
  expBox.style.display = "block";
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").style.color = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").textContent = isCorrect ? "✓ Correct!" : "✗ Incorrect";
  
  // Show Next button
  document.getElementById("pretest-next-btn").style.display = "inline-block";
}

function nextPretestQuestion() {
  state.pretestIndex++;
  if (state.pretestIndex < 12) {
    loadPretestQuestion();
  } else {
    document.getElementById("pretest-progress-fill").style.width = "100%";
    finishPretest();
  }
}

function finishPretest() {
  document.getElementById("pretest-quiz-screen").style.display = "none";
  document.getElementById("pretest-result-screen").style.display = "block";
  
  document.getElementById("pretest-score-display").textContent = `${state.pretestScore} / 12`;
  
  // Determine placement based on thresholds
  let finalLevel = "hsk1";
  let levelName = "HSK 1 (Beginner)";
  let levelDesc = "This level is designed for complete beginners. It focuses on essential words (like greetings, numbers, family members), simple verbs, and foundational sentence templates (questions with 吗).";
  
  if (state.pretestScore >= 5 && state.pretestScore <= 8) {
    finalLevel = "hsk2";
    levelName = "HSK 2 (Elementary)";
    levelDesc = "Perfect for learners who know basic vocabulary and want to structure their sentences. You'll learn to handle time keywords, transport modes, weather details, hobby terms, and bargain items.";
  } else if (state.pretestScore >= 9) {
    finalLevel = "hsk3";
    levelName = "HSK 3 (Intermediate)";
    levelDesc = "Great for intermediate learners ready for advanced sentence connectives. Focuses on passive markers (被), concession arguments (虽然...但是...), duration expressions, and workplace contexts.";
  }
  
  document.getElementById("recommended-level-name").textContent = levelName;
  document.getElementById("recommended-level-desc").textContent = levelDesc;
  
  // Save result
  state.userLevel = finalLevel;
  state.score += (state.pretestScore * 10); // 10 pts per correct answer
  saveProgress();
  
  // Update change level dropdown in Settings
  const selectLevel = document.getElementById("change-level-select");
  if (selectLevel) selectLevel.value = finalLevel;
}

// ----------------------------------------------------
// STUDENT DASHBOARD CURRICULUM
// ----------------------------------------------------
function renderDashboard() {
  // Sync title and levels
  const levelTag = document.getElementById("dashboard-level-badge");
  let levelString = "HSK 1 (Beginner)";
  if (state.userLevel === "hsk2") levelString = "HSK 2 (Elementary)";
  if (state.userLevel === "hsk3") levelString = "HSK 3 (Intermediate)";
  levelTag.textContent = levelString;
  levelTag.className = `student-level-tag tag-${state.userLevel}`;
  
  // Sync stats numbers
  document.getElementById("stat-streak").textContent = state.streakCount;
  
  const hskLessons = window.CHINESE_LESSONS.lessons[state.userLevel] || [];
  const completedCount = hskLessons.filter(l => state.completedLessons.includes(l.id)).length;
  document.getElementById("stat-lessons-completed").textContent = `${completedCount} / ${hskLessons.length}`;
  
  // Approximate total hours study
  const totalHours = Math.round(completedCount * 1.0);
  document.getElementById("stat-time-spent").textContent = `${totalHours}h`;
  
  // Populate the lesson list rows
  const listContainer = document.getElementById("dashboard-lessons-container");
  listContainer.innerHTML = "";
  
  hskLessons.forEach((lesson, index) => {
    const isCompleted = state.completedLessons.includes(lesson.id);
    
    const row = document.createElement("div");
    row.className = `glass-panel glass-panel-hover lesson-row ${isCompleted ? 'completed' : ''}`;
    
    // Auto flag first incomplete lesson as active
    const isNextAvailable = index === 0 || state.completedLessons.includes(hskLessons[index - 1].id);
    if (!isCompleted && isNextAvailable) {
      row.classList.add("active-lesson");
    }
    
    row.innerHTML = `
      <div class="lesson-row-info">
        <h3>${lesson.title}</h3>
        <span>🎯 Target: Vocab, Grammar, Reading, Review • ⏱️ 1-Hour Session</span>
      </div>
      <div class="lesson-status-icon">
        ${isCompleted ? "✓" : "▶"}
      </div>
    `;
    
    row.addEventListener("click", () => {
      launchLesson(lesson, index);
    });
    listContainer.appendChild(row);
  });
}

// ----------------------------------------------------
// 1-HOUR STUDY TIMER AND LESSON INTERFACE
// ----------------------------------------------------
function launchLesson(lesson, index) {
  state.currentLesson = lesson;
  state.currentLessonIndex = index;
  state.timerSeconds = 3600; // Reset to 60 minutes
  state.timerPaused = false;
  
  // Level badge on top
  const levelBadge = document.getElementById("lesson-level-badge");
  levelBadge.textContent = lesson.level;
  levelBadge.className = `tag tag-${state.userLevel}`;
  
  // Set title
  document.getElementById("lesson-title-display").textContent = lesson.title;
  
  // Clean other states
  state.vocabIndex = 0;
  state.cardFlipped = false;
  state.grammarPracticeAnswers = {};
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswers = [];
  
  // UI setups
  switchView("lesson-view");
  switchLessonPane("vocab-pane");
  
  // Run 1-hour study timer
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimerTick, 1000);
  updateTimerUI();
  
  // Trigger speech synthesis warning occasionally
  speakText(`开始学习：${lesson.title.split(":")[1]}`);
}

function updateTimerTick() {
  if (state.timerPaused) return;
  
  if (state.timerSeconds > 0) {
    state.timerSeconds--;
    updateTimerUI();
    
    // Milestones warning check:
    // Suggest 15 mins per stage. Let's send notifications/warnings when stages should transition
    // Stage 1 (Vocab): 0 - 15 mins (timer: 3600 to 2700)
    // Stage 2 (Grammar): 15 - 30 mins (timer: 2700 to 1800)
    // Stage 3 (Dialogue): 30 - 45 mins (timer: 1800 to 900)
    // Stage 4 (Quiz): 45 - 60 mins (timer: 900 to 0)
    
    if (state.timerSeconds === 2700) {
      showCurriculumMilestoneNotification("Vocab time is up!", "Time to proceed to Stage 2: Grammar explanations and builders.");
      speakText("词汇学习时间到，请进入语法学习。");
    } else if (state.timerSeconds === 1800) {
      showCurriculumMilestoneNotification("Grammar time is up!", "Time to proceed to Stage 3: Conversational reading and listening dialogues.");
      speakText("语法学习时间到，请进入对话阅读。");
    } else if (state.timerSeconds === 900) {
      showCurriculumMilestoneNotification("Dialogue reading is up!", "Time to proceed to Stage 4: Review quiz to wrap up your 1-hour session.");
      speakText("对话学习时间到，请进入单元复习测试。");
    }
  } else {
    // 1 hour finished!
    clearInterval(state.timerInterval);
    showCurriculumMilestoneNotification("1 Hour Complete!", "Congratulations, you hit your full 1-hour study goal! Finish your quiz to save progress.");
    speakText("一小时学习目标已达成，祝贺你！");
  }
}

function updateTimerUI() {
  const display = document.getElementById("lesson-timer-display");
  const mins = Math.floor(state.timerSeconds / 60);
  const secs = state.timerSeconds % 60;
  
  const minStr = mins < 10 ? `0${mins}` : mins;
  const secStr = secs < 10 ? `0${secs}` : secs;
  display.textContent = `${minStr}:${secStr}`;
}

function toggleTimer() {
  state.timerPaused = !state.timerPaused;
  const pauseIcon = document.getElementById("timer-pause-icon");
  if (state.timerPaused) {
    pauseIcon.textContent = "▶️";
    clearInterval(state.timerInterval);
  } else {
    pauseIcon.textContent = "⏸️";
    state.timerInterval = setInterval(updateTimerTick, 1000);
  }
}

// Stage Panes Switched
function switchLessonPane(paneId) {
  state.currentPane = paneId;
  
  // Hide all panes
  document.querySelectorAll(".lesson-pane-content").forEach(p => {
    p.style.display = "none";
  });
  
  // Show active pane
  document.getElementById(paneId).style.display = "block";
  
  // Update timeline CSS indicators
  document.querySelectorAll(".timeline-step").forEach(step => {
    step.classList.remove("active");
    const stepPane = step.getAttribute("data-pane");
    
    // Complete indicator
    const currentIdx = timelineStages.indexOf(paneId);
    const stepIdx = timelineStages.indexOf(stepPane);
    
    if (stepIdx < currentIdx) {
      step.classList.add("completed");
    } else {
      step.classList.remove("completed");
    }
    
    if (stepPane === paneId) {
      step.classList.add("active");
    }
  });
  
  // Initialize content specific to that pane
  if (paneId === "vocab-pane") {
    loadVocabWord();
  } else if (paneId === "grammar-pane") {
    loadGrammarSection();
  } else if (paneId === "dialogue-pane") {
    loadDialogueSection();
  } else if (paneId === "quiz-pane") {
    loadQuizSection();
  }
  
  // Adjust footer buttons based on pane
  const backBtn = document.getElementById("pane-back-btn");
  const nextBtn = document.getElementById("pane-next-btn");
  
  if (paneId === "vocab-pane") {
    backBtn.style.visibility = "hidden";
    nextBtn.textContent = "Proceed to Grammar ➔";
    nextBtn.style.background = "var(--primary)";
    nextBtn.style.color = "var(--text-primary)";
    nextBtn.style.boxShadow = "0 4px 14px var(--primary-glow)";
  } else {
    backBtn.style.visibility = "visible";
    
    if (paneId === "grammar-pane") {
      nextBtn.textContent = "Proceed to Dialogue ➔";
      nextBtn.style.background = "var(--primary)";
      nextBtn.style.color = "var(--text-primary)";
      nextBtn.style.boxShadow = "0 4px 14px var(--primary-glow)";
    } else if (paneId === "dialogue-pane") {
      nextBtn.textContent = "Take Review Quiz ➔";
      nextBtn.style.background = "var(--primary)";
      nextBtn.style.color = "var(--text-primary)";
      nextBtn.style.boxShadow = "0 4px 14px var(--primary-glow)";
    } else if (paneId === "quiz-pane") {
      nextBtn.textContent = "Finish 1-Hour Lesson ✓";
      nextBtn.style.background = "var(--success)";
      nextBtn.style.color = "var(--bg-darker)";
      nextBtn.style.boxShadow = "0 4px 14px rgba(0, 245, 212, 0.35)";
    }
  }
}

function paneGoBack() {
  const currentIdx = timelineStages.indexOf(state.currentPane);
  if (currentIdx > 0) {
    switchLessonPane(timelineStages[currentIdx - 1]);
  }
}

function paneGoNext() {
  const currentIdx = timelineStages.indexOf(state.currentPane);
  if (currentIdx < timelineStages.length - 1) {
    switchLessonPane(timelineStages[currentIdx + 1]);
  } else {
    // Finish lesson entirely
    finishLessonSession();
  }
}

// ----------------------------------------------------
// STAGE 1: VOCABULARY CARD DRAWING
// ----------------------------------------------------
let writerInstance = null;
let currentWritingMode = "animate"; // 'animate', 'trace', 'freewrite'
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let canvasCtx = null;

function loadVocabWord() {
  const vocabList = state.currentLesson.vocab;
  const word = vocabList[state.vocabIndex];
  
  // Card UI resets
  const flashcard = document.getElementById("vocab-flashcard");
  flashcard.classList.remove("flipped");
  state.cardFlipped = false;
  
  document.getElementById("vocab-char").textContent = word.character;
  document.getElementById("vocab-meaning").textContent = word.meaning;
  document.getElementById("vocab-pinyin").textContent = word.pinyin;
  
  // Details pane sync
  document.getElementById("vocab-detail-pinyin").textContent = word.pinyin;
  document.getElementById("vocab-ex-cn").textContent = word.exampleCn;
  document.getElementById("vocab-ex-py").textContent = word.examplePy;
  document.getElementById("vocab-ex-en").textContent = word.exampleEn;
  
  // Indicator
  document.getElementById("vocab-index-indicator").textContent = `Word ${state.vocabIndex + 1} of ${vocabList.length}`;
  
  // Deconstruction
  const deconstructText = document.getElementById("vocab-deconstruct-text");
  if (deconstructText) {
    deconstructText.textContent = word.deconstruct || "No deconstruction data available.";
  }

  // Initialize or update writing mode for the current character
  if (currentWritingMode === "freewrite") {
    clearFreeWriteCanvas();
  } else {
    initHanziWriter(word.character);
  }
}

function vocabPrev() {
  if (state.vocabIndex > 0) {
    state.vocabIndex--;
    loadVocabWord();
  }
}

function vocabNext() {
  const vocabList = state.currentLesson.vocab;
  if (state.vocabIndex < vocabList.length - 1) {
    state.vocabIndex++;
    loadVocabWord();
  }
}

// Hanzi Writer & Drawing Canvas Handlers
function initHanziWriter(character) {
  const target = document.getElementById("hanzi-writer-target");
  if (!target) return;
  target.innerHTML = ""; // Clear existing SVG
  
  if (typeof HanziWriter === "undefined") {
    target.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:2rem;text-align:center;">HanziWriter not loaded</div>`;
    return;
  }

  writerInstance = HanziWriter.create("hanzi-writer-target", character, {
    width: 220,
    height: 220,
    padding: 10,
    showOutline: true,
    strokeColor: "#ff3366",      // Rose Red (--primary)
    outlineColor: "rgba(255, 255, 255, 0.08)",
    drawingColor: "#00f5d4",     // Teal (--success)
    drawingWidth: 4,
    strokeAnimationSpeed: 1.5,
    delayBetweenStrokes: 400
  });

  if (currentWritingMode === "animate") {
    setTimeout(() => {
      if (writerInstance && currentWritingMode === "animate") {
        writerInstance.animateCharacter();
      }
    }, 450);
  } else if (currentWritingMode === "trace") {
    setTimeout(() => {
      if (writerInstance && currentWritingMode === "trace") {
        writerInstance.quiz();
      }
    }, 450);
  }
}

function switchWritingMode(mode) {
  currentWritingMode = mode;
  
  document.querySelectorAll(".writing-modes-header .btn-mode").forEach(btn => {
    if (btn.getAttribute("data-mode") === mode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const writerTarget = document.getElementById("hanzi-writer-target");
  const canvas = document.getElementById("free-write-canvas");
  const playBtn = document.getElementById("btn-writing-play");
  const clearBtn = document.getElementById("btn-writing-clear");
  const resetBtn = document.getElementById("btn-writing-reset");

  if (mode === "freewrite") {
    writerTarget.style.display = "none";
    canvas.style.display = "block";
    
    playBtn.style.display = "none";
    clearBtn.style.display = "inline-flex";
    resetBtn.style.display = "none";
    
    clearFreeWriteCanvas();
  } else {
    writerTarget.style.display = "flex";
    canvas.style.display = "none";
    
    playBtn.style.display = "inline-flex";
    clearBtn.style.display = "none";
    resetBtn.style.display = "inline-flex";

    const vocabList = state.currentLesson.vocab;
    const word = vocabList[state.vocabIndex];
    initHanziWriter(word.character);
  }
}

function initFreeWriteCanvas() {
  const canvas = document.getElementById("free-write-canvas");
  if (!canvas) return;
  canvasCtx = canvas.getContext("2d");
  
  canvas.width = 260;
  canvas.height = 260;
  
  canvasCtx.strokeStyle = "#00f5d4"; // Teal drawing color
  canvasCtx.lineWidth = 4;
  canvasCtx.lineCap = "round";
  canvasCtx.lineJoin = "round";

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseleave", stopDrawing);

  canvas.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", (e) => {
    const mouseEvent = new MouseEvent("mouseup", {});
    canvas.dispatchEvent(mouseEvent);
  });
}

function startDrawing(e) {
  isDrawing = true;
  const rect = e.target.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
}

function draw(e) {
  if (!isDrawing) return;
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  canvasCtx.beginPath();
  canvasCtx.moveTo(lastX, lastY);
  canvasCtx.lineTo(x, y);
  canvasCtx.stroke();
  
  lastX = x;
  lastY = y;
}

function stopDrawing() {
  isDrawing = false;
}

function clearFreeWriteCanvas() {
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, 260, 260);
  }
}

// ----------------------------------------------------
// STAGE 2: GRAMMAR BUILDER GENERATOR
// ----------------------------------------------------
function loadGrammarSection() {
  const container = document.getElementById("grammar-topics-container");
  container.innerHTML = "";
  
  state.currentLesson.grammar.forEach((gm, idx) => {
    const section = document.createElement("div");
    section.className = "grammar-block";
    
    // Build Examples html string
    let exHtml = "";
    gm.examples.forEach(ex => {
      exHtml += `
        <div class="grammar-example-item">
          <div>
            <div class="example-cn" style="font-size:1.15rem;">${ex.cn}</div>
            <div class="example-py" style="font-size:0.85rem;">${ex.py}</div>
            <div class="example-en" style="font-size:0.85rem;">${ex.en}</div>
          </div>
          <button class="audio-btn" style="width: 32px; height: 32px; font-size: 0.8rem;" onclick="speakText('${ex.cn}')">🔊</button>
        </div>
      `;
    });
    
    // Sentence Reordering construction
    section.innerHTML = `
      <div class="grammar-header">${gm.title}</div>
      <div class="grammar-explanation">${gm.explanation}</div>
      <div style="font-weight: 600; margin-bottom: 0.75rem; font-size: 0.9rem; color: var(--text-secondary); text-transform:uppercase;">Structures in action:</div>
      <div class="grammar-examples">
        ${exHtml}
      </div>
      
      <!-- Interactive Sentence Builder -->
      <div class="reorder-container">
        <div class="reorder-prompt">🧩 Reordering Challenge: ${gm.practice.prompt}</div>
        <div class="reorder-workspace" id="workspace-${idx}">
          <!-- Selected words appear here -->
        </div>
        <div class="word-chips-pool" id="pool-${idx}">
          <!-- Shuffled chips pool -->
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-secondary" onclick="resetReorderChallenge(${idx})">Reset</button>
          <button class="btn btn-primary" style="padding:0.5rem 1rem;" onclick="checkReorderChallenge(${idx})">Check Answer</button>
        </div>
        <div class="reorder-result" id="result-${idx}"></div>
      </div>
    `;
    
    container.appendChild(section);
    initReorderChallenge(idx, gm.practice);
  });
}

function initReorderChallenge(index, practiceData) {
  // Store user answer state
  state.grammarPracticeAnswers[index] = [];
  
  const poolContainer = document.getElementById(`pool-${index}`);
  const workspace = document.getElementById(`workspace-${index}`);
  
  workspace.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">Click words below to construct the sentence...</span>`;
  poolContainer.innerHTML = "";
  
  // Shuffle words pool
  const shuffledWords = [...practiceData.words].sort(() => Math.random() - 0.5);
  
  shuffledWords.forEach((word, wordIdx) => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
    chip.textContent = word;
    chip.id = `chip-${index}-${wordIdx}`;
    
    chip.addEventListener("click", () => {
      if (!chip.classList.contains("selected")) {
        chip.classList.add("selected");
        addWordToWorkspace(index, word, chip.id);
      }
    });
    
    poolContainer.appendChild(chip);
  });
}

function addWordToWorkspace(index, word, chipId) {
  const workspace = document.getElementById(`workspace-${index}`);
  
  // Clean default text
  if (state.grammarPracticeAnswers[index].length === 0) {
    workspace.innerHTML = "";
  }
  
  state.grammarPracticeAnswers[index].push({ word, chipId });
  
  const item = document.createElement("div");
  item.className = "word-chip";
  item.textContent = word;
  item.style.borderColor = "var(--primary)";
  item.style.background = "var(--primary-glow)";
  
  // Click workspace item to remove it
  item.addEventListener("click", () => {
    // Remove from array
    state.grammarPracticeAnswers[index] = state.grammarPracticeAnswers[index].filter(x => x.chipId !== chipId);
    
    // Enable pool chip back
    const poolChip = document.getElementById(chipId);
    if (poolChip) poolChip.classList.remove("selected");
    
    // Redraw workspace
    redrawWorkspace(index);
  });
  
  workspace.appendChild(item);
}

function redrawWorkspace(index) {
  const workspace = document.getElementById(`workspace-${index}`);
  workspace.innerHTML = "";
  
  if (state.grammarPracticeAnswers[index].length === 0) {
    workspace.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">Click words below to construct the sentence...</span>`;
    return;
  }
  
  state.grammarPracticeAnswers[index].forEach(x => {
    const item = document.createElement("div");
    item.className = "word-chip";
    item.textContent = x.word;
    item.style.borderColor = "var(--primary)";
    item.style.background = "var(--primary-glow)";
    
    item.addEventListener("click", () => {
      state.grammarPracticeAnswers[index] = state.grammarPracticeAnswers[index].filter(y => y.chipId !== x.chipId);
      const poolChip = document.getElementById(x.chipId);
      if (poolChip) poolChip.classList.remove("selected");
      redrawWorkspace(index);
    });
    
    workspace.appendChild(item);
  });
}

window.resetReorderChallenge = function(index) {
  const gm = state.currentLesson.grammar[index];
  initReorderChallenge(index, gm.practice);
  const resultDiv = document.getElementById(`result-${index}`);
  resultDiv.textContent = "";
  resultDiv.className = "reorder-result";
};

window.checkReorderChallenge = function(index) {
  const gm = state.currentLesson.grammar[index];
  const userArr = state.grammarPracticeAnswers[index].map(x => x.word);
  const correctArr = gm.practice.answer;
  
  const resultDiv = document.getElementById(`result-${index}`);
  
  if (userArr.length === 0) {
    resultDiv.textContent = "Please select some words first!";
    resultDiv.className = "reorder-result incorrect";
    return;
  }
  
  const isCorrect = userArr.length === correctArr.length && userArr.every((v, i) => v === correctArr[i]);
  
  if (isCorrect) {
    resultDiv.textContent = "✓ Excellent! Sentence matches perfectly.";
    resultDiv.className = "reorder-result correct";
    speakText(userArr.join(""));
  } else {
    resultDiv.textContent = `✗ Incorrect. Try rearranging. Hint: Correct character order starts with "${correctArr[0]}".`;
    resultDiv.className = "reorder-result incorrect";
  }
};

// ----------------------------------------------------
// STAGE 3: CONVERSATIONAL DIALOGUE
// ----------------------------------------------------
function loadDialogueSection() {
  const dl = state.currentLesson.dialogue;
  
  document.getElementById("dialogue-title-lbl").textContent = dl.title;
  
  const container = document.getElementById("dialogue-bubbles-container");
  container.innerHTML = "";
  
  dl.lines.forEach((line, idx) => {
    const bubble = document.createElement("div");
    bubble.className = "dialogue-bubble";
    
    bubble.innerHTML = `
      <div class="dialogue-speaker">${line.speaker}:</div>
      <div class="dialogue-text-block">
        <div class="dialogue-cn">${line.cn}</div>
        <div class="dialogue-py">${line.py}</div>
        <div class="dialogue-en">${line.en}</div>
      </div>
      <button class="audio-btn" style="width: 32px; height: 32px; font-size: 0.8rem;" onclick="speakText('${line.cn}')">🔊</button>
    `;
    container.appendChild(bubble);
  });
  
  // Set default visibility based on state
  if (state.pinyinVisible) {
    container.classList.remove("pinyin-toggle-hide");
  } else {
    container.classList.add("pinyin-toggle-hide");
  }
}

function playFullDialogue() {
  const lines = state.currentLesson.dialogue.lines;
  let lineIdx = 0;
  
  function playNextBubble() {
    if (lineIdx < lines.length) {
      speakText(lines[lineIdx].cn);
      
      // Flash speaking bubble visually
      const bubbles = document.querySelectorAll(".dialogue-bubble");
      bubbles.forEach((b, i) => {
        if (i === lineIdx) {
          b.style.borderColor = "var(--primary)";
          b.style.background = "rgba(255, 51, 102, 0.05)";
        } else {
          b.style.borderColor = "var(--glass-border)";
          b.style.background = "rgba(255, 255, 255, 0.01)";
        }
      });
      
      // Delay to play next line (roughly estimating line reading time based on character count)
      const delay = Math.max(2500, lines[lineIdx].cn.length * 400);
      lineIdx++;
      setTimeout(playNextBubble, delay);
    } else {
      // Clear visual highlighted lines
      const bubbles = document.querySelectorAll(".dialogue-bubble");
      bubbles.forEach(b => {
        b.style.borderColor = "var(--glass-border)";
        b.style.background = "rgba(255, 255, 255, 0.01)";
      });
    }
  }
  
  playNextBubble();
}

// ----------------------------------------------------
// STAGE 4: UNIT QUIZ EXAMINATIONS
// ----------------------------------------------------
function loadQuizSection() {
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswers = [];
  
  loadLessonQuizQuestion();
}

function loadLessonQuizQuestion() {
  const quiz = state.currentLesson.quiz;
  const question = quiz[state.quizIndex];
  
  // Update progress
  document.getElementById("lesson-quiz-progress-fill").style.width = `${(state.quizIndex / quiz.length) * 100}%`;
  document.getElementById("lesson-quiz-question-lbl").innerHTML = `
    <span>Question ${state.quizIndex + 1} of ${quiz.length}</span>
    <span style="color:var(--accent);">⭐ +10 pts for correct answer</span>
  `;
  
  // Display text
  const textContainer = document.getElementById("lesson-quiz-text");
  textContainer.textContent = question.question;
  
  // Check if it's a listening type question
  const isListening = question.question.includes("pronunciation") || question.question.includes("audio") || question.question.includes("hear");
  if (isListening) {
    let wordToSay = "";
    if (question.id || true) {
      // Pull answer word
      const optionsClean = question.options.map(o => o.split(" ")[0]);
      const idxAnswer = question.options.indexOf(question.answer);
      wordToSay = optionsClean[idxAnswer];
    }
    textContainer.innerHTML = `👂 Listening Challenge: <button id="quiz-audio-trigger" class="audio-btn" style="width:36px; height:36px; font-size:0.85rem;">🔊</button><br><span style="font-size:0.95rem; font-weight:normal; color:var(--text-secondary); margin-top:0.5rem; display:block;">Click speaker to listen, then select matching option.</span>`;
    
    document.getElementById("quiz-audio-trigger").addEventListener("click", () => speakText(wordToSay));
    setTimeout(() => speakText(wordToSay), 500);
  }
  
  // Reset feedback & next button
  document.getElementById("lesson-quiz-explanation-box").style.display = "none";
  document.getElementById("lesson-quiz-next-btn").style.display = "none";
  
  // Populate options list
  const optionsList = document.getElementById("lesson-quiz-options");
  optionsList.innerHTML = "";
  
  question.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.addEventListener("click", () => selectLessonQuizAnswer(btn, opt));
    optionsList.appendChild(btn);
  });
}

function selectLessonQuizAnswer(button, optionVal) {
  const question = state.currentLesson.quiz[state.quizIndex];
  const options = document.getElementById("lesson-quiz-options").querySelectorAll(".quiz-option");
  
  // Disable all options
  options.forEach(oBtn => {
    oBtn.disabled = true;
    if (oBtn.textContent === question.answer) {
      oBtn.classList.add("correct");
    }
  });
  
  const isCorrect = optionVal === question.answer;
  if (isCorrect) {
    state.quizScore++;
    button.classList.add("correct");
    state.score += 10; // 10 pts per correct quiz answer
  } else {
    button.classList.add("incorrect");
  }
  
  state.quizAnswers.push({ index: state.quizIndex, correct: isCorrect });
  
  // Feedback
  const expBox = document.getElementById("lesson-quiz-explanation-box");
  const expText = document.getElementById("lesson-quiz-explanation-text");
  const expTitle = document.getElementById("lesson-quiz-correctness");
  
  expText.textContent = question.explanation;
  expBox.style.display = "block";
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expTitle.style.color = isCorrect ? "var(--success)" : "var(--error)";
  expTitle.textContent = isCorrect ? "✓ Correct! (+10 pts)" : "✗ Incorrect";
  
  // Show next question button
  document.getElementById("lesson-quiz-next-btn").style.display = "inline-block";
}

function nextLessonQuizQuestion() {
  state.quizIndex++;
  const quiz = state.currentLesson.quiz;
  
  if (state.quizIndex < quiz.length) {
    loadLessonQuizQuestion();
  } else {
    document.getElementById("lesson-quiz-progress-fill").style.width = "100%";
    
    // Complete lesson sequence
    finishLessonSession();
  }
}

// ----------------------------------------------------
// STUDY COMPLETE & PERSISTENCE PROCESSES
// ----------------------------------------------------
function finishLessonSession() {
  clearInterval(state.timerInterval);
  
  // Add to completed lessons if not already present
  if (!state.completedLessons.includes(state.currentLesson.id)) {
    state.completedLessons.push(state.currentLesson.id);
    state.score += 50; // 50 pts completion bonus
  }
  
  // Update streak count
  updateStreak();
  
  // Add to time spent (1 hour = 60 minutes)
  state.timeSpentMinutes += 60;
  
  saveProgress();
  
  // Congratulate page
  switchView("congrats-view");
  
  // Sync congrats stats
  const minsSpent = Math.floor((3600 - state.timerSeconds) / 60);
  const secsSpent = (3600 - state.timerSeconds) % 60;
  document.getElementById("congrats-time").textContent = `${minsSpent}m ${secsSpent}s`;
  document.getElementById("congrats-quiz-score").textContent = `${state.quizScore} / ${state.currentLesson.quiz.length}`;
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  
  if (state.lastStudyDate === today) {
    // Already studied today, keep streak
    return;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (state.lastStudyDate === yesterdayStr) {
    // Studied yesterday, increment streak
    state.streakCount++;
  } else if (!state.lastStudyDate) {
    // First time studying ever
    state.streakCount = 1;
  } else {
    // Streak broken, reset to 1
    state.streakCount = 1;
  }
  
  state.lastStudyDate = today;
}

// ----------------------------------------------------
// REMINDERS AND DAILY SCHEDULER
// ----------------------------------------------------
function setupDailyReminders() {
  const timeInput = document.getElementById("reminder-time-input");
  const selectedTime = timeInput.value;
  
  state.reminderTime = selectedTime;
  saveProgress();
  
  // Request notifications
  if (typeof Notification !== 'undefined') {
    Notification.requestPermission().then(permission => {
      state.notificationGranted = permission === "granted";
      
      const statusMsg = document.getElementById("reminder-status-msg");
      statusMsg.style.display = "block";
      
      if (state.notificationGranted) {
        statusMsg.textContent = `🔔 Reminder set for ${selectedTime} daily!`;
        statusMsg.style.color = "var(--success)";
      } else {
        statusMsg.textContent = `⚠️ Set for ${selectedTime}, but browser notifications are blocked.`;
        statusMsg.style.color = "var(--warning)";
      }
      
      // Proactively notify the AI system to trigger a scheduled notification
      console.log(`[HANPATH_SCHEDULER] User requested a study reminder at ${selectedTime}.`);
      
      setTimeout(() => {
        statusMsg.style.display = "none";
      }, 5000);
    });
  }
}

// Browser notification wrapper
function showCurriculumMilestoneNotification(title, message) {
  if (state.notificationGranted && typeof Notification !== 'undefined') {
    new Notification(title, {
      body: message,
      icon: "https://cdn-icons-png.flaticon.com/512/3251/3251521.png"
    });
  } else {
    // Fallback to JS Alert inside app
    alert(`${title}\n${message}`);
  }
}
