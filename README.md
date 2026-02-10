# Cozy Classroom MVP

A browser-based prototype where you reinforce concepts by teaching a classroom of AI animal students.

## Implemented features

- **Lesson planner** with topic, objective, mode, and source material notes.
- **Live classroom simulation** with 6 AI student archetypes.
- **Hand-raise queue** where students ask questions based on uncertainty and misconceptions.
- **Teaching quality heuristics** that reward explanations with examples, structure, and causal language.
- **Mini formative checks** that can detect weak understanding and trigger misconception prompts.
- **Reflection dashboard** showing mastery/confidence trends and session stats.
- **Lesson history + streak tracking** persisted in `localStorage`.

## Run locally

No build step required.

```bash
python3 -m http.server 4173
```

Open: `http://localhost:4173`

## Files

- `index.html` — app structure and panels.
- `styles.css` — cozy UI styling.
- `app.js` — classroom logic, AI student simulation, and analytics state.

## Notes

This is an MVP simulation layer intended to validate UX and teaching loop behavior before introducing full 3D rendering (e.g., Three.js), backend persistence, and multiplayer.
