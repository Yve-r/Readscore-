// ══════════════════════════════════════
//  READSCORE — JAVASCRIPT (AI-POWERED)
//  Sections:
//  1. Configuration & State
//  2. Page Navigation
//  3. Auth (Login / Register)
//  4. Assessment Logic
//  5. AI Evaluation & Results
//  6. Classroom
//  7. Utilities (Toast, API)
// ══════════════════════════════════════

// ─────────────────────────────────────
//  1. CONFIGURATION & STATE
// ─────────────────────────────────────
const API_BASE_URL = 'http://localhost:5000';

// Reading passage (must match backend)
const PASSAGE = `Water is one of the most important resources on Earth. Every living thing — humans, animals, and plants — needs water to survive. However, clean and fresh water is not unlimited. Only about three percent of all water on Earth is fresh water, and most of it is frozen in glaciers and ice caps.

In the Philippines, many communities still struggle with water shortages, especially during dry seasons. Rivers and lakes are sometimes polluted due to improper waste disposal, making the water unsafe to drink. This affects not only the health of the people but also the animals and plants that depend on those water sources.

There are many simple ways we can help save water in our daily lives. Turning off the faucet while brushing teeth, fixing leaky pipes, and collecting rainwater for watering plants are small steps that make a big difference. When everyone works together to conserve water, we help ensure that future generations will also have enough clean water to drink and use.`;

const questions = [
  { q: "What percentage of Earth's water is fresh water?", bloom: "Remember" },
  { q: "In your own words, why is clean water important for living things?", bloom: "Understand" },
  { q: "What are two specific actions mentioned in the passage that people can do to save water at home?", bloom: "Remember" },
  { q: "How does water pollution affect both people and the environment based on the passage?", bloom: "Analyze" },
  { q: "If your community is experiencing a water shortage, what solutions from the passage would you apply and why?", bloom: "Apply" },
];

let currentQ = 0;
let answers = Array(questions.length).fill('');
let evaluationResults = []; // Store AI evaluation results
let currentUser = null;

// ─────────────────────────────────────
//  2. PAGE NAVIGATION
// ─────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ─────────────────────────────────────
//  3. AUTH — LOGIN / REGISTER
// ─────────────────────────────────────
function handleLogin() {
  const username = document.getElementById('home-username').value.trim();
  const password = document.getElementById('home-password').value;

  if (!username || !password) {
    showToast('✗', 'Please enter username and password');
    return;
  }

  // Try server-side login first
  try {
    fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json()).then(data => {
      if (data && data.success) {
        currentUser = { username: data.username, role: data.role, fullName: data.fullName || '' };
        localStorage.setItem('rs_user', JSON.stringify(currentUser));
        showToast('✓', `Welcome, ${currentUser.username}!`);
        if (currentUser.role === 'teacher') {
          showPage('page-classroom');
        } else {
          showPage('page-reading');
          document.getElementById('reading-fill').style.width = '15%';
        }
      } else {
        // fallback to client simulation
        showToast('⚠', data?.error || 'Login failed; using offline fallback');
        offlineLoginFallback(username);
      }
    }).catch(() => {
      showToast('⚠', 'Server unreachable — offline login');
      offlineLoginFallback(username);
    });
  } catch (e) {
    showToast('✗', 'Login error');
    offlineLoginFallback(username);
  }
}

function offlineLoginFallback(username) {
  if (username.toLowerCase() === 'teacher') {
    currentUser = { role: 'teacher', username };
    localStorage.setItem('rs_user', JSON.stringify(currentUser));
    showPage('page-classroom');
    showToast('✓', `Welcome, ${username}!`);
    return;
  }
  currentUser = { role: 'student', username };
  localStorage.setItem('rs_user', JSON.stringify(currentUser));
  showPage('page-reading');
  document.getElementById('reading-fill').style.width = '15%';
}

function handleCodeJoin() {
  const code = document.getElementById('home-class-code').value.trim().toUpperCase();

  if (code === 'RC-4821') {
    showPage('page-reading');
    document.getElementById('reading-fill').style.width = '15%';
    showToast('✓', 'Joined classroom RC-4821!');
  } else {
    showToast('✗', 'Invalid class code. Try RC-4821.');
  }
}

function showStudentCodeEntry() {
  const input = document.getElementById('home-class-code');
  input.focus();
  input.scrollIntoView({ behavior: 'smooth' });
}

function handleRegister() {
  const isTeacher = document.getElementById('role-teacher').classList.contains('active');
  const fullName = document.getElementById('reg-fullname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-password-confirm').value;
  const classroom = document.getElementById('reg-classroom').value.trim();

  if (!fullName || !username || !password || !confirm) {
    showToast('✗', 'Please fill all required fields');
    return;
  }

  if (password.length < 8) {
    showToast('✗', 'Password must be at least 8 characters');
    return;
  }

  if (password !== confirm) {
    showToast('✗', 'Passwords do not match');
    return;
  }

  if (isTeacher && !classroom) {
    showToast('✗', 'Please enter your classroom name');
    return;
  }

  // Try server-side registration
  try {
    fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, password, role: isTeacher ? 'teacher' : 'student', classroom })
    }).then(r => r.json()).then(data => {
      if (data && data.success) {
        currentUser = { role: data.role, username: data.username, fullName: data.fullName };
        localStorage.setItem('rs_user', JSON.stringify(currentUser));
        showToast('✓', 'Account created successfully');
        if (data.role === 'teacher') {
          showPage('page-classroom');
        } else {
          showPage('page-reading');
          document.getElementById('reading-fill').style.width = '15%';
        }
      } else {
        showToast('⚠', data?.error || 'Registration failed — offline fallback');
        // fallback: store in localStorage
        currentUser = { role: isTeacher ? 'teacher' : 'student', username, fullName, classroom: isTeacher ? classroom : null };
        localStorage.setItem('rs_user', JSON.stringify(currentUser));
        if (currentUser.role === 'teacher') showPage('page-classroom'); else showPage('page-reading');
      }
    }).catch(() => {
      showToast('⚠', 'Server unreachable — offline registration');
      currentUser = { role: isTeacher ? 'teacher' : 'student', username, fullName, classroom: isTeacher ? classroom : null };
      localStorage.setItem('rs_user', JSON.stringify(currentUser));
      if (currentUser.role === 'teacher') showPage('page-classroom'); else showPage('page-reading');
    });
  } catch (e) {
    showToast('✗', 'Registration error');
  }
}

function togglePassword(fieldId, checkboxId) {
  const field = document.getElementById(fieldId);
  const cb = document.getElementById(checkboxId);
  if (!field || !cb) return;
  field.type = cb.checked ? 'text' : 'password';
}

function setRole(role) {
  document.getElementById('role-teacher').classList.toggle('active', role === 'teacher');
  document.getElementById('role-student').classList.toggle('active', role === 'student');
  document.getElementById('classroom-field').style.display = role === 'teacher' ? 'block' : 'none';
}

// ─────────────────────────────────────
//  4. ASSESSMENT LOGIC
// ─────────────────────────────────────
function initAssessment() {
  currentQ = 0;
  answers = Array(questions.length).fill('');
  evaluationResults = [];
  renderQ();
  renderQNav();
}

function renderQ() {
  const q = questions[currentQ];

  document.getElementById('q-text').textContent = q.q;
  document.getElementById('a-text').value = answers[currentQ];
  document.getElementById('qa-progress-label').textContent = `Question ${currentQ + 1} of ${questions.length}`;
  document.getElementById('word-count').textContent = wordCount(answers[currentQ]) + ' words';

  const bloomClass = {
    Remember: 'bloom-remember',
    Understand: 'bloom-understand',
    Apply: 'bloom-apply',
    Analyze: 'bloom-analyze',
    Evaluate: 'bloom-evaluate',
    Create: 'bloom-create',
  }[q.bloom] || 'bloom-remember';

  document.getElementById('bloom-badge-wrap').innerHTML =
    `<span class="bloom-badge ${bloomClass}">Bloom's: ${q.bloom}</span>`;

  renderQNav();
  updateNextButton();
}

function updateNextButton() {
  const nextBtn = document.getElementById('next-btn');
  if (!nextBtn) return;

  const unanswered = answers.filter(a => !a.trim()).length;
  const isCurrentUnanswered = !answers[currentQ].trim();

  // If the current question is the last unanswered one, change label
  if (unanswered === 1 && isCurrentUnanswered) {
    nextBtn.textContent = 'Submit All';
  } else {
    nextBtn.textContent = 'Next';
  }
}

function renderQNav() {
  const nav = document.getElementById('q-nav');
  nav.innerHTML = '';

  questions.forEach((_, i) => {
    const btn = document.createElement('div');
    btn.className = 'q-num'
      + (i === currentQ ? ' active' : '')
      + (answers[i] ? ' answered' : '');
    btn.textContent = i + 1;
    btn.onclick = () => { currentQ = i; renderQ(); };
    nav.appendChild(btn);
  });
}

function saveAnswer() {
  answers[currentQ] = document.getElementById('a-text').value;
  document.getElementById('word-count').textContent = wordCount(answers[currentQ]) + ' words';
  renderQNav();
  updateNextButton();
}

function wordCount(str) {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

function changeQ(dir) {
  saveAnswer();

  // If moving forward and there are no more unanswered questions, submit instead
  if (dir > 0) {
    const unanswered = answers.filter(a => !a.trim()).length;
    if (unanswered === 0) {
      submitAssessment();
      return;
    }
  }

  currentQ = Math.max(0, Math.min(questions.length - 1, currentQ + dir));
  renderQ();
}

async function submitAssessment() {
  saveAnswer();
  const unanswered = answers.filter(a => !a.trim()).length;

  if (unanswered > 0) {
    showToast('⚠', `${unanswered} question(s) still unanswered.`);
    return;
  }

  // Show loading state
  showToast('🤖', 'AI is evaluating your answers...');
  
  try {
    // Evaluate all answers using the AI pipeline
    await evaluateAllAnswers();
    
    // Show results page
    showPage('page-result');
    showResults();
  } catch (error) {
    console.error('Evaluation error:', error);
    showToast('✗', 'Error evaluating answers. Please try again.');
  }
}

// ─────────────────────────────────────
//  5. AI EVALUATION & RESULTS
// ─────────────────────────────────────
async function evaluateAllAnswers() {
  // Prepare batch request
  const qa_pairs = questions.map((q, idx) => ({
    question: q.q,
    answer: answers[idx]
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/evaluate_batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qa_pairs })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Evaluation failed');
    }

    evaluationResults = data.results;
    console.log('Evaluation results:', evaluationResults);
    
  } catch (error) {
    console.error('Error calling API:', error);
    // Fallback to mock data if API is unavailable
    showToast('⚠', 'Using offline scoring (API unavailable)');
    evaluationResults = generateMockResults();
  }
}

function generateMockResults() {
  // Fallback mock results if backend is unavailable
  return questions.map((q, idx) => ({
    question_index: idx,
    question: q.q,
    answer: answers[idx],
    result: {
      story_entailment: 0.7 + Math.random() * 0.25,
      story_neutral: 0.15,
      story_contradiction: 0.1,
      answer_entailment: 0.65 + Math.random() * 0.3,
      question_relevance: 0.7 + Math.random() * 0.25,
      expected_answer: "Mock expected answer",
      is_grounded: Math.random() > 0.3 ? 1 : 0,
      is_relevant: Math.random() > 0.2 ? 1 : 0,
      is_similar: Math.random() > 0.3 ? 1 : 0,
      is_correct: Math.random() > 0.35 ? 1 : 0,
      bloom_category: q.bloom,
      bloom_confidence: 0.75 + Math.random() * 0.2
    }
  }));
}

function calculateScores() {
  // Calculate scores by Bloom's level
  const bloomScores = {
    Remember: [],
    Understand: [],
    Apply: [],
    Analyze: []
  };

  evaluationResults.forEach((result, idx) => {
    const bloom = questions[idx].bloom;
    const score = result.result.is_correct * 100;
    
    if (bloomScores[bloom]) {
      bloomScores[bloom].push(score);
    }
  });

  // Calculate averages
  const scores = {};
  Object.keys(bloomScores).forEach(level => {
    const levelScores = bloomScores[level];
    if (levelScores.length > 0) {
      scores[level] = Math.round(
        levelScores.reduce((a, b) => a + b, 0) / levelScores.length
      );
    } else {
      scores[level] = 0;
    }
  });

  return scores;
}

function showResults() {
  const scores = calculateScores();
  
  // Calculate overall score
  const scoreLevels = Object.values(scores).filter(s => s > 0);
  const overall = scoreLevels.length > 0
    ? Math.round(scoreLevels.reduce((a, b) => a + b, 0) / scoreLevels.length)
    : 0;

  // Determine Phil-IRI level
  let level, levelDesc;
  if (overall >= 80) {
    level = 'Independent';
    levelDesc = 'Student reads without difficulty';
  } else if (overall >= 59) {
    level = 'Instructional';
    levelDesc = 'Student needs guided instruction';
  } else {
    level = 'Frustration';
    levelDesc = 'Student struggles significantly';
  }

  // Update UI
  document.getElementById('res-score').textContent = overall + '%';
  document.getElementById('res-level').textContent = level;
  document.getElementById('res-level-desc').textContent = levelDesc;

  document.getElementById('res-bloom-overall').textContent = overall + '%';
  document.getElementById('res-bloom-bar').style.width = overall + '%';

  renderAnswerPreview(questions.map((q, idx) => ({
    question: q.q,
    answer: answers[idx] || 'No answer provided.'
  })));

  // Log detailed results to console
  console.log('=== DETAILED EVALUATION RESULTS ===');
  evaluationResults.forEach((result, idx) => {
    console.log(`\nQuestion ${idx + 1}: ${questions[idx].q}`);
    console.log(`Answer: ${answers[idx]}`);
    console.log(`Expected: ${result.result.expected_answer}`);
    console.log(`Bloom Category: ${result.result.bloom_category} (${(result.result.bloom_confidence * 100).toFixed(1)}%)`);
    console.log(`Story Entailment: ${(result.result.story_entailment * 100).toFixed(1)}%`);
    console.log(`Question Relevance: ${(result.result.question_relevance * 100).toFixed(1)}%`);
    console.log(`Answer Similarity: ${(result.result.answer_entailment * 100).toFixed(1)}%`);
    console.log(`Is Correct: ${result.result.is_correct ? '✓ YES' : '✗ NO'}`);
  });
}

function renderAnswerPreview(items) {
  const list = document.getElementById('answer-preview-list');
  if (!list) return;
  list.innerHTML = '';

  if (!items || !items.length) {
    list.innerHTML = '<div class="answer-preview-item">No answers available to preview.</div>';
    return;
  }

  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'answer-preview-item';

    const header = document.createElement('div');
    header.className = 'answer-preview-item-header';
    header.innerHTML = `
      <div class="question-index">${idx + 1}</div>
      <div class="question-title">${item.question}</div>
    `;

    const answerText = document.createElement('div');
    answerText.className = 'answer-preview-item-text';
    answerText.textContent = item.answer || 'No answer provided.';

    card.appendChild(header);
    card.appendChild(answerText);
    list.appendChild(card);
  });
}

// ─────────────────────────────────────
//  6. CLASSROOM
// ─────────────────────────────────────
function viewStudentResult(name, score, level) {
  showPage('page-result');
  document.querySelector('#page-result h2').textContent = `Results — ${name}`;
  document.getElementById('res-score').textContent = score + '%';
  document.getElementById('res-level').textContent = level;

  const descs = {
    Independent: 'Reads without difficulty',
    Instructional: 'Needs guided instruction',
    Frustration: 'Struggles significantly',
  };
  document.getElementById('res-level-desc').textContent = descs[level] || '';
  document.getElementById('res-bloom-overall').textContent = score + '%';
  document.getElementById('res-bloom-bar').style.width = score + '%';

  renderAnswerPreview([
    { question: 'What was the main message of the passage?', answer: 'The passage explained how important it is to conserve water and protect water sources.' },
    { question: 'Name two ways people can save water.', answer: 'They can turn off taps while brushing and collect rainwater for plants.' },
    { question: 'How does pollution affect communities?', answer: 'Polluted water makes it unsafe to drink and harms people, animals, and plants.' }
  ]);
}

function copyCode() {
  navigator.clipboard?.writeText('RC-4821').catch(() => { });
  showToast('✓', 'Class code RC-4821 copied!');
}

function showNewAssessmentModal() {
  // Navigate to the teacher assessment editor page
  window.location.href = 'new_assessment.html';
}

// ─────────────────────────────────────
//  7. UTILITIES — TOAST & API
// ─────────────────────────────────────
let toastTimer;

function showToast(icon, msg) {
  clearTimeout(toastTimer);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast').classList.add('show');
  toastTimer = setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
}

// Check API health on page load
window.addEventListener('load', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✓ AI Backend connected successfully');
    }
  } catch (error) {
    console.warn('⚠ AI Backend not available - will use offline mode');
  }
});
