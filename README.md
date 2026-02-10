# Cozy Classroom MVP (3D, voice-first, game flow)

This prototype now behaves like a small classroom game: you control a character in a cozy 3D room, walk to places/students, and run lesson cycles with voice-first teaching.

## What was improved

- **Playable player character** (WASD/Arrow movement) with proximity-based interactions.
- **World-driven UI flow**: walk to the podium to start lesson setup, walk to students to inspect their profile/stats/learning needs.
- **Cutesy visual direction** with softer palettes, rounded HUD, playful badges, and less flat overlays.
- **Voice-first teaching** remains the default (`SpeechRecognition`) with text fallback.
- **Archetype-aware student behavior** during lessons:
  - curious students ask intuition questions,
  - skeptical students challenge rigor,
  - practical/big-picture students ask application/transfer questions.
- **Persistent gamification**: each student gains XP, level, and long-term mastery/confidence over multiple sessions.
- **Post-lesson reflection** with strongest learner, struggling learner, and next-step coaching suggestion.

## Flow design (implemented)

### 1) Lobby / classroom phase
- You can roam the classroom.
- Podium interaction opens lesson setup.
- Student interaction opens profile and coaching tips.

### 2) Lesson setup phase (podium)
- Define topic, objective, mode, and materials.
- Starting lesson transitions system to live lesson behavior.

### 3) Live lesson phase
- Teach by voice (or text fallback).
- Students raise hands based on archetype + uncertainty.
- You respond to queue, run mini-checks, and adapt explanation quality.

### 4) Reflection phase
- End lesson to compute outcomes.
- Student long-term progress updates and persists.
- Reflection panel gives summary + concrete next lesson suggestion.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`

> Notes: Three.js is loaded from CDN. Voice APIs depend on browser support and microphone permissions (best in Chromium browsers).

## Controls

- Move: `WASD` or Arrow keys
- Interact: `E`
- Teaching: open Voice Console and use Start/Stop Voice

## Files

- `index.html` — game shell, HUD, and world-triggered menus.
- `styles.css` — cutesy HUD/panel styling and responsive layout.
- `app.js` — player movement, interaction system, lesson-state machine, voice loop, and progression logic.
