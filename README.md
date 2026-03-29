# Namma Raitha — ನಮ್ಮ ರೈತ
### Karnataka's Smart Farm Platform

A full-stack React + Node.js web application connecting farmers and buyers directly.

## 🚀 How to Run

### Start the Backend API Server (Terminal 1):
```
node server.js
```
Backend runs at: **http://localhost:3001**

### Start the React Frontend (Terminal 2):
```
npm run dev
```
Frontend runs at: **http://localhost:5173**

### Or run both together (concurrently):
```
npm start
```

---

## 🔐 Authentication

### Login
- Enter your **phone number** (10 digits) and **password**
- Choose your role: **Farmer** or **Buyer**

### Sign Up (DigiLocker Flow)
1. Enter your **phone number**
2. Enter your **12-digit Aadhaar number** on the DigiLocker screen
3. Click **"Verify with DigiLocker"** → OTP is generated
4. In **Demo Mode**: The OTP is displayed in an orange box on screen
5. Enter the 6-digit OTP → Your name and details are auto-filled from DigiLocker
6. Set your **password** → Account created!

---

## 📱 Features

### Farmer Dashboard
- 📈 Live market rates ticker
- 🌾 AI Crop Advisor (soil type, season, irrigation)
- 🛰️ Satellite Water Intelligence Map (all 31 Karnataka districts)
- 🔵 Borewell AI recommendations
- 🛒 Marketplace (list crops, receive bids)
- 📊 Growth Dashboard (income charts, badge system)
- 🆘 Solutions (pest control, govt schemes, helplines)
- 👤 Profile with DigiLocker verified details

### Buyer Dashboard
- 🔥 Fresh harvest browsing
- 🔍 Crop search with filters
- 📦 Order tracking with status
- 📊 Procurement analytics
- 🔐 Escrow payment protection

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Node.js + Express 5 |
| Database | JSON file (users.json) |
| Auth | JWT + bcryptjs |
| DigiLocker | Simulated sandbox (demo OTP) |

---

## 📁 Project Structure

```
namma-raitha/
├── server.js              # Express API server
├── data/users.json        # User database (auto-created)
├── src/
│   ├── App.jsx            # Root component with auth routing
│   ├── index.css          # Global styles
│   ├── pages/
│   │   ├── AuthPage.jsx   # Login + DigiLocker signup
│   │   ├── AuthPage.css   # Auth page premium styles
│   │   ├── FarmerApp.jsx  # Farmer app shell
│   │   ├── BuyerApp.jsx   # Buyer app shell
│   │   ├── farmer/        # Farmer pages
│   │   └── buyer/         # Buyer pages
│   ├── components/
│   │   └── Ticker.jsx     # Market rates ticker
│   └── data/
│       └── appData.js     # All static data
└── package.json
```

---

> **Note**: DigiLocker integration is simulated for demo purposes. In production, register at [partners.digitallocker.gov.in](https://partners.digitallocker.gov.in) for real API credentials.
