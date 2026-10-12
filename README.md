# 🎓 Campus Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> A modern, secure, and open-source peer-to-peer campus marketplace and student community platform designed for colleges and universities.

---

## 🌟 Overview

**Campus Marketplace** is a full-featured web platform that allows university students and staff to buy, sell, and exchange textbooks, electronics, dorm furniture, study gear, and tickets securely within their academic community.

It features student email verification, OTP authentication, interactive buyer-seller messaging, designated campus safe trade zones, student club spotlights, and a comprehensive administrative portal.

The application is built **offline-first / local-first**: it runs out-of-the-box with zero configuration and zero external dependencies using client-side storage, with optional support for Google Cloud Firestore synchronization and real-world email dispatchers (SMTP & Resend).

---

## ✨ Features

- **🔐 Institutional Email Verification & OTP Login**
  - Restrict registrations to verified university domains (e.g. `@university.edu`).
  - Secure One-Time Password (OTP) verification with automated expiration.
  - **Zero-Friction Dev Sandbox**: In local development mode without email credentials, OTP codes automatically print directly to your terminal.

- **🛍️ Peer-to-Peer Marketplace & Listings**
  - High-speed product catalog with real-time text search and category filtering.
  - Condition ratings (Brand New, Like New, Good, Fair).
  - Multiple image uploads with local image preview and data optimization.
  - Bookmark favorites and filter by price range or urgency.

- **💬 Real-Time Buyer & Seller Messaging**
  - In-app messaging interface for negotiations and inquiries.
  - Integrated safe meetup proposal generator (select campus landmarks, dates, and times).

- **📍 Campus Safe Trade Zones**
  - Pre-vetted high-visibility exchange locations on campus (Library Lobby, Student Center, Campus Cafeteria, Campus Security Post).
  - Safety guidelines and exchange checklist for students.

- **🛡️ Administrative Governance Dashboard**
  - Complete oversight over listings, users, and transactions.
  - One-click listing approval, takedown, or flagging.
  - Campus-wide broadcast announcement banners.
  - Immutable audit logs with timestamped administrative actions and CSV export.

- **🏛️ Student Clubs & Community Announcements**
  - Spotlight campus societies, student unions, and upcoming campus events.
  - Promote verified student initiatives and club merch.

- **🌓 Modern Responsive UI**
  - Glassmorphic modern aesthetic built with performant vanilla CSS.
  - Dark mode and light mode toggle with system preference detection.
  - Fully mobile-responsive layout for smartphones, tablets, and desktops.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0 or newer)
- [npm](https://www.npmjs.com/) (version 9.0 or newer)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/campus-marketplace.git
cd campus-marketplace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser. The app is immediately interactive with pre-loaded mock campus data!

---

## 🧪 Demo Credentials & Sandbox Mode

For testing and demonstration, use the following pre-configured credentials:

| Role | Email | Password / PIN | Notes |
| :--- | :--- | :--- | :--- |
| **Student** | `student@university.edu` | `password123` | Default student account with sample listings |
| **Admin** | `admin@university.edu` | `admin123` | Full access to `/admin` management portal |

> **💡 Developer OTP Sandbox:**
> When testing user registration or forgot-password flows locally without configuring an email service, the dev server will print the 6-digit OTP verification code straight to your terminal console:
> ```
> ╔════════════════════════════════════════════════════╗
> ║  [DEV OTP SANDBOX]                                 ║
> ║  To: student@university.edu                        ║
> ║  Your OTP code is: 482910                          ║
> ║  Valid for 10 minutes                              ║
> ╚════════════════════════════════════════════════════╝
> ```

---

## ⚙️ Environment Configuration (Optional)

The application works completely offline without any environment variables. To enable production services (cloud database, real email delivery), copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Available Configuration Options:

```env
# Campus Domain Filtering (optional - leave empty to allow any standard email)
VITE_ALLOWED_DOMAINS=@university.edu,@student.university.edu

# Optional: Google Cloud Firebase / Firestore
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Optional: Outgoing Email Services (SMTP or Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-service-account@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Campus Marketplace <noreply@university.edu>"

# Or Resend API
RESEND_API_KEY=re_your_api_key_here
```

---

## 📂 Project Structure

```
campus-marketplace/
├── api/                       # Serverless API endpoints (Vercel)
│   ├── send-otp.js            # OTP generation and email dispatcher
│   └── verify-otp.js          # OTP token validation
├── public/                    # Static public assets, favicon, icons
├── scripts/                   # Database seeding and testing utilities
├── src/
│   ├── assets/                # App icons and media
│   ├── components/            # Reusable UI components (Navbar, Modals, Chat, Layout)
│   ├── data/                  # Default seed data and campus categories
│   ├── pages/                 # Application views (Home, Listings, Login, Admin, etc.)
│   ├── services/              # Local storage, Firebase sync, and state store
│   ├── App.jsx                # Main application component & routing
│   ├── main.jsx               # React DOM entry point
│   └── index.css              # Global styles, variables, and typography
├── .env.example               # Template environment configuration
├── firestore.rules            # Firebase Security Rules for production
├── package.json               # Dependencies and build scripts
├── vite.config.js             # Vite configuration with local OTP dev middleware
└── vercel.json                # Vercel deployment routes and serverless headers
```

---

## 🌐 Deployment to Production

### Deploying on Vercel

The repository is pre-configured for instant zero-configuration deployment to [Vercel](https://vercel.com):

1. Push your repository to GitHub or GitLab.
2. Import the project into your Vercel Dashboard.
3. (Optional) Add your environment variables in **Project Settings > Environment Variables**.
4. Click **Deploy**.

Both client-side single-page routing and the serverless OTP functions in `/api` will be configured automatically.

---

## 🔒 Security & Privacy

- **No Hardcoded Secrets:** All private credentials, passwords, and API keys are strictly loaded via environment variables.
- **Client Sanitization:** Input sanitization and secure verification checks are applied across store mutations and authentication routes.
- **Granular Firestore Rules:** Provided [firestore.rules](firestore.rules) ensure only authenticated users can modify their own listings and only designated administrators have moderation privileges.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
