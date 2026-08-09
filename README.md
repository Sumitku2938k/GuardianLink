# 🛡️ GuardianLink — AI-Powered Real-Time Child Safety & Emergency Response Ecosystem

> **Solution Statement:** 
> *“We propose an AI-powered real-time child identification and emergency response system that enables instant verification, guardian connection, and crowd-assisted recovery of lost or missing children using smart digital IDs and intelligent scanning infrastructure.”*

---

## 📌 Problem Statement
In emergency situations involving lost or missing children, **there is no fast, accessible, and real-time system** for civilians or authorities to identify the child and instantly connect with verified guardians or law enforcement. 

* **The Reality:** When a lost child is found by a citizen, there is no immediate way to verify their identity or securely contact their family. Existing databases (e.g., government registries, NGO lists) are fragmented, slow, and inaccessible to the general public.

---

## 💡 The GuardianLink Solution & Edge

GuardianLink bridges the gap between **the Public, AI intelligence, and Real-time response networks**.

| Core Feature | Traditional Process | GuardianLink Edge |
| :--- | :--- | :--- |
| **Response Time** | Hours to days (waiting for reports/FIR) | **Instant (Real-Time Push Alerts & Biometric Matches)** |
| **Dynamic IDs** | Static details, high loss rate | **NFC bracelets / Smart QR codes with offline fail-safes** |
| **Public Collaboration** | Passive flyers, manual notifications | **Active geolocation citizen network notifications** |
| **Identity Verification** | Manual checks, open databases | **AI-driven biometric facial indexing & KYC parent vetting** |

---

## ⚙️ Core Architecture & System Features

### 1. Dynamic Child Smart ID
* **Wearable Tech**: Lightweight NFC bracelets and smart QR bands containing offline basic identifiers.
* **Scan Response System (3 Levels)**:
  * **Level 1 (Safe Mode)**: A public scan displays safe details and alerts parent of check-in.
  * **Level 2 (Suspicious Mode)**: Scans in anomalous times/locations flag alerts to parent.
  * **Level 3 (Missing Mode Active)**: Instantly notifies nearby citizens, displays police contact details, and logs GPS coordinates.

### 2. AI Facial Recognition Pipeline
* **Biometric Vector Indexing**: Encrypts child facial photos into multi-dimensional embeddings (e.g., using `InsightFace` / `DeepFace`).
* **Vector Databases**: Utilizes specialized vector engines (like `Qdrant` or `Pinecone`) to scan databases at sub-second speeds.
* **CCTV & Citizen Crowd Sourcing**: Allows citizens to upload photos of lost/crying children to run instant matching routines.

### 3. The Trust Layer
* **Guardian KYC**: Prevents fake parent claims through authority validation, Aadhaar/Government ID validation, and secure OTP verification.
* **Alert Validation**: Prevents spam alerts by linking high-level emergency alerts with police verification workflows.

---

## 🛠️ Technology Stack

```
                     ┌───────────────────────────┐
                     │   GuardianLink Frontend   │
                     │  (Vite + React + Tailwind)│
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │    Node.js + Express API  │
                     └─────────────┬─────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ MongoDB Database │      │  AI Face Vector  │      │ Firebase Cloud   │
│  (User Records)  │      │  (Pinecone/Model)│      │  (Push Alerts)   │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 1. Frontend
* **React (Vite, JS)**: High-performance dashboard logic, clean modular architecture.
* **Tailwind CSS & Vanilla CSS**: Modern, premium UI containing glassmorphism, gradient styling, and custom theme systems.
* **Framer Motion**: Smooth animations, progressive multi-step forms, and transition effects.
* **React Router**: Router layout management.

### 2. Backend & Services (Future Scope)
* **API Service**: Node.js + Express.js.
* **Database**: MongoDB (Flexible JSON schemas for profiles, complaint registries, and scan logs).
* **Biometric Vector DB**: Pinecone / Qdrant.
* **Real-time Comms**: Socket.io (live navigation mapping) + Twilio/MSG91 (SMS alerts).
* **Storage**: Cloudinary / AWS S3 (secure KYC image hosting).

---

## 📂 Project Structure

```
GuardianLink Sem 5/
│
├── client/                      # Vite + React Client App
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI controls (Buttons, Inputs, Modals, Cards)
│   │   │   ├── dashboard/       # Dashboard widgets (Sidebar, TopNavbar, Timelines, Tips)
│   │   │   └── layout/          # Global layout headers/footers
│   │   ├── pages/               # Application Pages (Index, Login, Register, Dashboard)
│   │   ├── styles/              # Global Tailwind style configuration
│   │   ├── constants/           # Mock data and static variables
│   │   ├── App.jsx              # Main routing and navigation engine
│   │   └── main.jsx             # React entry point
│   ├── tailwind.config.js       # Custom design system tokens
│   └── package.json
│
├── server/                      # Future Node.js Backend API
└── README.md                    # Platform overview & details
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)

### Run the Client Application

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:5173/`.

### Run the Server Application

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Boot the API development server (uses `nodemon`):
   ```bash
   npm run dev
   ```
4. Verify the server is active by accessing the health endpoint at `http://localhost:5000/api/health`.

---
*Developed with 🛡️ by GuardianLink Team — Child Safety Initiative.*
