# 🌌 Nova Link Launcher

> **Your Ultimate Minecraft Modpack Experience** 🚀

Welcome to **Nova Link**, a next-generation Minecraft launcher designed to make managing and playing modpacks seamless, beautiful, and social. Built with modern web technologies and a focus on user experience.

![Version](https://img.shields.io/badge/version-1.0.48-blueviolet.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Stable-success.svg?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg?style=for-the-badge&logo=windows)

---

## ✨ Key Features

*   **🚀 Seamless Modpack Management**: Browse, install, and launch your favorite modpacks with a single click.
*   **👤 User Profiles & Avatars**:
    *   **Custom Avatar Uploads**: Express yourself! Upload your own avatar directly from the client.
    *   **Profile Management**: Update your username, email, and password securely.
*   **🔒 Secure Authentication**:
    *   **Microsoft Integration**: Certified Minecraft authentication.
    *   **Two-Factor Security**: Email verification for sensitive account changes.
*   **⚡ High Performance**: Optimized for speed with a lightweight Electron + React frontend.
*   **🛠️ Tech Stack**:
    *   **Frontend**: React, TypeScript, TailwindCSS, Framer Motion
    *   **Backend**: NestJS, MinIO (S3 Compatible Storage), PostgreSQL, Prisma
    *   **Core**: Electron, Minecraft Launcher Core

---

## 📦 What's New in v1.0.48?

This release focuses on **Social Identity and Stability**:

*   **📸 Avatar System Overhaul**:
    *   Direct-to-Cloud uploads using **MinIO** pre-signed URLs.
    *   Secure and fast image hosting.
    *   Real-time profile updates.
*   **🔐 Enhanced Security**:
    *   Improved JWT handling and storage.
    *   Strict **Content Security Policies (CSP)** for safer browsing.
*   **🐛 Bug Fixes**:
    *   Fixed authentication token mismatches.
    *   Resolved connection issues with backend storage services.
    *   Overall stability improvements for long sessions.

---

## 🚀 Getting Started

1.  **Download**: Grab the latest `.exe` from the [Releases](https://github.com/S-BlackDragon/Nova-Link/releases) page.
2.  **Install**: Run the installer (it handles dependencies automatically).
3.  **Login**: Use your Nova Link credentials.
4.  **Play**: Select a modpack and hit **Launch**!

---

## 🛠️ For Developers

Nova Link is built with a modern stack:

```bash
# Clone the repo
git clone https://github.com/S-BlackDragon/Nova-Link.git

# Install dependencies
npm install

# Run dev mode
npm run dev
```

---

Made with ❤️ by the **Nova Link Team**
