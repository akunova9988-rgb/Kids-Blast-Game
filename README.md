# 🧮 Math Quiz – Интерактивная математическая викторина

A fully-featured interactive Math Quiz web application for teachers and students, built with pure HTML/CSS/JavaScript using `localStorage` + `BroadcastChannel` for real-time multi-tab communication (Firebase-ready).

## Pages

| File | Description |
|---|---|
| `index.html` | Home page – choose Teacher or Student |
| `teacher.html` | Teacher cabinet (login protected) |
| `student.html` | Student cabinet – enter name & quiz code |

## Usage

Open `index.html` in a browser (no server required – runs from the filesystem).

### Teacher login
- **Username:** `teacher`
- **Password:** `Math2026!`

### Default quiz code
- `MATH2026` (editable in the teacher dashboard)

## Features

- **15 default math questions** (algebra, geometry, statistics, calculus)
- **30-second countdown timer** per question with animated circular progress
- **4-option answer cards** (A/B/C/D) with keyboard shortcuts
- **Real-time leaderboard** updated as students finish
- **Question editor** – add, edit, delete questions
- **Confetti celebration** on results screen
- **Grade system** in Russian (Отлично / Хорошо / etc.)
- **Responsive** – mobile, tablet, desktop
- **Multi-tab simulation** – open teacher in one tab, students in others; state syncs via `BroadcastChannel` + `localStorage`

## Color palette

| Token | Hex |
|---|---|
| Primary (purple) | `#6C63FF` |
| Secondary (blue) | `#4FC3F7` |
| Background | `#F8F9FF` |

## Firebase (production upgrade)

The app uses `localStorage` + `BroadcastChannel` as a working demo backend.  
To upgrade to Firebase Realtime Database for true multi-device support, replace the `loadState()` / `saveState()` helpers with Firebase read/write calls and the `BroadcastChannel` listeners with `onValue()` subscriptions.

```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js"></script>
```
