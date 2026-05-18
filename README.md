# 💼 Escrow Account Ledger — Professional Ledger Suite

[![Live Production](https://img.shields.io/badge/Live-Production-emerald?style=for-the-badge&logo=firebase)](https://esrow-ledger.web.app)
[![Tech Stack](https://img.shields.io/badge/Vite_/_React_/_TypeScript-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/Supabase_/_PostgreSQL-green?style=for-the-badge&logo=supabase)](https://supabase.com)

An elite, keyboard-first, desktop-grade double-entry accounting suite built to manage high-volume transactional ledgers, automate Monday Final settlements, calculate volumes, and keep full multi-party balance sheets completely in sync.

---

## ✨ Key Features & UX Highlights

*   🎹 **Keyboard-First Ledger Navigation**: Engineered for lightning-fast double-entry manual bookkeeping. Includes auto-completion overlays and custom `TAB` selectors.
*   ⚡ **Monday Final Settlement Engine**: Automates the transition of open transaction logs into permanent finalized logs weekly with strict read-only ledger locking.
*   📊 **Visual Balance Sheet**: Live rendering of Credit (Jama / Dena) and Debit (Name / Lena) balances with custom color-coded indicators and pagination filters.
*   🌗 **Seamless Global Theme Toggle**: High-performance theme provider toggles between a crisp Light Mode (default) and a stunning dark glassmorphism theme instantly.
*   👑 **Secure Admin Command Panel**: Global workspace metrics (realtime count of registered users, parties, volume logs) with active system permissions management.
*   🎯 **Automated Database Triggers**: Realtime database functions manage settlement constraints and automatically flag anomalies dynamically on the Supabase/PostgreSQL layers.

---

## 🛠️ Technology Stack

*   **Frontend Library**: React 19 (TypeScript)
*   **Build Bundler**: Vite 8 (with hyper-fast compilation hooks)
*   **Styling Engine**: Tailwind CSS (Fully Standard compliant)
*   **Icons Framework**: Lucide React
*   **Database & Auth**: Supabase (PostgreSQL with custom PL/pgSQL database triggers)
*   **Live Cloud Hosting**: Firebase Hosting

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install all node packages:
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory (make sure it's kept private!) and add your credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_api_key
```

### 3. Local Development Run
Launch Vite's hot-reload server locally:
```bash
npm run dev
```

### 4. Build & Production Check
Generate optimal statically bundled production files:
```bash
npm run build
```

### 5. Deployment
Deploy to Firebase Hosting using CLI:
```bash
npx firebase deploy --only hosting
```

---

## 📂 Project Architecture

```
├── .firebase/           # Firebase hosting state
├── public/              # Global brand assets, SVGs & logo images
├── src/
│   ├── assets/          # Static layout assets
│   ├── components/      # UI, layout (Navbar/Footer), routing gates
│   ├── contexts/        # Auth, Theme, and Admin providers
│   ├── lib/             # Supabase clients & utility libraries
│   ├── pages/           # Premium view screens (Dashboard, Ledger, BalanceSheet, Reports...)
│   ├── App.tsx          # Router mapping and theme contexts
│   └── main.tsx         # Virtual DOM entrypoint
├── supabase/            # Database schema updates, triggers, & RPC scripts
├── tailwind.config.js   # Tailored theme configs
└── vite.config.ts       # Bundler configs
```

---

## 🔒 Security & Data Compliance
*   All environmental variables are protected via standard `.gitignore` settings to prevent leak risks.
*   Strict PL/pgSQL database triggers enforce read-only historical transactions post Monday Final settlements.
