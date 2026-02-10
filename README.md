# Cozy Classroom — Product Blueprint

A learning web app where users reinforce what they know by **teaching** a classroom of AI students (and optionally friends) in a cute 3D world.

## 1) Vision

**Core idea:** Learning-by-teaching in an Animal Crossing–inspired cozy classroom.

- You host "lessons" in a 3D classroom.
- AI students have personalities, strengths, and misconceptions.
- You teach verbally/textually with slides, notes, examples, and Q&A.
- Students become more competent over time, visibly and measurably.
- Friends can join as co-teachers or peer students.

The app should feel warm and playful while remaining academically serious.

---

## 2) Why this works (science-backed rationale)

The design should explicitly leverage proven learning science:

1. **Protégé Effect / Learning by Teaching**
   - Teaching forces retrieval, explanation, and organization of knowledge.
   - Users improve metacognition by seeing where students are confused.

2. **Retrieval Practice**
   - Students ask questions and mini-checks during/after lessons.
   - Teacher must recall and articulate concepts without passive rereading.

3. **Elaboration + Self-Explanation**
   - AI prompts for analogies, examples, and edge cases.
   - Teacher explains "why" and "how," not just definitions.

4. **Spaced Repetition + Interleaving**
   - Follow-up sessions revisit old topics after delays.
   - Mixed question sets across related concepts build transfer.

5. **Formative Assessment Loops**
   - The app shows misconception heatmaps and weak concept graphs.
   - Each lesson ends with actionable feedback and next best lesson goals.

6. **Cognitive Load Management**
   - Structured lesson flow and visual cues keep sessions focused.
   - NPC interruptions are paced and purposeful (not chaotic).

---

## 3) Product pillars

1. **Cozy immersion:** soft visuals, expressive avatars, emotionally safe environment.
2. **Serious pedagogy:** clear lesson objectives, evidence-based prompts, robust analytics.
3. **Visible growth:** AI students progress from novice to capable explainers.
4. **Social reinforcement:** teach with friends, compare progress, co-run sessions.

---

## 4) Core user experience

### 4.1 Session loop

1. **Plan (2–5 min)**
   - Pick topic + learning objective template (e.g., "Explain backpropagation for beginners").
   - Choose lesson mode:
     - Quick Drill (10 min)
     - Standard Class (20–30 min)
     - Deep Seminar (45 min)
   - Optionally attach source docs (notes, PDFs, links).

2. **Teach (main phase)**
   - User stands at front of class in 3D room.
   - Students react nonverbally (confused, curious, excited).
   - Hand-raise system queues questions.
   - User can answer live, defer, or ask class to discuss first.

3. **Check understanding (micro-assessment)**
   - AI students attempt to summarize and solve mini problems.
   - User corrects mistakes and reinforces key points.

4. **Reflect (post-class analytics)**
   - Dashboard shows what user explained well vs weakly.
   - Misconception map + recommended next lesson.
   - Auto-generated spaced review schedule.

### 4.2 In-class interaction model

- **Dialogue rails (visual novel style):**
  - Main chat panel for current speaking student.
  - Optional quick-select response actions: "Give example", "Rephrase simply", "Ask class first", "Draw analogy".
- **Classroom events:**
  - "Pop quiz card" appears at pedagogically relevant points.
  - "Misconception alert" if many students fail same concept.
- **Teacher tools:**
  - Whiteboard mode (draw + formulas + simple diagrams).
  - Slide deck snippets.
  - "Cold call" student for explanation practice.

---

## 5) AI student system

### 5.1 Student archetypes

Each NPC has:
- Knowledge state per concept (mastery score + confidence).
- Personality traits (shy, curious, skeptical, detail-oriented).
- Learning preferences (examples-first, formal-first, visual-first).
- Common misconception patterns (domain-specific).

### 5.2 Behavioral rules

- Students ask questions when uncertainty exceeds a threshold.
- Question type depends on archetype + current lesson stage.
- Students can challenge superficial explanations.
- Better teaching quality increases future student question depth.

### 5.3 Progression and game layer

- Students level up concept badges (Seed → Sprout → Bloom).
- Classroom decor unlocks from consistent teaching streaks.
- "Class average mastery" trends become a key progression metric.
- Cosmetics reward consistency, while pedagogy rewards understanding.

---

## 6) Lesson design framework (serious mode)

Each lesson should follow a pedagogical template:

1. **Objective statement** (measurable)
2. **Prior knowledge activation** (1–2 prompts)
3. **Core explanation** (chunked into 2–4 subtopics)
4. **Worked example(s)**
5. **Guided student Q&A**
6. **Mini formative assessment**
7. **Error correction + summary**
8. **Assigned spaced review prompt**

### Suggested timing (30-min standard class)

- 3 min objective + prior knowledge
- 12 min concept teaching
- 7 min worked example + student questions
- 5 min assessment
- 3 min recap + next steps

---

## 7) UI/UX system for a 3D-first app

### 7.1 3D + 2D hybrid principles

- Keep world diegetic where possible (hand raises, mood icons over heads).
- Use non-diegetic overlays for high-information tasks (analytics, concept maps).
- Preserve focus: one speaking student at a time in "spotlight" camera.

### 7.2 Key screens

1. **Campus Hub** (room selection, schedule, avatar prep)
2. **Lesson Planner** (objective template + material upload)
3. **Classroom Session** (3D world + dialogue + tools)
4. **Reflection Dashboard** (learning metrics + recommendations)
5. **Student Profiles** (growth timeline per NPC)

### 7.3 Non-generic feel

- Warm palette, stylized low-poly assets, soft shadows.
- Character emotes and idle animations communicate understanding.
- Notebook-like UI cards integrated with classroom props.
- Audio cues (gentle chimes for breakthroughs, soft rustle for hand raises).

---

## 8) Technical architecture (web)

### 8.1 Frontend

- **Framework:** Next.js + TypeScript
- **3D:** Three.js with React Three Fiber + Drei
- **State:** Zustand (session state) + TanStack Query (server state)
- **UI:** Tailwind + custom component system
- **Realtime:** WebSocket (class events, multiplayer presence)

### 8.2 Backend

- **API:** Node/TypeScript (tRPC or REST)
- **DB:** PostgreSQL (users, sessions, concept mastery, lesson artifacts)
- **Cache/queue:** Redis (session events, background scoring jobs)
- **Storage:** S3-compatible bucket for uploaded materials

### 8.3 AI stack

- **Orchestrator service:** manages student agents + memory
- **RAG layer:** retrieves uploaded docs and lesson history
- **Evaluation service:** scores lesson quality and misconception handling
- **Safety layer:** guardrails for harmful or incorrect educational output

### 8.4 Multiplayer (friends)

- Shared session room with roles: lead teacher, co-teacher, observer.
- Turn-taking controls for synchronized teaching.
- Collaborative whiteboard and annotation.

---

## 9) Data model sketch

Core entities:
- `User`
- `Classroom`
- `StudentNPC`
- `Concept`
- `LessonSession`
- `LessonSegment`
- `QuestionEvent`
- `AssessmentResult`
- `MasterySnapshot`
- `TeachingFeedback`

Important tracking dimensions:
- Concept mastery over time (user + each NPC)
- Misconception frequency by concept
- Explanation quality signals (clarity, structure, examples)
- Session-level engagement metrics

---

## 10) MVP scope (first shippable)

### Include

- 1 classroom scene (single environment)
- 6–10 AI students with 3 archetype families
- Text + voice teaching input
- Hand-raise Q&A queue
- End-of-session analytics dashboard
- Material upload (PDF/text)
- Single-player mode

### Exclude (post-MVP)

- Full multiplayer co-teaching
- Multiple classroom maps
- Complex economy/market systems
- Advanced avatar customization

---

## 11) Metrics for success

### Learning outcome metrics

- Pre/post quiz improvement across repeated sessions
- Retention after 1 week and 1 month
- Increased explanation quality score over time

### Product metrics

- Session completion rate
- Weekly teaching streak retention
- Lesson planner to completed lesson conversion
- Repeat teaching by topic depth

### Quality metrics

- Hallucination/error rate in AI student responses
- User-corrected misconception closure rate
- Latency during classroom Q&A events

---

## 12) Risk register + mitigations

1. **Risk:** Gamification overshadows serious learning.
   - **Mitigation:** Tie rewards primarily to demonstrated understanding gains.

2. **Risk:** AI students feel random or "fake smart."
   - **Mitigation:** Constrain agent behavior with explicit pedagogical state machines.

3. **Risk:** 3D complexity hurts accessibility/performance.
   - **Mitigation:** Offer lightweight 2D/classic mode and performance presets.

4. **Risk:** User overwhelm from too many features.
   - **Mitigation:** Guided onboarding + progressive disclosure of tools.

---

## 13) 12-week execution roadmap

### Phase 1 (Weeks 1–4): Foundations

- Build lesson planner + basic classroom scene.
- Implement student archetype engine (v1).
- Add core Q&A loop and session recording.

### Phase 2 (Weeks 5–8): Learning intelligence

- Add doc ingestion + retrieval for topic grounding.
- Implement formative assessment and mastery snapshots.
- Ship reflection dashboard with next-step recommendations.

### Phase 3 (Weeks 9–12): Polish + validation

- Improve animations, camera, and dialogue UX.
- Add voice input + clearer correction workflows.
- Run pilot cohort and evaluate retention outcomes.

---

## 14) Suggested immediate next steps

1. Define top 3 target domains (e.g., math, biology, programming).
2. Choose one domain for MVP and draft misconception taxonomy.
3. Build a clickable prototype of planner → class → reflection flow.
4. Validate with 5–10 users focusing on learning efficacy, not visuals alone.

