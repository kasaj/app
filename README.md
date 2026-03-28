<p align="center">
  <img src="public/logo.png" alt="PRA" width="120" />
</p>

# PRA

A conscious space for daily practice.

**[Česky](README.cs.md)** | English

**[Launch App](https://kasaj.github.io/app/)**

## About

PRA is a mindfulness app built around a simple idea: the quality of life depends on awareness — how finely we perceive reality and ourselves, and how consciously we act.

It follows the natural mechanics of change: **thought → word → action → habit → character → destiny.**

The app doesn't teach. It provides structure for daily practice and a quiet space to pause, reflect, and return to yourself. Everything runs locally on your device — no accounts, no servers, no tracking.

## Philosophy

The app is organized around three questions:

- **Why** — without rootedness in meaning, no practice lasts. Why is the root from which everything else grows.
- **How** — discipline is a form of love for what we are becoming. The bridge between intention and reality.
- **What** — method and concrete practice. Content without direction is noise, method without form is chaos.

Each user can write their own answers to these questions directly in the app (Info page).

## Activities

PRA comes with six default activities, each with selectable variants that auto-fill into notes:

| Activity | Type | Description |
|----------|------|-------------|
| 🧍‍♂️ **Pause** | Timed (1 min) | Consciously stop, breathe, observe, be present |
| 🏃‍♂️ **Movement - Activity** | Timed (30 min) | Get energy flowing — sport, stretching, yoga, balance |
| 🧎‍♂️ **Contemplation - Nourishment** | Timed (15 min) | Meditation, mindful eating, imagination, observing thoughts |
| 📜 **Comment - Note** | Moment | Self-reflection, intention, anchoring a thought or feeling |
| 👫 **Embrace - Relationships** | Moment | Conscious contact — sharing, family, understanding, community |
| 🔥 **Challenge - Courage** | Moment | Facing what you avoid — fear, pain, new habits, small steps |

All activities are fully customizable — name, emoji, description, duration, and variants. Changes auto-save.

## Features

- **Timed practice** — countdown timer with gong, pause/resume, finish early, "Done" for retroactive recording. Start time displayed during countdown
- **Moments** — quick records without timer
- **Unified comment system** — all activity interactions (notes, reflections, observations) are timestamped comments. No separate "Record" button — adding a comment is the action
- **Variants** — clickable chips that auto-fill into notes
- **State tracking** — rate your state before and after timed activities (1-5 stars)
- **Activity linking** — create follow-up activities from any record (+), navigate between linked activities with ‹ › arrows
- **Record navigation** — browse through all records with ‹ › in the edit view
- **Statistics** — day/week/month trend chart (bar chart for activity count + line for average state), elapsed time since first use, practice percentage of waking hours
- **Monthly calendar** — color-coded days by activity count, click to preview day's records
- **Today/Total summary** — activity count and time shown as today / all-time
- **Info page** — philosophical context (Why/How/What/I) with personal note fields, inspirational quotes, scientific foundations. App logo at the bottom
- **Smart sync** — app detects config changes on server, auto-merges new activities while preserving user edits
- **Session reset** — start a new practice session from Settings (resets today's completion markers)
- **Configuration** — JSON config file drives activities, info content, quotes, language and theme
- **Backup/Import** — full backup with history, ratings, comments and per-activity stats (count, time, avg rating). Import always merges — user data is never overwritten
- **Themes** — Auto (follows system light/dark), Classic (warm earth tones), Dark
- **Auto-save** — all settings, ratings, and comments save instantly
- **Bilingual** — Czech and English with per-language notes
- **Offline** — works without internet as a PWA
- **CI/CD** — push to main auto-deploys via GitHub Actions

## Install on Mobile

1. Open the [app](https://kasaj.github.io/app/) in your browser
2. **iOS Safari**: Share → Add to Home Screen
3. **Android Chrome**: Menu → Add to Home Screen

Works offline. All data stays on your device.

## Configuration

The app is driven by `public/default-config.json`:

```json
{
  "version": 1,
  "name": "default",
  "language": "cs",
  "theme": "modern",
  "activities": [...],
  "info": {
    "cs": { "intro": "...", "quotes": [...], "why": "...", "how": "...", "what": "..." },
    "en": { ... }
  }
}
```

Edit config → push to main → auto-deploy. New activities appear for users automatically. User-edited activities are never overwritten.

## Privacy

- All data stays on your device (localStorage)
- No analytics, no tracking, no cookies
- No server — purely client-side
- Backup is your responsibility

## Tech Stack

React + TypeScript, Vite, Tailwind CSS, Recharts, PWA, GitHub Actions, GitHub Pages

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (localhost:3000)
npm run build      # Build for production
```

Push to `main` auto-deploys via GitHub Actions.

## License

MIT
