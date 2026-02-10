const STUDENT_ARCHETYPES = [
  { label: "Curious Fox", style: "asks many why/how questions" },
  { label: "Skeptical Owl", style: "challenges weak logic" },
  { label: "Shy Rabbit", style: "needs examples and reassurance" },
  { label: "Detail Beaver", style: "wants precise terminology" },
  { label: "Big Picture Bear", style: "asks for intuition first" },
  { label: "Practical Squirrel", style: "demands real-world use cases" },
];

const QUESTION_STEMS = [
  "Can you give one concrete example?",
  "Why does this step work?",
  "What misconception should we avoid here?",
  "How is this different from a similar concept?",
  "Can we walk through one edge case?",
  "What should I memorize vs truly understand?",
];

const state = {
  lesson: null,
  students: [],
  queue: [],
  history: loadHistory(),
  streak: loadStreak(),
};

const els = {
  lessonForm: document.getElementById("lessonForm"),
  topic: document.getElementById("topic"),
  objective: document.getElementById("objective"),
  mode: document.getElementById("mode"),
  materials: document.getElementById("materials"),
  classStatus: document.getElementById("classStatus"),
  room: document.getElementById("room"),
  teachInput: document.getElementById("teachInput"),
  teachBtn: document.getElementById("teachBtn"),
  askCheckBtn: document.getElementById("askCheckBtn"),
  questionQueue: document.getElementById("questionQueue"),
  respondBtn: document.getElementById("respondBtn"),
  metrics: document.getElementById("metrics"),
  history: document.getElementById("history"),
  streakBadge: document.getElementById("streakBadge"),
  studentCardTemplate: document.getElementById("studentCardTemplate"),
};

els.lessonForm.addEventListener("submit", (event) => {
  event.preventDefault();

  state.lesson = {
    topic: els.topic.value.trim(),
    objective: els.objective.value.trim(),
    mode: els.mode.value,
    materials: els.materials.value.trim(),
    explanations: 0,
    checks: 0,
    startAt: Date.now(),
  };

  state.students = buildStudents();
  state.queue = [];

  updateStreak();
  renderAll();

  els.teachBtn.disabled = false;
  els.askCheckBtn.disabled = false;
  els.respondBtn.disabled = false;
  els.classStatus.textContent = `Class live: ${state.lesson.topic}. Objective: ${state.lesson.objective}`;
});

els.teachBtn.addEventListener("click", () => {
  const input = els.teachInput.value.trim();
  if (!input || !state.lesson) return;

  state.lesson.explanations += 1;
  const quality = evaluateExplanation(input);

  for (const student of state.students) {
    student.mastery = clamp(student.mastery + quality.masteryDelta + randomInt(-2, 4), 0, 100);
    student.confidence = clamp(student.confidence + quality.confDelta + randomInt(-2, 3), 0, 100);
    student.mood = student.mastery > 70 ? "🌟 getting it" : student.confidence < 35 ? "😵 confused" : "🙂 engaged";

    if (Math.random() < studentQuestionProbability(student, quality)) {
      enqueueQuestion(student);
    }
  }

  els.teachInput.value = "";
  renderAll();
});

els.askCheckBtn.addEventListener("click", () => {
  if (!state.lesson) return;
  state.lesson.checks += 1;

  const avgMastery = average(state.students.map((s) => s.mastery));
  const needsReview = avgMastery < 55;
  state.students.forEach((student) => {
    if (needsReview) {
      student.confidence = clamp(student.confidence - randomInt(3, 9), 0, 100);
      if (Math.random() < 0.65) enqueueQuestion(student, true);
    } else {
      student.mastery = clamp(student.mastery + randomInt(2, 7), 0, 100);
      student.confidence = clamp(student.confidence + randomInt(1, 4), 0, 100);
    }
  });

  const guidance = needsReview
    ? "Mini check indicates misconceptions. Re-teach with a worked example."
    : "Mini check looks strong. Move to transfer/edge-case questions.";

  els.classStatus.textContent = guidance;
  renderAll();
});

els.respondBtn.addEventListener("click", () => {
  if (!state.queue.length || !state.lesson) return;

  const next = state.queue.shift();
  const student = state.students.find((s) => s.id === next.studentId);
  if (student) {
    student.confidence = clamp(student.confidence + randomInt(5, 12), 0, 100);
    student.mastery = clamp(student.mastery + randomInt(2, 8), 0, 100);
    student.mood = "😊 clarified";
    els.classStatus.textContent = `You responded to ${student.name}: "${next.text}"`;
  }

  renderAll();
});

function buildStudents() {
  return STUDENT_ARCHETYPES.map((archetype, index) => ({
    id: `s-${index}`,
    name: ["Milo", "Nori", "Poppy", "Jun", "Tama", "Coco"][index],
    archetype: archetype.label,
    style: archetype.style,
    mastery: randomInt(18, 45),
    confidence: randomInt(25, 55),
    mood: "📝 ready",
  }));
}

function evaluateExplanation(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasExample = /example|for instance|e\.g\./i.test(text);
  const hasWhy = /because|therefore|so that|why/i.test(text);
  const hasStructure = /first|second|finally|step/i.test(text);

  let masteryDelta = words > 20 ? 6 : 2;
  let confDelta = words > 12 ? 4 : 1;

  if (hasExample) masteryDelta += 4;
  if (hasWhy) masteryDelta += 3;
  if (hasStructure) confDelta += 3;

  return { masteryDelta, confDelta };
}

function studentQuestionProbability(student, quality) {
  const lowConfidence = student.confidence < 40 ? 0.2 : 0;
  const lowMastery = student.mastery < 50 ? 0.2 : 0;
  const highQualityReduction = quality.masteryDelta > 10 ? -0.1 : 0;
  return clamp(0.18 + lowConfidence + lowMastery + highQualityReduction, 0.05, 0.75);
}

function enqueueQuestion(student, misconception = false) {
  const prompt = QUESTION_STEMS[randomInt(0, QUESTION_STEMS.length - 1)];
  const prefix = misconception ? "⚠️ Misconception check:" : "❓";
  state.queue.push({
    studentId: student.id,
    studentName: student.name,
    text: `${prefix} ${prompt}`,
  });
}

function renderAll() {
  renderStudents();
  renderQueue();
  renderMetrics();
  renderHistory();
}

function renderStudents() {
  els.room.innerHTML = "";
  state.students.forEach((student) => {
    const node = els.studentCardTemplate.content.cloneNode(true);
    node.querySelector(".name").textContent = student.name;
    node.querySelector(".archetype").textContent = `${student.archetype}: ${student.style}`;
    node.querySelectorAll("progress")[0].value = student.mastery;
    node.querySelectorAll("progress")[1].value = student.confidence;
    node.querySelector(".mood").textContent = student.mood;
    els.room.append(node);
  });
}

function renderQueue() {
  els.questionQueue.innerHTML = "";
  if (!state.queue.length) {
    const li = document.createElement("li");
    li.textContent = "No hands raised yet.";
    els.questionQueue.append(li);
  } else {
    state.queue.slice(0, 6).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.studentName}: ${item.text}`;
      els.questionQueue.append(li);
    });
  }
}

function renderMetrics() {
  const avgMastery = state.students.length ? Math.round(average(state.students.map((s) => s.mastery))) : 0;
  const avgConfidence = state.students.length ? Math.round(average(state.students.map((s) => s.confidence))) : 0;

  els.metrics.innerHTML = "";
  const cards = [
    ["Class Mastery", `${avgMastery}%`],
    ["Class Confidence", `${avgConfidence}%`],
    ["Explanations Delivered", `${state.lesson?.explanations ?? 0}`],
    ["Mini Checks Run", `${state.lesson?.checks ?? 0}`],
    ["Queue Depth", `${state.queue.length} questions`],
  ];

  cards.forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "metric";
    card.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    els.metrics.append(card);
  });

  if (state.lesson && avgMastery > 65 && state.lesson.explanations >= 3) {
    saveLessonSummary(avgMastery, avgConfidence);
  }

  els.streakBadge.textContent = `Streak: ${state.streak.days} days`;
}

function renderHistory() {
  els.history.innerHTML = "";
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "Complete a class to start building your history.";
    els.history.append(li);
    return;
  }

  state.history.slice(0, 7).forEach((entry) => {
    const li = document.createElement("li");
    const weak = entry.mastery < 60 ? `<span class="warn">Needs reteach</span>` : "Solid understanding";
    li.innerHTML = `<strong>${entry.topic}</strong> • ${entry.mode} • mastery ${entry.mastery}% • confidence ${entry.confidence}%<br/>${weak}`;
    els.history.append(li);
  });
}

function saveLessonSummary(mastery, confidence) {
  const alreadyLogged = state.history.some((h) => h.lessonId === state.lesson.startAt);
  if (alreadyLogged) return;
  const summary = {
    lessonId: state.lesson.startAt,
    topic: state.lesson.topic,
    mode: state.lesson.mode,
    mastery,
    confidence,
    date: new Date().toISOString(),
  };
  state.history.unshift(summary);
  localStorage.setItem("cozy-history", JSON.stringify(state.history.slice(0, 20)));
}

function updateStreak() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (state.streak.lastDate === today) return;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const ymd = yesterday.toISOString().slice(0, 10);
  state.streak.days = state.streak.lastDate === ymd ? state.streak.days + 1 : 1;
  state.streak.lastDate = today;
  localStorage.setItem("cozy-streak", JSON.stringify(state.streak));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("cozy-history") ?? "[]");
  } catch {
    return [];
  }
}

function loadStreak() {
  try {
    return JSON.parse(localStorage.getItem("cozy-streak") ?? '{"days":0,"lastDate":null}');
  } catch {
    return { days: 0, lastDate: null };
  }
}

function average(nums) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

renderAll();
