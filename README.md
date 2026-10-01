# 🛡️ HackHero - Frontend Application

<p align="center">
  <b>Interactive, Real-Time Gamified Cybersecurity Platform</b>
</p>

> ⚠️ **Note:** This repository contains the **Frontend Architecture** for the HackHero platform. The Backend repository is currently kept private for security and system configuration reasons.

---

## 📌 About The Project

**HackHero** is an AI-powered, web-based educational platform designed to bridge the gap between theoretical and practical cybersecurity knowledge through interactive, gamified simulations.

The platform features a Generative AI engine that dynamically creates adaptive real-time game scenarios based on user performance, ensuring a completely unique experience where different scenarios are generated each time a person plays.

Tailoring to users aged 10 and above, the platform delivers personalized learning through two distinct pathways:
-  **Non-Technical Mode:** Focuses on foundational cybersecurity awareness, risk assessment, and safe online behaviors.
-  **Technical Mode:** Designed for advanced learners to tackle complex concepts such as secure coding, cryptography, and database privacy.

Across these pathways, **HackHero** offers seven specialized games. It seamlessly supports both single-player and multiplayer (2–4 players) modes, integrated with an intuitive friends system, as well as competitive weekly and public wager-based challenges.

---

## 🎯 National Vision & Educational Mission

**HackHero** aligns directly with **Saudi Vision 2030** and the **National Transformation Program** by fostering a digitally secure infrastructure and advancing community cybersecurity awareness.

The platform transforms complex security protocols, threat detection, and vulnerability assessments into engaging tactical simulations. 
---

## ✨ Key Features

-  **Multiplayer & Single-Player Modes:** Real-time synchronized escape room challenges powered by WebSockets (2–4 players).
-  **AI-Driven Dynamic Scenarios:** Integrated with Gemini AI APIs to generate adaptive, non-repetitive challenges.
-  **Tactical Communication:** Real-time in-game chat system with unread notification counters.
-  **Responsive Cyber UI:** Built with a modern dark-mode aesthetic, optimized across desktop, tablet, and mobile views.
-  **Interactive Dashboards:** Live leaderboards, friends management, and weekly wager challenges.

---

## 🛠️ Tech Stack & Architecture

###  Frontend Architecture
- **Framework:** React.js (Bootstrapped with Vite)
- **Styling & UI:** Tailwind CSS, PostCSS
- **Real-Time Communication Client:** Socket.io-client
- **Icons & Modals:** Lucide React, SweetAlert2
- **Hosting & Deployment:** Vercel

###  Backend & AI Infrastructure (Private Repo)
- **Core Environment:** Node.js & Express.js for scalable API architecture and data management.
- **Real-Time Engine:** Socket.IO for low-latency, multi-player event synchronization (2–4 players) and live state management.
- **Generative AI Integration:** Gemini AI APIs for dynamic scenario creation, real-time security hint generation, and performance-based puzzle adaptation.


