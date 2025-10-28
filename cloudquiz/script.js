/* -------------------------------------------------------------
   script.js – only the parts used in login.html & index.html
   ------------------------------------------------------------- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7yUz7cS9aiczAKycuQun-JjeorGCmkLM",
  authDomain: "cloudquiz-bacea.firebaseapp.com",
  projectId: "cloudquiz-bacea",
  storageBucket: "cloudquiz-bacea.appspot.com",
  messagingSenderId: "938069212339",
  appId: "1:938069212339:web:8caa2905c8fc94bf2e84c6",
  measurementId: "G-9YF62YV2TZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ---------- DOM ELEMENTS ---------- */
let userSection, quizSection, resultSection, questionText, optionsDiv,
    resultText, quizSelect, progressBar, progressText, timerEl,
    prevBtn, nextBtn, adminKeyInput, adminStats, resultsWrap,
    resultsTableBody, breakdownDiv;

/* ---------- QUIZ STATE ---------- */
let username = "", currentQuestion = 0, score = 0, questions = [],
    selectedAnswers = [], quizId = "cloud_basics", timerId = null,
    timeRemainingMs = 10 * 60 * 1000, startTime = null,
    flaggedQuestions = new Set(), hintsUsed = 0;

/* ---------- ADMIN ---------- */
const ADMIN_KEY = "VIT_AdminKey_2025ava@123";

/* ---------- DEFAULT QUESTIONS (fallback) ---------- */
const DEFAULT_QUESTIONS = [
  { question: "What is the primary benefit of cloud computing?", options: ["Scalability","Fixed cost","Limited access","Manual updates"], answer: "Scalability", hint: "Think about handling traffic spikes." },
  { question: "Which is a core service model in cloud?", options: ["IaaS","PaaS","SaaS","All of the above"], answer: "All of the above", hint: "Three letters represent the models." },
  { question: "Public cloud is owned by?", options: ["Your company","Third-party provider","Government","None"], answer: "Third-party provider", hint: "Think Amazon, Azure, GCP." },
  { question: "What does VPC stand for?", options: ["Virtual Private Cloud","Very Powerful Computer","Virtual Public Cloud","None"], answer: "Virtual Private Cloud", hint: "Isolated network in the cloud." },
  { question: "Serverless computing means?", options: ["No servers at all","No management of servers","No internet","No code"], answer: "No management of servers", hint: "You write code, provider runs it." },
  { question: "Which is NOT a cloud deployment model?", options: ["Public","Private","Hybrid","Local"], answer: "Local", hint: "Standard models are Public, Private, Hybrid." },
  { question: "Elasticity in cloud refers to?", options: ["Stretching servers","Automatic scaling","Colorful UI","None"], answer: "Automatic scaling", hint: "Resources grow/shrink with demand." },
  { question: "What is a CDN?", options: ["Content Delivery Network","Cloud Data Node","Central Database Network","None"], answer: "Content Delivery Network", hint: "Speeds up static content delivery." },
  { question: "IAM in cloud stands for?", options: ["Identity and Access Management","Internet Application Module","Image Asset Manager","None"], answer: "Identity and Access Management", hint: "Controls who can do what." },
  { question: "Which service is an example of PaaS?", options: ["AWS EC2","Google App Engine","Azure Blob Storage","AWS S3"], answer: "Google App Engine", hint: "You deploy code, platform runs it." }
];

/* ---------- INITIALISE DOM ---------- */
function initDomElements() {
  userSection   = document.getElementById("userSection");
  quizSection   = document.getElementById("quizSection");
  resultSection = document.getElementById("resultSection");
  questionText  = document.getElementById("questionText");
  optionsDiv    = document.getElementById("options");
  resultText    = document.getElementById("resultText");
  quizSelect    = document.getElementById("quizSelect");
  progressBar   = document.getElementById("progressBar");
  progressText  = document.getElementById("progressText");
  timerEl       = document.getElementById("timer-text");
  prevBtn       = document.getElementById("prevBtn");
  nextBtn       = document.getElementById("nextBtn");

  adminKeyInput = document.getElementById("adminKey");
  adminStats    = document.getElementById("adminStats");
  resultsWrap   = document.getElementById("resultsWrap");
  resultsTableBody = document.querySelector("#resultsTable tbody");
  breakdownDiv  = document.getElementById("breakdown");
}

/* ---------- AUTH ---------- */
async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await addDoc(collection(db, "users"), {
    uid: cred.user.uid,
    email,
    displayName,
    role: 'student',
    createdAt: new Date().toISOString()
  });
  showNotification("Account created!", "success");
  return cred.user;
}

async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  showNotification("Signed in!", "success");
  return cred.user;
}

window.signOutUser = async () => {
  await signOut(auth);
  showNotification("Signed out", "info");
  location.href = 'login.html';
};

/* ---------- THEME ---------- */
window.toggleTheme = () => {
  const body = document.body;
  const icon = document.getElementById('theme-icon');
  if (body.hasAttribute('data-theme')) {
    body.removeAttribute('data-theme');
    icon.className = 'fas fa-moon';
    localStorage.setItem('theme', 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    icon.className = 'fas fa-sun';
    localStorage.setItem('theme', 'dark');
  }
};

function loadTheme() {
  const saved = localStorage.getItem('theme');
  const icon = document.getElementById('theme-icon');
  if (saved === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    icon.className = 'fas fa-sun';
  }
}

/* ---------- LOAD QUESTIONS ---------- */
async function loadQuestions() {
  questions = [];
  try {
    const snap = await getDocs(collection(db, "questions_cloud_basics"));
    snap.forEach(d => {
      const q = d.data();
      if (q.question && Array.isArray(q.options) && q.answer) {
        questions.push({ ...q, hint: q.hint || "No hint." });
      }
    });
  } catch (e) { /* ignore */ }

  if (questions.length === 0) questions = DEFAULT_QUESTIONS.slice(0, 10);
  else if (questions.length > 10) questions = questions.sort(() => 0.5 - Math.random()).slice(0, 10);
  selectedAnswers = new Array(questions.length).fill(null);
}

/* ---------- QUIZ FLOW ---------- */
window.startQuiz = async () => {
  username = document.getElementById("username").value.trim();
  if (!username) return showNotification("Enter your name", "error");

  await loadQuestions();
  currentQuestion = 0; score = 0; timeRemainingMs = 10 * 60 * 1000;
  startTime = Date.now(); flaggedQuestions.clear(); hintsUsed = 0;

  userSection?.classList.add("hidden");
  resultSection?.classList.add("hidden");
  quizSection?.classList.remove("hidden");

  updateProgress(); updateStats(); startTimer(); showQuestion();
};

function showQuestion() {
  const q = questions[currentQuestion];
  questionText.textContent = q.question;
  optionsDiv.innerHTML = "";
  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.className = "option";
    if (selectedAnswers[currentQuestion] === opt) btn.classList.add("selected");
    btn.onclick = () => selectAnswer(opt);
    optionsDiv.appendChild(btn);
  });

  prevBtn.disabled = currentQuestion === 0;
  nextBtn.innerHTML = currentQuestion === questions.length - 1 ?
    'Submit Quiz <i class="fas fa-check"></i>' :
    'Next Question <i class="fas fa-arrow-right"></i>';
  updateProgress(); updateQuestionNumber();
}

function selectAnswer(ans) {
  selectedAnswers[currentQuestion] = ans;
  optionsDiv.querySelectorAll('.option').forEach(b => {
    b.classList.toggle('selected', b.textContent === ans);
  });
  setTimeout(() => { if (currentQuestion < questions.length - 1) nextQuestion(); }, 500);
}

window.nextQuestion = () => {
  if (currentQuestion === questions.length - 1) { endQuiz(); return; }
  currentQuestion++; showQuestion();
};

window.prevQuestion = () => {
  if (currentQuestion === 0) return;
  currentQuestion--; showQuestion();
};

async function endQuiz() {
  score = selectedAnswers.reduce((c, a, i) => c + (a === questions[i].answer ? 1 : 0), 0);
  stopTimer();
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  const percent = Math.round((score / questions.length) * 100);

  quizSection?.classList.add("hidden");
  resultSection?.classList.remove("hidden");

  resultText.textContent = `Congratulations ${username}!`;
  document.getElementById("score-fraction").textContent = `${score}/${questions.length}`;
  document.getElementById("score-percentage").textContent = `${percent}%`;
  document.getElementById("time-taken").textContent = formatTime(timeTaken);
  document.getElementById("final-accuracy").textContent = `${percent}%`;
  document.getElementById("performance-level").textContent = getPerformanceLevel(percent);

  if (percent >= 80) showConfetti();
  renderBreakdown();

  const payload = { name: username, quizId, score, total: questions.length, percent, timeTaken,
                    hintsUsed, flaggedQuestions: [...flaggedQuestions], date: new Date().toISOString(),
                    answers: selectedAnswers };
  try { await addDoc(collection(db, "results"), payload); } catch (e) { /* fallback to local */ }
  saveResultLocally(payload);
}

/* ---------- RESULT ACTIONS ---------- */
window.restartQuiz = () => location.reload();
window.reviewAnswers = () => breakdownDiv?.scrollIntoView({ behavior: "smooth" });

/* ---------- TIMER ---------- */
function startTimer() {
  updateTimerText();
  timerId = setInterval(() => {
    timeRemainingMs -= 1000;
    updateTimerText();
    if (timeRemainingMs <= 0) { clearInterval(timerId); endQuiz(); }
  }, 1000);
}
function stopTimer() { clearInterval(timerId); }
function updateTimerText() {
  const s = Math.max(0, Math.floor(timeRemainingMs / 1000));
  timerEl.textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

/* ---------- HINT / FLAG ---------- */
window.showHint = () => {
  const q = questions[currentQuestion];
  document.getElementById("hintText").textContent = q.hint;
  document.getElementById("hintModal").classList.remove("hidden");
  hintsUsed++;
};
window.closeHint = () => document.getElementById("hintModal").classList.add("hidden");
window.flagQuestion = () => { flaggedQuestions.add(currentQuestion); showNotification("Flagged", "info"); };

/* ---------- ADMIN DASHBOARD ---------- */
window.loadResults = async () => {
  if (adminKeyInput.value.trim() !== ADMIN_KEY) {
    showNotification("Wrong admin key", "error"); return;
  }
  adminStats?.classList.remove("hidden");
  resultsWrap?.classList.remove("hidden");

  let rows = [];
  try {
    const snap = await getDocs(collection(db, "results"));
    snap.forEach(d => rows.push(d.data()));
  } catch (e) {
    rows = getLocalResults();
  }

  if (rows.length === 0) { showEmptyTable(); return; }

  rows.sort((a,b) => (b.date||"").localeCompare(a.date||""));
  resultsTableBody.innerHTML = "";
  let totalPct = 0, best = 0, totalTime = 0;
  rows.forEach(r => {
    const pct = r.percent ?? Math.round((r.score/r.total)*100);
    totalPct += pct; if (r.score > best) best = r.score; totalTime += (r.timeTaken||0);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.name||"-"}</td><td>${r.score}/${r.total}</td><td>${pct}%</td>
                    <td>${formatTime(r.timeTaken||0)}</td><td>${(r.date||"").replace("T"," ").slice(0,16)}</td>
                    <td><button class="action-btn secondary" onclick="viewDetails('${r.name}',${r.score},${r.total},'${r.date}')">
                      <i class="fas fa-eye"></i></button></td>`;
    resultsTableBody.appendChild(tr);
  });

  const avg = Math.round(totalPct/rows.length);
  const avgT = Math.round(totalTime/rows.length);
  document.getElementById("totalAttempts").textContent = rows.length;
  document.getElementById("averageScore").textContent = `${avg}%`;
  document.getElementById("bestScore").textContent = best;
  document.getElementById("avgTime").textContent = formatTime(avgT);
};

function showEmptyTable() {
  document.getElementById("totalAttempts").textContent = "0";
  document.getElementById("averageScore").textContent = "0%";
  document.getElementById("bestScore").textContent = "0";
  document.getElementById("avgTime").textContent = "0:00";
  resultsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
    <i class="fas fa-inbox" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>
    No results yet.</td></tr>`;
}

window.refreshResults = () => loadResults();
window.clearAllResults = () => {
  if (confirm("Delete all results?")) {
    localStorage.removeItem('quizResults');
    showNotification("Cleared", "success");
    loadResults();
  }
};

window.exportResults = () => showNotification("Export coming soon", "info");
window.viewDetails = (n,s,t,d) => showNotification(`${n}: ${s}/${t} on ${d}`, "info");

/* ---------- CERTIFICATE (simple txt) ---------- */
window.downloadCertificate = async () => {
  const pct = Math.round((score/questions.length)*100);
  if (pct < 70) return showNotification("Need 70% for certificate", "warning");

  const txt = `CLOUDQUIZ CERTIFICATE
====================
${username}
Score: ${score}/${questions.length} (${pct}%)
Date: ${new Date().toLocaleDateString()}
Quiz: Cloud Computing Basics
ID: ${Date.now()}`;

  const blob = new Blob([txt], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Certificate_${username.replace(/\s+/g,'_')}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  showNotification("Certificate downloaded", "success");
};

/* ---------- LOCAL STORAGE BACKUP ---------- */
function saveResultLocally(data) {
  const arr = JSON.parse(localStorage.getItem('quizResults')||'[]');
  arr.push(data);
  localStorage.setItem('quizResults', JSON.stringify(arr));
}
function getLocalResults() {
  return JSON.parse(localStorage.getItem('quizResults')||'[]');
}

/* ---------- UI HELPERS ---------- */
function updateProgress() {
  const cur = currentQuestion + 1;
  progressText.textContent = `Question ${cur} of ${questions.length}`;
  progressBar.style.width = `${Math.round((cur/questions.length)*100)}%`;
}
function updateQuestionNumber() {
  document.getElementById("question-number").textContent = currentQuestion + 1;
}
function updateStats() {
  const correct = selectedAnswers.slice(0, currentQuestion+1)
    .filter((a,i) => a===questions[i]?.answer).length;
  const inc = (currentQuestion+1) - correct;
  document.getElementById("correct-count").textContent = correct;
  document.getElementById("incorrect-count").textContent = inc;
}
function renderBreakdown() {
  breakdownDiv.innerHTML = "";
  const ol = document.createElement("ol");
  questions.forEach((q,i) => {
    const correct = selectedAnswers[i]===q.answer;
    const li = document.createElement("li");
    li.innerHTML = `<div class="qa ${correct?'correct':'wrong'}">
      <div class="q">${q.question}</div>
      <div class="a">Your: ${selectedAnswers[i]??'—'}</div>
      <div class="a">Correct: ${q.answer}</div>
      ${flaggedQuestions.has(i)?'<div class="flagged"><i class="fas fa-flag"></i> Flagged</div>':''}
    </div>`;
    ol.appendChild(li);
  });
  breakdownDiv.appendChild(ol);
}
function formatTime(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function getPerformanceLevel(p) {
  if (p>=90) return "Expert";
  if (p>=80) return "Advanced";
  if (p>=70) return "Intermediate";
  if (p>=60) return "Beginner";
  return "Needs Practice";
}
function showConfetti() {
  const c = document.getElementById("confetti");
  if (!c) return;
  c.classList.remove("hidden");
  for (let i=0;i<50;i++) {
    const p = document.createElement("div");
    p.style.cssText = `position:absolute;width:10px;height:10px;background:${['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b'][i%5]};
                       left:${Math.random()*100}%;top:-10px;
                       animation:confettiFall ${2+Math.random()*3}s linear forwards;border-radius:50%;`;
    c.appendChild(p);
    setTimeout(()=>p.remove(),5000);
  }
  setTimeout(()=>c.classList.add("hidden"),5000);
}
function showNotification(msg,type="info") {
  const n = document.createElement("div");
  n.className = `notification notification-${type}`;
  n.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':type==='warning'?'exclamation-triangle':'info-circle'}"></i><span>${msg}</span>`;
  Object.assign(n.style, {
    position:'fixed',top:'20px',right:'20px',background:'var(--bg-primary)',color:'var(--text-primary)',
    padding:'1rem 1.5rem',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-lg)',
    borderLeft:`4px solid var(--${type}-color)`,zIndex:1001,display:'flex',alignItems:'center',gap:'0.75rem',
    maxWidth:'400px',animation:'slideIn 0.3s ease'
  });
  document.body.appendChild(n);
  setTimeout(()=>{ n.style.animation='fadeOut 0.3s ease'; setTimeout(()=>n.remove(),300); },3000);
}

/* ---------- AUTH UI (login page) ---------- */
window.showAuthTab = tab => {
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('signinForm').classList.toggle('hidden', tab!=='signin');
  document.getElementById('signupForm').classList.toggle('hidden', tab!=='signup');
};

window.handleSignIn = async () => {
  const email = document.getElementById('signinEmail').value.trim();
  const pass  = document.getElementById('signinPassword').value;
  if (!email||!pass) return showNotification("Fill all fields","error");
  await signIn(email,pass);
  location.href='index.html';
};

window.handleSignUp = async () => {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass  = document.getElementById('signupPassword').value;
  if (!name||!email||!pass) return showNotification("Fill all fields","error");
  if (pass.length<6) return showNotification("Password ≥6 chars","error");
  await signUp(email,pass,name);
  location.href='index.html';
};

/* ---------- GLOBAL AUTH LISTENER ---------- */
onAuthStateChanged(auth, user => {
  if (user) {
    // show profile on index.html
    const profile = document.getElementById('userProfile');
    if (profile) {
      profile.classList.remove('hidden');
      document.getElementById('userDisplayName').textContent = user.displayName || user.email.split('@')[0];
    }
    // if on login page → go to index
    if (location.pathname.includes('login.html')) location.href='index.html';
  } else {
    // if on index → go to login
    if (location.pathname.includes('index.html') || location.pathname==='/') location.href='login.html';
  }
});

/* ---------- PAGE LOAD ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initDomElements();
  loadTheme();

  // keyboard navigation (quiz)
  document.addEventListener('keydown', e => {
    if (!quizSection || quizSection.classList.contains('hidden')) return;
    if (e.key==='ArrowRight' || e.key==='Enter') nextQuestion();
    else if (e.key==='ArrowLeft') prevQuestion();
    else if (e.key>='1' && e.key<='4') {
      const idx = parseInt(e.key)-1;
      const btn = optionsDiv?.querySelectorAll('.option')[idx];
      btn?.click();
    }
  });

  // close modal on outside click
  document.addEventListener('click', e => {
    const modal = document.getElementById('hintModal');
    if (e.target===modal) closeHint();
  });
});

/* ---------- CONFETTI / NOTIFICATION ANIMATIONS ---------- */
const style = document.createElement('style');
style.textContent = `
@keyframes confettiFall{to{transform:translateY(100vh) rotate(720deg);}}
@keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}
@keyframes fadeOut{to{opacity:0;transform:translateX(100%);}}
`;
document.head.appendChild(style);