# 🌾 Contributing to Namma Raitha

Welcome to the team! This guide explains how to set up the project locally and collaborate using Git/GitHub.

---

## ⚡ Quick Setup (First Time)

### 1. Clone the repository
```bash
git clone https://github.com/arunkumarmeda27/namma-raitha.git
cd namma-raitha
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up your environment variables
```bash
# Copy the example file
cp .env.example .env
```
Then open `.env` and fill in your **own** API keys:
- Get a free Gemini API key at: https://aistudio.google.com

> ⚠️ **NEVER commit your `.env` file.** It is already in `.gitignore`.

### 4. Start the development server
```bash
# Start the frontend (React/Vite)
npm run dev

# In a separate terminal, start the backend
node server.js
```

---

## 🔄 Daily Workflow (Every Time You Work)

### Before starting any work — always pull latest changes:
```bash
git pull origin main
```

### Create a branch for your feature/fix:
```bash
git checkout -b feature/your-feature-name
# Examples:
# git checkout -b feature/add-crop-calendar
# git checkout -b fix/login-bug
```

### Make your changes, then commit:
```bash
git add .
git commit -m "Short description of what you changed"
```

### Push your branch to GitHub:
```bash
git push origin feature/your-feature-name
```

### Open a Pull Request (PR) on GitHub:
1. Go to https://github.com/arunkumarmeda27/namma-raitha
2. Click **"Compare & pull request"**
3. Add a description of your changes
4. Assign a reviewer (ping the team)
5. After review + approval → **Merge to main**

---

## 🌿 Branch Naming Rules

| Type | Example |
|------|---------|
| New feature | `feature/farmer-chat-ai` |
| Bug fix | `fix/market-price-not-loading` |
| UI improvement | `ui/responsive-sidebar` |
| Documentation | `docs/update-readme` |

---

## 💬 Commit Message Tips

Write clear, short commit messages:
```
✅ Good: "Add crop recommendation card to FarmerHome"
❌ Bad:  "changes" / "fix" / "update"
```

---

## 🗂️ Project Structure

```
namma-raitha/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/
│   │   ├── farmer/     # Farmer dashboard pages
│   │   └── buyer/      # Buyer dashboard pages
│   ├── data/           # Static data / mock data
│   └── App.jsx         # Main app + routing
├── public/             # Static assets
├── server.js           # Node.js/Express backend
├── .env.example        # Template for environment variables
└── package.json
```

---

## ❓ Need Help?

- Open an **Issue** on GitHub for bugs or feature requests
- Tag `@arunkumarmeda27` for urgent issues
