/**
 * HanPath - Core Application Engine (4-Stage Layout)
 */

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
        
        if (!serverData.userLevel && state.userLevel) {
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
          if (document.getElementById("lesson-pretest-quiz-screen").style.display !== "none") {
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
      document.getElementById("auth-name").style.display = isLogin ? "none" : "block";
      document.getElementById("auth-error").style.display = "none";
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
          errorDiv.style.display = "block";
        }
      } catch (err) {
        errorDiv.textContent = t('error_network');
        errorDiv.style.display = "block";
      }
    });
  }

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

  document.getElementById("skip-pretest-btn").addEventListener("click", () => {
    state.hasTakenPlacementTest = true;
    state.userLevel = "hsk1"; // Default level
    saveProgress();
    switchView("dashboard-view");
  });
  
  document.getElementById("pretest-next-btn").addEventListener("click", nextPretestQuestion);
  document.getElementById("claim-placement-btn").addEventListener("click", () => {
    switchView("dashboard-view");
  });

  // Banner pretest trigger
  const bannerPretestBtn = document.getElementById("banner-pretest-btn");
  if (bannerPretestBtn) {
    bannerPretestBtn.addEventListener("click", () => {
      switchView("pretest-view");
      initPretest();
    });
  }

  // Pinyin Chart triggers
  const pinyinChartBtn = document.getElementById("pinyin-chart-btn");
  if (pinyinChartBtn) {
    pinyinChartBtn.addEventListener("click", () => {
      switchView("pinyin-chart-view");
      initPinyinChart();
    });
  }

  const pinyinBackBtn = document.getElementById("pinyin-back-btn");
  if (pinyinBackBtn) {
    pinyinBackBtn.addEventListener("click", () => {
      switchView("dashboard-view");
    });
  }

  // Lesson pretest triggers
  document.getElementById("begin-lesson-test-btn").addEventListener("click", () => {
    document.getElementById("lesson-pretest-intro-screen").style.display = "none";
    document.getElementById("lesson-pretest-quiz-screen").style.display = "block";
    startLessonPretestQuiz();
  });

  document.getElementById("skip-lesson-test-entirely-btn").addEventListener("click", () => {
    startLesson(state.currentLessonId);
  });

  document.getElementById("lesson-pretest-next-btn").addEventListener("click", nextLessonPretestQuestion);

  document.getElementById("lesson-pretest-start-study-btn").addEventListener("click", () => {
    startLesson(state.currentLessonId);
  });

  document.getElementById("lesson-pretest-skip-lesson-btn").addEventListener("click", () => {
    if (!state.completedLessons.includes(state.currentLessonId)) {
      state.completedLessons.push(state.currentLessonId);
      state.score += 30; // Bonus points for skipping via pre-test mastery!
      saveProgress();
    }
    switchView("dashboard-view");
  });

  document.getElementById("lesson-pretest-exit-btn").addEventListener("click", () => {
    switchView("dashboard-view");
  });

  // Reminder configurator
  document.getElementById("set-reminder-btn").addEventListener("click", setupDailyReminders);

  // Welcome & Level Select
  document.querySelectorAll('.manual-level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.userLevel = e.target.getAttribute('data-level');
      saveProgress();
      switchView("dashboard-view");
    });
  });
  
  document.getElementById('change-level-select').addEventListener('change', (e) => {
    state.userLevel = e.target.value;
    saveProgress();
    fetchCurriculumAndRender(state.userLevel);
  });
  
  document.getElementById('reset-progress-btn').addEventListener('click', () => {
    showConfirmModal("title_confirm", "msg_reset_progress", () => {
      state.userLevel = null;
      state.completedLessons = [];
      state.score = 0;
      state.timeSpentMinutes = 0;
      saveProgress();
      switchView("welcome-view");
    });
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
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
    document.getElementById('free-write-canvas').style.display = 'none';
    if(writer) { writer.cancelQuiz(); writer.animateCharacter(); }
  });
  document.getElementById('mode-trace-btn').addEventListener('click', (e) => {
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('free-write-canvas').style.display = 'none';
    if(writer) writer.quiz({showHintAfterMisses: 1});
  });
  document.getElementById('mode-freewrite-btn').addEventListener('click', (e) => {
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById('free-write-canvas').style.display = 'block';
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
    document.getElementById('btn-writing-clear').style.display = 'inline-block';
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
      el.style.display = (el.style.display === 'none') ? 'block' : 'none';
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
  document.getElementById('dashboard-level-badge').textContent = getLevelName(state.userLevel);
  document.getElementById('change-level-select').value = state.userLevel;
  
  document.getElementById('stat-lessons-completed').textContent = state.completedLessons.length;
  // Let's also update the daily streak value here!
  document.getElementById('stat-streak').textContent = state.streakCount;
  document.getElementById('stat-time-spent').textContent = Math.round(state.timeSpentMinutes / 60) + "h";
  document.getElementById('score-val').textContent = state.score;

  // Toggle placement test warning banner
  const warningBanner = document.getElementById('placement-warning-banner');
  if (warningBanner) {
    warningBanner.style.display = state.hasTakenPlacementTest ? 'none' : 'flex';
  }
  
  const container = document.getElementById('dashboard-lessons-container');
  container.innerHTML = '';
  
  const lessons = (window.CHINESE_LESSONS && window.CHINESE_LESSONS.lessons) ? (window.CHINESE_LESSONS.lessons[state.userLevel] || []) : [];
  
  // Update Today's Recommended Lesson Panel
  const activeLesson = lessons.find(l => !state.completedLessons.includes(l.id));
  const todayPanel = document.getElementById('today-lesson-panel');
  if (todayPanel) {
    if (activeLesson) {
      todayPanel.style.display = 'block';
      document.getElementById('today-lesson-title').textContent = t('day_prefix', { day: activeLesson.day_number || activeLesson.id.replace(/^hsk\d_day/, '') }) + ld(activeLesson, 'title');
      
      let descId = "todays_lesson_desc";
      if (state.userLevel === 'hsk2') descId = "todays_lesson_desc_hsk2";
      if (state.userLevel === 'hsk3') descId = "todays_lesson_desc_hsk3";
      document.getElementById('today-lesson-desc').textContent = t(descId);
      
      const todayTag = document.getElementById('today-lesson-tag');
      todayTag.textContent = t('todays_lesson_with_level', { level: state.userLevel.toUpperCase() });
      todayTag.className = `tag tag-${state.userLevel}`;
      
      const startBtn = document.getElementById('today-lesson-start-btn');
      startBtn.textContent = t('btn_start_today');
      startBtn.onclick = () => routeToLesson(activeLesson.id);
    } else {
      if (lessons.length > 0) {
        todayPanel.style.display = 'block';
        document.getElementById('today-lesson-title').textContent = t('level_complete_title');
        document.getElementById('today-lesson-desc').textContent = t('level_complete_desc', { level: state.userLevel.toUpperCase() });
        
        const todayTag = document.getElementById('today-lesson-tag');
        todayTag.textContent = t('lbl_complete_tag');
        todayTag.className = "tag tag-hsk1";
        todayTag.style.background = "var(--success)";
        
        const startBtn = document.getElementById('today-lesson-start-btn');
        startBtn.textContent = t('btn_explore_next');
        startBtn.onclick = () => {
          if (state.userLevel === 'hsk1') {
            state.userLevel = 'hsk2';
          } else if (state.userLevel === 'hsk2') {
            state.userLevel = 'hsk3';
          } else {
            document.getElementById('today-lesson-desc').textContent = t('all_levels_complete');
            document.getElementById('today-lesson-desc').style.color = "var(--success)";
            startBtn.style.display = "none";
            return;
          }
          saveProgress();
          renderDashboard();
        };
      } else {
        todayPanel.style.display = 'none';
      }
    }
  }

  lessons.forEach(l => {
    const isCompleted = state.completedLessons.includes(l.id);
    const div = document.createElement('div');
    div.className = `lesson-row glass-panel ${isCompleted ? 'completed' : ''}`;
    div.innerHTML = `
      <div class="lesson-info">
        <h4 class="mb-1">${t('day_prefix', { day: l.day_number || l.id.replace(/^hsk\d_day/, '') })}${ld(l, 'title')}</h4>
        <div class="text-sm text-muted">
          ${t('lesson_stages_info')}
        </div>
      </div>
      <div>
        ${isCompleted ? 
          `<button class="btn btn-primary btn-sm start-lesson-btn" data-id="${l.id}">${t('lbl_done')} (Re-learn)</button>` : 
          `<button class="btn btn-primary btn-sm start-lesson-btn" data-id="${l.id}">${t('btn_start_lesson_short')}</button>`
        }
      </div>
    `;
    container.appendChild(div);
  });
  
  document.querySelectorAll('.start-lesson-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
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
  document.querySelectorAll('.lesson-pane-content').forEach(el => el.style.display = 'none');
  document.getElementById(paneId).style.display = 'block';
  
  document.querySelectorAll('.timeline-step').forEach(el => el.classList.remove('active'));
  const stepEl = document.querySelector(`.timeline-step[data-pane="${paneId}"]`);
  if(stepEl) stepEl.classList.add('active');
  
  const idx = timelineStages.indexOf(paneId);
  document.getElementById('pane-back-btn').style.visibility = idx === 0 ? 'hidden' : 'visible';
  document.getElementById('pane-next-btn').style.display = idx === timelineStages.length - 1 ? 'none' : 'block';
  
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
         tabsContainer.style.display = 'flex';
         tabsContainer.style.gap = '0.5rem';
         tabsContainer.style.justifyContent = 'center';
         tabsContainer.style.marginTop = '1rem';
         tabsContainer.style.flexWrap = 'wrap';
         targetDiv.parentNode.insertBefore(tabsContainer, targetDiv.nextSibling);
      }
      tabsContainer.innerHTML = '';

      writer = HanziWriter.create('hanzi-writer-target', v.character.charAt(0), {
        width: 200,
        height: 200,
        padding: 15,
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
  document.getElementById('lesson-quiz-explanation-box').style.display = 'none';
  document.getElementById('lesson-quiz-next-btn').style.display = 'none';
  
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
  document.getElementById('lesson-quiz-explanation-box').style.display = 'block';
  
  const nextBtn = document.getElementById('lesson-quiz-next-btn');
  nextBtn.style.display = 'inline-block';
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
  
  document.getElementById("pretest-intro-screen").style.display = "block";
  document.getElementById("pretest-quiz-screen").style.display = "none";
  document.getElementById("pretest-result-screen").style.display = "none";

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
  
  document.getElementById("pretest-explanation-box").style.display = "none";
  document.getElementById("pretest-next-btn").style.display = "none";
  
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
  expBox.style.display = "block";
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").style.color = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").textContent = isCorrect ? t('msg_correct') : t('msg_incorrect');
  
  document.getElementById("pretest-next-btn").style.display = "inline-block";
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
  document.getElementById("pretest-quiz-screen").style.display = "none";
  document.getElementById("pretest-result-screen").style.display = "block";
  
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
      document.getElementById('custom-confirm-modal').style.display = 'none';
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

      document.getElementById("lesson-pretest-intro-screen").style.display = "block";
      document.getElementById("lesson-pretest-quiz-screen").style.display = "none";
      document.getElementById("lesson-pretest-result-screen").style.display = "none";

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

  document.getElementById("lesson-pretest-explanation-box").style.display = "none";
  document.getElementById("lesson-pretest-next-btn").style.display = "none";

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
  expBox.style.display = "block";
  expBox.style.borderColor = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").style.color = isCorrect ? "var(--success)" : "var(--error)";
  expBox.querySelector("strong").textContent = isCorrect ? t('msg_correct') : t('msg_incorrect');

  const nextBtn = document.getElementById("lesson-pretest-next-btn");
  nextBtn.style.display = "inline-block";
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
  document.getElementById("lesson-pretest-quiz-screen").style.display = "none";
  document.getElementById("lesson-pretest-result-screen").style.display = "block";

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
    skipBtn.style.display = "inline-block";
  } else {
    recTitle.textContent = t('pretest_result_ready');
    recTitle.style.color = "var(--primary)";
    recDesc.textContent = t('pretest_result_ready_desc', { score: score, total: total });
    skipBtn.style.display = "none";
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
      if (content) content.style.display = 'block';
      if (btn) { btn.classList.add('btn-primary', 'active'); btn.classList.remove('btn-secondary'); }
    } else {
      if (content) content.style.display = 'none';
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
  const dict = i18nDictionary[currentLang] || i18nDictionary['en'];
  
  document.getElementById('custom-confirm-title').textContent = dict[i18nKeyTitle] || dict['title_confirm'] || "Confirm";
  document.getElementById('custom-confirm-message').textContent = dict[i18nKeyMsg] || i18nKeyMsg;
  
  document.getElementById('custom-confirm-modal').style.display = 'flex';
  
  const cancelBtn = document.getElementById('custom-confirm-cancel');
  const okBtn = document.getElementById('custom-confirm-ok');
  
  // Clean up previous event listeners by cloning
  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  
  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  
  newCancel.addEventListener('click', () => {
    document.getElementById('custom-confirm-modal').style.display = 'none';
  });
  
  newOk.addEventListener('click', () => {
    document.getElementById('custom-confirm-modal').style.display = 'none';
    if (onConfirm) onConfirm();
  });
}
