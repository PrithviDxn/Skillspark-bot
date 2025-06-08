# SkillSpark Interview Bot (Fresh Implementation)

## Overview
This bot acts as a virtual interviewer in Twilio Video rooms, controlled by the admin, and interacts with candidates using AI-generated and pre-defined questions. It is split into two main parts:
- **Backend (Node.js, Render):** Handles Twilio, OpenAI, audio processing, question flow, and report generation.
- **Frontend Avatar (Web, Netlify):** Joins the Twilio room as a participant, displays the animated avatar, and plays TTS audio.

## Structure
- `/bot` — Bot backend logic (Node.js, deploy to Render)
- `/bot/avatar` — Bot avatar web app (deploy to Netlify or serve statically)

## Features
- Joins Twilio Video room as a virtual participant
- Admin controls (start, pause, resume, stop, custom instructions)
- Dynamic and pre-defined question management
- Audio capture, speech-to-text, and answer storage
- Report generation with Q&A, timestamps, audio, and AI summary

## Deployment
### Backend (Render)
- Deploy `/bot` as a Node.js service on Render
- Set environment variables for Twilio, OpenAI, etc.
- Exposes REST/WebSocket endpoints for admin controls and bot communication

### Frontend Avatar (Netlify)
- Deploy `/bot/avatar` as a static site on Netlify
- Connects to Twilio Video as the bot participant
- Displays animated avatar and plays TTS

## Admin Controls
- Integrated into your main Netlify frontend or a separate dashboard
- Communicates with backend via REST/WebSocket

## Getting Started
1. Clone the repo and install dependencies in `/bot`
2. Deploy `/bot` to Render
3. Deploy `/bot/avatar` to Netlify
4. Configure environment variables on both platforms
5. Use admin controls to manage interviews

---

## Next Steps
- Backend: Implement Twilio, OpenAI, question, and report logic
- Frontend: Build avatar web app
- Integrate admin controls 