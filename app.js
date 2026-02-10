import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const STUDENT_ARCHETYPES = [
  { label: "Curious Fox", style: "asks many why/how questions", curiosity: 0.9, skepticism: 0.35 },
  { label: "Skeptical Owl", style: "challenges weak logic", curiosity: 0.6, skepticism: 0.95 },
  { label: "Shy Rabbit", style: "needs examples and reassurance", curiosity: 0.5, skepticism: 0.2 },
  { label: "Detail Beaver", style: "wants precise terminology", curiosity: 0.7, skepticism: 0.75 },
  { label: "Big Picture Bear", style: "asks for intuition first", curiosity: 0.8, skepticism: 0.45 },
  { label: "Practical Squirrel", style: "demands real-world use cases", curiosity: 0.75, skepticism: 0.65 },
];

const QUESTION_STEMS = {
  curiosity: [
    "Can we see one more intuitive example?",
    "How does this connect to what we learned before?",
    "Could you explain the idea in a simpler way first?",
  ],
  skepticism: [
    "Why is this true mathematically and not just intuitively?",
    "What edge case breaks this explanation?",
    "Can you justify that step more rigorously?",
  ],
  practical: [
    "Where would this show up in a real scenario?",
    "How would I use this on a project/interview?",
    "What should I practice right after this lesson?",
  ],
};

const LESSON_DURATION_MIN = { quick: 10, standard: 25, deep: 45 };
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const state = {
  phase: "lobby", // lobby | lesson | reflection
  lesson: null,
  students: loadStudentProgress(),
  queue: [],
  history: loadHistory(),
  streak: loadStreak(),
  voiceTranscript: "",
  voiceEnabled: Boolean(SpeechRecognition),
  voiceActive: false,
  nearTarget: null,
  sessionTimer: null,
  lessonStartTime: null,
};

const els = {
  phaseBadge: document.getElementById("phaseBadge"),
  streakBadge: document.getElementById("streakBadge"),
  voiceStatus: document.getElementById("voiceStatus"),
  interactionHint: document.getElementById("interactionHint"),
  statusToast: document.getElementById("statusToast"),
  classroom3d: document.getElementById("classroom3d"),

  plannerPanel: document.getElementById("plannerPanel"),
  teachPanel: document.getElementById("teachPanel"),
  queuePanel: document.getElementById("queuePanel"),
  studentPanel: document.getElementById("studentPanel"),
  analyticsPanel: document.getElementById("analyticsPanel"),
  reflectionPanel: document.getElementById("reflectionPanel"),

  lessonForm: document.getElementById("lessonForm"),
  topic: document.getElementById("topic"),
  objective: document.getElementById("objective"),
  mode: document.getElementById("mode"),
  materials: document.getElementById("materials"),

  openTeachBtn: document.getElementById("openTeachBtn"),
  openQueueBtn: document.getElementById("openQueueBtn"),
  openAnalyticsBtn: document.getElementById("openAnalyticsBtn"),

  startVoiceBtn: document.getElementById("startVoiceBtn"),
  stopVoiceBtn: document.getElementById("stopVoiceBtn"),
  teachInput: document.getElementById("teachInput"),
  teachBtn: document.getElementById("teachBtn"),
  askCheckBtn: document.getElementById("askCheckBtn"),
  endLessonBtn: document.getElementById("endLessonBtn"),

  questionQueue: document.getElementById("questionQueue"),
  respondBtn: document.getElementById("respondBtn"),
  speakQuestionBtn: document.getElementById("speakQuestionBtn"),

  studentProfile: document.getElementById("studentProfile"),
  metrics: document.getElementById("metrics"),
  history: document.getElementById("history"),
  reflectionBody: document.getElementById("reflectionBody"),
};

const sceneState = initThreeScene(els.classroom3d, state.students);
const recognition = initVoiceRecognition();
const keys = new Set();

bindUi();
startGameLoop();
renderAll();

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    keys.add(key);
  }
  if (key === "e") handleInteract();
});

document.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

function bindUi() {
  els.openTeachBtn.addEventListener("click", () => togglePanel("teachPanel"));
  els.openQueueBtn.addEventListener("click", () => togglePanel("queuePanel"));
  els.openAnalyticsBtn.addEventListener("click", () => togglePanel("analyticsPanel"));

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => document.getElementById(btn.dataset.close).classList.add("hidden"));
  });

  els.lessonForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startLessonFromPlan();
  });

  els.startVoiceBtn.addEventListener("click", startVoiceTeaching);
  els.stopVoiceBtn.addEventListener("click", stopVoiceTeaching);
  els.teachBtn.addEventListener("click", deliverExplanation);
  els.askCheckBtn.addEventListener("click", runMiniCheck);
  els.endLessonBtn.addEventListener("click", endLessonAndReflect);

  els.respondBtn.addEventListener("click", respondToNextStudent);
  els.speakQuestionBtn.addEventListener("click", speakNextQuestion);
}

function startGameLoop() {
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    updatePlayerMovement(dt);
    detectInteractionTarget();
    updateSceneStudents();
    sceneState.render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function updatePlayerMovement(dt) {
  const move = new THREE.Vector3(0, 0, 0);
  if (keys.has("w") || keys.has("arrowup")) move.z -= 1;
  if (keys.has("s") || keys.has("arrowdown")) move.z += 1;
  if (keys.has("a") || keys.has("arrowleft")) move.x -= 1;
  if (keys.has("d") || keys.has("arrowright")) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(3.4 * dt);
    sceneState.player.position.add(move);
    sceneState.player.position.x = clamp(sceneState.player.position.x, -8.6, 8.6);
    sceneState.player.position.z = clamp(sceneState.player.position.z, -5.6, 4.8);
    sceneState.player.rotation.y = Math.atan2(move.x, move.z);
  }

  sceneState.camera.position.x += (sceneState.player.position.x - sceneState.camera.position.x) * 0.08;
  sceneState.camera.position.z += (sceneState.player.position.z + 8.8 - sceneState.camera.position.z) * 0.08;
  sceneState.camera.lookAt(sceneState.player.position.x, 0.9, sceneState.player.position.z - 2.7);
}

function detectInteractionTarget() {
  const p = sceneState.player.position;
  let nearest = null;
  let nearestDist = Infinity;

  const podiumDist = p.distanceTo(sceneState.podium.position);
  if (podiumDist < 1.7 && podiumDist < nearestDist) {
    nearest = { type: "podium" };
    nearestDist = podiumDist;
  }

  sceneState.studentMeshes.forEach((mesh, index) => {
    const d = p.distanceTo(mesh.group.position);
    if (d < 1.4 && d < nearestDist) {
      nearest = { type: "student", index };
      nearestDist = d;
    }
  });

  state.nearTarget = nearest;
  if (!nearest) {
    els.interactionHint.classList.add("hidden");
    return;
  }

  els.interactionHint.classList.remove("hidden");
  els.interactionHint.innerHTML = nearest.type === "podium"
    ? `Press <kbd>E</kbd> at podium to ${state.phase === "lesson" ? "review lesson setup" : "start a lesson"}`
    : "Press <kbd>E</kbd> to talk to student";
}

function handleInteract() {
  if (!state.nearTarget) return;
  if (state.nearTarget.type === "podium") {
    els.plannerPanel.classList.remove("hidden");
    return;
  }
  if (state.nearTarget.type === "student") openStudentPanel(state.nearTarget.index);
}

function startLessonFromPlan() {
  state.lesson = {
    topic: els.topic.value.trim(),
    objective: els.objective.value.trim(),
    mode: els.mode.value,
    materials: els.materials.value.trim(),
    explanations: 0,
    checks: 0,
    qualityPoints: 0,
    startAt: Date.now(),
  };

  state.students.forEach((student) => {
    student.sessionMastery = student.mastery;
    student.sessionConfidence = student.confidence;
    student.mood = "📝 ready";
  });

  state.phase = "lesson";
  state.lessonStartTime = Date.now();
  state.queue = [];
  updateStreak();

  setLessonControls(true);
  els.plannerPanel.classList.add("hidden");
  els.teachPanel.classList.remove("hidden");

  toast(`Lesson started: ${state.lesson.topic}. Students will question according to archetype behavior.`);
  startLessonBehaviorLoop();
  renderAll();
}

function setLessonControls(active) {
  els.teachBtn.disabled = !active;
  els.askCheckBtn.disabled = !active;
  els.endLessonBtn.disabled = !active;
  els.respondBtn.disabled = !active;
  els.speakQuestionBtn.disabled = !active;
}

function startLessonBehaviorLoop() {
  if (state.sessionTimer) clearInterval(state.sessionTimer);

  state.sessionTimer = setInterval(() => {
    if (state.phase !== "lesson") return;

    const elapsedMin = (Date.now() - state.lessonStartTime) / 60000;
    const duration = LESSON_DURATION_MIN[state.lesson.mode] || 25;

    // archetype-driven spontaneous questioning / retention drift
    state.students.forEach((student) => {
      const uncertainty = (100 - student.sessionMastery) / 100;
      const askChance = 0.07 + uncertainty * 0.25 + student.curiosity * 0.07;
      if (Math.random() < askChance) enqueueQuestion(student, false, pickQuestionByArchetype(student));

      if (Math.random() < 0.18) {
        student.sessionConfidence = clamp(student.sessionConfidence - randomInt(0, 2), 0, 100);
      }
    });

    if (elapsedMin > duration) {
      toast("Session time target reached. Wrap up and end lesson for reflection.");
    }

    renderAll();
  }, 5000);
}

function pickQuestionByArchetype(student) {
  if (student.skepticism > 0.75) return QUESTION_STEMS.skepticism[randomInt(0, QUESTION_STEMS.skepticism.length - 1)];
  if (student.label.includes("Practical") || student.label.includes("Big Picture")) {
    return QUESTION_STEMS.practical[randomInt(0, QUESTION_STEMS.practical.length - 1)];
  }
  return QUESTION_STEMS.curiosity[randomInt(0, QUESTION_STEMS.curiosity.length - 1)];
}

function initVoiceRecognition() {
  if (!SpeechRecognition) {
    state.voiceEnabled = false;
    els.voiceStatus.textContent = "⚠️ Voice unsupported";
    els.startVoiceBtn.disabled = true;
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";

  rec.onstart = () => {
    state.voiceActive = true;
    els.voiceStatus.textContent = "🎙️ Listening...";
    els.startVoiceBtn.disabled = true;
    els.stopVoiceBtn.disabled = false;
  };

  rec.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += `${t} `;
      else interimText += t;
    }
    if (finalText) state.voiceTranscript += finalText;
    els.teachInput.value = `${state.voiceTranscript}${interimText}`.trim();
  };

  rec.onerror = (event) => {
    toast(`Voice error: ${event.error}. Text fallback still available.`);
    els.voiceStatus.textContent = "⚠️ Voice error";
  };

  rec.onend = () => {
    state.voiceActive = false;
    els.startVoiceBtn.disabled = !state.voiceEnabled;
    els.stopVoiceBtn.disabled = true;
    els.voiceStatus.textContent = state.voiceEnabled ? "🎙️ Voice idle" : "⚠️ Voice unsupported";
  };

  return rec;
}

function startVoiceTeaching() {
  if (!recognition || state.phase !== "lesson") {
    toast("Start a lesson first, then start voice teaching.");
    return;
  }
  state.voiceTranscript = "";
  els.teachInput.value = "";
  recognition.start();
}

function stopVoiceTeaching() {
  if (recognition && state.voiceActive) recognition.stop();
}

function deliverExplanation() {
  const input = els.teachInput.value.trim();
  if (!input || state.phase !== "lesson") return;

  state.lesson.explanations += 1;
  const quality = evaluateExplanation(input);
  state.lesson.qualityPoints += quality.masteryDelta + quality.confDelta;

  state.students.forEach((student) => {
    const archetypeBoost = student.curiosity * 1.2 + (1 - student.skepticism) * 0.8;
    student.sessionMastery = clamp(student.sessionMastery + quality.masteryDelta + randomInt(-2, 3) + archetypeBoost, 0, 100);
    student.sessionConfidence = clamp(student.sessionConfidence + quality.confDelta + randomInt(-2, 3), 0, 100);
    student.mood = student.sessionMastery > 72 ? "🌟 understanding" : student.sessionConfidence < 35 ? "😵 uncertain" : "🙂 engaged";

    if (Math.random() < studentQuestionProbability(student, quality)) {
      enqueueQuestion(student, false, pickQuestionByArchetype(student));
    }
  });

  state.voiceTranscript = "";
  els.teachInput.value = "";
  toast("Explanation delivered. Watch how student understanding shifts.");
  renderAll();
}

function runMiniCheck() {
  if (state.phase !== "lesson") return;
  state.lesson.checks += 1;

  const avgMastery = average(state.students.map((s) => s.sessionMastery));
  const needsReview = avgMastery < 56;

  state.students.forEach((student) => {
    if (needsReview) {
      student.sessionConfidence = clamp(student.sessionConfidence - randomInt(3, 8), 0, 100);
      if (Math.random() < 0.62) enqueueQuestion(student, true, pickQuestionByArchetype(student));
    } else {
      student.sessionMastery = clamp(student.sessionMastery + randomInt(2, 6), 0, 100);
      student.sessionConfidence = clamp(student.sessionConfidence + randomInt(1, 4), 0, 100);
    }
  });

  toast(needsReview
    ? "Mini check: misconceptions found. Re-teach with concrete example + why it works."
    : "Mini check: class is strong. Move to transfer and edge cases.");

  renderAll();
}

function respondToNextStudent() {
  if (!state.queue.length || state.phase !== "lesson") return;
  const next = state.queue.shift();
  const student = state.students.find((s) => s.id === next.studentId);
  if (!student) return;

  student.sessionConfidence = clamp(student.sessionConfidence + randomInt(6, 12), 0, 100);
  student.sessionMastery = clamp(student.sessionMastery + randomInt(3, 8), 0, 100);
  student.mood = "😊 clarified";

  toast(`You addressed ${student.name}'s question.`);
  renderAll();
}

function speakNextQuestion() {
  const next = state.queue[0];
  if (!next) return;
  if (!("speechSynthesis" in window)) {
    toast("Speech synthesis unavailable on this browser.");
    return;
  }
  const utter = new SpeechSynthesisUtterance(`${next.studentName} asks: ${next.text}`);
  utter.rate = 0.95;
  utter.pitch = 1.12;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function endLessonAndReflect() {
  if (state.phase !== "lesson") return;
  if (state.sessionTimer) clearInterval(state.sessionTimer);
  stopVoiceTeaching();

  const classMastery = Math.round(average(state.students.map((s) => s.sessionMastery)));
  const classConfidence = Math.round(average(state.students.map((s) => s.sessionConfidence)));

  // Persist progression (gamification)
  state.students.forEach((student) => {
    const growth = Math.max(0, Math.round((student.sessionMastery - student.mastery) * 0.4));
    const xpGain = growth + randomInt(4, 10) + Math.round(state.lesson.qualityPoints / 20);
    student.xp += xpGain;
    student.mastery = Math.round((student.mastery * 0.6) + (student.sessionMastery * 0.4));
    student.confidence = Math.round((student.confidence * 0.6) + (student.sessionConfidence * 0.4));
    student.level = Math.floor(student.xp / 120) + 1;
  });

  saveStudentProgress(state.students);
  saveLessonSummary(classMastery, classConfidence);

  state.phase = "reflection";
  setLessonControls(false);
  state.queue = [];

  const topLearner = [...state.students].sort((a, b) => b.sessionMastery - a.sessionMastery)[0];
  const needingHelp = [...state.students].sort((a, b) => a.sessionMastery - b.sessionMastery)[0];
  els.reflectionBody.innerHTML = `
    <div class="metric"><strong>Topic</strong><span>${state.lesson.topic}</span></div>
    <div class="metric"><strong>Class mastery</strong><span>${classMastery}%</span></div>
    <div class="metric"><strong>Class confidence</strong><span>${classConfidence}%</span></div>
    <div class="metric"><strong>Strongest learner</strong><span>${topLearner.name} (${topLearner.archetype})</span></div>
    <div class="metric"><strong>Needs reinforcement</strong><span>${needingHelp.name} (${needingHelp.archetype})</span></div>
    <div class="metric"><strong>Next lesson suggestion</strong><span>Start with misconception correction for ${needingHelp.name}, then ask ${topLearner.name} to explain in their own words.</span></div>
  `;

  els.reflectionPanel.classList.remove("hidden");
  toast("Lesson ended. Review reflection, then walk around and plan the next session.");

  state.lesson = null;
  renderAll();
}

function openStudentPanel(index) {
  const s = state.students[index];
  if (!s) return;

  const stage = s.level < 3 ? "🌱 Seed" : s.level < 6 ? "🌿 Sprout" : "🌸 Bloom";
  els.studentProfile.innerHTML = `
    <div class="studentCard">
      <h3>${s.name} <span class="badge">${stage}</span></h3>
      <p><strong>Archetype:</strong> ${s.archetype}</p>
      <p><strong>Style:</strong> ${s.style}</p>
      <p><strong>Long-term mastery:</strong> ${Math.round(s.mastery)}%</p>
      <p><strong>Long-term confidence:</strong> ${Math.round(s.confidence)}%</p>
      <p><strong>XP / Level:</strong> ${s.xp} XP • Lv ${s.level}</p>
      <p><strong>Current mood:</strong> ${s.mood}</p>
      <p><strong>Coach tip:</strong> ${buildCoachingTip(s)}</p>
    </div>
  `;
  els.studentPanel.classList.remove("hidden");
  toast(`Chatting with ${s.name}. Adapt your teaching style to their archetype.`);
}

function buildCoachingTip(student) {
  if (student.skepticism > 0.75) return "Provide a step-by-step proof and explicitly state assumptions.";
  if (student.curiosity > 0.8) return "Invite 'why' questions and use analogies before formal notation.";
  if (student.archetype.includes("Shy")) return "Ask low-pressure checks and reinforce partial understanding.";
  return "Use one worked example and one transfer problem to deepen retention.";
}

function evaluateExplanation(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasExample = /example|for instance|e\.g\.|suppose/i.test(text);
  const hasWhy = /because|therefore|so that|why/i.test(text);
  const hasStructure = /first|second|finally|step|then/i.test(text);

  let masteryDelta = words > 20 ? 6 : 2;
  let confDelta = words > 12 ? 4 : 1;
  if (hasExample) masteryDelta += 4;
  if (hasWhy) masteryDelta += 3;
  if (hasStructure) confDelta += 3;

  return { masteryDelta, confDelta };
}

function studentQuestionProbability(student, quality) {
  const lowConfidence = student.sessionConfidence < 40 ? 0.22 : 0;
  const lowMastery = student.sessionMastery < 50 ? 0.2 : 0;
  const skepticalBoost = student.skepticism * 0.08;
  const highQualityReduction = quality.masteryDelta > 10 ? -0.1 : 0;
  return clamp(0.12 + lowConfidence + lowMastery + skepticalBoost + highQualityReduction, 0.05, 0.8);
}

function enqueueQuestion(student, misconception = false, prompt = null) {
  const text = prompt ?? QUESTION_STEMS.curiosity[randomInt(0, QUESTION_STEMS.curiosity.length - 1)];
  const prefix = misconception ? "⚠️ Misconception:" : "❓";
  state.queue.push({ studentId: student.id, studentName: student.name, text: `${prefix} ${text}` });
}

function renderAll() {
  els.phaseBadge.textContent = state.phase === "lesson" ? "Live Lesson" : state.phase === "reflection" ? "Reflection" : "Lobby";
  els.streakBadge.textContent = `Streak: ${state.streak.days} days`;
  renderQueue();
  renderMetrics();
  renderHistory();
}

function renderQueue() {
  els.questionQueue.innerHTML = "";
  if (!state.queue.length) {
    const li = document.createElement("li");
    li.textContent = "No hands raised yet.";
    els.questionQueue.append(li);
    return;
  }
  state.queue.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.studentName}: ${item.text}`;
    els.questionQueue.append(li);
  });
}

function renderMetrics() {
  const avgMastery = Math.round(average(state.students.map((s) => s.mastery)));
  const avgConfidence = Math.round(average(state.students.map((s) => s.confidence)));
  const avgLevel = (average(state.students.map((s) => s.level))).toFixed(1);

  els.metrics.innerHTML = "";
  [
    ["Flow stage", state.phase],
    ["Class mastery", `${avgMastery}%`],
    ["Class confidence", `${avgConfidence}%`],
    ["Average student level", avgLevel],
    ["Queue depth", String(state.queue.length)],
    ["Active lesson", state.lesson ? state.lesson.topic : "None"],
  ].forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "metric";
    card.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    els.metrics.append(card);
  });
}

function renderHistory() {
  els.history.innerHTML = "";
  if (!state.history.length) {
    const li = document.createElement("li");
    li.textContent = "No lessons logged yet.";
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

function togglePanel(id) {
  document.getElementById(id).classList.toggle("hidden");
}

function toast(msg) {
  els.statusToast.textContent = msg;
}

function initThreeScene(container, students) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf9eff6);
  scene.fog = new THREE.Fog(0xf9eff6, 18, 34);

  const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 7, 10.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.append(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xfff0f1, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0xd3b188, roughness: 0.97 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const chalk = new THREE.Mesh(
    new THREE.BoxGeometry(8.2, 3.3, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x48613f, roughness: 0.8 })
  );
  chalk.position.set(0, 2.3, -5.3);
  scene.add(chalk);

  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.1, 1.45, 6),
    new THREE.MeshStandardMaterial({ color: 0xcf9c71, roughness: 0.84 })
  );
  podium.position.set(0, 0.72, -3.1);
  podium.castShadow = true;
  scene.add(podium);

  const player = makePlayerCharacter();
  player.position.set(0, 0, 3.5);
  scene.add(player);

  const studentSlots = [
    [-3.2, 0, -0.9], [-1.9, 0, -0.9], [-0.6, 0, -0.9],
    [0.7, 0, -0.9], [2.0, 0, -0.9], [3.3, 0, -0.9],
  ];

  const studentMeshes = studentSlots.map(([x, y, z], i) => {
    const mesh = makeStudentCharacter();
    mesh.group.position.set(x, y, z);
    scene.add(mesh.group);
    mesh.group.userData.studentId = students[i]?.id;
    return mesh;
  });

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    studentMeshes.forEach((mesh, i) => {
      mesh.group.position.y = Math.sin(t * 1.5 + i) * 0.035;
      mesh.group.rotation.y = Math.sin(t * 0.8 + i) * 0.08;
    });
    player.position.y = Math.sin(t * 3.5) * 0.03;
    renderer.render(scene, camera);
  };

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  return { scene, camera, renderer, podium, player, studentMeshes, render };
}

function makePlayerCharacter() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.82, 4, 9),
    new THREE.MeshStandardMaterial({ color: 0x88b7ff, roughness: 0.65 })
  );
  body.position.y = 0.8;
  body.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffdcc5, roughness: 0.6 })
  );
  head.position.y = 1.46;

  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.045, 12, 20),
    new THREE.MeshStandardMaterial({ color: 0xf79dbf })
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.17;

  group.add(body, head, scarf);
  return group;
}

function makeStudentCharacter() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.68, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xa9d8b5, roughness: 0.7 })
  );
  body.position.y = 0.64;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8d5b1, roughness: 0.7 })
  );
  head.position.y = 1.3;

  const earL = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8d5b1 })
  );
  earL.position.set(-0.15, 1.5, 0);

  const earR = earL.clone();
  earR.position.x = 0.15;

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xffea7f, emissive: 0x000000 })
  );
  orb.position.set(0, 1.92, 0);

  group.add(body, head, earL, earR, orb);
  group.castShadow = true;

  return { group, body, head, orb };
}

function updateSceneStudents() {
  sceneState.studentMeshes.forEach((meshStudent, index) => {
    const data = state.students[index];
    if (!data) {
      meshStudent.group.visible = false;
      return;
    }

    const mastery = (state.phase === "lesson" ? data.sessionMastery : data.mastery) / 100;
    const conf = (state.phase === "lesson" ? data.sessionConfidence : data.confidence) / 100;

    meshStudent.body.material.color.setHSL(0.35 - mastery * 0.17, 0.5, 0.67);
    meshStudent.head.material.color.setHSL(0.08, 0.62, 0.8 - (1 - conf) * 0.18);

    const raised = state.queue.some((q) => q.studentId === data.id);
    meshStudent.orb.material.emissive.setHex(raised ? 0xffd76a : 0x000000);
    meshStudent.orb.position.y = 1.92 + (raised ? 0.09 : 0);
  });
}

function saveLessonSummary(mastery, confidence) {
  state.history.unshift({
    lessonId: Date.now(),
    topic: state.lesson.topic,
    mode: state.lesson.mode,
    mastery,
    confidence,
    date: new Date().toISOString(),
  });
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

function loadStudentProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("cozy-students") ?? "null");
    if (saved?.length === STUDENT_ARCHETYPES.length) return saved;
  } catch {}

  return STUDENT_ARCHETYPES.map((a, i) => ({
    id: `s-${i}`,
    name: ["Milo", "Nori", "Poppy", "Jun", "Tama", "Coco"][i],
    label: a.label,
    archetype: a.label,
    style: a.style,
    curiosity: a.curiosity,
    skepticism: a.skepticism,
    mastery: randomInt(20, 46),
    confidence: randomInt(22, 52),
    sessionMastery: randomInt(20, 46),
    sessionConfidence: randomInt(22, 52),
    mood: "📝 ready",
    xp: randomInt(30, 120),
    level: 1,
  })).map((s) => ({ ...s, level: Math.floor(s.xp / 120) + 1 }));
}

function saveStudentProgress(students) {
  const payload = students.map((s) => ({
    ...s,
    sessionMastery: s.mastery,
    sessionConfidence: s.confidence,
  }));
  localStorage.setItem("cozy-students", JSON.stringify(payload));
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("cozy-history") ?? "[]"); }
  catch { return []; }
}

function loadStreak() {
  try { return JSON.parse(localStorage.getItem("cozy-streak") ?? '{"days":0,"lastDate":null}'); }
  catch { return { days: 0, lastDate: null }; }
}

function average(nums) { return nums.reduce((a, b) => a + b, 0) / (nums.length || 1); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
