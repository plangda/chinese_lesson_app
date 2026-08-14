/**
 * HanPath - Core Application Engine (4-Stage Layout)
 */

import { eventBus } from './modules/event-bus.js?v=2';
import { srsEngine } from './modules/srs-engine.js?v=2';
import { challengeSelector } from './modules/challenge-selector.js?v=3';
import { gardenRenderer } from './modules/garden.js?v=2';

const state = {
  userLevel: null,
  completedLessons: [],
  streakCount: 0,
  score: 0,
  timeSpentMinutes: 0,
  reminderTime: "09:00",
  
  currentView: "welcome-view",
  currentLesson: null,
  currentPane: "vocab-pane",
  
  currentLanguage: "en",
  pendingLessonId: null,
  timerSeconds: 3600,
  timerInterval: null,
  timerPaused: false,
  
  vocabIndex: 0,
  
  quizIndex: 0,
  quizScore: 0,
  quizAnswers: [],

  // Pre-test diagnostic state
  pretestIndex: 0,
  pretestScore: 0,
  pretestAnswers: [],
  recommendedLevel: "hsk1",

  hasTakenPlacementTest: false,
  lessonPretestIndex: 0,
  lessonPretestScore: 0,
  lessonPretestQuestions: [],
  pretestLesson: null,
  currentLessonId: null
};

// Expose state globally so i18n.js t() helper can read currentLanguage
window.state = state;

// Global helper for fetching data-driven translated strings from the database
window.ld = function(item, baseField) {
  if (state.currentLanguage === 'th') {
    const thField = baseField === 'exampleEn' ? 'example_th' : baseField + '_th';
    if (item[thField] !== undefined && item[thField] !== null) {
      return item[thField];
    }
  }
  return item[baseField] !== undefined ? item[baseField] : '';
};

function localizeLessonObject(data, lang) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => localizeLessonObject(item, lang));

  const localized = { ...data };
  if (lang === 'th') {
    Object.keys(localized).forEach(key => {
      if (key.endsWith('_th') && localized[key] !== null && localized[key] !== undefined && localized[key] !== '') {
        const baseKey = key.slice(0, -3);
        const targetKey = baseKey === 'example' ? 'exampleEn' : baseKey;
        localized[targetKey] = localized[key];
      }
    });
  }
  for (const key in localized) {
    localized[key] = localizeLessonObject(localized[key], lang);
  }
  return localized;
}

const timelineStages = ["vocab-pane", "grammar-pane", "dialogue-pane", "quiz-pane"];

// Speech Synthesis setup
let speechVoice = null;
function loadSpeechVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  const voices = speechSynthesis.getVoices();
  speechVoice = voices.find(v => v.lang.includes('zh-CN') || v.lang.includes('zh-')) || null;
}
if (typeof speechSynthesis !== 'undefined') {
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadSpeechVoices;
  }
  loadSpeechVoices();
}

function speakText(text) {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  if (speechVoice) utterance.voice = speechVoice;
  speechSynthesis.speak(utterance);
}

// HanziWriter instance
let writer = null;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("hanpath_token");
  if (!token) {
    switchView("auth-view");
  } else {
    loadProgress();
  }
  setupEventListeners();
  translateUI();
  setInterval(checkDailyReminder, 30000);
});

function loadProgress() {
  const saved = localStorage.getItem("hanpath_data_v2");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      applyProgressState(parsed);
      if (state.userLevel) {
        state.currentView = "dashboard-view";
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  const token = localStorage.getItem("hanpath_token");
  if (!token) return;

  // Fetch from server to sync
  fetch("/api/progress", {
    headers: { "Authorization": "Bearer " + token }
  })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error("Server response not ok");
    })
    .then(serverData => {
      if (serverData && Object.keys(serverData).length > 0) {
        // Smart merge: take max score and time, union of completed lessons
        if (state.score > serverData.score) serverData.score = state.score;
        if (state.timeSpentMinutes > serverData.timeSpentMinutes) serverData.timeSpentMinutes = state.timeSpentMinutes;
        
        const mergedLessons = new Set([...(state.completedLessons || []), ...(serverData.completedLessons || [])]);
        serverData.completedLessons = Array.from(mergedLessons);
        
        if (state.userLevel) {
           serverData.userLevel = state.userLevel;
        }

        applyProgressState(serverData);
        localStorage.setItem("hanpath_data_v2", JSON.stringify(serverData));
        if (state.userLevel) {
          switchView("dashboard-view");
        } else {
          switchView("welcome-view");
        }
      } else if (state.userLevel) {
        switchView("dashboard-view");
      } else {
        switchView("welcome-view");
      }
    })
    .catch(err => {
      console.log("Could not sync with server, using local data:", err.message);
      if (state.userLevel) {
        switchView("dashboard-view");
      } else {
        switchView("welcome-view");
      }
    });
}

function fetchCurriculumAndRender(level) {
  fetch(`/api/curriculum/${level}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    })
    .then(data => {
      if (!window.CHINESE_LESSONS) {
        window.CHINESE_LESSONS = {};
      }
      if (!window.CHINESE_LESSONS.lessons) {
        window.CHINESE_LESSONS.lessons = {};
      }
      if (!window.CHINESE_LESSONS.preTestQuestions) {
        window.CHINESE_LESSONS.preTestQuestions = [
          { id: "q1", level: 1, type: "vocab", question: "Which of the following means 'Hello'?", question_th: "คำใดมีความหมายว่า 'สวัสดี'?", options: ["谢谢", "你好", "再见", "对不起"], options_th: ["谢谢 (ขอบคุณ)", "你好 (สวัสดี)", "再见 (ลาก่อน)", "对不起 (ขอโทษ)"], answer: "你好", answer_th: "你好 (สวัสดี)", explanation: "你好 (nǐ hǎo) means Hello.", explanation_th: "你好 (nǐ hǎo) แปลว่า สวัสดี" },
          { id: "q2", level: 1, type: "pinyin", question: "What is the pinyin for '吃' (to eat)?", question_th: "พินอินของ '吃' (กิน) คืออะไร?", options: ["chī", "hē", "shū", "dà"], options_th: ["chī", "hē", "shū", "dà"], answer: "chī", answer_th: "chī", explanation: "吃 is pronounced 'chī' and means to eat.", explanation_th: "吃 ออกเสียงว่า 'chī' แปลว่า กิน" },
          { id: "q3", level: 1, type: "grammar", question: "Which sentence is grammatically correct for 'I drink tea'?", question_th: "ประโยคใดถูกต้องตามหลักไวยากรณ์สำหรับคำว่า 'ฉันดื่มชา'?", options: ["我喝茶。", "茶喝我。", "我茶喝。", "茶我喝。"], options_th: ["我喝茶。", "茶喝我。", "我茶喝。", "茶我喝。"], answer: "我喝茶。", answer_th: "我喝茶。", explanation: "Standard word order in Chinese is Subject-Verb-Object (SVO): 我 (I) + 喝 (drink) + 茶 (tea).", explanation_th: "โครงสร้างประโยคมาตรฐานในภาษาจีนคือ ประธาน-กริยา-กรรม (SVO): 我 (ฉัน) + 喝 (ดื่ม) + 茶 (ชา)" },
          { id: "q4", level: 2, type: "vocab", question: "Translate this word: '便宜'", question_th: "แปลคำนี้: '便宜'", options: ["Expensive", "Cheap", "Beautiful", "Delicious"], options_th: ["แพง", "ถูก", "สวยงาม", "อร่อย"], answer: "Cheap", answer_th: "ถูก", explanation: "便宜 (piányi) means cheap.", explanation_th: "便宜 (piányi) แปลว่า ราคาถูก" },
          { id: "q5", level: 2, type: "pinyin", question: "What is the pinyin for '帮助' (to help)?", question_th: "พินอินของ '帮助' (ช่วยเหลือ) คืออะไร?", options: ["bāngzhù", "bàozhǐ", "chànggē", "chuān"], options_th: ["bāngzhù", "bàozhǐ", "chànggē", "chuān"], answer: "bāngzhù", answer_th: "bāngzhù", explanation: "帮助 is pronounced 'bāngzhù' and means to help.", explanation_th: "帮助 ออกเสียงว่า 'bāngzhù' แปลว่า ช่วยเหลือ" },
          { id: "q6", level: 2, type: "grammar", question: "Select the correct sentence for 'He likes to read newspapers':", question_th: "เลือกประโยคที่ถูกต้องสำหรับคำว่า 'เขาชอบอ่านหนังสือพิมพ์':", options: ["他喜欢看报纸。", "看报纸他喜欢。", "他看报纸喜欢。", "喜欢他看报纸。"], options_th: ["他喜欢看报纸。", "看报纸他喜欢。", "他看报纸喜欢。", "喜欢他看报纸。"], answer: "他喜欢看报纸。", answer_th: "他喜欢看报纸。", explanation: "Subject + 喜欢 (like) + Verb-Object: 他 (He) + 喜欢 (likes) + 看报纸 (to read newspapers).", explanation_th: "ประธาน + 喜欢 (ชอบ) + กริยา-กรรม: 他 (เขา) + 喜欢 (ชอบ) + 看报纸 (อ่านหนังสือพิมพ์)" },
          { id: "q7", level: 3, type: "vocab", question: "Which describes 'getting sick'?", question_th: "คำใดอธิบายถึงการ 'ป่วย'?", options: ["生病", "生气", "生命", "生意"], options_th: ["生病 (ป่วย)", "生气 (โกรธ)", "生命 (ชีวิต)", "生意 (ธุรกิจ)"], answer: "生病", answer_th: "生病 (ป่วย)", explanation: "生病 (shēngbìng) means to fall ill.", explanation_th: "生病 (shēngbìng) แปลว่า ป่วย หรือ ไม่สบาย" },
          { id: "q8", level: 3, type: "pinyin", question: "What is the pinyin for '安静' (quiet)?", question_th: "พินอินของ '安静' (เงียบ) คืออะไร?", options: ["ānjìng", "āyí", "ǎi", "ā"], options_th: ["ānjìng", "āyí", "ǎi", "ā"], answer: "ānjìng", answer_th: "ānjìng", explanation: "安静 is pronounced 'ānjìng' and means quiet.", explanation_th: "安静 ออกเสียงว่า 'ānjìng' แปลว่า เงียบ" },
          { id: "q9", level: 3, type: "grammar", question: "Complete the sentence to say 'He drank the tea': 他把茶___。", question_th: "เติมประโยคให้สมบูรณ์สำหรับ 'เขาดื่มชาแล้ว': 他把茶___。", options: ["喝了", "喝", "茶了", "把喝了"], options_th: ["喝了", "喝", "茶了", "把喝了"], answer: "喝了", answer_th: "喝了", explanation: "In a 把 (bǎ) sentence, the structure is Subject + 把 + Object + Verb + Result: 他 (He) + 把 + 茶 (tea) + 喝了 (drank).", explanation_th: "ในประโยค 把 (bǎ) โครงสร้างคือ ประธาน + 把 + กรรม + กริยา + ผลลัพธ์: 他 (เขา) + 把 + 茶 (ชา) + 喝了 (ดื่มแล้ว)" }
        ];
      }
      window.CHINESE_LESSONS.lessons[level] = data;
      
      // Update vocabulary pool for active challenge selection
      const pool = [];
      Object.keys(window.CHINESE_LESSONS.lessons).forEach(lvl => {
        const lessonsArray = window.CHINESE_LESSONS.lessons[lvl];
        if (Array.isArray(lessonsArray)) {
          lessonsArray.forEach(lesson => {
            if (Array.isArray(lesson.vocab)) {
              pool.push(...lesson.vocab);
            }
          });
        }
      });
      challengeSelector.setVocabularyPool(pool);
      
      renderDashboard();
    })
    .catch(err => {
      console.error("Failed to fetch curriculum:", err);
      const container = document.getElementById('dashboard-lessons-container');
      if (container) {
         container.innerHTML = `<div class="error text-center mt-3" style="color: var(--danger);">${t('error_load_lessons')}</div>`;
       }
    });
}

function applyProgressState(data) {
  state.currentLanguage = data.currentLanguage || 'en';
  state.userLevel = data.userLevel || null;
  state.completedLessons = data.completedLessons || [];
  state.streakCount = data.streakCount || 0;
  state.score = data.score || 0;
  state.timeSpentMinutes = data.timeSpentMinutes || 0;
  state.reminderTime = data.reminderTime || "09:00";
  state.lastReminderDate = data.lastReminderDate || null;
  state.lastStudiedDate = data.lastStudiedDate || null;
  state.hasTakenPlacementTest = data.hasTakenPlacementTest || false;
  
  if (state.lastStudiedDate) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (state.lastStudiedDate !== todayStr && state.lastStudiedDate !== yesterdayStr) {
      state.streakCount = 0;
    }
  }
  
  // Sync the reminder UI
  const timeInput = document.getElementById("reminder-time-input");
  if (timeInput && state.reminderTime) {
    timeInput.value = state.reminderTime;
  }
}

function saveProgress() {
  const dataToSave = {
    currentLanguage: state.currentLanguage,
    userLevel: state.userLevel,
    completedLessons: state.completedLessons,
    streakCount: state.streakCount,
    score: state.score,
    timeSpentMinutes: state.timeSpentMinutes,
    reminderTime: state.reminderTime,
    lastReminderDate: state.lastReminderDate,
    lastStudiedDate: state.lastStudiedDate,
    hasTakenPlacementTest: state.hasTakenPlacementTest
  };
  localStorage.setItem("hanpath_data_v2", JSON.stringify(dataToSave));
  
  const token = localStorage.getItem("hanpath_token");
  if (!token) return;

  // Send to server
  fetch("/api/progress", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(dataToSave)
  }).catch(err => {
    console.error("Failed to sync progress with server:", err);
  });
}



let _i18nNodesCache = null;
function translateUI(forceRequery = false) {
  const currentLang = state.currentLanguage || "en";
  const dict = i18nDictionary[currentLang];
  if (!dict) return;
  
  if (!_i18nNodesCache || forceRequery) {
      _i18nNodesCache = document.querySelectorAll("[data-i18n]");
  }
  
  _i18nNodesCache.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', dict[key]);
      } else {
        el.textContent = dict[key];
      }
    }
  });
  
  // Update the global language toggle button label in the header
  const langToggleBtn = document.getElementById('global-lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'th' ? '🇬🇧 EN' : '🇹🇭 TH';
  }
  
  // Specific dynamic updates
  const el = (id) => document.getElementById(id);
  if (el('dialogue-title-lbl') && state.currentLesson && state.currentLesson.dialogue) {
     el('dialogue-title-lbl').textContent = ld(state.currentLesson.dialogue, 'title');
  }
  if (el('lesson-title-display') && state.currentLesson) {
     el('lesson-title-display').textContent = ld(state.currentLesson, 'title');
  }
  if (el('lesson-level-badge') && state.userLevel) {
     el('lesson-level-badge').textContent = getLevelName(state.userLevel);
  }
  if (el('user-level-badge') && state.userLevel) {
     el('user-level-badge').textContent = getLevelName(state.userLevel);
  }
}


function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  state.currentView = viewId;
  
  if (viewId === "dashboard-view") {
    if (state.userLevel) {
      fetchCurriculumAndRender(state.userLevel);
    } else {
      renderDashboard();
    }
    if (typeof window.loadMockExamSummary === 'function') {
      window.loadMockExamSummary();
    }
  }
  if (viewId === "seed-fusion-lab-view") {
    window.initActiveRadicalLab();
  }
  if (viewId === "sentence-quest-view") {
    window.initSentenceQuest();
  }
  translateUI();
}

function setupEventListeners() {
    // Global Language Toggle Button in header
    const globalLangBtn = document.getElementById('global-lang-toggle-btn');
    if (globalLangBtn) {
      globalLangBtn.addEventListener('click', () => {
        state.currentLanguage = state.currentLanguage === 'th' ? 'en' : 'th';
        if (state.currentLesson && state.rawLesson) {
          state.currentLesson = localizeLessonObject(state.rawLesson, state.currentLanguage);
        }
        translateUI();
        // Re-render the current view to update dynamic strings
        if (state.currentView === 'dashboard-view') {
          renderDashboard();
        } else if (state.currentView === 'pretest-view') {
          // Safely re-render current question without resetting progress
          loadPretestQuestion();
        } else if (state.currentView === 'lesson-pretest-view') {
          // Re-render only if actively taking the test (not on result screen)
          if (!document.getElementById("lesson-pretest-quiz-screen").classList.contains("hidden")) {
            loadLessonPretestQuestion();
          }
        } else if (state.currentView === 'lesson-view') {
          // Safely re-render active pane without resetting states
          if (state.currentPane === "vocab-pane") renderVocabPane();
          if (state.currentPane === "grammar-pane") renderGrammarPane();
          if (state.currentPane === "dialogue-pane") renderDialoguePane();
          if (state.currentPane === "quiz-pane") renderQuizQuestion();
        } else if (state.currentView === 'pinyin-chart-view') {
          initPinyinChart();
        } else if (state.currentView === 'srs-view') {
          renderSrsCard();
        } else if (state.currentView === 'welcome-view') {
          // static, translateUI is enough
        }
        
        saveProgress(); // Persist language preference
      });
    }

  // Auth Form Listeners
  let isLogin = true;
  const toggleLink = document.getElementById("auth-toggle-link");
  if (toggleLink) {
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      isLogin = !isLogin;
      document.getElementById("auth-title").setAttribute("data-i18n", isLogin ? "login_title" : "signup_title");
      document.getElementById("auth-submit-btn").setAttribute("data-i18n", isLogin ? "btn_login" : "btn_signup");
      document.getElementById("auth-toggle-text").setAttribute("data-i18n", isLogin ? "auth_no_account" : "auth_have_account");
      translateUI();
      toggleLink.textContent = isLogin ? "Sign Up" : "Login";
      isLogin ? document.getElementById("auth-name").classList.add('hidden') : document.getElementById("auth-name").classList.remove('hidden');
      document.getElementById("auth-error").classList.add('hidden');
    });
  }

  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("auth-email").value;
      const password = document.getElementById("auth-password").value;
      const name = document.getElementById("auth-name").value;
      const errorDiv = document.getElementById("auth-error");
      
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        
        if (data.success) {
          localStorage.setItem("hanpath_token", data.token);
          loadProgress();
        } else {
        errorDiv.textContent = data.error || t('error_network');
          errorDiv.classList.remove('hidden');
        }
      } catch (err) {
        errorDiv.textContent = t('error_network');
        errorDiv.classList.remove('hidden');
      }
    });
  }

  const bindClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  const bindChange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', fn); };

  // Pre-test triggers
  bindClick("start-pretest-btn", () => {
    switchView("pretest-view");
    initPretest();
  });
  
  bindClick("begin-test-now-btn", () => {
    const intro = document.getElementById("pretest-intro-screen");
    const quiz = document.getElementById("pretest-quiz-screen");
    if (intro) intro.classList.add('hidden');
    if (quiz) quiz.classList.remove('hidden');
    loadPretestQuestion();
  });

  bindClick("skip-pretest-btn", () => {
    state.hasTakenPlacementTest = true;
    state.userLevel = "hsk1"; // Default level
    saveProgress();
    switchView("dashboard-view");
  });
  
  bindClick("pretest-next-btn", nextPretestQuestion);
  bindClick("claim-placement-btn", () => {
    switchView("dashboard-view");
  });

  // Banner pretest trigger
  bindClick("banner-pretest-btn", () => {
    switchView("pretest-view");
    initPretest();
  });

  // Pinyin Chart triggers
  bindClick("pinyin-chart-btn", () => {
    switchView("pinyin-chart-view");
    initPinyinChart();
  });

  bindClick("pinyin-back-btn", () => {
    switchView("dashboard-view");
  });

  // Lesson pretest triggers
  bindClick("begin-lesson-test-btn", () => {
    const intro = document.getElementById("lesson-pretest-intro-screen");
    const quiz = document.getElementById("lesson-pretest-quiz-screen");
    if (intro) intro.classList.add('hidden');
    if (quiz) quiz.classList.remove('hidden');
    startLessonPretestQuiz();
  });

  bindClick("skip-lesson-test-entirely-btn", () => {
    startLesson(state.currentLessonId);
  });

  bindClick("lesson-pretest-next-btn", nextLessonPretestQuestion);

  bindClick("lesson-pretest-start-study-btn", () => {
    startLesson(state.currentLessonId);
  });

  bindClick("lesson-pretest-skip-lesson-btn", () => {
    if (!state.completedLessons.includes(state.currentLessonId)) {
      state.completedLessons.push(state.currentLessonId);
      state.score += 30; // Bonus points for skipping via pre-test mastery!
      saveProgress();
    }
    switchView("dashboard-view");
  });

  bindClick("lesson-pretest-exit-btn", () => {
    switchView("dashboard-view");
  });

  // Reminder configurator
  bindClick("set-reminder-btn", setupDailyReminders);

  // Welcome & Level Select
  document.querySelectorAll('.manual-level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.userLevel = e.target.getAttribute('data-level');
      saveProgress();
      switchView("dashboard-view");
    });
  });
  
  bindChange('change-level-select', (e) => {
    state.userLevel = e.target.value;
    saveProgress();
    fetchCurriculumAndRender(state.userLevel);
  });
  
  bindClick('reset-progress-btn', () => {
    showConfirmModal("title_confirm", "msg_reset_progress", () => {
      state.userLevel = null;
      state.completedLessons = [];
      state.score = 0;
      state.timeSpentMinutes = 0;
      saveProgress();
      switchView("welcome-view");
    });
  });

  bindClick('logout-btn', () => {
    showConfirmModal("title_confirm", "msg_logout", () => {
      localStorage.removeItem("hanpath_token");
      localStorage.removeItem("hanpath_data_v2");
      Object.assign(state, {
        currentView: "auth-view",
        userLevel: null,
        completedLessons: [],
        score: 0,
        timeSpentMinutes: 0,
        streakDays: 0,
        lastStudyDate: null,
        hasTakenPlacementTest: false,
        currentLesson: null,
        currentLessonId: null
      });
      switchView("auth-view");
    });
  });

  // Lesson Nav
  document.getElementById('lesson-exit-btn').addEventListener('click', () => {
    showConfirmModal("title_confirm", "msg_exit_lesson", () => {
      clearInterval(state.timerInterval);
      switchView("dashboard-view");
    });
  });

  document.getElementById('timer-pause-btn').addEventListener('click', () => {
    state.timerPaused = !state.timerPaused;
    document.getElementById('timer-pause-icon').textContent = state.timerPaused ? '▶️' : '⏸️';
  });
  
  document.getElementById('pane-next-btn').addEventListener('click', () => {
    const idx = timelineStages.indexOf(state.currentPane);
    if (idx < timelineStages.length - 1) {
      switchPane(timelineStages[idx + 1]);
    }
  });
  document.getElementById('pane-back-btn').addEventListener('click', () => {
    const idx = timelineStages.indexOf(state.currentPane);
    if (idx > 0) {
      switchPane(timelineStages[idx - 1]);
    }
  });

  document.querySelectorAll('.timeline-step').forEach(step => {
    step.addEventListener('click', (e) => {
      const pane = e.target.getAttribute('data-pane');
      if (pane) switchPane(pane);
    });
  });

  // Vocab Flashcards & Audio
  document.getElementById('vocab-flashcard').addEventListener('click', () => {
    document.getElementById('vocab-flashcard').classList.toggle('flipped');
  });
  document.getElementById('vocab-speak-btn').addEventListener('click', () => {
    const v = state.currentLesson.vocab[state.vocabIndex];
    if (v) speakText(v.character);
  });
  document.getElementById('vocab-ex-speak-btn').addEventListener('click', () => {
    const v = state.currentLesson.vocab[state.vocabIndex];
    if (v) speakText(v.exampleCn);
  });
  document.getElementById('vocab-next-btn').addEventListener('click', () => {
    if (state.vocabIndex < state.currentLesson.vocab.length - 1) {
      state.vocabIndex++;
      renderVocabPane();
    }
  });
  document.getElementById('vocab-prev-btn').addEventListener('click', () => {
    if (state.vocabIndex > 0) {
      state.vocabIndex--;
      renderVocabPane();
    }
  });
  
  // Writing Pad Controls
  document.getElementById('btn-writing-play').addEventListener('click', () => {
    if (writer) writer.animateCharacter();
  });
  document.getElementById('btn-writing-reset').addEventListener('click', () => {
    if (writer) {
      const char = state.currentLesson.vocab[state.vocabIndex].character;
      writer.setCharacter(char.charAt(0)); 
    }
  });
  document.getElementById('mode-animate-btn').addEventListener('click', (e) => {
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('free-write-canvas').classList.add('hidden');
    if(writer) { writer.cancelQuiz(); writer.animateCharacter(); }
  });
  document.getElementById('mode-trace-btn').addEventListener('click', (e) => {
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('free-write-canvas').classList.add('hidden');
    if(writer) writer.quiz({showHintAfterMisses: 1});
  });
  document.getElementById('mode-freewrite-btn').addEventListener('click', (e) => {
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('free-write-canvas').classList.remove('hidden');
    if(writer) writer.cancelQuiz();
    initFreeWriteCanvas();
  });
  
  let isDrawing = false;
  let ctx = null;
  function initFreeWriteCanvas() {
    const canvas = document.getElementById('free-write-canvas');
    if(!ctx) {
      ctx = canvas.getContext('2d');
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff3366';
      
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseout', endDraw);
      
      canvas.addEventListener('touchstart', handleTouch, {passive: false});
      canvas.addEventListener('touchmove', handleTouch, {passive: false});
      canvas.addEventListener('touchend', endDraw);
      
      document.getElementById('btn-writing-clear').addEventListener('click', () => {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }
    document.getElementById('btn-writing-clear').classList.remove('hidden');
  }
  
  function handleTouch(e) {
    if (e.touches && e.touches.length > 0) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      e.target.dispatchEvent(mouseEvent);
    }
  }
  
  function startDraw(e) { isDrawing = true; draw(e); }
  function draw(e) {
    if(!isDrawing || !ctx) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function endDraw() { isDrawing = false; if(ctx) ctx.beginPath(); }
  
  // Dialogue Audio & Toggles
  document.getElementById('dialogue-play-all-btn').addEventListener('click', () => {
    let fullText = state.currentLesson.dialogue.lines.map(l => l.cn).join(" ");
    speakText(fullText);
  });
  document.getElementById('pinyin-visibility-toggle').addEventListener('click', () => {
    const pyElements = document.querySelectorAll('.dialogue-py');
    pyElements.forEach(el => {
      el.classList.toggle('hidden');
    });
  });

  // Quiz Navigation
  document.getElementById('lesson-quiz-next-btn').addEventListener('click', nextQuizQuestion);
  document.getElementById('finish-to-dashboard-btn').addEventListener('click', () => {
    switchView("dashboard-view");
  });
}

function getLevelName(level) {
  if (level === 'hsk1') return t('hsk1_level_name');
  if (level === 'hsk2') return t('hsk2_level_name');
  if (level === 'hsk3') return t('hsk3_level_name');
  return level ? level.toUpperCase() : '';
}

function renderDashboard() {
  const lvlBadge = document.getElementById('dashboard-level-badge');
  if (lvlBadge) lvlBadge.textContent = getLevelName(state.userLevel);
  
  const lvlSelect = document.getElementById('change-level-select');
  if (lvlSelect) lvlSelect.value = state.userLevel;
  
  const lessonsCompletedEl = document.getElementById('stat-lessons-completed');
  if (lessonsCompletedEl) lessonsCompletedEl.textContent = state.completedLessons.length;

  const streakEl = document.getElementById('stat-streak');
  if (streakEl) streakEl.textContent = state.streakCount;

  const timeSpentEl = document.getElementById('stat-time-spent');
  if (timeSpentEl) timeSpentEl.textContent = Math.round(state.timeSpentMinutes / 60) + "h";

  const scoreValEl = document.getElementById('score-val');
  if (scoreValEl) scoreValEl.textContent = state.score;

  // Render Vocab Garden SRS Widget
  renderVocabGardenWidget();

  // Toggle placement test warning banner
  const warningBanner = document.getElementById('placement-warning-banner');
  if (warningBanner) {
    state.hasTakenPlacementTest ? warningBanner.classList.add('hidden') : warningBanner.classList.remove('hidden');
  }
  
  const container = document.getElementById('dashboard-lessons-container');
  if (!container) return;
  container.innerHTML = '';
  
  const lessons = (window.CHINESE_LESSONS && window.CHINESE_LESSONS.lessons) ? (window.CHINESE_LESSONS.lessons[state.userLevel] || []) : [];
  
  // Update Today's Recommended Lesson Panel
  const activeLesson = lessons.find(l => !state.completedLessons.includes(l.id));
  const todayPanel = document.getElementById('today-lesson-panel');
  if (todayPanel) {
    if (activeLesson) {
      todayPanel.classList.remove('hidden');
      const dayNum = activeLesson.day_number || activeLesson.id.replace(/^hsk\d_day/, '');
      const dayPrefixRaw = t('day_prefix', { day: dayNum });
      const dayClean = dayPrefixRaw.replace(/:\s*$/, '');
      
      const todayDayLabel = document.getElementById('today-lesson-day-label');
      if (todayDayLabel) {
        todayDayLabel.textContent = `${dayClean} • ${state.userLevel.toUpperCase()}`;
      }

      const todayTitle = document.getElementById('today-lesson-title');
      if (todayTitle) todayTitle.textContent = ld(activeLesson, 'title');
      
      const todayDesc = document.getElementById('today-lesson-desc');
      if (todayDesc) {
        let descId = "todays_lesson_desc";
        if (state.userLevel === 'hsk2') descId = "todays_lesson_desc_hsk2";
        if (state.userLevel === 'hsk3') descId = "todays_lesson_desc_hsk3";
        todayDesc.textContent = t(descId);
      }
      
      const todayTag = document.getElementById('today-lesson-tag');
      if (todayTag) {
        todayTag.textContent = t('todays_lesson_with_level', { level: state.userLevel.toUpperCase() });
        todayTag.className = `tag tag-${state.userLevel}`;
      }
      
      const startBtn = document.getElementById('today-lesson-start-btn');
      if (startBtn) {
        startBtn.textContent = t('btn_start_today');
        startBtn.onclick = () => routeToLesson(activeLesson.id);
      }
    } else {
      if (lessons.length > 0) {
        todayPanel.classList.remove('hidden');
        const todayTitle = document.getElementById('today-lesson-title');
        if (todayTitle) todayTitle.textContent = t('level_complete_title');
        
        const todayDesc = document.getElementById('today-lesson-desc');
        if (todayDesc) todayDesc.textContent = t('level_complete_desc', { level: state.userLevel.toUpperCase() });
        
        const todayTag = document.getElementById('today-lesson-tag');
        if (todayTag) {
          todayTag.textContent = t('lbl_complete_tag');
          todayTag.className = "tag tag-hsk1";
          todayTag.style.background = "var(--success)";
        }
        
        const startBtn = document.getElementById('today-lesson-start-btn');
        if (startBtn) {
          startBtn.textContent = t('btn_explore_next');
          startBtn.onclick = () => {
            if (state.userLevel === 'hsk1') {
              state.userLevel = 'hsk2';
            } else if (state.userLevel === 'hsk2') {
              state.userLevel = 'hsk3';
            } else {
              if (todayDesc) {
                todayDesc.textContent = t('all_levels_complete');
                todayDesc.style.color = "var(--success)";
              }
              startBtn.classList.add('hidden');
              return;
            }
            saveProgress();
            renderDashboard();
          };
        }
      } else {
        todayPanel.classList.add('hidden');
      }
    }
  }

  // Inject Lesson 0 at the top of the list manually so it's always accessible
  const displayLessons = [
    { id: 'hsk1_day0', day_number: 0, title: 'Pinyin Chart', title_th: 'ตารางพินอิน' },
    ...lessons
  ];

  displayLessons.forEach(l => {
    const isCompleted = state.completedLessons.includes(l.id);
    const div = document.createElement('div');
    div.className = `lesson-row glass-panel ${isCompleted ? 'completed' : ''}`;
    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; margin-bottom: 0.5rem; border-radius: 12px; transition: transform 0.2s, background-color 0.2s;";
    
    const dayNum = l.day_number || l.id.replace(/^hsk\d_day/, '');
    const dayLabel = t('day_prefix', { day: dayNum }).replace(/:\s*$/, '');
    
    div.innerHTML = `
      <div class="lesson-info" style="display: flex; flex-direction: column; gap: 0.15rem; text-align: left;">
        <span style="font-size: 0.7rem; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          ${l.id === 'hsk1_day0' ? 'FOUNDATION' : `${dayLabel}`}
        </span>
        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-color);">${ld(l, 'title')}</h4>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        ${isCompleted ? 
          `<span style="color: var(--success); font-size: 1.15rem; font-weight: bold; padding: 0.2rem;" title="Review lesson">✅</span>` : 
          `<button class="btn btn-primary btn-sm start-lesson-btn" data-id="${l.id}" style="border-radius: 12px; padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: bold; border: none;">${t('btn_start_lesson_short')}</button>`
        }
      </div>
    `;
    
    if (isCompleted) {
      div.style.cursor = 'pointer';
      div.title = t('review_lesson_tooltip', 'Click to review this lesson');
      div.addEventListener('click', () => routeToLesson(l.id));
      
      div.addEventListener('mouseenter', () => {
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      });
      div.addEventListener('mouseleave', () => {
        div.style.backgroundColor = '';
      });
    }
    
    container.appendChild(div);
  });
  
  document.querySelectorAll('.start-lesson-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.getAttribute('data-id');
      routeToLesson(id);
    });
  });

  // Apply translations to all static data-i18n elements
  translateUI();
}

function startLesson(id) {
  if (id === 'hsk1_day0') {
    switchView('pinyin-chart-view');
    initPinyinChart();
    return;
  }
  fetch(`/api/lessons/${id}`)
    .then(res => res.json())
    .then(data => {
      state.rawLesson = data;
      state.currentLesson = localizeLessonObject(data, state.currentLanguage);
      
      document.getElementById('lesson-level-badge').textContent = getLevelName(state.userLevel);
      document.getElementById('lesson-title-display').textContent = ld(state.currentLesson, 'title');
      
      state.timerSeconds = 3600;
      state.timerPaused = false;
      
      const pauseIcon = document.getElementById('timer-pause-icon');
      if (pauseIcon) pauseIcon.textContent = '⏸️';
      
      clearInterval(state.timerInterval);
      state.timerInterval = setInterval(() => {
        if (state.timerPaused) return;
        state.timerSeconds--;
        if(state.timerSeconds <= 0) {
          clearInterval(state.timerInterval);
          finishLesson();
        }
        const m = Math.floor(state.timerSeconds / 60);
        const s = state.timerSeconds % 60;
        document.getElementById('lesson-timer-display').textContent = `${m}:${s < 10 ? '0'+s : s}`;
      }, 1000);
      
      state.vocabIndex = 0;
      switchPane("vocab-pane");
      switchView("lesson-view");
    })
    .catch(err => {
      console.error("Failed to load full lesson data:", err);
      alert(t('error_load_lesson'));
    });
}

function switchPane(paneId) {
  state.currentPane = paneId;
  document.querySelectorAll('.lesson-pane-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(paneId).classList.remove('hidden');
  
  document.querySelectorAll('.timeline-step').forEach(el => el.classList.remove('active'));
  const stepEl = document.querySelector(`.timeline-step[data-pane="${paneId}"]`);
  if(stepEl) stepEl.classList.add('active');
  
  const idx = timelineStages.indexOf(paneId);
  document.getElementById('pane-back-btn').style.visibility = idx === 0 ? 'hidden' : 'visible';
  idx === timelineStages.length - 1 ? document.getElementById('pane-next-btn').classList.add('hidden') : document.getElementById('pane-next-btn').classList.remove('hidden');
  
  if (paneId === "vocab-pane") renderVocabPane();
  if (paneId === "grammar-pane") renderGrammarPane();
  if (paneId === "dialogue-pane") renderDialoguePane();
  if (paneId === "quiz-pane") renderQuizPane();
}

function renderVocabPane() {
    if (!state.currentLesson || !state.currentLesson.vocab) return;
    const v = state.currentLesson.vocab[state.vocabIndex];
    if (!v) return;
    
    document.getElementById('vocab-char').textContent = v.character;
    document.getElementById('vocab-meaning').textContent = ld(v, 'meaning');
    document.getElementById('vocab-pinyin').textContent = v.pinyin;
    
    document.getElementById('vocab-detail-pinyin').textContent = v.pinyin;
    document.getElementById('vocab-ex-cn').textContent = v.exampleCn;
    document.getElementById('vocab-ex-py').textContent = v.examplePy;
    document.getElementById('vocab-ex-en').textContent = ld(v, 'exampleEn');
    
    let deconstructDefault = "Basic radical combination.";
    document.getElementById('vocab-deconstruct-text').textContent = ld(v, 'deconstruct') || deconstructDefault;
    
    document.getElementById('vocab-flashcard').classList.remove('flipped');
    document.getElementById('vocab-index-indicator').textContent = t('word_progress', { current: state.vocabIndex + 1, total: state.currentLesson.vocab.length });
    
    // HanziWriter init
    if (typeof HanziWriter !== "undefined") {
      const targetDiv = document.getElementById('hanzi-writer-target');
      targetDiv.innerHTML = '';
      
      let tabsContainer = document.getElementById('hanzi-tabs-container');
      if (!tabsContainer) {
         tabsContainer = document.createElement('div');
         tabsContainer.id = 'hanzi-tabs-container';
         tabsContainer.classList.remove('hidden');
         tabsContainer.style.gap = '0.5rem';
         tabsContainer.style.justifyContent = 'center';
         tabsContainer.style.marginTop = '1rem';
         tabsContainer.style.flexWrap = 'wrap';
         targetDiv.parentNode.insertBefore(tabsContainer, targetDiv.nextSibling);
      }
      tabsContainer.innerHTML = '';

      const computedWidth = Math.min(200, window.innerWidth * 0.45);
      writer = HanziWriter.create('hanzi-writer-target', v.character.charAt(0), {
        width: computedWidth,
        height: computedWidth,
        padding: computedWidth * 0.08,
        strokeColor: '#ff3366',
        radicalColor: '#00f5d4',
        delayBetweenStrokes: 150
      });

      if (v.character.length > 1) {
        for (let i = 0; i < v.character.length; i++) {
          const char = v.character.charAt(i);
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary btn-sm';
          btn.textContent = char;
          if (i === 0) btn.style.borderColor = 'var(--primary)';
          btn.onclick = () => {
             writer.setCharacter(char);
             Array.from(tabsContainer.children).forEach(c => c.style.borderColor = 'var(--glass-border)');
             btn.style.borderColor = 'var(--primary)';
          };
          tabsContainer.appendChild(btn);
        }
      }
    }
  }

function renderGrammarPane() {
    const container = document.getElementById('grammar-topics-container');
    container.innerHTML = '';
    
    state.currentLesson.grammar.forEach((g, idx) => {
      const div = document.createElement('div');
      div.className = 'glass-panel';
      div.style.padding = '1.5rem';
      div.style.marginBottom = '1.5rem';
      
      let title = ld(g, 'title');
      let html = `<h4 style="color: var(--accent); margin-bottom: 0.5rem; font-size: 1.1rem;">${title}</h4>`;
      let explanation = ld(g, 'explanation');
      
      // Inject SVG graphics & interactive buttons for Pinyin mouth rules
      const tEn = g.title || g.title_en || '';
      if (tEn.includes('Retroflex')) {
        html += `
          <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
            <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
              <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
              <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
              <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
              <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
              <path d="M 40 100 Q 80 95 100 80 Q 115 60 105 48" fill="none" stroke="#ff9f43" stroke-width="8" stroke-linecap="round"/>
              <path d="M 85 65 Q 100 65 125 70" fill="none" stroke="#54a0ff" stroke-width="3" stroke-dasharray="4,4"/>
              <polygon points="125,65 133,70 125,75" fill="#54a0ff"/>
            </svg>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <button class="btn btn-sm btn-secondary" onclick="playTone('zhi1')">🔊 zh (จ-ม้วนลิ้น)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('chi1')">🔊 ch (ช-พ่นลม)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('shi1')">🔊 sh (ซ-ม้วนลิ้น)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('ri1')">🔊 r (ย/ร-ม้วนลิ้น)</button>
          </div>
        `;
      } else if (tEn.includes('Palatal')) {
        html += `
          <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
            <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
              <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
              <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
              <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
              <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
              <path d="M 40 100 Q 75 90 63 78" fill="none" stroke="#10ac84" stroke-width="8" stroke-linecap="round"/>
              <path d="M 140 70 Q 155 85 170 70" fill="none" stroke="#feca57" stroke-width="3"/>
            </svg>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <button class="btn btn-sm btn-secondary" onclick="playTone('ji1')">🔊 j (จิ)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('qi1')">🔊 q (ชิ-พ่นลม)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('xi1')">🔊 x (ซิ)</button>
          </div>
        `;
      } else if (tEn.includes('Dental')) {
        html += `
          <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
            <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
              <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
              <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
              <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
              <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
              <path d="M 40 100 Q 75 90 63 46" fill="none" stroke="#54a0ff" stroke-width="8" stroke-linecap="round"/>
            </svg>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
            <button class="btn btn-sm btn-secondary" onclick="playTone('zi1')">🔊 z (จึ)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('ci1')">🔊 c (ชึ-พ่นลม)</button>
            <button class="btn btn-sm btn-secondary" onclick="playTone('si1')">🔊 s (ซึ)</button>
          </div>
        `;
      }
      
      html += `<p style="margin-bottom: 1rem;">${explanation.replace(/\n/g, '<br>')}</p>`;
      
      g.examples.forEach(ex => {
        let exEn = (state.currentLanguage === 'th' && ex.th) ? ex.th : ex.en;
        html += `<div class="example-box" style="margin-bottom: 0.5rem;">
          <div class="example-cn">${ex.cn}</div>
          <div class="example-py">${ex.py}</div>
          <div class="example-en">${exEn}</div>
        </div>`;
      });
      
      if (g.practice && g.practice.prompt) {
         const pId = `grammar-prac-${idx}`;
         let wordsHtml = '';
         if(g.practice.words && g.practice.words.length > 0) {
           wordsHtml = `
             <div class="grammar-practice-area" id="${pId}-area">
               <div class="grammar-answer-box" id="${pId}-answer-box" style="min-height: 40px; padding: 0.5rem; margin: 0.5rem 0; border: 2px dashed var(--glass-border-focus); border-radius: 8px; display: flex; gap: 0.5rem; flex-wrap: wrap;"></div>
               <div class="grammar-word-bank" id="${pId}-word-bank" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                 ${g.practice.words.map((w, wIdx) => `<button class="btn btn-secondary btn-sm prac-word-btn" data-word="${w}">${w}</button>`).join('')}
               </div>
               <button class="btn btn-primary btn-sm check-prac-btn" data-pid="${pId}" data-answer='${JSON.stringify(g.practice.answer)}'>${t('btn_check_answer')}</button>
               <button class="btn btn-secondary btn-sm show-prac-btn" data-pid="${pId}" data-answer='${JSON.stringify(g.practice.answer)}' style="margin-left: 0.5rem;">${t('btn_show_answer')}</button>
               <span class="prac-feedback" id="${pId}-feedback" style="margin-left: 1rem; font-weight: bold;"></span>
             </div>
           `;
         }
         
         html += `
           <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,245,212,0.05); border: 1px solid rgba(0,245,212,0.2); border-radius: 8px;">
             <strong style="color: var(--primary);">🎯 ${g.practice.prompt}</strong>
             ${wordsHtml}
           </div>
         `;
      }
      
      div.innerHTML = html;
      container.appendChild(div);
    });
    
    // Bind practice listeners
    document.querySelectorAll('.prac-word-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
         const btnEl = e.target;
         const container = btnEl.closest('.grammar-practice-area');
         const answerBox = container.querySelector('.grammar-answer-box');
         const bank = container.querySelector('.grammar-word-bank');
         
         if (btnEl.parentElement === bank) {
           answerBox.appendChild(btnEl);
         } else {
           bank.appendChild(btnEl);
         }
      });
    });
    
    document.querySelectorAll('.check-prac-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target;
        const pId = btnEl.getAttribute('data-pid');
        const correctAnswer = JSON.parse(btnEl.getAttribute('data-answer'));
        
        const answerBox = document.getElementById(`${pId}-answer-box`);
        const userWords = Array.from(answerBox.children).map(c => c.getAttribute('data-word'));
        
        const feedback = document.getElementById(`${pId}-feedback`);
        if (JSON.stringify(userWords) === JSON.stringify(correctAnswer)) {
          feedback.textContent = t('msg_correct') + " 🎉";
          feedback.style.color = "var(--success)";
          answerBox.style.borderColor = "var(--success)";
          state.score += 20;
          updateDashboardStats();
        } else {
          feedback.textContent = t('msg_try_again');
          feedback.style.color = "var(--error)";
          answerBox.style.borderColor = "var(--error)";
        }
      });
    });

    document.querySelectorAll('.show-prac-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.target;
        const pId = btnEl.getAttribute('data-pid');
        const correctAnswer = JSON.parse(btnEl.getAttribute('data-answer'));
        
        const answerBox = document.getElementById(`${pId}-answer-box`);
        const bank = document.getElementById(`${pId}-word-bank`);
        
        answerBox.innerHTML = '';
        correctAnswer.forEach(word => {
          const matchedBtn = Array.from(bank.children).find(c => c.getAttribute('data-word') === word);
          if (matchedBtn) {
            answerBox.appendChild(matchedBtn);
          } else {
            const newBtn = document.createElement('button');
            newBtn.className = 'btn btn-secondary btn-sm prac-word-btn';
            newBtn.setAttribute('data-word', word);
            newBtn.textContent = word;
            answerBox.appendChild(newBtn);
          }
        });
        
        const feedback = document.getElementById(`${pId}-feedback`);
        feedback.textContent = t('msg_correct') + " 🎉";
        feedback.style.color = "var(--success)";
        answerBox.style.borderColor = "var(--success)";
      });
    });
  }

function renderDialoguePane() {
    const container = document.getElementById('dialogue-bubbles-container');
    container.innerHTML = '';
    
    state.currentLesson.dialogue.lines.forEach(line => {
      const div = document.createElement('div');
      div.className = 'dialogue-line glass-panel';
      
      let avatarHtml = '';
      if (line.speaker === 'A') {
         avatarHtml = `
           <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
             <div class="dialogue-avatar" style="background: var(--primary);">👦</div>
             <button class="btn btn-secondary btn-sm dialogue-line-speak-btn" data-text="${line.cn.replace(/'/g, "&apos;")}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; opacity: 0.7;">🔈</button>
           </div>
         `;
      } else {
         div.style.flexDirection = 'row-reverse';
         div.style.textAlign = 'right';
         avatarHtml = `
           <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
             <div class="dialogue-avatar" style="background: var(--accent);">👧</div>
             <button class="btn btn-secondary btn-sm dialogue-line-speak-btn" data-text="${line.cn.replace(/'/g, "&apos;")}" style="padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; opacity: 0.7;">🔈</button>
           </div>
         `;
      }
      
      let trans = (state.currentLanguage === 'th') ? (line.th || '') : line.en;
      let textHtml = `
        <div style="flex: 1; padding: 0 1rem;">
          <div class="dialogue-text">${line.cn}</div>
          <div class="dialogue-py">${line.py}</div>
          <div class="dialogue-en">${trans}</div>
        </div>
      `;
      
      if (line.speaker === 'A') {
         div.innerHTML = avatarHtml + textHtml;
      } else {
         div.innerHTML = textHtml + avatarHtml;
      }
      
      container.appendChild(div);
    });

    document.querySelectorAll('.dialogue-line-speak-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        speakText(btn.getAttribute('data-text'));
      };
    });
  }

function generatePostLessonQuiz(vocab) {
  const generatedQuiz = [];
  if (!vocab || vocab.length === 0) return generatedQuiz;

  // Maximum 15 questions, exactly 1 question per vocabulary word to prevent duplicates
  let qCount = Math.min(15, vocab.length);
  
  // Shuffle vocab so the order is randomized
  const shuffledVocab = [...vocab].sort(() => Math.random() - 0.5);

  for (let i = 0; i < qCount; i++) {
    const target = shuffledVocab[i];
    // Defensive check (Lesson Learned): skip malformed vocab to prevent nonsense questions
    if (!target || !target.meaning || target.meaning === target.character) {
        continue;
    }
    // HSK Exam Mock Styles:
    // 0 = True/False (Reading Part 1 Mock) - Show character, meaning, ask True/False
    // 1 = Multiple Choice Listening (Listening Part 3/4 Mock) - Listen, choose correct meaning
    // 2 = Multiple Choice Reading (Reading Part 2 Mock) - Match meaning to character
    const qType = Math.floor(Math.random() * 3); 
    
    let questionText = "";
    let questionTextTh = "";
    let answerVal = "";
    let answerValTh = "";
    let explanationText = "";
    let explanationTextTh = "";
    let options = [];
    let optionsTh = [];
    let qTypeStr = "text";
    let testWordStr = target.character;

    if (qType === 0) {
      qTypeStr = "true_false"; // Custom type for UI if handled, else fallback to text options
      // 50% chance to be true, 50% false
      const isTrue = Math.random() > 0.5;
      let displayMeaning = target.meaning;
      let displayMeaningTh = target.meaning_th || target.meaning;
      
      if (!isTrue && vocab.length > 1) {
          // pick a wrong meaning
          let wrongVocab = vocab.filter(v => v.character !== target.character);
          let wrongChoice = wrongVocab[Math.floor(Math.random() * wrongVocab.length)];
          displayMeaning = wrongChoice.meaning;
          displayMeaningTh = wrongChoice.meaning_th || wrongChoice.meaning;
      }
      
      questionText = `Does ${target.character} mean "${displayMeaning}"?`;
      questionTextTh = `คำว่า ${target.character} แปลว่า "${displayMeaningTh}" ใช่หรือไม่?`;
      answerVal = isTrue ? "True" : "False";
      answerValTh = isTrue ? "ใช่" : "ไม่ใช่";
      explanationText = `${target.character} (${target.pinyin}) means "${target.meaning}".`;
      explanationTextTh = `${target.character} (${target.pinyin}) แปลว่า "${target.meaning_th || target.meaning}".`;
      
      options = ["True", "False"];
      optionsTh = ["ใช่", "ไม่ใช่"];
      
    } else if (qType === 1) {
      qTypeStr = "listening";
      questionText = "Listen to the audio and select the correct meaning:";
      questionTextTh = "ฟังเสียงแล้วเลือกความหมายที่ถูกต้อง:";
      answerVal = target.meaning;
      answerValTh = target.meaning_th || target.meaning;
      explanationText = `You heard ${target.pinyin} (${target.character}), meaning "${target.meaning}".`;
      explanationTextTh = `คุณได้ยิน ${target.pinyin} (${target.character}) แปลว่า "${target.meaning_th || target.meaning}".`;
      
      const optPairs = [{ en: target.meaning, th: target.meaning_th || target.meaning }];
      const wrongOpts = vocab.filter(v => v.character !== target.character).sort(() => Math.random() - 0.5);
      for(let w of wrongOpts) {
          if(optPairs.length < 4) optPairs.push({ en: w.meaning, th: w.meaning_th || w.meaning });
      }
      
      optPairs.sort(() => Math.random() - 0.5);
      options = optPairs.map(o => o.en);
      optionsTh = optPairs.map(o => o.th);

    } else if (qType === 2) {
      qTypeStr = "text";
      questionText = `Which character means "${target.meaning}"?`;
      questionTextTh = `ตัวอักษรใดแปลว่า "${target.meaning_th || target.meaning}"?`;
      answerVal = target.character;
      answerValTh = target.character;
      explanationText = `${target.character} is the character for "${target.meaning}".`;
      explanationTextTh = `${target.character} คือตัวอักษรของ "${target.meaning_th || target.meaning}".`;
      
      const charOpts = [target.character];
      const wrongOpts = vocab.filter(v => v.character !== target.character).sort(() => Math.random() - 0.5);
      for(let w of wrongOpts) {
          if(charOpts.length < 4) charOpts.push(w.character);
      }
      charOpts.sort(() => Math.random() - 0.5);
      options = charOpts;
      optionsTh = charOpts;
    }

    generatedQuiz.push({
      type: qTypeStr,
      testWord: testWordStr,
      question: questionText,
      question_th: questionTextTh,
      answer: answerVal,
      answer_th: answerValTh,
      explanation: explanationText,
      explanation_th: explanationTextTh,
      options: options,
      options_th: optionsTh
    });
  }
  return generatedQuiz;
}
function renderQuizPane() {
  // Always dynamically generate the quiz to ensure sufficient length (10+ questions) and full localization
  // We ignore pre-generated DB quizzes because they often lack Thai translations for options and answers.
  state.currentLesson.quiz = generatePostLessonQuiz(state.currentLesson.vocab);
  
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswers = [];
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const questionLbl = document.getElementById('lesson-quiz-question-lbl');
  
  // The click listener is already added in initEvents(), no need to re-assign onclick here.

  if (questionLbl) {
    questionLbl.innerHTML = `<span>${t('question_progress', { current: state.quizIndex + 1, total: state.currentLesson.quiz.length })}</span>`;
  }
  
  const q = state.currentLesson.quiz[state.quizIndex];
  const qText = document.getElementById('lesson-quiz-text');
  
  if (q.type === 'audio') {
    qText.innerHTML = `<span style="font-size: 2rem;">🔊</span> <br/> ${t('listen_select')}`;
  } else if (q.type === 'listening') {
    qText.innerHTML = `
      <div style="text-align: center; margin-bottom: 1rem;">
        <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem;">${t('listen_select')}</p>
        <button id="quiz-audio-trigger-btn" class="audio-btn" style="width:60px; height:60px; font-size:1.5rem;">🔊</button>
      </div>
    `;
    setTimeout(() => {
      const btn = document.getElementById('quiz-audio-trigger-btn');
      if (btn) {
        btn.addEventListener('click', () => speakText(q.testWord));
        speakText(q.testWord);
      }
    }, 10);
  } else {
    qText.textContent = ld(q, 'question');
  }
  
  const opts = document.getElementById('lesson-quiz-options');
  opts.innerHTML = '';
  document.getElementById('lesson-quiz-explanation-box').classList.add('hidden');
  document.getElementById('lesson-quiz-next-btn').classList.add('hidden');
  
  // Progress bar
  const pct = (state.quizIndex / state.currentLesson.quiz.length) * 100;
  document.getElementById('lesson-quiz-progress-fill').style.width = `${pct}%`;
  
  const currentOptions = ld(q, 'options');
  currentOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.width = '100%';
    btn.style.textAlign = 'left';
    btn.style.lineHeight = '1.5';
    btn.textContent = opt;
    btn.onclick = () => handleQuizAnswer(opt, btn);
    opts.appendChild(btn);
  });
}

function handleQuizAnswer(selectedOpt, btnEl) {
  const q = state.currentLesson.quiz[state.quizIndex];
  const correctAnswer = ld(q, 'answer');
  const isCorrect = selectedOpt === correctAnswer;
  
  const opts = document.getElementById('lesson-quiz-options').querySelectorAll('button');
  opts.forEach(b => {
    b.disabled = true;
    if (b.textContent === correctAnswer) b.style.borderColor = "var(--success)";
  });
  
  if (isCorrect) {
    btnEl.classList.add("correct");
    state.quizScore++;
    document.getElementById('lesson-quiz-correctness').textContent = t('msg_correct');
    document.getElementById('lesson-quiz-correctness').style.color = "var(--success)";
  } else {
    btnEl.classList.add("incorrect");
    document.getElementById('lesson-quiz-correctness').textContent = t('msg_incorrect');
    document.getElementById('lesson-quiz-correctness').style.color = "var(--error)";
  }
  
  document.getElementById('lesson-quiz-explanation-text').textContent = ld(q, 'explanation');
  document.getElementById('lesson-quiz-explanation-box').classList.remove('hidden');
  
  const nextBtn = document.getElementById('lesson-quiz-next-btn');
  nextBtn.classList.remove('hidden');
  if (state.quizIndex === state.currentLesson.quiz.length - 1) {
    nextBtn.textContent = t('btn_finish_lesson');
  } else {
    nextBtn.textContent = t('btn_next_question');
  }
}

function nextQuizQuestion() {
  if (state.quizIndex < state.currentLesson.quiz.length - 1) {
    state.quizIndex++;
    renderQuizQuestion();
  } else {
    finishLesson();
  }
}

function finishLesson() {
  clearInterval(state.timerInterval);
  const timeSpent = 3600 - state.timerSeconds;
  state.timeSpentMinutes += Math.round(timeSpent / 60);
  
  const today = new Date().toISOString().split('T')[0];
  if (state.lastStudiedDate !== today) {
    state.streakCount++;
    state.lastStudiedDate = today;
  }
  
  if (!state.completedLessons.includes(state.currentLesson.id)) {
    state.completedLessons.push(state.currentLesson.id);
    state.score += (state.quizScore * 10);
  }
  
  saveProgress();
  
  const totalQuiz = (state.currentLesson.quiz && state.currentLesson.quiz.length) ? state.currentLesson.quiz.length : 0;
  document.getElementById('congrats-quiz-score').textContent = `${state.quizScore} / ${totalQuiz}`;
  document.getElementById('congrats-time').textContent = `${Math.floor(timeSpent/60)}m ${timeSpent%60}s`;
  
  switchView('congrats-view');
}

// ----------------------------------------------------
// DIAGNOSTIC PRE-TEST CORE LOGIC
// ----------------------------------------------------
function initPretest() {
  state.pretestIndex = 0;
  state.pretestScore = 0;
  state.pretestAnswers = [];
  
  document.getElementById("pretest-intro-screen").classList.remove('hidden');
  document.getElementById("pretest-quiz-screen").classList.add('hidden');
  document.getElementById("pretest-result-screen").classList.add('hidden');

  // Apply translations after showing the pretest view
  translateUI();
}

function loadPretestQuestion() {
  const questionsList = window.CHINESE_LESSONS.preTestQuestions;
  const totalCount = questionsList.length;
  const question = questionsList[state.pretestIndex];
  
  document.getElementById("pretest-question-number").textContent = t('question_progress', { current: state.pretestIndex + 1, total: totalCount });
  
  document.getElementById("pretest-question-level").textContent = t('hsk_benchmark_level', { level: question.level });
  document.getElementById("pretest-progress-fill").style.width = `${((state.pretestIndex) / totalCount) * 100}%`;
  
  const qText = document.getElementById('pretest-question-text');
  qText.textContent = ld(question, 'question');
  
  document.getElementById("pretest-explanation-box").classList.add('hidden');
  document.getElementById("pretest-next-btn").classList.add('hidden');
  
  const optionsBox = document.getElementById("pretest-options-container");
  optionsBox.innerHTML = "";
  
  const currentOptions = ld(question, 'options');
  currentOptions.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.marginBottom = "0.5rem";
    btn.addEventListener("click", () => selectPretestAnswer(btn, opt, idx));
    optionsBox.appendChild(btn);
  });
}

function selectPretestAnswer(button, selectedVal, selectedIdx) {
  const question = window.CHINESE_LESSONS.preTestQuestions[state.pretestIndex];
  const optionsList = document.getElementById("pretest-options-container").querySelectorAll(".quiz-option");
  
  const correctAnswer = ld(question, 'answer');

  optionsList.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctAnswer) {
      btn.style.borderColor = "var(--success)";
    }
  });
  
  const isCorrect = (selectedVal === correctAnswer);
  if (isCorrect) {
    state.pretestScore++;
    button.classList.add("correct");
  } else {
    button.classList.add("incorrect");
  }
  
  state.pretestAnswers.push({ questionId: question.id, correct: isCorrect });
  
  const expBox = document.getElementById("pretest-explanation-box");
  const expText = document.getElementById("pretest-explanation-text");
  
  expText.textContent = ld(question, 'explanation');
  expBox.classList.remove('hidden');
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").style.color = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").textContent = isCorrect ? t('msg_correct') : t('msg_incorrect');
  
  document.getElementById("pretest-next-btn").classList.remove('hidden');
}

function nextPretestQuestion() {
  const totalCount = window.CHINESE_LESSONS.preTestQuestions.length;
  state.pretestIndex++;
  if (state.pretestIndex < totalCount) {
    loadPretestQuestion();
  } else {
    document.getElementById("pretest-progress-fill").style.width = "100%";
    finishPretest();
  }
}

function finishPretest() {
  const totalCount = window.CHINESE_LESSONS.preTestQuestions.length;
  document.getElementById("pretest-quiz-screen").classList.add('hidden');
  document.getElementById("pretest-result-screen").classList.remove('hidden');
  
  document.getElementById("pretest-score-display").textContent = `${state.pretestScore} / ${totalCount}`;
  
  let finalLevel = "hsk1";
  let levelName = "HSK 1 (Beginner)";
  let levelDesc = "This level is designed for complete beginners. It focuses on essential words (like greetings, numbers, family members), simple verbs, and foundational sentence templates (questions with 吗).";
  
  if (state.pretestScore >= 5 && state.pretestScore <= 6) {
    finalLevel = "hsk2";
    levelName = "HSK 2 (Elementary)";
    levelDesc = "Perfect for learners who know basic vocabulary and want to structure their sentences. You'll learn to handle time keywords, transport modes, weather details, hobby terms, and bargain items.";
  } else if (state.pretestScore >= 7) {
    finalLevel = "hsk3";
    levelName = "HSK 3 (Intermediate)";
    levelDesc = "Great for intermediate learners ready for advanced sentence connectives. Focuses on passive markers (被), concession arguments (虽然...但是...), duration expressions, and workplace contexts.";
  }
  
  document.getElementById("recommended-level-name").textContent = levelName;
  document.getElementById("recommended-level-desc").textContent = levelDesc;
  
  state.userLevel = finalLevel;
  state.score += (state.pretestScore * 10);
  state.hasTakenPlacementTest = true;
  saveProgress();
  
  const selectLevel = document.getElementById("change-level-select");
  if (selectLevel) selectLevel.value = finalLevel;
}

// ----------------------------------------------------
// REMINDERS & DESKTOP NOTIFICATIONS
// ----------------------------------------------------
function setupDailyReminders() {
  const timeInput = document.getElementById("reminder-time-input");
  const statusMsg = document.getElementById("reminder-status-msg");
  
  if (!timeInput) return;
  state.reminderTime = timeInput.value;
  saveProgress();
  
  if (typeof Notification === 'undefined') {
    statusMsg.textContent = `⏰ Study reminder set daily for ${state.reminderTime}! (Notifications unsupported in browser fallback to alert)`;
    statusMsg.className = "reminder-status-alert text-success";
    return;
  }
  
  Notification.requestPermission().then(permission => {
    state.notificationGranted = permission === "granted";
    if (state.notificationGranted) {
      statusMsg.textContent = `⏰ Active study reminder scheduled daily at ${state.reminderTime}!`;
      statusMsg.className = "reminder-status-alert text-success";
      
      const tempNotif = new Notification("HanPath Reminders Configured!", {
        body: `We will remind you daily at ${state.reminderTime} to complete your 1-hour study block.`,
        icon: "favicon.ico"
      });
    } else {
      statusMsg.textContent = `⏰ Reminder saved for ${state.reminderTime}, but notification permission was denied. We will use fallback alerts.`;
      statusMsg.className = "reminder-status-alert text-warning";
    }
  });
}

function checkDailyReminder() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  
  const todayDateStr = now.toISOString().split('T')[0];
  
  if (currentTimeStr === state.reminderTime) {
    if (state.lastReminderDate !== todayDateStr) {
      state.lastReminderDate = todayDateStr;
      saveProgress();
      
      showCurriculumMilestoneNotification(
        "HanPath Chinese Study Time! 📚",
        "It's time for your daily 1-hour Chinese lesson. Let's keep your streak active!"
      );
      
      speakText("该学习中文了，让我们开始今天的课程吧。");
    }
  }
}

function showCurriculumMilestoneNotification(title, message) {
  if (state.notificationGranted && typeof Notification !== 'undefined') {
    try {
      new Notification(title, {
        body: message,
        icon: "favicon.ico"
      });
      return;
    } catch (e) {
      console.warn("Notification constructor failed, falling back to alert: ", e);
    }
  }
  
  alert(`${title}\n\n${message}`);
}

// ----------------------------------------------------
// LESSON-SPECIFIC PRE-TEST LOGIC
// ----------------------------------------------------



function routeToLesson(id) {
  if (id === 'hsk1_day0') {
    startLesson('hsk1_day0');
    return;
  }
  if (!state.hasTakenPlacementTest) {
    showConfirmModal("title_confirm", "msg_pretest_rec", () => {
      switchView("pretest-view");
      initPretest();
    });
    // Add cancel handler to proceed if they skip
    const cancelBtn = document.getElementById('custom-confirm-cancel');
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener('click', () => {
      document.getElementById('custom-confirm-modal').classList.add('hidden');
      startLessonPretest(id);
    });
  } else {
    startLessonPretest(id);
  }
}
  
  function startLessonPretest(id) {
  state.currentLessonId = id;
  
  // Fetch full lesson data from server so we have the vocab array for generating questions
  fetch(`/api/lessons/${id}`)
    .then(res => res.json())
    .then(data => {
      state.pretestLesson = data;
      
      if (!state.pretestLesson || !state.pretestLesson.vocab) {
        alert("Lesson data could not be loaded properly.");
        return;
      }

      document.getElementById("lesson-pretest-intro-screen").classList.remove('hidden');
      document.getElementById("lesson-pretest-quiz-screen").classList.add('hidden');
      document.getElementById("lesson-pretest-result-screen").classList.add('hidden');

      document.getElementById("lesson-pretest-intro-title").textContent = t('lesson_pretest_intro_title') + ": " + state.pretestLesson.title;

      switchView("lesson-pretest-view");
    })
    .catch(err => {
      console.error("Failed to load full lesson data for pretest:", err);
      alert(t('error_load_lesson'));
    });
}

function startLessonPretestQuiz() {
  state.lessonPretestIndex = 0;
  state.lessonPretestScore = 0;
  state.lessonPretestQuestions = [];

  const vocab = state.pretestLesson.vocab;
  const qCount = Math.min(3, vocab.length);

  for (let i = 0; i < qCount; i++) {
    const target = vocab[i];
    const qType = Math.floor(Math.random() * 4); // 0 = meaning, 1 = pinyin, 2 = character, 3 = listening
    let questionText = "";
    let questionTextTh = "";
    let answerVal = "";
    let answerValTh = "";
    let explanationText = "";
    let explanationTextTh = "";
    let optPairs = [];
    let qTypeStr = "text";
    let testWordStr = "";

    if (qType === 0) {
      questionText = `What is the meaning of ${target.character}?`;
      questionTextTh = `คำว่า ${target.character} แปลว่าอะไร?`;
      answerVal = target.meaning;
      answerValTh = target.meaning_th || target.meaning;
      explanationText = `${target.character} (${target.pinyin}) means ${target.meaning}.`;
      explanationTextTh = `${target.character} (${target.pinyin}) แปลว่า ${target.meaning_th || target.meaning}.`;
      
      optPairs.push({ en: target.meaning, th: target.meaning_th || target.meaning });
      vocab.forEach(v => {
        if (v.meaning !== target.meaning && optPairs.length < 4) {
          optPairs.push({ en: v.meaning, th: v.meaning_th || v.meaning });
        }
      });
      while (optPairs.length < 4) {
        optPairs.push({ en: "To listen " + optPairs.length, th: "ฟัง " + optPairs.length });
      }
    } else if (qType === 1) {
      questionText = `What is the pinyin for ${target.character} (${target.meaning})?`;
      questionTextTh = `พินอินของ ${target.character} (${target.meaning_th || target.meaning}) คืออะไร?`;
      answerVal = target.pinyin;
      answerValTh = target.pinyin;
      explanationText = `${target.character} is pronounced ${target.pinyin}.`;
      explanationTextTh = `${target.character} ออกเสียงว่า ${target.pinyin}.`;
      
      optPairs.push({ en: target.pinyin, th: target.pinyin });
      vocab.forEach(v => {
        if (v.pinyin !== target.pinyin && optPairs.length < 4) {
          optPairs.push({ en: v.pinyin, th: v.pinyin });
        }
      });
      while (optPairs.length < 4) {
        optPairs.push({ en: "pīn" + optPairs.length, th: "pīn" + optPairs.length });
      }
    } else if (qType === 2) {
      questionText = `Which character means ${target.meaning}?`;
      questionTextTh = `ตัวอักษรใดแปลว่า ${target.meaning_th || target.meaning}?`;
      answerVal = target.character;
      answerValTh = target.character;
      explanationText = `${target.character} means ${target.meaning}.`;
      explanationTextTh = `${target.character} แปลว่า ${target.meaning_th || target.meaning}.`;
      
      optPairs.push({ en: target.character, th: target.character });
      vocab.forEach(v => {
        if (v.character !== target.character && optPairs.length < 4) {
          optPairs.push({ en: v.character, th: v.character });
        }
      });
      while (optPairs.length < 4) {
        optPairs.push({ en: "字" + optPairs.length, th: "字" + optPairs.length });
      }
    } else {
      qTypeStr = "listening";
      testWordStr = target.character;
      questionText = `Listen and select the correct meaning:`;
      questionTextTh = `ฟังเสียงแล้วเลือกความหมายที่ถูกต้อง:`;
      answerVal = target.meaning;
      answerValTh = target.meaning_th || target.meaning;
      explanationText = `You heard ${target.pinyin} (${target.character}), meaning ${target.meaning}.`;
      explanationTextTh = `คุณได้ยิน ${target.pinyin} (${target.character}) แปลว่า ${target.meaning_th || target.meaning}.`;
      
      optPairs.push({ en: target.meaning, th: target.meaning_th || target.meaning });
      vocab.forEach(v => {
        if (v.meaning !== target.meaning && optPairs.length < 4) {
          optPairs.push({ en: v.meaning, th: v.meaning_th || v.meaning });
        }
      });
      while (optPairs.length < 4) {
        optPairs.push({ en: "Meaning " + optPairs.length, th: "ความหมาย " + optPairs.length });
      }
    }

    // Shuffle options
    optPairs.sort(() => Math.random() - 0.5);
    const correctIndex = optPairs.findIndex(opt => opt.en === answerVal);

    state.lessonPretestQuestions.push({
      type: qTypeStr,
      testWord: testWordStr,
      question: questionText,
      question_th: questionTextTh,
      answer: answerVal,
      answer_th: answerValTh,
      explanation: explanationText,
      explanation_th: explanationTextTh,
      options: optPairs.map(o => o.en),
      options_th: optPairs.map(o => o.th),
      correctIndex: correctIndex
    });
  }

  loadLessonPretestQuestion();
}

function loadLessonPretestQuestion() {
  const q = state.lessonPretestQuestions[state.lessonPretestIndex];
  const totalCount = state.lessonPretestQuestions.length;

  
  document.getElementById("lesson-pretest-question-number").textContent = t('question_progress', { current: state.lessonPretestIndex + 1, total: totalCount });
  document.getElementById("lesson-pretest-progress-fill").style.width = `${(state.lessonPretestIndex / totalCount) * 100}%`;

  const qText = document.getElementById("lesson-pretest-question-text");
  
  if (q.type === 'listening') {
    qText.innerHTML = `
      <div style="text-align: center; margin-bottom: 1rem;">
        <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1rem;">${ld(q, 'question')}</p>
        <button id="lesson-pretest-audio-btn" class="audio-btn" style="width:60px; height:60px; font-size:1.5rem;">🔊</button>
      </div>
    `;
    setTimeout(() => {
      const btn = document.getElementById('lesson-pretest-audio-btn');
      if (btn) {
        btn.addEventListener('click', () => speakText(q.testWord));
        speakText(q.testWord);
      }
    }, 10);
  } else {
    qText.textContent = ld(q, 'question');
  }

  const container = document.getElementById("lesson-pretest-options-container");
  container.innerHTML = "";

  document.getElementById("lesson-pretest-explanation-box").classList.add('hidden');
  document.getElementById("lesson-pretest-next-btn").classList.add('hidden');

  const currentOptions = ld(q, 'options');
  currentOptions.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.marginBottom = "0.5rem";
    btn.onclick = () => selectLessonPretestAnswer(btn, opt, idx);
    container.appendChild(btn);
  });
}

function selectLessonPretestAnswer(button, selectedVal, selectedIdx) {
  const q = state.lessonPretestQuestions[state.lessonPretestIndex];
  const options = document.getElementById("lesson-pretest-options-container").querySelectorAll(".quiz-option");

  options.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.correctIndex) {
      btn.style.borderColor = "var(--success)";
    }
  });

  const isCorrect = selectedIdx === q.correctIndex;
  if (isCorrect) {
    state.lessonPretestScore++;
    button.style.background = "rgba(0, 245, 212, 0.1)";
    button.style.borderColor = "var(--success)";
  } else {
    button.style.background = "rgba(255, 77, 109, 0.1)";
    button.style.borderColor = "var(--error)";
  }

  const expBox = document.getElementById("lesson-pretest-explanation-box");
  const expText = document.getElementById("lesson-pretest-explanation-text");
  expText.textContent = ld(q, 'explanation');
  expBox.classList.remove('hidden');
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").style.color = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").textContent = isCorrect ? t('msg_correct') : t('msg_incorrect');

  const nextBtn = document.getElementById("lesson-pretest-next-btn");
  nextBtn.classList.remove('hidden');
  if (state.lessonPretestIndex === state.lessonPretestQuestions.length - 1) {
    nextBtn.textContent = t('btn_next_question');
  } else {
    nextBtn.textContent = t('btn_next_question');
  }
}

function nextLessonPretestQuestion() {
  if (state.lessonPretestIndex < state.lessonPretestQuestions.length - 1) {
    state.lessonPretestIndex++;
    loadLessonPretestQuestion();
  } else {
    finishLessonPretest();
  }
}

function finishLessonPretest() {
  document.getElementById("lesson-pretest-quiz-screen").classList.add('hidden');
  document.getElementById("lesson-pretest-result-screen").classList.remove('hidden');

  const score = state.lessonPretestScore;
  const total = state.lessonPretestQuestions.length;

  document.getElementById("lesson-pretest-score-display").textContent = `${score} / ${total}`;

  const recTitle = document.getElementById("lesson-pretest-recommendation-title");
  const recDesc = document.getElementById("lesson-pretest-recommendation-desc");
  const skipBtn = document.getElementById("lesson-pretest-skip-lesson-btn");

  if (score === total) {
    recTitle.textContent = t('pretest_result_perfect');
    recTitle.style.color = "var(--success)";
    recDesc.textContent = t('pretest_result_perfect_desc');
    skipBtn.classList.remove('hidden');
  } else {
    recTitle.textContent = t('pretest_result_ready');
    recTitle.style.color = "var(--primary)";
    recDesc.textContent = t('pretest_result_ready_desc', { score: score, total: total });
    skipBtn.classList.add('hidden');
  }
}

// --- PINYIN CHART LOGIC ---
let pinyinMatrixData = null;

const tonePairsData = [
  { pair: "1 + 1", pinyin: "jīntiān", cn: "今天", th: "วันนี้", en: "Today", contour: "— —", play: "jintian" },
  { pair: "1 + 2", pinyin: "jīnnián", cn: "今年", th: "ปีนี้", en: "This year", contour: "— /", play: "jinnian" },
  { pair: "1 + 3", pinyin: "chīfàn", cn: "吃饭", th: "กินข้าว", en: "Eat a meal", contour: "— \\/", play: "chifan" },
  { pair: "1 + 4", pinyin: "bāngzhù", cn: "帮助", th: "ช่วยเหลือ", en: "To help", contour: "— \\", play: "bangzhu" },
  { pair: "1 + 0", pinyin: "māma", cn: "妈妈", th: "แม่", en: "Mom", contour: "— ·", play: "mama" },
  
  { pair: "2 + 1", pinyin: "míngtiān", cn: "明天", th: "พรุ่งนี้", en: "Tomorrow", contour: "/ —", play: "mingtian" },
  { pair: "2 + 2", pinyin: "tóngxué", cn: "同学", th: "เพื่อนนักเรียน", en: "Classmate", contour: "/ /", play: "tongxue" },
  { pair: "2 + 3", pinyin: "hánjiǎ", cn: "寒假", th: "ปิดเทอมฤดูหนาว", en: "Winter vacation", contour: "/ \\/", play: "hanjia" },
  { pair: "2 + 4", pinyin: "shídài", cn: "时代", th: "ยุคสมัย", en: "Era", contour: "/ \\", play: "shidai" },
  { pair: "2 + 0", pinyin: "yéye", cn: "爷爷", th: "คุณปู่", en: "Grandpa", contour: "/ ·", play: "yeye" },

  { pair: "3 + 1", pinyin: "hǎochī", cn: "好吃", th: "อร่อย", en: "Delicious", contour: "\\/ —", play: "haochi" },
  { pair: "3 + 2", pinyin: "zǐxì", cn: "仔细", th: "ละเอียดรอบคอบ", en: "Careful", contour: "\\/ /", play: "zixi" },
  { pair: "3 + 3 (Sandhi)", pinyin: "nǐhǎo", cn: "你好", th: "สวัสดี (เปลี่ยนเป็น 2+3)", en: "Hello (pronounced níhǎo)", contour: "/ \\/", play: "nihao" },
  { pair: "3 + 4", pinyin: "hǎokàn", cn: "好看", th: "ดูดี/สวย", en: "Good-looking", contour: "\\/ \\", play: "haokan" },
  { pair: "3 + 0", pinyin: "xǐhuan", cn: "喜欢", th: "ชอบ", en: "To like", contour: "\\/ ·", play: "xihuan" },

  { pair: "4 + 1", pinyin: "dàjiā", cn: "大家", th: "ทุกคน", en: "Everyone", contour: "\\ —", play: "dajia" },
  { pair: "4 + 2", pinyin: "dàxué", cn: "大学", th: "มหาวิทยาลัย", en: "University", contour: "\\ /", play: "daxue" },
  { pair: "4 + 3", pinyin: "dàxiǎo", cn: "大小", th: "ขนาด", en: "Size", contour: "\\ \\/", play: "daxia" },
  { pair: "4 + 4", pinyin: "zàijiàn", cn: "再见", th: "ลาก่อน", en: "Goodbye", contour: "\\ \\", play: "zaijian" },
  { pair: "4 + 0", pinyin: "xièxie", cn: "谢谢", th: "ขอบคุณ", en: "Thank you", contour: "\\ ·", play: "xiexie" }
];

window.switchPinyinTab = function(tabName) {
  const tabs = ['matrix', 'mouth', 'rules', 'pairs', 'typing'];
  tabs.forEach(t => {
    const content = document.getElementById(`pinyin-tab-${t}-content`);
    const btn = document.getElementById(`pinyin-tab-${t}-btn`);
    if (t === tabName) {
      if (content) content.classList.remove('hidden');
      if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
    } else {
      if (content) content.classList.add('hidden');
      if (btn) { btn.classList.add('btn-secondary'); btn.classList.remove('btn-primary', 'active'); }
    }
  });
  if (tabName === 'typing') {
    initPinyinTypingGame();
  }
};

let currentTypingTarget = null;
const pinyinTypingBank = [
  { cn: "你好", pinyin: "nihao", pyFormatted: "nǐhǎo", en: "Hello", th: "สวัสดี", distractor: ["你号", "拟好", "泥好"] },
  { cn: "谢谢", pinyin: "xiexie", pyFormatted: "xièxie", en: "Thank you", th: "ขอบคุณ", distractor: ["写写", "斜斜", "些些"] },
  { cn: "再见", pinyin: "zaijian", pyFormatted: "zàijiàn", en: "Goodbye", th: "ลาก่อน", distractor: ["在件", "ใน见", "在建"] },
  { cn: "今天", pinyin: "jintian", pyFormatted: "jīntiān", en: "Today", th: "วันนี้", distractor: ["斤天", "金天", "津天"] },
  { cn: "明天", pinyin: "mingtian", pyFormatted: "míngtiān", en: "Tomorrow", th: "พรุ่งนี้", distractor: ["名天", "铭天", "鸣天"] },
  { cn: "妈妈", pinyin: "mama", pyFormatted: "māma", en: "Mom", th: "แม่", distractor: ["麻麻", "马马", "骂骂"] },
  { cn: "同学", pinyin: "tongxue", pyFormatted: "tóngxué", en: "Classmate", th: "เพื่อนนักเรียน", distractor: ["童学", "桐学", "同雪"] },
  { cn: "帮助", pinyin: "bangzhu", pyFormatted: "bāngzhù", en: "To help", th: "ช่วยเหลือ", distractor: ["棒竹", "榜主", "帮住"] }
];

window.initPinyinTypingGame = function() {
  const target = pinyinTypingBank[Math.floor(Math.random() * pinyinTypingBank.length)];
  currentTypingTarget = target;
  
  const promptCn = document.getElementById('typing-prompt-cn');
  const promptDesc = document.getElementById('typing-prompt-desc');
  const input = document.getElementById('pinyin-typing-input');
  const candidatesBox = document.getElementById('pinyin-typing-candidates');
  const feedback = document.getElementById('pinyin-typing-feedback');
  
  if (!promptCn || !input || !candidatesBox) return;
  
  const lang = state.currentLanguage || 'en';
  const descText = lang === 'th' ? target.th : target.en;
  
  // Hide Hanzi initially to create an authentic learning challenge!
  promptCn.textContent = '❓ ❓';
  promptDesc.innerHTML = `
    <div style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--accent);">
      ${lang === 'th' ? 'พิมพ์พินอินของคำว่า:' : 'Type Pinyin for:'} <strong>"${descText}"</strong>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="speakText('${target.cn}')" style="margin-bottom: 0.5rem;">🔊 Listen Audio (ฟังเสียง)</button>
  `;
  
  input.value = '';
  candidatesBox.innerHTML = '';
  feedback.textContent = '';
  feedback.style.color = '';
  
  input.oninput = () => {
    const val = input.value.trim().toLowerCase();
    candidatesBox.innerHTML = '';
    if (val === target.pinyin) {
      const candidates = [target.cn, ...target.distractor].sort(() => Math.random() - 0.5);
      candidates.forEach((cand, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.style.cssText = 'font-size: 1.2rem; padding: 0.5rem 1rem; border-color: var(--primary);';
        btn.textContent = `${idx + 1}. ${cand}`;
        btn.onclick = () => {
          if (cand === target.cn) {
            promptCn.textContent = target.cn; // Reveal Hanzi on success!
            feedback.textContent = lang === 'th' ? `🎉 ถูกต้อง! (${target.cn} = ${target.pyFormatted})` : `🎉 Correct! (${target.cn} = ${target.pyFormatted})`;
            feedback.style.color = '#10ac84';
            speakText(target.cn);
          } else {
            feedback.textContent = lang === 'th' ? '❌ ยังไม่ถูกต้อง ลองใหม่อีกครั้ง!' : '❌ Incorrect candidate, try again!';
            feedback.style.color = '#ff6b6b';
          }
        };
        candidatesBox.appendChild(btn);
      });
    }
  };
};

async function initPinyinChart() {
  try {
    // 0ms Memory Cache for Instant Language Toggle
    if (state.pinyinLessonData) {
      renderPinyinRules(state.pinyinLessonData.grammar);
    } else {
      const rulesRes = await fetch('/api/lessons/hsk1_day0');
      if (rulesRes.ok) {
        state.pinyinLessonData = await rulesRes.json();
        renderPinyinRules(state.pinyinLessonData.grammar);
      }
    }

    // Load Matrix if not loaded
    if (!pinyinMatrixData) {
      const matrixRes = await fetch('/pinyin_data.json');
      if (matrixRes.ok) {
        pinyinMatrixData = await matrixRes.json();
        renderPinyinMatrix(pinyinMatrixData);
      }
    }

    // Render Tone Pairs
    renderTonePairs();
  } catch (err) {
    console.error('Failed to load Pinyin chart data', err);
  }
}

function renderTonePairs() {
  const container = document.getElementById('pinyin-tone-pairs-container');
  if (!container) return;
  const lang = state.currentLanguage || 'en';
  container.innerHTML = '';

  tonePairsData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'glass-panel';
    card.style.cssText = 'padding: 1rem; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; border-top: 3px solid var(--accent-color, #feca57);';
    card.onmouseover = () => { card.style.transform = 'translateY(-3px)'; };
    card.onmouseout = () => { card.style.transform = 'none'; };
    card.onclick = () => speakText(item.cn);

    const desc = lang === 'th' ? item.th : item.en;
    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
        <span class="badge" style="background: rgba(254, 202, 87, 0.2); color: #feca57; font-weight: bold;">Tone ${item.pair}</span>
        <span style="font-family: monospace; color: #54a0ff; font-weight: bold;">${item.contour}</span>
      </div>
      <div style="font-size: 1.4rem; font-weight: bold; margin-bottom: 0.2rem;">${item.cn} <span style="font-size: 1.1rem; color: var(--accent-orange, #ff9f43); font-weight: normal;">(${item.pinyin})</span></div>
      <div style="font-size: 0.88rem; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between;">
        <span>${desc}</span>
        <span style="font-size: 1.1rem;">🔊</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPinyinRules(rules) {
  if (!rules || rules.length === 0) return;

  const mouthContainer = document.getElementById('pinyin-mouth-container');
  const rulesContainer = document.getElementById('pinyin-rules-container');
  const typingContainer = document.getElementById('pinyin-typing-rule-container');

  if (mouthContainer) mouthContainer.innerHTML = '';
  if (rulesContainer) rulesContainer.innerHTML = '';
  if (typingContainer) typingContainer.innerHTML = '';

  rules.forEach((rule, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-panel rule-card';
    card.style.cssText = 'padding: 1.25rem; border-left: 4px solid var(--accent, #00f5d4);';
    
    const title = ld(rule, 'title');
    const explanation = ld(rule, 'explanation');
    const tEn = rule.title || rule.title_en || '';
    
    let svgGraphicHtml = '';
    if (tEn.includes('Retroflex')) {
      card.style.borderLeftColor = 'var(--accent-orange, #ff9f43)';
      svgGraphicHtml = `
        <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
          <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
            <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
            <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
            <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
            <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
            <path d="M 40 100 Q 80 95 100 80 Q 115 60 105 48" fill="none" stroke="#ff9f43" stroke-width="8" stroke-linecap="round"/>
            <path d="M 85 65 Q 100 65 125 70" fill="none" stroke="#54a0ff" stroke-width="3" stroke-dasharray="4,4"/>
            <polygon points="125,65 133,70 125,75" fill="#54a0ff"/>
          </svg>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn btn-sm btn-secondary" onclick="playTone('zhi1')">🔊 zh</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('chi1')">🔊 ch</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('shi1')">🔊 sh</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('ri1')">🔊 r</button>
        </div>
      `;
    } else if (tEn.includes('Palatal')) {
      card.style.borderLeftColor = 'var(--accent-green, #10ac84)';
      svgGraphicHtml = `
        <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
          <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
            <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
            <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
            <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
            <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
            <path d="M 40 100 Q 75 90 63 78" fill="none" stroke="#10ac84" stroke-width="8" stroke-linecap="round"/>
            <path d="M 140 70 Q 155 85 170 70" fill="none" stroke="#feca57" stroke-width="3"/>
          </svg>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn btn-sm btn-secondary" onclick="playTone('ji1')">🔊 j</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('qi1')">🔊 q</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('xi1')">🔊 x</button>
        </div>
      `;
    } else if (tEn.includes('Dental')) {
      card.style.borderLeftColor = 'var(--accent-blue, #54a0ff)';
      svgGraphicHtml = `
        <div style="background: rgba(0,0,0,0.15); border-radius: 12px; padding: 1rem; text-align: center; margin: 1rem 0;">
          <svg width="180" height="120" viewBox="0 0 200 140" style="max-width: 100%;">
            <path d="M 30 20 Q 120 10 160 50 Q 170 80 160 110" fill="none" stroke="var(--text-secondary)" stroke-width="3" opacity="0.4"/>
            <path d="M 60 40 Q 110 30 140 50" fill="none" stroke="#fff" stroke-width="4"/>
            <rect x="55" y="38" width="8" height="12" rx="2" fill="#fff"/>
            <rect x="55" y="70" width="8" height="12" rx="2" fill="#fff"/>
            <path d="M 40 100 Q 75 90 63 46" fill="none" stroke="#54a0ff" stroke-width="8" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn btn-sm btn-secondary" onclick="playTone('zi1')">🔊 z</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('ci1')">🔊 c</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('si1')">🔊 s</button>
        </div>
      `;
    } else if (tEn.includes("ü' Vowel Sound")) {
      card.style.borderLeftColor = 'var(--accent-purple, #a29bfe)';
      svgGraphicHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1rem 0;">
          <button class="btn btn-sm btn-secondary" onclick="playTone('v1')">🔊 Tone 1 (ǖ)</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('v2')">🔊 Tone 2 (ǘ)</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('v3')">🔊 Tone 3 (ǚ)</button>
          <button class="btn btn-sm btn-secondary" onclick="playTone('v4')">🔊 Tone 4 (ǜ)</button>
        </div>
      `;
    }

    card.innerHTML = `
      <h4 style="color: var(--accent-color, #00f5d4); margin-bottom: 0.5rem;">${title}</h4>
      ${svgGraphicHtml}
      <p style="line-height: 1.6; color: var(--text-primary);">${explanation.replace(/\n/g, '<br>')}</p>
    `;

    // Robust Title-Based Categorization into Tab containers
    const isMouthGuide = tEn.includes('Retroflex') || tEn.includes('Palatal') || tEn.includes('Dental') || tEn.includes('Aspirated') || tEn.includes("ü' Vowel Sound") || tEn.includes('Nasal');
    const isTypingRule = tEn.includes('Typing') || tEn.includes('Zero-Initials');

    if (isMouthGuide && mouthContainer) {
      mouthContainer.appendChild(card);
    } else if (isTypingRule && typingContainer) {
      typingContainer.appendChild(card);
    } else if (rulesContainer) {
      rulesContainer.appendChild(card);
    }
  });
}

function renderPinyinMatrix(data) {
  const container = document.getElementById('pinyin-matrix');
  container.innerHTML = '';
  
  // +1 for the initials column
  container.style.gridTemplateColumns = `repeat(${data.finals.length + 1}, minmax(40px, 1fr))`;
  
  // Header Row
  let html = '<div class="pinyin-cell header-cell"></div>';
  data.finals.forEach(f => {
    html += `<div class="pinyin-cell header-cell">${f}</div>`;
  });
  
  // Rows
  data.initials.forEach(i => {
    html += `<div class="pinyin-cell header-cell">${i || '-'}</div>`;
    
    data.finals.forEach(f => {
      const cellData = data.matrix[i] && data.matrix[i][f];
      if (cellData) {
        const base = cellData.base;
        let popupHtml = `<div class="tones-popup">`;
        cellData.tones.forEach(tone => {
          popupHtml += `<button class="popup-tone-btn" onclick="event.stopPropagation(); playTone('${tone.pinyin}')">${tone.pinyin}</button>`;
        });
        popupHtml += `</div>`;
        html += `<div class="pinyin-cell" onclick="playTone('${cellData.tones[0].pinyin}')">${base}${popupHtml}</div>`;
      } else {
        html += '<div class="pinyin-cell empty-cell"></div>';
      }
    });
  });
  
  container.innerHTML = html;
}

const pinyinToHanziMap = {
  // Single Vowels (ā, á, ǎ, à, o, e, i, u, ü)
  'a1': '啊', 'a2': '啊', 'a3': '啊', 'a4': '啊', 'ā': '啊', 'á': '啊', 'ǎ': '啊', 'à': '啊', 'a': '啊',
  'o1': '喔', 'o2': '喔', 'o3': '喔', 'o4': '喔', 'ō': '喔', 'ó': '喔', 'ǒ': '喔', 'ò': '喔', 'o': '喔',
  'e1': '鹅', 'e2': '鹅', 'e3': '鹅', 'e4': '饿', 'ē': '鹅', 'é': '鹅', 'ě': '鹅', 'è': '饿', 'e': '鹅',
  'i1': '衣', 'i2': '移', 'i3': '椅', 'i4': '意', 'ī': '衣', 'í': '移', 'ǐ': '椅', 'ì': '意', 'i': '衣',
  'u1': '屋', 'u2': '无', 'u3': '五', 'u4': '物', 'ū': '屋', 'ú': '无', 'ǔ': '五', 'ù': '物', 'u': '屋',
  'v1': '迂', 'v2': '鱼', 'v3': '雨', 'v4': '玉', 'ǖ': '迂', 'ǘ': '鱼', 'ǚ': '雨', 'ǜ': '玉', 'ü': '迂',

  // Consonant Groups (zh, ch, sh, r, j, q, x, z, c, s)
  'zh': '知', 'zhi': '知', 'zhi1': '知', 'zhī': '知',
  'ch': '吃', 'chi': '吃', 'chi1': '吃', 'chī': '吃',
  'sh': '诗', 'shi': '诗', 'shi1': '诗', 'shī': '诗',
  'r': '日', 'ri': '日', 'ri4': '日', 'rì': '日',
  'j': '鸡', 'ji': '鸡', 'ji1': '鸡', 'jī': '鸡',
  'q': '七', 'qi': '七', 'qi1': '七', 'qī': '七',
  'x': '西', 'xi': '西', 'xi1': '西', 'xī': '西',
  'z': '资', 'zi': '资', 'zi1': '资', 'zī': '资',
  'c': '词', 'ci': '词', 'ci1': '词', 'cī': '词',
  's': '丝', 'si': '丝', 'si1': '丝', 'sī': '丝'
};

function playTone(text) {
  let cleanText = text.trim().toLowerCase();
  
  // Convert accented Pinyin to base+tone number (e.g. bā -> ba1)
  const toneMap = {
    'ā': { char: 'a', tone: '1' }, 'á': { char: 'a', tone: '2' }, 'ǎ': { char: 'a', tone: '3' }, 'à': { char: 'a', tone: '4' },
    'ē': { char: 'e', tone: '1' }, 'é': { char: 'e', tone: '2' }, 'ě': { char: 'e', tone: '3' }, 'è': { char: 'e', tone: '4' },
    'ī': { char: 'i', tone: '1' }, 'í': { char: 'i', tone: '2' }, 'ǐ': { char: 'i', tone: '3' }, 'ì': { char: 'i', tone: '4' },
    'ō': { char: 'o', tone: '1' }, 'ó': { char: 'o', tone: '2' }, 'ǒ': { char: 'o', tone: '3' }, 'ò': { char: 'o', tone: '4' },
    'ū': { char: 'u', tone: '1' }, 'ú': { char: 'u', tone: '2' }, 'ǔ': { char: 'u', tone: '3' }, 'ù': { char: 'u', tone: '4' },
    'ǖ': { char: 'v', tone: '1' }, 'ǘ': { char: 'v', tone: '2' }, 'ǚ': { char: 'v', tone: '3' }, 'ǜ': { char: 'v', tone: '4' },
    'ü': { char: 'v', tone: '5' }
  };

  let base = cleanText;
  let toneNumber = '5';

  for (const [accented, data] of Object.entries(toneMap)) {
    if (base.includes(accented)) {
      base = base.replace(accented, data.char);
      toneNumber = data.tone;
      break;
    }
  }

  // Handle zhi1 -> base: zhi, toneNumber: 1
  const numMatch = cleanText.match(/^([a-z]+)([1-5])$/);
  if (numMatch) {
    base = numMatch[1];
    toneNumber = numMatch[2];
  }

  if (/^[jqxy]/.test(base)) {
    base = base.replace(/v/g, 'u');
  }

  // 1. Try local self-hosted open-access audio asset first
  const localUrl = `/audio/pinyin/${base}${toneNumber}.mp3`;
  const audio = new Audio(localUrl);

  let fallbackTriggered = false;
  const fallbackToTTS = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    
    // Hanzi fallback guarantees 100% native Mandarin vocalization!
    const hanziText = pinyinToHanziMap[cleanText] || pinyinToHanziMap[`${base}${toneNumber}`] || pinyinToHanziMap[base] || text;
    speakText(hanziText);
  };

  audio.onerror = () => {
    // Try PurpleCulture open CDN as secondary, then Hanzi TTS as final
    const remoteUrl = `https://www.purpleculture.net/mp3/${base}${toneNumber}.mp3`;
    const remoteAudio = new Audio(remoteUrl);
    remoteAudio.onerror = fallbackToTTS;
    remoteAudio.play().catch(fallbackToTTS);
  };

  audio.play().catch(err => {
    const remoteUrl = `https://www.purpleculture.net/mp3/${base}${toneNumber}.mp3`;
    const remoteAudio = new Audio(remoteUrl);
    remoteAudio.onerror = fallbackToTTS;
    remoteAudio.play().catch(fallbackToTTS);
  });
}

// Initialize translations on load
translateUI();


function showConfirmModal(i18nKeyTitle, i18nKeyMsg, onConfirm) {
  const currentLang = state.currentLanguage || "en";
  const dict = window.i18nDictionary[currentLang] || window.i18nDictionary['en'];
  
  document.getElementById('custom-confirm-title').textContent = dict[i18nKeyTitle] || dict['title_confirm'] || "Confirm";
  document.getElementById('custom-confirm-message').textContent = dict[i18nKeyMsg] || i18nKeyMsg;
  
  document.getElementById('custom-confirm-modal').classList.remove('hidden');
  
  const cancelBtn = document.getElementById('custom-confirm-cancel');
  const okBtn = document.getElementById('custom-confirm-ok');
  
  // Clean up previous event listeners by cloning
  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  
  newCancel.addEventListener('click', () => {
    document.getElementById('custom-confirm-modal').classList.add('hidden');
  });
  
  newOk.addEventListener('click', () => {
    document.getElementById('custom-confirm-modal').classList.add('hidden');
    if (onConfirm) onConfirm();
  });
}

// ====================================================
// VOCAB GARDEN SRS CONTROLLER MODULE
// ====================================================

async function renderVocabGardenWidget() {
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/srs/garden', {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    state.lastGardenPlants = data.plants || [];

    // Update total badge
    const totalBadge = document.getElementById('garden-total-badge');
    if (totalBadge) {
      totalBadge.textContent = `${data.totalPlanted} / ${data.levelTargetTotal} Words`;
    }

    // Update habit banner title & description
    const habitTitle = document.getElementById('habit-banner-title');
    const habitDesc = document.getElementById('habit-banner-desc');
    const mainWaterBtn = document.getElementById('main-water-all-btn');
    
    if (habitTitle && habitDesc) {
      if (data.totalPlanted === 0) {
        habitTitle.textContent = "Welcome to HanPath!";
        habitDesc.textContent = "Your garden is empty. Start a lesson or take a pre-test to plant your first words!";
        if (mainWaterBtn) {
          mainWaterBtn.textContent = "💧 Water All Due Words";
          mainWaterBtn.disabled = true;
          mainWaterBtn.style.opacity = '0.5';
        }
      } else {
        habitTitle.textContent = "Today's Memory Habit";
        habitDesc.textContent = `${data.thirstyDueCount} plants need watering & ${data.wiltingCount} plants are wilting.`;
        if (mainWaterBtn) {
          if (data.thirstyDueCount > 0) {
            mainWaterBtn.textContent = `💧 Water ${data.thirstyDueCount} Thirsty Words (~${Math.ceil(data.thirstyDueCount * 0.5)} mins)`;
            mainWaterBtn.disabled = false;
            mainWaterBtn.style.opacity = '1';
          } else {
            mainWaterBtn.textContent = "✨ Garden Fully Nourished!";
            mainWaterBtn.disabled = true;
            mainWaterBtn.style.opacity = '0.7';
          }
        }
      }
    }

    // Render the visual garden canvas
    gardenRenderer.render('main-garden-canvas-slot', data.plants);

    // Surface Confusion Pairs Alert
    const confusionAlert = document.getElementById('confusion-pairs-alert');
    const confusionList = document.getElementById('confusion-pairs-list');
    if (confusionAlert && confusionList) {
      const activePairs = [];
      const userChars = data.plants.map(p => p.character);
      
      const pairsMap = {
        hsk1: [['买', '卖'], ['本', '木'], ['人', '入']],
        hsk2: [['喝', '渴'], ['右', '左'], ['谁', '准']],
        hsk3: [['洗', '选'], ['干', '千'], ['同', '司']]
      };

      const levelPairs = pairsMap[state.userLevel] || pairsMap.hsk1;
      levelPairs.forEach(pair => {
        if (userChars.includes(pair[0]) && userChars.includes(pair[1])) {
          activePairs.push(pair);
        }
      });

      if (activePairs.length > 0) {
        confusionAlert.classList.remove('hidden');
        let text = "You have confusable character pairs planted: ";
        activePairs.forEach(pair => {
          text += `<strong>${pair[0]}</strong> vs <strong>${pair[1]}</strong> | `;
        });
        confusionList.innerHTML = text.slice(0, -3) + ". Pay special attention to their tone and structural details!";
      } else {
        confusionAlert.classList.add('hidden');
      }
    }

  } catch (err) {
    console.error("Failed to render Vocab Garden widget:", err);
  }
}

function setupSrsEventListeners() {
  eventBus.on('garden:plant-clicked', (plant) => {
    showPlantQuickModal(plant);
  });
}

window.handleGardenPlantClick = function(vocabId) {
  const plants = state.lastGardenPlants || [];
  const plant = plants.find(p => p.vocab_id == vocabId);
  if (plant) {
    showPlantQuickModal(plant);
  }
};

window.showPlantQuickModal = function(plant) {
  let modal = document.getElementById('plant-quick-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'plant-quick-modal';
    modal.className = 'modal-backdrop';
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };
    document.body.appendChild(modal);
  }

  const localizedMeaning = state.currentLanguage === 'th' ? (plant.meaning_th || plant.meaning) : (plant.meaning || plant.meaning_en);
  const localizedDeconstruct = state.currentLanguage === 'th' ? (plant.deconstruct_th || plant.deconstruct) : (plant.deconstruct || plant.deconstruct_en);
  
  const stageMap = {
    1: { name: '🌱 Seed', nameTh: '🌱 เมล็ดพันธุ์' },
    2: { name: '🌿 Sprout', nameTh: '🌿 ต้นกล้า' },
    3: { name: '🌻 Blooming', nameTh: '🌻 ดอกไม้' },
    4: { name: '🌳 Mastered Tree', nameTh: '🌳 ต้นไม้นำโชค' }
  };
  const stageInfo = stageMap[plant.mastery_stage] || stageMap[1];
  const stageName = state.currentLanguage === 'th' ? stageInfo.nameTh : stageInfo.name;

  modal.innerHTML = `
    <div class="modal-card glass-panel" style="max-width: 420px; width: 90%; text-align: center; position: relative; padding: 1.75rem 1.25rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);">
      <button class="modal-close-btn" onclick="document.getElementById('plant-quick-modal').classList.remove('active')" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer;">&times;</button>
      
      <div style="font-size: 3.5rem; font-family: var(--font-serif); color: var(--primary); margin-bottom: 0.25rem;">
        ${plant.character}
      </div>
      <div style="font-size: 1.2rem; font-weight: bold; color: var(--accent); margin-bottom: 0.5rem;">
        ${plant.pinyin || ''}
      </div>
      
      <div style="font-size: 1.05rem; font-weight: 600; color: #fff; margin-bottom: 0.75rem;">
        ${localizedMeaning || ''}
      </div>

      <div style="display: inline-block; padding: 0.3rem 0.8rem; border-radius: 20px; background: rgba(46, 196, 182, 0.15); color: var(--success); font-size: 0.85rem; font-weight: bold; margin-bottom: 1.25rem;">
        ${stageName}
      </div>

      ${localizedDeconstruct ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; background: rgba(255,255,255,0.02); padding: 0.6rem; border-radius: 8px;">🧩 ${localizedDeconstruct}</div>` : ''}

      <div style="display: flex; gap: 0.75rem; justify-content: center; width: 100%;">
        <button class="btn btn-secondary" onclick="playTone('${plant.character}')" style="flex: 1; padding: 0.75rem; border-radius: 12px; font-weight: bold;">
          🔊 Listen
        </button>
        <button class="btn btn-primary" onclick="window.startTargetPractice(${plant.vocab_id})" style="flex: 1; padding: 0.75rem; border-radius: 12px; font-weight: bold;">
          🎯 Target Practice
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  playTone(plant.character);
};

window.startTargetPractice = function(vocabId) {
  const modal = document.getElementById('plant-quick-modal');
  if (modal) modal.classList.remove('active');

  const activeCard = (state.lastGardenPlants || []).find(p => p.vocab_id == vocabId);
  if (activeCard) {
    srsEngine.initSession([activeCard], 1);
    state.srsSessionMode = 'single';
    state.srsXpEarned = 0;
    switchView('srs-view');
    renderSrsCard();
  }
};

window.handleEarlyExit = function() {
  if (state.srsXpEarned > 0) {
    showConfirmModal('early_exit_title', 'early_exit_msg', () => {
      srsEngine.currentBatch = [];
      renderSrsCard(); // This will trigger the summary screen since batch is empty
    });
  } else {
    switchView('dashboard-view');
  }
};
// Keep track of active challenge state
let currentChallenge = null;
let challengeAttempts = 0;
let challengeHintsUsed = false;

async function startSrsSession(mode = 'normal') {
  try {
    let cards;

    const token = localStorage.getItem("hanpath_token");
    if (mode === 'full') {
      // Full review: fetch ALL planted words from the garden (not just due ones)
      const res = await fetch('/api/srs/garden', {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) return;
      const gardenData = await res.json();
      // The garden endpoint returns { plants: [...] } — reshape each plant into the card format
      // that the SRS engine expects (same fields as /api/srs/due cards)
      // Limit to 15 to prevent massive review queues
      const shuffledPlants = (gardenData.plants || []).sort(() => Math.random() - 0.5).slice(0, 15);
      
      cards = shuffledPlants.map(p => ({
        srs_id: p.vocab_id,
        vocab_id: p.vocab_id,
        character: p.character,
        pinyin: p.pinyin,
        meaning: p.meaning,
        meaning_th: p.meaning_th,
        mastery_stage: p.mastery_stage,
        interval_days: p.interval_days,
        times_forgotten: p.times_forgotten,
        deconstruct: p.deconstruct,
        deconstruct_th: p.deconstruct_th,
        exampleCn: p.exampleCn,
        examplePy: p.examplePy,
        exampleEn: p.exampleEn,
        exampleTh: p.exampleTh
      }));
    } else {
      // Normal or rescue mode: fetch only due cards
      const res = await fetch(`/api/srs/due?mode=${mode}`, {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!res.ok) return;
      cards = await res.json();
    }

    if (!cards || cards.length === 0) {
      alert(t('srs_empty_due'));
      return;
    }

    // Initialize the interleaved round-robin engine
    srsEngine.initSession(cards, 5);
    state.srsSessionMode = mode;
    state.srsXpEarned = 0;

    switchView('srs-view');
    renderSrsCard();
  } catch (err) {
    console.error("Failed to start SRS session:", err);
  }
}
window.startSrsSession = startSrsSession;

// Priority 3: Bubble & Tone Drag/Drop state
let activePinyinSelection = [];
let activeToneSelection = [];

window.selectPinyinBubble = function(syllable, bankIdx) {
  if (!currentChallenge) return;
  activePinyinSelection.push(syllable);
  const bankBtn = document.getElementById(`pinyin-bank-btn-${bankIdx}`);
  if (bankBtn) bankBtn.style.visibility = 'hidden';
  renderPinyinBubbleSlots();
};

window.removePinyinBubble = function(slotIdx) {
  if (slotIdx >= 0 && slotIdx < activePinyinSelection.length) {
    const removed = activePinyinSelection.splice(slotIdx, 1)[0];
    const bankBtns = document.querySelectorAll('.pinyin-bank-bubble');
    bankBtns.forEach(btn => {
      if (btn.textContent.trim() === removed && btn.style.visibility === 'hidden') {
        btn.style.visibility = 'visible';
      }
    });
    renderPinyinBubbleSlots();
  }
};

function renderPinyinBubbleSlots() {
  const container = document.getElementById('pinyin-bubble-slots');
  if (!container || !currentChallenge) return;
  const numSlots = currentChallenge.targetSyllables ? currentChallenge.targetSyllables.length : 1;
  let html = '';
  for (let i = 0; i < numSlots; i++) {
    const val = activePinyinSelection[i] || '';
    if (val) {
      html += `
        <div onclick="window.removePinyinBubble(${i})" 
             style="min-width: 65px; padding: 0.6rem 1rem; border-radius: 12px; background: var(--primary); color: #000; font-weight: bold; font-size: 1.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,245,212,0.3);">
          ${val}
        </div>
      `;
    } else {
      html += `
        <div style="min-width: 65px; height: 46px; border: 2px dashed rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-weight: bold;">
          ___
        </div>
      `;
    }
  }
  container.innerHTML = html;
}

window.submitBubbleWatering = function() {
  const userAns = activePinyinSelection.join('');
  window.checkChallengeAnswer(userAns);
};

window.selectToneBubble = function(toneNum) {
  if (!currentChallenge || !currentChallenge.chars) return;
  const targetLen = currentChallenge.chars.length;
  if (activeToneSelection.length < targetLen) {
    activeToneSelection.push(String(toneNum));
    renderToneSlots();
  }
};

window.clearToneSlot = function(slotIdx) {
  if (slotIdx >= 0 && slotIdx < activeToneSelection.length) {
    activeToneSelection.splice(slotIdx, 1);
    renderToneSlots();
  }
};

function renderToneSlots() {
  const container = document.getElementById('tone-character-slots');
  if (!container || !currentChallenge || !currentChallenge.chars) return;

  const toneLabels = { '1': 'ā (1st)', '2': 'á (2nd)', '3': 'ǎ (3rd)', '4': 'à (4th)', '5': 'a (5th)' };

  let html = '';
  currentChallenge.chars.forEach((char, idx) => {
    const toneVal = activeToneSelection[idx] || '';
    const label = toneVal ? (toneLabels[toneVal] || toneVal) : '?';
    html += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;">
        <div onclick="window.clearToneSlot(${idx})" 
             style="min-width: 65px; padding: 0.4rem 0.8rem; border-radius: 10px; background: ${toneVal ? 'rgba(46, 196, 182, 0.25)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${toneVal ? 'var(--success)' : 'rgba(255,255,255,0.15)'}; color: ${toneVal ? 'var(--success)' : 'var(--text-muted)'}; font-weight: bold; cursor: pointer; text-align: center;">
          ${label}
        </div>
        <div style="font-size: 2.5rem; font-family: var(--font-serif); color: var(--primary);">${char}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.submitToneWatering = function() {
  const userAns = activeToneSelection.join('-');
  window.checkChallengeAnswer(userAns);
};

function renderSrsCard() {
  const container = document.getElementById('srs-arena-container');
  if (!container) return;

  const activeCard = srsEngine.getActiveCard();
  if (!activeCard) {
    // Session summary
    container.innerHTML = `
      <div style="font-size: 3.5rem; margin-bottom: 1.25rem; animation: bounce 2s infinite;">🪴✨</div>
      <h2 style="font-family: var(--font-serif); margin-bottom: 0.5rem; color: var(--success);">${t('srs_session_complete', { xp: state.srsXpEarned })}</h2>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">All target plants received proper care and active cognitive watering today!</p>
      <button class="btn btn-primary" onclick="switchView('dashboard-view')" style="padding: 0.75rem 2.5rem; font-weight: bold; border-radius: 30px; box-shadow: 0 4px 15px rgba(0, 245, 212, 0.3);">
        🚀 Return to Dashboard
      </button>
    `;
    document.getElementById('srs-card-progress').textContent = 'Completed!';
    // Refresh the garden widgets
    renderVocabGardenWidget();
    return;
  }

  // Update batch progress text
  document.getElementById('srs-card-progress').textContent = `Progress: ${srsEngine.getSessionProgressString()}`;

  // Generate a challenge based on current mastery stage
  currentChallenge = challengeSelector.generateChallenge(activeCard, state.currentLanguage);
  if (!currentChallenge) {
    container.innerHTML = `<div class="error" style="color: var(--danger); text-align: center; padding: 2rem;">Error: Failed to generate challenge for this card. Please try returning to the dashboard.</div>`;
    return;
  }
  challengeAttempts = 0;
  challengeHintsUsed = false;

  // Build the challenge HTML
  const stageIcons = { 1: '🌱 Seed (Recognition)', 2: '🌿 Sprout (Phonology)', 3: '🌻 Flower (Meaning)', 4: '🌳 Harvest (Context)' };
  const stageIcon = stageIcons[activeCard.mastery_stage] || '🌱 Seed';
  const plantState = gardenRenderer ? gardenRenderer.getPlantState(activeCard) : { emoji: '🌱' };

  let questionDisplay = '';
  let interactionArea = '';

  if (currentChallenge.type === 'PINYIN_BUBBLE' || currentChallenge.type === 'PINYIN_INPUT') {
    activePinyinSelection = [];
    questionDisplay = `
      <div class="active-challenge-question" style="font-size: 4rem; font-family: var(--font-serif); color: var(--primary); margin: 0.5rem 0;">
        ${currentChallenge.question}
      </div>
    `;

    let bankHtml = '';
    const bankList = currentChallenge.bankSyllables || [currentChallenge.answer];
    bankList.forEach((syl, bIdx) => {
      bankHtml += `
        <button id="pinyin-bank-btn-${bIdx}" class="btn btn-secondary pinyin-bank-bubble" 
                onclick="window.selectPinyinBubble('${syl}', ${bIdx})" 
                style="padding: 0.6rem 1.2rem; font-size: 1.2rem; font-weight: bold; border-radius: 20px; background: rgba(255,255,255,0.05);">
          ${syl}
        </button>
      `;
    });

    interactionArea = `
      <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; align-items: center; gap: 1.25rem;">
        <div id="pinyin-bubble-slots" style="display: flex; gap: 0.75rem; justify-content: center; min-height: 50px; flex-wrap: wrap;">
          <!-- Filled dynamically by renderPinyinBubbleSlots -->
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center;">
          ${bankHtml}
        </div>
        <button class="btn btn-primary" onclick="window.submitBubbleWatering()" style="padding: 0.75rem 2.5rem; margin-top: 0.5rem;">
          ${t('btn_water_srs') || '💦 Water'}
        </button>
      </div>
    `;
  } else if (currentChallenge.type === 'TONE_ID' && currentChallenge.chars) {
    activeToneSelection = [];
    questionDisplay = ``; // Integrated into character slots below

    let toneBankHtml = '';
    const toneOpts = [
      { val: '1', lbl: '1st (ā)' },
      { val: '2', lbl: '2nd (á)' },
      { val: '3', lbl: '3rd (ǎ)' },
      { val: '4', lbl: '4th (à)' },
      { val: '5', lbl: '5th (a)' }
    ];

    toneOpts.forEach(t => {
      toneBankHtml += `
        <button class="btn btn-secondary challenge-opt-btn" 
                onclick="window.selectToneBubble('${t.val}')" 
                style="padding: 0.6rem 0.8rem; font-weight: bold; border-radius: 12px;">
          ${t.lbl}
        </button>
      `;
    });

    interactionArea = `
      <div style="width: 100%; max-width: 500px; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
        <div id="tone-character-slots" style="display: flex; gap: 1.5rem; justify-content: center; margin: 1rem 0; flex-wrap: wrap;">
          <!-- Rendered dynamically by renderToneSlots -->
        </div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; width: 100%;">
          ${toneBankHtml}
        </div>
        <button class="btn btn-primary" onclick="window.submitToneWatering()" style="padding: 0.75rem 2.5rem; margin-top: 0.5rem;">
          ${t('btn_water_srs') || '💦 Water'}
        </button>
      </div>
    `;
  } else {
    // Multiple Choice Challenge (RECOGNITION, TRANSLATION, CONTEXT)
    const isContext = currentChallenge.type === 'CONTEXT';
    
    questionDisplay = `
      <div class="active-challenge-question" style="font-size: ${isContext ? '1.5rem' : '4.25rem'}; font-family: ${isContext ? 'inherit' : 'var(--font-serif)'}; color: var(--primary); margin: 0.5rem 0; font-weight: ${isContext ? 'bold' : 'normal'}; line-height: 1.4;">
        ${currentChallenge.question}
      </div>
    `;

    let buttonHtml = `<div class="active-challenge-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; width: 100%; max-width: 500px; margin-top: 1rem;">`;
    
    currentChallenge.options.forEach(opt => {
      const optVal = typeof opt === 'object' ? opt.value : opt;
      const optLabel = typeof opt === 'object' ? opt.label : opt;
      buttonHtml += `
        <button class="btn btn-secondary challenge-opt-btn" 
                onclick="window.checkChallengeAnswer('${optVal}')" 
                style="padding: 1rem 0.5rem; text-align: center; border-radius: 12px; font-weight: bold; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); min-height: 50px;">
          ${optLabel}
        </button>
      `;
    });
    buttonHtml += `</div>`;
    interactionArea = buttonHtml;
  }

  container.innerHTML = `
    <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
      <span class="tag" style="background: rgba(46, 196, 182, 0.15); color: var(--success); border: none; font-size: 0.85rem; font-weight: bold;">
        ${stageIcon}
      </span>
      <span id="srs-plant-badge" style="font-size: 1.6rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); transition: transform 0.3s ease;">
        ${plantState.emoji}
      </span>
    </div>
    
    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.75rem; font-weight: 500;">
      ${currentChallenge.prompt}
    </div>
    
    ${questionDisplay}
    
    ${interactionArea}

    <div id="challenge-feedback-area" style="min-height: 40px; margin-top: 1.25rem; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
    </div>

    <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center;">
      <button class="btn btn-secondary btn-sm" onclick="window.showChallengeHint()" style="padding: 0.5rem 1.25rem; font-size: 0.8rem; border-radius: 20px;">
        💡 Hint
      </button>
    </div>
  `;

  if (currentChallenge.type === 'PINYIN_BUBBLE' || currentChallenge.type === 'PINYIN_INPUT') {
    renderPinyinBubbleSlots();
  } else if (currentChallenge.type === 'TONE_ID' && currentChallenge.chars) {
    renderToneSlots();
  }
}
window.renderSrsCard = renderSrsCard;

window.submitPinyinChallengeAnswer = function() {
  const input = document.getElementById('srs-pinyin-input');
  if (input) {
    window.checkChallengeAnswer(input.value);
  }
};

window.showChallengeHint = function() {
  challengeHintsUsed = true;
  const feedback = document.getElementById('challenge-feedback-area');
  if (feedback && currentChallenge) {
    feedback.innerHTML = `<span style="color: var(--accent); font-weight: normal; font-size: 0.9rem;">${currentChallenge.hint}</span>`;
  }
};

window.checkChallengeAnswer = async function(userAnswer) {
  if (!currentChallenge) return;

  const activeCard = srsEngine.getActiveCard();
  if (!activeCard) return;

  const cleanUserAnswer = userAnswer.trim().toLowerCase();
  const cleanCorrectAnswer = currentChallenge.answer.trim().toLowerCase();
  
  const isCorrect = cleanUserAnswer === cleanCorrectAnswer;
  const feedback = document.getElementById('challenge-feedback-area');

  // Disable interaction options during feedback
  const buttons = document.querySelectorAll('.challenge-opt-btn');
  buttons.forEach(b => b.disabled = true);
  const input = document.getElementById('srs-pinyin-input');
  if (input) input.disabled = true;

  const plantBadge = document.getElementById('srs-plant-badge');
  const cardContainer = document.getElementById('srs-arena-container');

  if (isCorrect) {
    feedback.innerHTML = `<span style="color: var(--success);">✅ Correct! Excellent job.</span>`;
    
    // Trigger water splash ripple overlay on card
    if (cardContainer) {
      const splash = document.createElement('div');
      splash.className = 'water-splash-overlay';
      cardContainer.style.position = 'relative';
      cardContainer.appendChild(splash);
      setTimeout(() => splash.remove(), 850);
    }

    // Trigger plant grow bounce animation
    if (plantBadge) {
      plantBadge.classList.add('plant-grow-active');
    }

    // Highlight correct button
    buttons.forEach(b => {
      const onclickAttr = b.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(`'${userAnswer}'`)) {
        b.style.backgroundColor = 'rgba(46, 196, 182, 0.25)';
        b.style.borderColor = 'var(--success)';
      }
    });

    // Audio reinforcement
    playTone(activeCard.character);

    submitSrsWatering(activeCard.vocab_id, challengeAttempts + 1, challengeHintsUsed, true);
  } else {
    feedback.innerHTML = `<span style="color: var(--danger);">❌ Try again! Correct answer was: ${currentChallenge.answer}</span>`;
    
    // Trigger plant wilt shake animation
    if (plantBadge) {
      plantBadge.classList.add('plant-wilt-active');
    }

    // Highlight incorrect button
    buttons.forEach(b => {
      const onclickAttr = b.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(`'${userAnswer}'`)) {
        b.style.backgroundColor = 'rgba(255, 51, 102, 0.25)';
        b.style.borderColor = 'var(--danger)';
      }
    });

    submitSrsWatering(activeCard.vocab_id, challengeAttempts + 1, challengeHintsUsed, false);
  }
};

function submitSrsWatering(vocabId, attemptsCount, hintsUsed, isCorrect) {
  try {
    const engineResult = srsEngine.recordResult(isCorrect, hintsUsed);
    
    if (isCorrect) {
      const activeCard = srsEngine.currentQueue.find(c => c.vocab_id === vocabId);
      const calculated = srsEngine.calculateSM2(activeCard, engineResult.systemGrade);
      state.srsXpEarned += (calculated.xpEarned || 10);
      state.score += (calculated.xpEarned || 10);
      saveProgress();

      const token = localStorage.getItem("hanpath_token");
      fetch('/api/srs/water', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ 
          vocabId, 
          attemptsCount, 
          hintsUsed,
          grade: engineResult.systemGrade 
        })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (data.xpEarned && data.xpEarned !== calculated.xpEarned) {
            state.score += (data.xpEarned - calculated.xpEarned);
            saveProgress();
          }
        }
      }).catch(err => console.error("Async SRS watering sync failed:", err));
    }
    
    setTimeout(() => {
      renderSrsCard();
    }, 700);
  } catch (err) {
    console.error("Failed to submit SRS watering:", err);
  }
}
window.submitSrsWatering = submitSrsWatering;

async function plantLessonSrs(lessonId) {
  try {
    const token = localStorage.getItem("hanpath_token");
    await fetch('/api/srs/plant-lesson', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ lessonId })
    });
  } catch (err) {
    console.error("Failed to plant lesson SRS:", err);
  }
}
window.plantLessonSrs = plantLessonSrs;

// ==========================================
// 🧪 ACTIVE RADICAL DISCOVERY LAB LOGIC
// ==========================================
let activeAnchor = null;

window.initActiveRadicalLab = async function() {
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/srs/fusion/anchors', {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Anchors fetch failed:", res.status, errText);
      document.getElementById('radical-tabs-container').innerHTML = `<div style="color: #ff4757; font-weight: bold; padding: 1rem;">Failed to load anchors. Please check console for details. ${res.status}: ${res.statusText}</div>`;
      return;
    }
    const data = await res.json();
    const anchors = data.anchors || [];
    
    const tabsContainer = document.getElementById('radical-tabs-container');
    if (!tabsContainer) return;
    
    // Clear state
    activeAnchor = null;
    document.getElementById('fusion-result-area').style.display = 'none';
    document.getElementById('fusion-seed-pool').innerHTML = '';
    
    if (anchors.length === 0) {
      tabsContainer.innerHTML = `<div style="color: var(--text-secondary);">No anchors available yet.</div>`;
      return;
    }
    
    let html = '';
    let firstEligibleAnchor = null;
    
    anchors.forEach((a, i) => {
      const localizedName = state.currentLanguage === 'th' ? (a.name_th || a.name_en) : a.name_en;
      
      if (a.user_learned > 0) {
        if (!firstEligibleAnchor) firstEligibleAnchor = a;
        html += `
          <button class="btn btn-secondary radical-anchor-btn" 
                  id="anchor-tab-${a.id}"
                  onclick="window.selectRadicalAnchor('${a.id}', '${a.symbol}', '${localizedName}', ${a.total_discoveries}, ${a.user_discovered})">
            ${a.icon} ${a.symbol} ${localizedName}
          </button>
        `;
      } else {
        html += `
          <button class="btn btn-secondary radical-anchor-btn locked" 
                  disabled
                  title="Unlock words with this radical by completing more lessons!">
            🔒 ❓ ${localizedName}
          </button>
        `;
      }
    });
    tabsContainer.innerHTML = html;
    
    // Select first eligible anchor by default, or clear if none
    if (firstEligibleAnchor) {
      const firstLocalName = state.currentLanguage === 'th' ? (firstEligibleAnchor.name_th || firstEligibleAnchor.name_en) : firstEligibleAnchor.name_en;
      window.selectRadicalAnchor(firstEligibleAnchor.id, firstEligibleAnchor.symbol, firstLocalName, firstEligibleAnchor.total_discoveries, firstEligibleAnchor.user_discovered);
    } else {
      document.getElementById('hero-anchor-name').innerText = `Keep learning to unlock!`;
      document.getElementById('hero-anchor-progress-text').innerText = `Progress: 0 / 0 Discovered`;
      document.getElementById('fusion-seed-pool').innerHTML = `<div style="padding: 1rem; color: var(--text-secondary);">No active radicals available yet. Complete more lessons to unlock components!</div>`;
    }
    
  } catch (err) {
    console.error("Failed to initialize Radical Discovery Lab:", err);
  }
};

window.selectRadicalAnchor = async function(id, symbol, name, total, userDiscovered) {
  activeAnchor = id;
  document.getElementById('fusion-result-area').style.display = 'none';
  
  // Highlight active tab
  document.querySelectorAll('#radical-tabs-container .btn').forEach(btn => {
    btn.classList.remove('btn-accent');
    btn.classList.add('btn-secondary');
  });
  const activeTab = document.getElementById(`anchor-tab-${id}`);
  if (activeTab) {
    activeTab.classList.remove('btn-secondary');
    activeTab.classList.add('btn-accent');
  }
  
  // Update Hero Card
  document.getElementById('hero-anchor-name').innerText = `${symbol} — ${name}`;
  document.getElementById('hero-anchor-progress-text').innerText = `Progress: ${userDiscovered} / ${total} Discovered`;
  const pct = total > 0 ? Math.round((userDiscovered / total) * 100) : 0;
  document.getElementById('hero-anchor-progress-fill').style.width = `${pct}%`;
  
  // Fetch components
  try {
    const token = localStorage.getItem("hanpath_token");
    const levelStr = state.userLevel || 'hsk1';
    const res = await fetch(`/api/srs/fusion/components?anchor=${encodeURIComponent(id)}&level=${levelStr}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Components fetch failed:", res.status, errText);
      document.getElementById('fusion-seed-pool').innerHTML = `<div style="color: #ff4757; font-weight: bold; padding: 1rem;">Failed to load components. ${res.status}: ${res.statusText}</div>`;
      return;
    }
    const data = await res.json();
    const components = data.components || [];
    
    const pool = document.getElementById('fusion-seed-pool');
    let html = '';
    components.forEach(c => {
      const isDisc = c.discovered === 1;
      const hasLearned = c.has_learned === 1;
      
      if (hasLearned) {
        html += `
          <button class="btn ${isDisc ? 'btn-secondary' : 'btn-accent'} fusion-component-btn" 
                  onclick="window.fuseComponent(${c.formula_id})">
            ${c.symbol}
            ${isDisc ? '<div class="fusion-discovery-sparkle">✨</div>' : ''}
          </button>
        `;
      } else {
        html += `
          <button class="btn btn-secondary fusion-component-btn locked" 
                  disabled
                  title="Keep playing lessons to unlock this mystery component!">
            ❓
          </button>
        `;
      }
    });
    pool.innerHTML = html;
  } catch (err) {
    console.error("Failed to load components:", err);
  }
};

window.fuseComponent = async function(formulaId) {
  const resultArea = document.getElementById('fusion-result-area');
  resultArea.style.display = 'flex';
  resultArea.innerHTML = `<span style="color: var(--accent); animation: pulse 1s infinite;">⚡ Synthesizing... ⚡</span>`;
  
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/srs/fusion/combine', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ formula_id: formulaId })
    });
    
    if (!res.ok) {
      resultArea.innerHTML = `<span style="color: var(--danger);">Server connection error.</span>`;
      return;
    }
    
    const data = await res.json();
    if (data.success) {
      if (typeof playTone === "function") playTone(data.word.character);
      
      const localizedMeaning = state.currentLanguage === 'th' ? (data.word.meaning_th || data.word.meaning) : data.word.meaning;
      const localizedDeconstruct = state.currentLanguage === 'th' ? (data.word.deconstruct_th || data.word.deconstruct) : data.word.deconstruct;
      
      resultArea.innerHTML = `
        <div class="glass-panel alchemy-fuse-active fusion-success-card">
          <div class="fusion-success-title">🎉 DISCOVERY SUCCESSFUL!</div>
          <div id="fusion-writer-target" class="fusion-canvas-target"></div>
          <div class="fusion-success-pinyin">
            🔊 ${data.word.pinyin}
          </div>
          <div class="fusion-success-meaning">
            ${localizedMeaning}
          </div>
          <div class="fusion-success-deconstruct">
            <strong>Structure:</strong> ${localizedDeconstruct}
          </div>
          <div class="fusion-success-planted">
            🪴 Auto-Planted to your SRS Vocab Garden!
          </div>
        </div>
      `;

      if (typeof HanziWriter !== "undefined" && data.word.character) {
        setTimeout(() => {
          try {
            const writerTarget = document.getElementById('fusion-writer-target');
            if (writerTarget) {
              writerTarget.innerHTML = '';
              const computedWidth = Math.min(150, window.innerWidth * 0.4);
              const fusionWriter = HanziWriter.create('fusion-writer-target', data.word.character.charAt(0), {
                width: computedWidth,
                height: computedWidth,
                padding: computedWidth * 0.08,
                strokeColor: '#00f5d4',
                radicalColor: '#ff3366',
                delayBetweenStrokes: 150
              });
              fusionWriter.animateCharacter();
            }
          } catch (e) {
            console.warn('HanziWriter init in fusion failed:', e);
          }
        }, 100);
      }

      // Refresh the tabs/components to update the progress/badges without losing context
      const currentTab = document.querySelector('#radical-tabs-container .btn-primary');
      if (currentTab) {
        // Soft refresh by clicking the tab again to fetch updated lists
        // Note: activeTab.click() resets display to 'none', so we override it
        currentTab.click(); 
        setTimeout(() => { document.getElementById('fusion-result-area').style.display = 'flex'; }, 50);
      }
    } else {
      resultArea.innerHTML = `<span style="color: var(--danger);">${data.message || 'Error'}</span>`;
    }
  } catch (err) {
    console.error("Fusion call failed:", err);
    resultArea.innerHTML = `<span style="color: var(--danger);">Fusion error occurred.</span>`;
  }
};

// ==========================================
// 🏹 SENTENCE QUEST GAME LOGIC
// ==========================================
let activeQuestSentence = '';
let correctQuestSequence = [];
let selectedQuestSequence = [];

function tokenizeSentence(sentence, plants) {
  const sortedVocab = (plants || [])
    .map(p => p.character)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  let remaining = sentence;
  const tokens = [];

  while (remaining.length > 0) {
    let matched = false;
    for (const word of sortedVocab) {
      if (word.length > 0 && remaining.startsWith(word)) {
        tokens.push(word);
        remaining = remaining.slice(word.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

window.initSentenceQuest = async function() {
  const promptArea = document.getElementById('sentence-quest-prompt-area');
  const targetArea = document.getElementById('sentence-quest-target-slots');
  const poolArea = document.getElementById('sentence-quest-words-pool');
  const feedback = document.getElementById('sentence-quest-feedback');
  
  if (!promptArea || !targetArea || !poolArea || !feedback) return;
  
  feedback.innerHTML = '';
  targetArea.innerHTML = '';
  selectedQuestSequence = [];
  
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/srs/garden', {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const allPlants = data.plants || [];

    if (allPlants.length === 0) {
      promptArea.textContent = '';
      poolArea.innerHTML = `
        <div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 2rem;">
          🌱 Welcome to Sentence Quest! Complete your first HSK lesson to unlock vocabulary plants and trigger sentence challenges!
        </div>
      `;
      return;
    }

    // 1. Try finding a plant with an example sentence from Stage 3+ (Blooming/Mastered) basket
    const basket = allPlants.filter(p => p.mastery_stage >= 3);
    let cardWithSentence = basket.find(c => c.exampleCn || c.example_sentence || c.example_cn);

    // 2. Fallback: If Stage 3+ basket has no example sentences, search ALL unlocked plants
    if (!cardWithSentence) {
      cardWithSentence = allPlants.find(c => c.exampleCn || c.example_sentence || c.example_cn);
    }

    if (!cardWithSentence) {
      promptArea.textContent = '';
      poolArea.innerHTML = `<div style="color: var(--text-secondary); width: 100%; text-align: center; padding: 2rem;">Complete more HSK lessons to unlock example sentences for Sentence Quest!</div>`;
      return;
    }
    
    // Clean target sentence
    const rawCn = cardWithSentence.exampleCn || cardWithSentence.example_sentence || cardWithSentence.example_cn || '';
    const cnSentence = rawCn.replace(/[。，！？、,!?]/g, '').trim();
    activeQuestSentence = cnSentence;

    // Tokenize sentence into word blocks using unlocked vocabulary list
    correctQuestSequence = tokenizeSentence(cnSentence, allPlants);
    
    // Prompt translation (EN or TH dynamically)
    const translation = (state.currentLanguage === 'th' ? (cardWithSentence.exampleTh || cardWithSentence.exampleEn) : (cardWithSentence.exampleEn || cardWithSentence.exampleTh))
      || cardWithSentence.meaning_en
      || 'Translate into Chinese';

    promptArea.innerHTML = `${state.currentLanguage === 'th' ? 'แปลเป็นภาษาจีน:' : 'Translate into Chinese:'}<br/><span style="color: #fff; font-size: 1.35rem; font-family: var(--font-serif);">${translation}</span>`;
    
    // Distractor tokens from other garden plants
    const distractorTokens = allPlants
      .map(p => p.character)
      .filter(c => c && !correctQuestSequence.includes(c));

    const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);
    shuffleArray(distractorTokens);
    
    const pool = correctQuestSequence.concat(distractorTokens.slice(0, 3));
    shuffleArray(pool);
    
    let poolHtml = '';
    pool.forEach((wordToken, idx) => {
      poolHtml += `
        <button class="btn btn-secondary quest-word-card" 
                id="quest-word-${idx}" 
                onclick="window.selectQuestWord('${wordToken}', 'quest-word-${idx}')" 
                style="font-size: 1.35rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; margin: 0.25rem;">
          ${wordToken}
        </button>
      `;
    });
    poolArea.innerHTML = poolHtml;
    
  } catch (err) {
    console.error("Failed to load Sentence Quest:", err);
  }
};

window.selectQuestWord = function(char, cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  
  // Disable it in the pool
  card.style.display = 'none';
  
  selectedQuestSequence.push({ char, cardId });
  window.updateSentenceQuestTargetUI();
};

window.removeQuestWord = function(index) {
  const item = selectedQuestSequence[index];
  if (!item) return;
  
  // Re-enable in the pool
  const card = document.getElementById(item.cardId);
  if (card) card.style.display = 'inline-block';
  
  selectedQuestSequence.splice(index, 1);
  window.updateSentenceQuestTargetUI();
};

window.updateSentenceQuestTargetUI = function() {
  const targetArea = document.getElementById('sentence-quest-target-slots');
  if (!targetArea) return;
  
  if (selectedQuestSequence.length === 0) {
    targetArea.innerHTML = `<span style="color: var(--text-secondary); font-size: 0.9rem;">Click cards from the pool below to form your sentence</span>`;
    return;
  }
  
  let html = '';
  selectedQuestSequence.forEach((item, idx) => {
    html += `
      <button class="btn btn-primary" 
              onclick="window.removeQuestWord(${idx})" 
              style="font-size: 1.5rem; padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; cursor: pointer; animation: scaleUp 0.2s ease;">
        ${item.char}
      </button>
    `;
  });
  targetArea.innerHTML = html;
};

window.resetSentenceQuest = function() {
  selectedQuestSequence.forEach(item => {
    const card = document.getElementById(item.cardId);
    if (card) card.style.display = 'inline-block';
  });
  selectedQuestSequence = [];
  window.updateSentenceQuestTargetUI();
  const feedback = document.getElementById('sentence-quest-feedback');
  if (feedback) feedback.innerHTML = '';
};

window.checkSentenceQuest = function() {
  const feedback = document.getElementById('sentence-quest-feedback');
  if (!feedback) return;
  
  const userSentence = selectedQuestSequence.map(item => item.char).join('');
  
  if (userSentence === activeQuestSentence) {
    feedback.innerHTML = `<span style="color: var(--success); font-size: 1.25rem;">🎉 100% CORRECT! +50 XP Reward</span>`;
    state.score += 50;
    saveProgress();
    
    // Play correct pronunciation of target character sentence if possible
    speakText(activeQuestSentence);
  } else {
    feedback.innerHTML = `<span style="color: var(--danger);">❌ Mismatched structure. Correct sequence: ${activeQuestSentence}</span>`;
  }
};

// ==========================================
// 🏆 OFFICIAL HSK 1-3 MOCK EXAM CONTROLLER
// ==========================================
let currentMockExamSession = {
  hskLevel: 'hsk1',
  questions: [],
  currentIndex: 0,
  userAnswers: {},
  reorderState: {},
  timerInterval: null,
  secondsRemaining: 0,
  totalTimeSeconds: 0
};

async function loadMockExamSummary() {
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/mock-exams/summary', {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const levels = data.levels || [];
    
    levels.forEach(lvl => {
      const badge = document.getElementById(`${lvl.level}-best-score-badge`);
      if (badge) {
        if (lvl.bestScore !== null && lvl.bestScore !== undefined) {
          const passTag = lvl.hasPassed ? '🎉 PASS' : '⚠️ RETAKE';
          badge.innerHTML = `🏆 Best: <strong>${lvl.bestScore} / ${lvl.maxScore}</strong> (${passTag})`;
        } else {
          badge.innerHTML = `🏆 Best: <span>${t('mock_exam_not_taken')}</span>`;
        }
      }
    });
  } catch (err) {
    console.error("Failed to load mock exam summary:", err);
  }
}
window.loadMockExamSummary = loadMockExamSummary;

async function startMockExamSession(level) {
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch(`/api/mock-exams/${level}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      alert("Failed to load mock exam questions. Please try again.");
      return;
    }
    const data = await res.json();
    const questions = data.questions || [];
    if (questions.length === 0) {
      alert("No questions available for this level yet.");
      return;
    }

    const timeLimits = {
      hsk1: 35 * 60,
      hsk2: 45 * 60,
      hsk3: 85 * 60
    };
    const totalTime = timeLimits[level] || 35 * 60;

    currentMockExamSession = {
      hskLevel: level,
      questions: questions,
      currentIndex: 0,
      userAnswers: {},
      reorderState: {},
      timerInterval: null,
      secondsRemaining: totalTime,
      totalTimeSeconds: totalTime
    };

    // Start countdown timer
    clearInterval(currentMockExamSession.timerInterval);
    currentMockExamSession.timerInterval = setInterval(() => {
      currentMockExamSession.secondsRemaining--;
      updateMockExamTimerDisplay();
      if (currentMockExamSession.secondsRemaining <= 0) {
        clearInterval(currentMockExamSession.timerInterval);
        alert("Time is up! Submitting your exam automatically...");
        submitMockExam();
      }
    }, 1000);

    // Switch view
    switchView('mock-exam-view');
    updateMockExamTimerDisplay();
    renderMockExamQuestion();
  } catch (err) {
    console.error("Failed to start mock exam session:", err);
    alert("Error launching mock exam session.");
  }
}
window.startMockExamSession = startMockExamSession;

function updateMockExamTimerDisplay() {
  const display = document.getElementById('mock-exam-timer-display');
  if (!display) return;
  const secs = Math.max(0, currentMockExamSession.secondsRemaining);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderMockExamQuestion() {
  const session = currentMockExamSession;
  const q = session.questions[session.currentIndex];
  if (!q) return;

  const total = session.questions.length;
  const idx = session.currentIndex;

  const titleElem = document.getElementById('mock-exam-arena-title');
  if (titleElem) titleElem.textContent = `${session.hskLevel.toUpperCase()} Mock Exam`;

  const secElem = document.getElementById('mock-exam-section-tag');
  if (secElem) {
    const secName = q.section === 'listening' ? t('mock_exam_listening_sec') : (q.section === 'writing' ? t('mock_exam_writing_sec') : t('mock_exam_reading_sec'));
    secElem.textContent = secName;
    secElem.className = `tag tag-${session.hskLevel}`;
  }

  const progElem = document.getElementById('mock-exam-question-progress');
  if (progElem) progElem.textContent = `Q ${idx + 1} of ${total}`;

  const prevBtn = document.getElementById('mock-exam-prev-btn');
  if (prevBtn) prevBtn.disabled = (idx === 0);

  const nextBtn = document.getElementById('mock-exam-next-btn');
  if (nextBtn) nextBtn.disabled = (idx === total - 1);

  const localizedPrompt = state.currentLanguage === 'th' ? (q.prompt_th || q.prompt_en) : (q.prompt_en || q.prompt_th);
  const container = document.getElementById('mock-exam-question-container');
  if (!container) return;

  const selectedAnswer = session.userAnswers[q.id] || '';
  const isListening = (q.section === 'listening');
  const isHsk3 = (session.hskLevel === 'hsk3');

  let html = `<div class="glass-panel" style="padding: 1.75rem; border-radius: 16px; background: rgba(0,0,0,0.15); margin-bottom: 1rem;">`;

  // 1. If Listening question, render Audio Player button (transcript hidden during exam)
  if (isListening) {
    html += `
      <div style="margin-bottom: 1.5rem; text-align: center; background: rgba(255, 51, 102, 0.08); padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255, 51, 102, 0.25);">
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Official HSK Listening Prompt (Plays 2 Times)</div>
        <button class="btn btn-primary" onclick="window.playMockExamAudio('${encodeURIComponent(q.prompt_cn)}', '${q.audio_url || ''}')" style="padding: 0.85rem 2.25rem; font-weight: bold; border-radius: 28px; box-shadow: 0 4px 18px rgba(255,51,102,0.3); font-size: 1.05rem;">
          🔊 ${t('mock_exam_audio_play')}
        </button>
      </div>
    `;
    if (q.image_url) {
      html += `<div style="margin-bottom: 1.25rem; text-align: center;"><img src="${q.image_url}" alt="Exam Illustration" style="max-height: 140px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'" /></div>`;
    }
  } else {
    // Reading or Writing section prompt
    html += `
      <div style="margin-bottom: 1.5rem; text-align: center;">
        ${q.image_url ? `<div style="margin-bottom: 1rem;"><img src="${q.image_url}" alt="Exam Illustration" style="max-height: 140px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'" /></div>` : ''}
        <div style="font-size: 1.85rem; font-weight: bold; font-family: var(--font-serif); margin-bottom: 0.4rem; color: var(--text-primary);">${q.prompt_cn}</div>
        ${(!isHsk3 && q.prompt_py) ? `<div style="font-size: 1.05rem; color: var(--accent); margin-bottom: 0.5rem; font-weight: 500;">${q.prompt_py}</div>` : ''}
      </div>
    `;
  }

  html += `<div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 520px; margin: 0 auto;">`;

  if (q.question_type === 'TRUE_FALSE') {
    const isTrueSelected = selectedAnswer === 'True';
    const isFalseSelected = selectedAnswer === 'False';
    html += `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <button class="btn ${isTrueSelected ? 'btn-primary' : 'btn-secondary'}" 
                onclick="window.selectMockExamAnswer(${q.id}, 'True')"
                style="padding: 1rem; font-size: 1.2rem; font-weight: bold; border-radius: 12px;">
          ✓ True / 对
        </button>
        <button class="btn ${isFalseSelected ? 'btn-primary' : 'btn-secondary'}" 
                onclick="window.selectMockExamAnswer(${q.id}, 'False')"
                style="padding: 1rem; font-size: 1.2rem; font-weight: bold; border-radius: 12px;">
          ✗ False / 错
        </button>
      </div>
    `;
  } else if (q.question_type === 'REORDER') {
    const options = q.options || [];
    const currentOrder = session.reorderState[q.id] || [];
    
    html += `
      <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--text-secondary); text-align: center;">
        Click words to assemble the sentence:
      </div>
      <div id="reorder-tray-${q.id}" style="min-height: 54px; padding: 0.75rem; border: 2px dashed rgba(0, 245, 212, 0.4); border-radius: 12px; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; background: rgba(0,0,0,0.25); margin-bottom: 1rem;">
        ${currentOrder.length === 0 ? '<span style="color: var(--text-muted); font-size: 0.85rem;">Click word blocks below in order</span>' : ''}
        ${currentOrder.map((w, wIdx) => `
          <button class="btn btn-primary btn-sm" onclick="window.removeMockReorderWord(${q.id}, ${wIdx})" style="font-size: 1.15rem; padding: 0.45rem 0.9rem; border-radius: 8px;">
            ${w}
          </button>
        `).join('')}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;">
        ${options.map((w, wIdx) => `
          <button class="btn btn-secondary btn-sm" onclick="window.addMockReorderWord(${q.id}, '${w}')" style="font-size: 1.15rem; padding: 0.45rem 0.9rem; border-radius: 8px;">
            ${w}
          </button>
        `).join('')}
      </div>
    `;
  } else if (q.question_type === 'CLOZE_CHAR') {
    // HSK 3 Writing Part 2: Pinyin Character Fill
    const options = q.options || [];
    html += `
      <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--text-secondary); text-align: center;">
        Select the correct Chinese character to fill the blank:
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.75rem;">
        ${options.map(opt => {
          const isSelected = (selectedAnswer === opt);
          return `
            <button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="window.selectMockExamAnswer(${q.id}, '${opt.replace(/'/g, "\\'")}')"
                    style="padding: 1rem; font-size: 1.6rem; font-weight: bold; font-family: var(--font-serif); border-radius: 12px; border-color: ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'};">
              ${opt}
            </button>
          `;
        }).join('')}
      </div>
    `;
  } else {
    const options = q.options || [];
    options.forEach(opt => {
      const isSelected = (selectedAnswer === opt);
      html += `
        <button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'}" 
                onclick="window.selectMockExamAnswer(${q.id}, '${opt.replace(/'/g, "\\'")}')"
                style="padding: 0.85rem 1.25rem; text-align: left; border-radius: 12px; font-size: 1rem; font-weight: ${isSelected ? 'bold' : 'normal'}; display: flex; align-items: center; justify-content: space-between; border-color: ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)'};">
          <span>${opt}</span>
          ${isSelected ? '<span>✓</span>' : ''}
        </button>
      `;
    });
  }

  html += `</div></div>`;
  container.innerHTML = html;
}
window.renderMockExamQuestion = renderMockExamQuestion;

function selectMockExamAnswer(questionId, answer) {
  currentMockExamSession.userAnswers[questionId] = answer;
  renderMockExamQuestion();
}
window.selectMockExamAnswer = selectMockExamAnswer;

function addMockReorderWord(questionId, word) {
  if (!currentMockExamSession.reorderState[questionId]) {
    currentMockExamSession.reorderState[questionId] = [];
  }
  currentMockExamSession.reorderState[questionId].push(word);
  currentMockExamSession.userAnswers[questionId] = currentMockExamSession.reorderState[questionId].join('');
  renderMockExamQuestion();
}
window.addMockReorderWord = addMockReorderWord;

function removeMockReorderWord(questionId, index) {
  if (currentMockExamSession.reorderState[questionId]) {
    currentMockExamSession.reorderState[questionId].splice(index, 1);
    currentMockExamSession.userAnswers[questionId] = currentMockExamSession.reorderState[questionId].join('');
    renderMockExamQuestion();
  }
}
window.removeMockReorderWord = removeMockReorderWord;

function navigateMockExam(direction) {
  const newIndex = currentMockExamSession.currentIndex + direction;
  if (newIndex >= 0 && newIndex < currentMockExamSession.questions.length) {
    currentMockExamSession.currentIndex = newIndex;
    renderMockExamQuestion();
  }
}
window.navigateMockExam = navigateMockExam;

function playMockExamAudio(encodedText, audioUrl) {
  const text = decodeURIComponent(encodedText || '');
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      speakTwice(text);
    });
  } else {
    speakTwice(text);
  }
}
window.playMockExamAudio = playMockExamAudio;

function speakTwice(text) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  
  const utter1 = new SpeechSynthesisUtterance(text);
  utter1.lang = 'zh-CN';
  utter1.rate = 0.85;

  const utter2 = new SpeechSynthesisUtterance(text);
  utter2.lang = 'zh-CN';
  utter2.rate = 0.85;

  utter1.onend = () => {
    setTimeout(() => {
      window.speechSynthesis.speak(utter2);
    }, 1200);
  };

  window.speechSynthesis.speak(utter1);
}

async function submitMockExam() {
  clearInterval(currentMockExamSession.timerInterval);
  const timeSpent = currentMockExamSession.totalTimeSeconds - currentMockExamSession.secondsRemaining;
  
  try {
    const token = localStorage.getItem("hanpath_token");
    const res = await fetch('/api/mock-exams/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        hskLevel: currentMockExamSession.hskLevel,
        timeSpentSeconds: timeSpent,
        answers: currentMockExamSession.userAnswers
      })
    });

    if (!res.ok) {
      alert("Failed to submit exam results.");
      return;
    }

    const report = await res.json();
    showMockExamResultModal(report);
  } catch (err) {
    console.error("Failed to submit mock exam:", err);
    alert("Network error submitting exam.");
  }
}
window.submitMockExam = submitMockExam;

function showMockExamResultModal(report) {
  const modal = document.getElementById('mock-exam-result-modal');
  if (!modal) return;

  const badge = document.getElementById('mock-exam-result-badge');
  if (badge) badge.textContent = report.passed ? '🎉' : '📚';

  const heading = document.getElementById('mock-exam-result-heading');
  if (heading) heading.textContent = report.passed ? t('mock_exam_passed') : t('mock_exam_failed');

  const scoreElem = document.getElementById('mock-exam-total-score');
  if (scoreElem) scoreElem.textContent = `${report.totalScore} / ${report.maxScore}`;

  const statusElem = document.getElementById('mock-exam-pass-status');
  if (statusElem) {
    statusElem.textContent = report.passed ? 'PASS 🎉' : 'RETAKE ⚠️';
    statusElem.style.color = report.passed ? 'var(--success)' : 'var(--accent)';
  }

  const listElem = document.getElementById('mock-exam-score-listening');
  if (listElem) listElem.textContent = `${report.listeningScore} / 100`;

  const readElem = document.getElementById('mock-exam-score-reading');
  if (readElem) readElem.textContent = `${report.readingScore} / 100`;

  const writeBox = document.getElementById('mock-exam-score-writing-box');
  const writeElem = document.getElementById('mock-exam-score-writing');
  if (writeBox && writeElem) {
    if (report.writingScore !== null && report.writingScore !== undefined) {
      writeBox.classList.remove('hidden');
      writeElem.textContent = `${report.writingScore} / 100`;
    } else {
      writeBox.classList.add('hidden');
    }
  }

  const listPct = report.weaknessSummary ? report.weaknessSummary.listeningAccuracy : 100;
  const readPct = report.weaknessSummary ? report.weaknessSummary.readingAccuracy : 100;
  
  const listPctElem = document.getElementById('mock-exam-diag-listening-pct');
  const listBar = document.getElementById('mock-exam-diag-listening-bar');
  if (listPctElem) listPctElem.textContent = `${listPct}%`;
  if (listBar) listBar.style.width = `${listPct}%`;

  const readPctElem = document.getElementById('mock-exam-diag-reading-pct');
  const readBar = document.getElementById('mock-exam-diag-reading-bar');
  if (readPctElem) readPctElem.textContent = `${readPct}%`;
  if (readBar) readBar.style.width = `${readPct}%`;

  const missedPanel = document.getElementById('mock-exam-missed-words-panel');
  const missedList = document.getElementById('mock-exam-missed-words-list');
  const missedWords = report.missedVocabWords || [];

  if (missedPanel && missedList) {
    if (missedWords.length > 0) {
      missedPanel.classList.remove('hidden');
      missedList.innerHTML = missedWords.map(w => {
        const localizedMeaning = state.currentLanguage === 'th' ? (w.meaning_th || w.meaning) : (w.meaning || w.meaning_th);
        return `
          <div class="tag" style="background: rgba(255, 51, 102, 0.15); color: var(--primary); font-size: 0.85rem; padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255, 51, 102, 0.3);">
            <strong>${w.character}</strong> (${w.pinyin}): ${localizedMeaning}
          </div>
        `;
      }).join('');
    } else {
      missedPanel.classList.add('hidden');
    }
  }

  modal.style.display = 'flex';
  modal.classList.remove('hidden');
}

function exitMockExamEarly() {
  if (confirm("Are you sure you want to exit the mock exam? Your current answers will not be graded.")) {
    clearInterval(currentMockExamSession.timerInterval);
    switchView('dashboard-view');
  }
}
window.exitMockExamEarly = exitMockExamEarly;

function closeMockExamResultModal() {
  const modal = document.getElementById('mock-exam-result-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.add('hidden');
  }
  switchView('dashboard-view');
  loadMockExamSummary();
  if (typeof renderVocabGardenWidget === 'function') {
    renderVocabGardenWidget();
  }
}
window.closeMockExamResultModal = closeMockExamResultModal;

// Global exports of other functions accessed via HTML to ensure ESM backward compatibility
window.playTone = playTone;
window.speakText = speakText;
window.switchView = switchView;
window.switchPane = switchPane;
window.startLesson = startLesson;
window.renderVocabGardenWidget = renderVocabGardenWidget;
window.localizeLessonObject = localizeLessonObject;
window.challengeSelector = challengeSelector;
window.srsEngine = srsEngine;

// Hook setupSrsEventListeners into initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    setupSrsEventListeners();
    if (typeof loadMockExamSummary === 'function') {
      loadMockExamSummary();
    }
  });
}

