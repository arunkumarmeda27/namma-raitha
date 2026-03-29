import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'namma_raitha_secret_key_2024_karnataka';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// In-memory database (JSON file based for persistence)
const DB_FILE = join(__dirname, 'data', 'users.json');

// Ensure data directory exists
if (!fs.existsSync(join(__dirname, 'data'))) {
  fs.mkdirSync(join(__dirname, 'data'));
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { users: [], otps: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── DIGILOCKER MOCK DATA ──────────────────────────────────────────────────────
const mockDigiLockerData = {
  farmers: [
    { name: 'Raju Patil', district: 'Dharwad', village: 'Kalaghatagi', land: '2.5 acres', dob: '1985-06-14' },
    { name: 'Manjappa Kumar', district: 'Gadag', village: 'Ron', land: '3.0 acres', dob: '1979-11-22' },
    { name: 'Suresh Nagaraj', district: 'Kodagu', village: 'Madikeri', land: '4.0 acres', dob: '1990-03-08' },
    { name: 'Basavaraj Patil', district: 'Haveri', village: 'Ranebennur', land: '1.5 acres', dob: '1983-09-15' },
    { name: 'Nagaraj Reddy', district: 'Shivamogga', village: 'Bhadravathi', land: '5.0 acres', dob: '1975-12-01' },
  ],
  buyers: [
    { name: 'Priya Merchants', business: 'Wholesale Grain Trading', gst: '29ABCDE1234F1Z5', city: 'Bengaluru' },
    { name: 'Anand Traders', business: 'Agricultural Export', gst: '29XYZAB5678G1Z2', city: 'Mysuru' },
    { name: 'Karnataka Agro Foods', business: 'Food Processing', gst: '29LMNOP9012H1Z8', city: 'Belagavi' },
    { name: 'Fresh Harvest Hub', business: 'Retail Distribution', gst: '29QRSTU3456I1Z4', city: 'Mangaluru' },
    { name: 'South India Grains', business: 'Commodity Trading', gst: '29VWXYZ7890J1Z7', city: 'Hubballi' },
  ]
};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getMockDigiData(aadhaar, role) {
  const list = role === 'farmer' ? mockDigiLockerData.farmers : mockDigiLockerData.buyers;
  const index = parseInt(aadhaar.slice(-1)) % list.length;
  return list[index];
}

// ── GEMINI AI HELPER ──────────────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    return null; // will use mock
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini API error:', err);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error('Gemini call failed:', e.message);
    return null;
  }
}

// ── SMART MOCK AI FALLBACK ────────────────────────────────────────────────────
function mockCropAdvice(district, soilType, season, irrigation, landSize) {
  const cropsByCondition = {
    'Red Sandy': ['Ragi', 'Groundnut', 'Sunflower'],
    'Black Cotton': ['Cotton', 'Soybean', 'Jowar'],
    'Laterite': ['Cashew', 'Arecanut', 'Coconut'],
    'Alluvial': ['Paddy', 'Wheat', 'Sugarcane'],
  };
  const soil = Object.keys(cropsByCondition).find(k => soilType?.includes(k.split(' ')[0])) || 'Red Sandy';
  const crops = cropsByCondition[soil];
  return {
    summary: `Based on ${district || 'Karnataka'} conditions, ${soil} soil and ${season || 'Kharif'} season, here are your AI-powered crop recommendations.`,
    topCrops: [
      { name: crops[0], icon: crops[0] === 'Ragi' ? '🌾' : crops[0] === 'Cotton' ? '🌿' : '🌱', kannadaName: 'ರಾಗಿ', profitPerAcre: 55000, yieldPerAcre: '15-18 qt', risk: 'Low', aiScore: 92, waterRequirement: 'Low', msPrice: '₹3,846/qt', advice: `Ideal for ${soil} soil in ${district}. Plant in June for best yield.` },
      { name: crops[1], icon: '🌽', kannadaName: 'ಜೋಳ', profitPerAcre: 42000, yieldPerAcre: '20-25 qt', risk: 'Medium', aiScore: 79, waterRequirement: 'Medium', msPrice: '₹1,962/qt', advice: `Good market demand. Requires moderate irrigation.` },
      { name: crops[2], icon: '🫘', kannadaName: 'ದ್ವಿದಳ', profitPerAcre: 36000, yieldPerAcre: '8-10 qt', risk: 'Low', aiScore: 65, waterRequirement: 'Low', msPrice: '₹6,600/qt', advice: `Safe bet crop. Low water requirement, good MSP support.` },
    ],
    generalAdvice: `For ${landSize || 2} acres in ${district || 'Karnataka'}, we recommend diversifying: 60% ${crops[0]}, 40% ${crops[1]} for risk mitigation and maximum profit.`,
    weatherForecast: 'Good rainfall expected in next 15 days. Ideal sowing window.',
    aiConfidence: 88
  };
}

function mockPestDiagnosis(cropName, symptoms) {
  const symlower = (symptoms || '').toLowerCase();
  let disease = {};
  if (symlower.includes('yellow') || symlower.includes('pale')) {
    disease = {
      name: 'Nutrient Deficiency / Chlorosis',
      kannadaName: 'ಪೋಷಕಾಂಶ ಕೊರತೆ',
      severity: 'Medium',
      cause: 'Nitrogen or Iron deficiency in soil',
      treatment: ['Apply Urea 30kg/acre top dressing', 'Ferrous Sulphate 0.5% foliar spray', 'Check soil pH — maintain 6.5-7.0'],
      prevention: ['Soil testing before sowing', 'Balanced NPK fertilization', 'Organic matter addition'],
      timeToTreat: '7-10 days for visible improvement'
    };
  } else if (symlower.includes('spot') || symlower.includes('blight') || symlower.includes('brown')) {
    disease = {
      name: 'Fungal Leaf Blight',
      kannadaName: 'ಶಿಲೀಂಧ್ರ ರೋಗ',
      severity: 'High',
      cause: `Fungal infection (Helminthosporium sp.) in ${cropName}`,
      treatment: ['Mancozeb 75WP @ 2.5g/L water spray', 'Remove and burn infected leaves', 'Avoid overhead irrigation'],
      prevention: ['Use certified disease-resistant seeds', 'Crop rotation every 2 seasons', 'Field sanitation — remove crop debris'],
      timeToTreat: '3-5 days urgent action needed'
    };
  } else if (symlower.includes('worm') || symlower.includes('insect') || symlower.includes('holes')) {
    disease = {
      name: 'Stem Borer / Caterpillar Infestation',
      kannadaName: 'ದಂಡ ಕೊರೆಯುವ ಕೀಟ',
      severity: 'High',
      cause: `Lepidopteron larvae boring into ${cropName} stems`,
      treatment: ['Chlorpyrifos 2.5ml/L spray at dusk', 'Carbaryl 50WP 2g/L as soil drench', 'Light traps to catch adult moths'],
      prevention: ['Deep summer ploughing to expose pupae', 'Trichogramma parasitoid release', 'Avoid excess nitrogen fertilizers'],
      timeToTreat: 'Spray within 48 hours for best results'
    };
  } else {
    disease = {
      name: 'General Crop Stress',
      kannadaName: 'ಸಾಮಾನ್ಯ ಬೆಳೆ ಒತ್ತಡ',
      severity: 'Low',
      cause: `Environmental or cultural stress in ${cropName}`,
      treatment: ['Check soil moisture — irrigate if dry', 'Inspect for root damage or waterlogging', 'Apply micronutrient foliar spray'],
      prevention: ['Regular field monitoring every 3 days', 'Maintain optimal plant spacing', 'Practice integrated crop management'],
      timeToTreat: 'Monitor for 3-5 days and reassess'
    };
  }
  return {
    crop: cropName,
    symptoms: symptoms,
    diagnosis: disease,
    confidence: Math.floor(75 + Math.random() * 20),
    nearbyAgriOffice: 'Contact: Krishi Vigyan Kendra — 1800-180-1551',
    emergencyHelpline: '155333 (Karnataka Raita Samparka)'
  };
}

function mockMarketInsight(cropName) {
  const insights = {
    'Ragi': { trend: 'Rising', forecast: '+8%', sellAdvice: 'Hold for 2 weeks — post-festival demand spike expected.', bestMarket: 'Dharwad APMC · Bellary Mandi', avgPrice: '₹3,900/qt', weekHigh: '₹4,100/qt', weekLow: '₹3,700/qt' },
    'Paddy': { trend: 'Stable', forecast: '+2%', sellAdvice: 'Sell now — government procurement at MSP ₹2,183 ongoing.', bestMarket: 'Mandya APMC · Davangere Mandi', avgPrice: '₹2,200/qt', weekHigh: '₹2,350/qt', weekLow: '₹2,100/qt' },
    'Cotton': { trend: 'Falling', forecast: '-4%', sellAdvice: 'Sell immediately — international prices declining due to surplus.', bestMarket: 'Davanagere APMC · Harihara Market', avgPrice: '₹7,200/qt', weekHigh: '₹7,500/qt', weekLow: '₹6,900/qt' },
  };
  const data = insights[cropName] || {
    trend: 'Stable', forecast: '+3%', sellAdvice: `${cropName} prices are stable. Good time to sell in bulk for better negotiation.`,
    bestMarket: 'Nearest APMC Market', avgPrice: '₹2,500/qt', weekHigh: '₹2,800/qt', weekLow: '₹2,300/qt'
  };
  return {
    crop: cropName,
    ...data,
    demandScore: Math.floor(65 + Math.random() * 30),
    buyerCount: Math.floor(8 + Math.random() * 20),
    priceHistory: [2800, 2900, 2750, 3000, 3200, 3100, 3400, 3600, 3500, 3800, 3900, 4000].map((v, i) => ({ month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], price: v })),
    tip: `Best time to sell: Early morning APMC auctions. Bring quality certification for +5% premium price.`
  };
}

// ── ROUTES ───────────────────────────────────────────────────────────────────

// Send OTP for DigiLocker
app.post('/api/auth/digilocker/send-otp', (req, res) => {
  const { aadhaar, phone, role } = req.body;
  if (!aadhaar || aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be 12 digits.' });
  }
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number.' });
  }
  const otp = generateOTP();
  const db = loadDB();
  db.otps[phone] = { otp, aadhaar, role, expires: Date.now() + 5 * 60 * 1000 };
  saveDB(db);
  console.log(`📱 OTP for +91${phone}: ${otp}`);
  res.json({ success: true, message: `OTP sent to +91-XXXXXX${phone.slice(-4)}`, demoOtp: otp });
});

// Verify OTP and get DigiLocker data
app.post('/api/auth/digilocker/verify', (req, res) => {
  const { phone, otp } = req.body;
  const db = loadDB();
  const stored = db.otps[phone];
  if (!stored) return res.status(400).json({ error: 'OTP not found. Please request again.' });
  if (Date.now() > stored.expires) {
    delete db.otps[phone]; saveDB(db);
    return res.status(400).json({ error: 'OTP expired. Please request again.' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  const userData = getMockDigiData(stored.aadhaar, stored.role);
  const aadhaarMasked = 'XXXX-XXXX-' + stored.aadhaar.slice(-4);
  delete db.otps[phone]; saveDB(db);
  res.json({ success: true, verified: true, data: { ...userData, aadhaarMasked, verifiedAt: new Date().toISOString() } });
});

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { phone, password, role, name, district, aadhaarMasked, digilockerData } = req.body;
  if (!phone || !password || !role || !name) return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const db = loadDB();
  const existing = db.users.find(u => u.phone === phone);
  if (existing) return res.status(400).json({ error: 'Phone number already registered. Please login.' });
  const passwordHash = await bcrypt.hash(password, 12);
  const userId = 'NR-' + (role === 'farmer' ? 'KA' : 'BUY') + '-' + Date.now().toString().slice(-6);
  const newUser = {
    id: userId, phone, passwordHash, role, name,
    district: district || (role === 'buyer' ? digilockerData?.city : digilockerData?.district) || 'Karnataka',
    aadhaarMasked: aadhaarMasked || '', digilockerData: digilockerData || {},
    verified: true, rating: 4.8, deals: 0, badge: role === 'farmer' ? 'Silver Farmer' : 'Verified Buyer',
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser); saveDB(db);
  const token = jwt.sign({ id: userId, phone, role, name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: userId, name, phone, role, district: newUser.district, badge: newUser.badge, rating: newUser.rating, digilockerData: digilockerData || {} } });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required.' });
  const db = loadDB();
  const user = db.users.find(u => u.phone === phone);
  if (!user) return res.status(401).json({ error: 'Phone number not registered. Please sign up first.' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role, district: user.district, badge: user.badge, rating: user.rating, deals: user.deals, digilockerData: user.digilockerData } });
});

// Get profile
app.get('/api/user/profile', authMiddleware, (req, res) => {
  const db = loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Logout
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Namma Raitha API', version: '2.0.0', aiEnabled: !!GEMINI_API_KEY }));

// ── AI ROUTES ─────────────────────────────────────────────────────────────────

// POST /api/ai/crop-advice
app.post('/api/ai/crop-advice', async (req, res) => {
  const { district, soilType, season, irrigation, landSize } = req.body;

  if (GEMINI_API_KEY) {
    const prompt = `You are an expert Karnataka agricultural AI advisor. Analyze these farm conditions and return JSON crop recommendations.

Farm Details:
- District: ${district || 'Dharwad'}
- Soil Type: ${soilType || 'Red Sandy'}
- Season: ${season || 'Kharif'}
- Irrigation: ${irrigation || 'Rainfed'}
- Land Size: ${landSize || 2.5} acres

Return ONLY valid JSON in this exact structure:
{
  "summary": "brief analysis of conditions",
  "topCrops": [
    {
      "name": "English crop name",
      "icon": "single emoji",
      "kannadaName": "Kannada name",
      "profitPerAcre": 55000,
      "yieldPerAcre": "15-18 qt",
      "risk": "Low|Medium|High",
      "aiScore": 92,
      "waterRequirement": "Low|Medium|High",
      "msPrice": "₹3,846/qt",
      "advice": "specific actionable advice"
    }
  ],
  "generalAdvice": "overall farm strategy",
  "weatherForecast": "brief weather note for this season",
  "aiConfidence": 88
}
Include exactly 3 crops in topCrops array. Focus on Karnataka-specific crops and local market conditions.`;

    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }

  // Fallback to smart mock
  const result = mockCropAdvice(district, soilType, season, irrigation, landSize);
  res.json({ success: true, fromAI: false, ...result });
});

// POST /api/ai/pest-diagnosis
app.post('/api/ai/pest-diagnosis', async (req, res) => {
  const { cropName, symptoms } = req.body;
  if (!cropName || !symptoms) {
    return res.status(400).json({ error: 'Crop name and symptoms are required.' });
  }

  if (GEMINI_API_KEY) {
    const prompt = `You are an expert plant pathologist and agricultural AI specializing in Karnataka, India crops. Diagnose this crop problem and return JSON.

Crop: ${cropName}
Symptoms described: ${symptoms}

Return ONLY valid JSON:
{
  "crop": "${cropName}",
  "symptoms": "${symptoms}",
  "diagnosis": {
    "name": "disease/pest name",
    "kannadaName": "Kannada name",
    "severity": "Low|Medium|High|Critical",
    "cause": "what is causing this",
    "treatment": ["step 1 with specific product/dose", "step 2", "step 3"],
    "prevention": ["prevention tip 1", "prevention tip 2", "prevention tip 3"],
    "timeToTreat": "urgency note"
  },
  "confidence": 85,
  "nearbyAgriOffice": "Contact: Krishi Vigyan Kendra — 1800-180-1551",
  "emergencyHelpline": "155333 (Karnataka Raita Samparka)"
}`;

    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }

  const result = mockPestDiagnosis(cropName, symptoms);
  res.json({ success: true, fromAI: false, ...result });
});

// POST /api/ai/market-insight
app.post('/api/ai/market-insight', async (req, res) => {
  const { cropName } = req.body;
  if (!cropName) return res.status(400).json({ error: 'Crop name is required.' });

  if (GEMINI_API_KEY) {
    const prompt = `You are an agricultural commodity market analyst for Karnataka, India. Analyze market conditions for ${cropName} and return JSON.

Return ONLY valid JSON:
{
  "crop": "${cropName}",
  "trend": "Rising|Falling|Stable",
  "forecast": "+5% over next 2 weeks",
  "sellAdvice": "specific actionable advice for Karnataka farmers",
  "bestMarket": "best APMC or mandi to sell",
  "avgPrice": "₹X,XXX/qt",
  "weekHigh": "₹X,XXX/qt",
  "weekLow": "₹X,XXX/qt",
  "demandScore": 78,
  "buyerCount": 12,
  "priceHistory": [
    {"month": "Jan", "price": 2800},
    {"month": "Feb", "price": 2900},
    {"month": "Mar", "price": 3000},
    {"month": "Apr", "price": 3100},
    {"month": "May", "price": 3200},
    {"month": "Jun", "price": 3400}
  ],
  "tip": "practical tip for getting best price"
}`;

    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }

  const result = mockMarketInsight(cropName);
  res.json({ success: true, fromAI: false, ...result });
});

app.listen(PORT, () => {
  console.log(`\n🌾 Namma Raitha API Server v2.0`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   AI Mode: ${GEMINI_API_KEY ? '🤖 Gemini AI LIVE' : '🔶 Smart Mock (add GEMINI_API_KEY to .env for real AI)'}`);
  console.log(`   Data stored at: ${DB_FILE}\n`);
});
