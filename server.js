import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import admin from 'firebase-admin';
import { districts as districtCatalog, cropRates as cropRateCatalog, marketItems as curatedMarketItems } from './src/data/appData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'namma_raitha_fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FAST2SMS_KEY = process.env.FAST2SMS_API_KEY || '';
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];
const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => trimTrailingSlash(origin.trim()))
  .filter(Boolean);
const allowedOrigins = new Set(
  [...defaultAllowedOrigins, ...envAllowedOrigins].map(trimTrailingSlash)
);
const allowedOriginPatterns = [
  /^https?:\/\/[a-z0-9-]+\.ngrok-free\.dev$/i,
  /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/[a-z0-9-]+\.onrender\.com$/i
];
const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = trimTrailingSlash(origin);
    const isAllowed =
      allowedOrigins.has(normalizedOrigin) ||
      allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin));

    if (isAllowed) {
      return callback(null, normalizedOrigin);
    }

    return callback(new Error(`Origin ${normalizedOrigin} not allowed by CORS`), false);
  },
  credentials: true
};

// ── FIREBASE ADMIN SDK ─────────────────────────────────────────────────────────
let db = null; // Firestore instance

try {
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey
      })
    });
    db = admin.firestore();
    console.log('🔥 Firebase Admin SDK connected — Firestore LIVE');
  } else {
    console.log('⚠️  Firebase Admin not configured — using local JSON fallback');
  }
} catch (err) {
  console.error('Firebase Admin init error:', err.message);
}

// ── FILE UPLOAD SETUP ──────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  }
});

// ── LOCAL JSON DB (users + OTPs only — fast, no Firestore needed) ─────────────
const DATA_DIR = join(__dirname, 'data');
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://127.0.0.1:5000';
const USERS_FILE = join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function readJSON(file, def) {
  if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(def, null, 2)); return def; }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return def; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function loadUsers() { return readJSON(USERS_FILE, { users: [], otps: {} }); }
function saveUsers(d) { writeJSON(USERS_FILE, d); }

// ── FIRESTORE HELPERS (with JSON file fallback) ───────────────────────────────
const ORDERS_FILE = join(DATA_DIR, 'orders.json');
const NOTIFICATIONS_FILE = join(DATA_DIR, 'notifications.json');
function loadOrders() { return readJSON(ORDERS_FILE, { orders: [] }); }
function saveOrders(d) { writeJSON(ORDERS_FILE, d); }
function loadNotifications() { return readJSON(NOTIFICATIONS_FILE, { notifications: [] }); }
function saveNotifications(d) { writeJSON(NOTIFICATIONS_FILE, d); }

// Save order to Firestore (and local JSON backup)
async function saveOrderToFirestore(order) {
  saveOrders((() => { const d = loadOrders(); const idx = d.orders.findIndex(o => o.id === order.id); if (idx >= 0) d.orders[idx] = order; else d.orders.push(order); return d; })());
  if (db) {
    try { await db.collection('orders').doc(order.id).set(order); } catch (e) { console.error('Firestore order save failed:', e.message); }
  }
}

// ── FIRESTORE USER DB HELPERS ──────────────────────────────────────────────────
async function getUserByPhone(phone) {
  if (db) {
    try {
      const snap = await db.collection('users').where('phone', '==', phone).get();
      if (!snap.empty) return snap.docs[0].data();
    } catch (e) { /* fallback */ }
  }
  return loadUsers().users.find(u => u.phone === phone) || null;
}

async function getUserById(id) {
  if (db) {
    try {
      const snap = await db.collection('users').doc(id).get();
      if (snap.exists) return snap.data();
    } catch (e) { /* fallback */ }
  }
  return loadUsers().users.find(u => u.id === id) || null;
}

async function getFarmersFromFirestore() {
  if (db) {
    try {
      const snap = await db.collection('users').where('role', '==', 'farmer').get();
      return snap.docs.map(d => d.data());
    } catch (e) { /* fallback */ }
  }
  const local = loadUsers();
  return local.users.filter(u => u.role === 'farmer');
}

async function saveUserToFirestore(user) {
  const udb = loadUsers();
  const idx = udb.users.findIndex(u => u.id === user.id);
  if (idx >= 0) udb.users[idx] = user; else udb.users.push(user);
  saveUsers(udb);
  if (db) {
    try { await db.collection('users').doc(user.id).set(user); } catch (e) { console.error('Firestore user save failed:', e.message); }
  }
}

// Save notification to Firestore (and local JSON backup)
async function saveNotifToFirestore(notif) {
  const d = loadNotifications(); d.notifications.push(notif); saveNotifications(d);
  if (db) {
    try { await db.collection('notifications').doc(notif.id).set(notif); } catch (e) { console.error('Firestore notif save failed:', e.message); }
  }
}

// Get orders from Firestore (with JSON fallback)
async function getOrdersFromFirestore(field, value) {
  if (db) {
    try {
      const snap = await db.collection('orders').where(field, '==', value).orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => d.data());
    } catch (e) { console.error('Firestore get orders failed:', e.message); }
  }
  const d = loadOrders();
  return d.orders.filter(o => o[field] === value).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get notifications from Firestore (with JSON fallback)
async function getNotifsFromFirestore(userId) {
  if (db) {
    try {
      const snap = await db.collection('notifications').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(50).get();
      return snap.docs.map(d => d.data());
    } catch (e) { console.error('Firestore get notifs failed:', e.message); }
  }
  const d = loadNotifications();
  return d.notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
}

// Update order in Firestore
async function updateOrderInFirestore(order) {
  await saveOrderToFirestore(order);
}

// Mark notification read in Firestore
async function markNotifReadInFirestore(notifId, userId) {
  // Update local
  const d = loadNotifications();
  const notif = d.notifications.find(n => n.id === notifId && n.userId === userId);
  if (notif) { notif.read = true; saveNotifications(d); }
  // Update Firestore
  if (db) {
    try { await db.collection('notifications').doc(notifId).update({ read: true }); } catch (e) { /* silent */ }
  }
}

async function markAllNotifsRead(userId) {
  // Local
  const d = loadNotifications();
  d.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
  saveNotifications(d);
  // Firestore batch
  if (db) {
    try {
      const snap = await db.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.update(doc.ref, { read: true }));
      await batch.commit();
    } catch (e) { /* silent */ }
  }
}

async function addNotification(userId, notification) {
  const notif = { id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), userId, timestamp: new Date().toISOString(), read: false, ...notification };
  await saveNotifToFirestore(notif);
  return notif;
}

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '20mb' }));

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), port: PORT }));

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// ── SMS NOTIFICATION SERVICE ───────────────────────────────────────────────────
async function sendSMS(phone, message) {
  if (!SMS_ENABLED || !FAST2SMS_KEY || FAST2SMS_KEY === 'your_fast2sms_key_here') {
    console.log(`📱 [SMS SIMULATION] To +91${phone}: ${message}`);
    return { success: true, mock: true };
  }
  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: FAST2SMS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: phone
      })
    });
    const data = await response.json();
    console.log(`📱 SMS sent to +91${phone}:`, data);
    return { success: true, data };
  } catch (err) {
    console.error('SMS sending failed:', err.message);
    return { success: false, error: err.message };
  }
}


// ── GEMINI AI HELPERS ─────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.0-flash-lite';  // free, fast, multimodal
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simple in-memory cache (5 minute TTL) to reduce API calls
const aiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = aiCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  aiCache.set(key, { data, ts: Date.now() });
  // Clear old entries periodically
  if (aiCache.size > 100) {
    const cutoff = Date.now() - CACHE_TTL;
    for (const [k, v] of aiCache.entries()) { if (v.ts < cutoff) aiCache.delete(k); }
  }
}

// Retry fetch with exponential backoff on 429
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    if (attempt < maxRetries) {
      const waitMs = Math.pow(2, attempt) * 2000; // 2s, 4s
      console.log(`⏳ Gemini rate limited (429). Retrying in ${waitMs / 1000}s...`);
      await new Promise(r => setTimeout(r, waitMs));
    } else {
      console.log('❌ Gemini 429 exhausted retries — using fallback');
      return res; // return the 429 response so caller knows
    }
  }
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DISTRICT_ALIASES = {
  bangalore: 'Bengaluru Urban',
  'bangalore urban': 'Bengaluru Urban',
  'bangalore rural': 'Bengaluru Rural',
  bellary: 'Ballari',
  mangalore: 'Dakshina Kannada',
  mysore: 'Mysuru'
};
const GOVERNMENT_SCHEMES = [
  {
    key: 'pm-kisan',
    name: 'PM-KISAN',
    benefit: 'Income support of ₹6,000/year',
    applyAt: 'Gram Panchayat or pmkisan.gov.in',
    tags: ['general', 'income', 'farmer']
  },
  {
    key: 'pmfby',
    name: 'PMFBY Crop Insurance',
    benefit: 'Weather and crop-loss insurance from 1.5%-2% premium',
    applyAt: 'Bank, CSC, or agricoop.nic.in',
    tags: ['risk', 'insurance', 'weather', 'crop', 'disease', 'pest']
  },
  {
    key: 'krishi-bhagya',
    name: 'Krishi Bhagya',
    benefit: 'Karnataka subsidy for farm ponds and micro-irrigation',
    applyAt: 'Nearest Raita Samparka Kendra',
    tags: ['water', 'irrigation', 'drip', 'rainfed', 'borewell']
  },
  {
    key: 'pm-kusum',
    name: 'PM-KUSUM',
    benefit: 'Solar pump subsidy support',
    applyAt: 'KREDL / DISCOM facilitation center',
    tags: ['water', 'pump', 'energy', 'irrigation']
  },
  {
    key: 'kcc',
    name: 'Kisan Credit Card',
    benefit: 'Working-capital loan up to ₹3 lakh',
    applyAt: 'Banks and cooperative societies',
    tags: ['credit', 'loan', 'seed', 'fertilizer', 'input']
  },
  {
    key: 'rsk',
    name: 'Raita Samparka Kendra',
    benefit: 'Free soil testing and pest guidance',
    applyAt: 'Taluk agriculture office / RSK center',
    tags: ['soil', 'testing', 'pest', 'disease', 'fertilizer', 'support']
  },
  {
    key: 'e-nam',
    name: 'e-NAM',
    benefit: 'Online mandi access and wider buyer reach',
    applyAt: 'enam.gov.in or APMC facilitation desk',
    tags: ['market', 'sell', 'buyer', 'price', 'msp', 'trade']
  }
];
const SCHEME_BY_KEY = Object.fromEntries(GOVERNMENT_SCHEMES.map((scheme) => [scheme.key, scheme]));
const CROP_PROFILES = {
  Ragi: {
    name: 'Ragi',
    icon: '🌾',
    kannadaName: 'ರಾಗಿ',
    yieldPerAcre: '15-18 qt',
    baseProfitPerAcre: 55000,
    waterRequirement: 'Low',
    risk: 'Low',
    idealSoils: ['Red Sandy', 'Red Loamy'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed', 'Drip'],
    rainfallBand: 'low',
    bestDistricts: ['Dharwad', 'Gadag', 'Tumakuru', 'Chitradurga'],
    priceRef: '₹3,846/qt',
    keyAdvice: 'Drought-tolerant and dependable for dryland Karnataka.'
  },
  Paddy: {
    name: 'Paddy',
    icon: '🌾',
    kannadaName: 'ಭತ್ತ',
    yieldPerAcre: '22-28 qt',
    baseProfitPerAcre: 62000,
    waterRequirement: 'High',
    risk: 'Medium',
    idealSoils: ['Alluvial', 'Black Loamy', 'Red Laterite'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Canal', 'Borewell'],
    rainfallBand: 'high',
    bestDistricts: ['Mandya', 'Mysuru', 'Shivamogga', 'Davangere'],
    priceRef: '₹2,183/qt',
    keyAdvice: 'Strong fit where canal water or reliable borewell supply is available.'
  },
  Maize: {
    name: 'Maize',
    icon: '🌽',
    kannadaName: 'ಮೆಕ್ಕೆಜೋಳ',
    yieldPerAcre: '25-35 qt',
    baseProfitPerAcre: 52000,
    waterRequirement: 'Medium',
    risk: 'Medium',
    idealSoils: ['Red Sandy', 'Black Cotton', 'Alluvial'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed', 'Canal', 'Borewell'],
    rainfallBand: 'medium',
    bestDistricts: ['Ballari', 'Davangere', 'Shivamogga', 'Belagavi'],
    priceRef: '₹1,962/qt',
    keyAdvice: 'Good feed demand and flexible across several Karnataka belts.'
  },
  Groundnut: {
    name: 'Groundnut',
    icon: '🥜',
    kannadaName: 'ಕಡಲೆಕಾಯಿ',
    yieldPerAcre: '8-10 qt',
    baseProfitPerAcre: 48000,
    waterRequirement: 'Low',
    risk: 'Low',
    idealSoils: ['Red Sandy', 'Alluvial'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed', 'Drip'],
    rainfallBand: 'low',
    bestDistricts: ['Tumakuru', 'Chitradurga', 'Koppal', 'Dharwad'],
    priceRef: '₹5,890/qt',
    keyAdvice: 'Low-water oilseed option with manageable input costs.'
  },
  Sunflower: {
    name: 'Sunflower',
    icon: '🌻',
    kannadaName: 'ಸೂರ್ಯಕಾಂತಿ',
    yieldPerAcre: '7-9 qt',
    baseProfitPerAcre: 43000,
    waterRequirement: 'Low',
    risk: 'Low',
    idealSoils: ['Red Sandy', 'Black Cotton'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed', 'Drip'],
    rainfallBand: 'low',
    bestDistricts: ['Vijayapura', 'Bagalkot', 'Gadag'],
    priceRef: '₹5,440/qt',
    keyAdvice: 'Useful diversification crop where moisture is limited.'
  },
  Cotton: {
    name: 'Cotton',
    icon: '🌸',
    kannadaName: 'ಹತ್ತಿ',
    yieldPerAcre: '12-15 qt',
    baseProfitPerAcre: 68000,
    waterRequirement: 'Medium',
    risk: 'Medium',
    idealSoils: ['Black Cotton'],
    seasons: ['Kharif'],
    irrigationFit: ['Rainfed', 'Drip'],
    rainfallBand: 'low',
    bestDistricts: ['Dharwad', 'Haveri', 'Gadag', 'Ballari'],
    priceRef: '₹7,121/qt',
    keyAdvice: 'Best suited to black soils when sowing follows steady early monsoon rain.'
  },
  Jowar: {
    name: 'Jowar',
    icon: '🌿',
    kannadaName: 'ಜೋಳ',
    yieldPerAcre: '10-14 qt',
    baseProfitPerAcre: 39000,
    waterRequirement: 'Low',
    risk: 'Low',
    idealSoils: ['Black Cotton', 'Red Sandy'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed'],
    rainfallBand: 'low',
    bestDistricts: ['Vijayapura', 'Kalaburagi', 'Bidar'],
    priceRef: '₹3,180/qt',
    keyAdvice: 'A hardy cereal that protects yield when rainfall is uncertain.'
  },
  Coffee: {
    name: 'Coffee',
    icon: '☕',
    kannadaName: 'ಕಾಫಿ',
    yieldPerAcre: '9-12 qt',
    baseProfitPerAcre: 90000,
    waterRequirement: 'Medium',
    risk: 'Medium',
    idealSoils: ['Laterite', 'Red Laterite'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Rainfed', 'Drip'],
    rainfallBand: 'high',
    bestDistricts: ['Kodagu', 'Chikkamagaluru', 'Hassan'],
    priceRef: '₹12,600/qt',
    keyAdvice: 'High-value perennial crop for Western Ghats belts with sustained moisture.'
  },
  Chilli: {
    name: 'Chilli',
    icon: '🌶',
    kannadaName: 'ಮೆಣಸಿನಕಾಯಿ',
    yieldPerAcre: '10-12 qt',
    baseProfitPerAcre: 75000,
    waterRequirement: 'Medium',
    risk: 'High',
    idealSoils: ['Red Sandy', 'Laterite'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Drip', 'Borewell'],
    rainfallBand: 'medium',
    bestDistricts: ['Haveri', 'Dharwad', 'Ballari'],
    priceRef: '₹8,200/qt',
    keyAdvice: 'Strong premium crop when irrigation and pest monitoring are disciplined.'
  },
  Coconut: {
    name: 'Coconut',
    icon: '🥥',
    kannadaName: 'ತೆಂಗು',
    yieldPerAcre: '7,000-9,000 nuts',
    baseProfitPerAcre: 70000,
    waterRequirement: 'Medium',
    risk: 'Low',
    idealSoils: ['Laterite', 'Alluvial'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Borewell', 'Canal'],
    rainfallBand: 'high',
    bestDistricts: ['Dakshina Kannada', 'Udupi', 'Kodagu'],
    priceRef: '₹28/pc',
    keyAdvice: 'Steady cash crop for coastal and high-rainfall belts.'
  },
  Sugarcane: {
    name: 'Sugarcane',
    icon: '🎋',
    kannadaName: 'ಕಬ್ಬು',
    yieldPerAcre: '35-45 ton',
    baseProfitPerAcre: 78000,
    waterRequirement: 'High',
    risk: 'High',
    idealSoils: ['Alluvial', 'Black Loamy'],
    seasons: ['Kharif', 'Rabi'],
    irrigationFit: ['Canal', 'Borewell'],
    rainfallBand: 'high',
    bestDistricts: ['Mandya', 'Belagavi', 'Mysuru'],
    priceRef: '₹3,150/qt',
    keyAdvice: 'Profitable where irrigation is assured and transport logistics are strong.'
  }
};
const CROP_ALIAS_MAP = {
  chilli: 'Chilli',
  chilies: 'Chilli',
  chilly: 'Chilli',
  coffee: 'Coffee',
  coconut: 'Coconut',
  corn: 'Maize',
  cotton: 'Cotton',
  'finger millet': 'Ragi',
  'ground nut': 'Groundnut',
  groundnut: 'Groundnut',
  jowar: 'Jowar',
  maize: 'Maize',
  millet: 'Ragi',
  paddy: 'Paddy',
  ragi: 'Ragi',
  rice: 'Paddy',
  sugarcane: 'Sugarcane',
  sunflower: 'Sunflower'
};
const SOIL_CROP_CANDIDATES = {
  'Alluvial': ['Paddy', 'Sugarcane', 'Maize', 'Groundnut'],
  'Black Cotton': ['Cotton', 'Maize', 'Jowar', 'Groundnut', 'Paddy'],
  'Laterite': ['Coffee', 'Coconut', 'Paddy', 'Chilli'],
  'Red Sandy': ['Ragi', 'Groundnut', 'Maize', 'Sunflower', 'Chilli']
};

function normalizeSearch(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function canonicalCropName(value = '') {
  const normalized = normalizeSearch(value);
  if (!normalized) return null;
  if (CROP_ALIAS_MAP[normalized]) return CROP_ALIAS_MAP[normalized];
  return Object.keys(CROP_PROFILES).find((cropName) => normalizeSearch(cropName) === normalized) || null;
}

function extractCropMention(text = '') {
  const normalized = normalizeSearch(text);
  if (!normalized) return null;
  for (const cropName of Object.keys(CROP_PROFILES)) {
    if (normalized.includes(normalizeSearch(cropName))) return cropName;
  }
  for (const [alias, cropName] of Object.entries(CROP_ALIAS_MAP)) {
    if (normalized.includes(alias)) return cropName;
  }
  return null;
}

function normalizeDistrictKey(value = '') {
  const normalized = normalizeSearch(value);
  return DISTRICT_ALIASES[normalized] ? normalizeSearch(DISTRICT_ALIASES[normalized]) : normalized;
}

function findDistrictIntel(districtName = '') {
  const normalized = normalizeDistrictKey(districtName);
  if (!normalized) return null;
  return districtCatalog.find((district) => {
    const candidate = normalizeDistrictKey(district.name);
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  }) || null;
}

function parseAmount(value) {
  const parsed = parseFloat(String(value ?? '').replace(/,/g, '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRupees(value, suffix = '') {
  if (!Number.isFinite(value)) return `₹0${suffix}`;
  return `₹${Math.round(value).toLocaleString('en-IN')}${suffix}`;
}

function normalizePriceLabel(value, fallbackSuffix = '/qt') {
  if (!value) return `₹0${fallbackSuffix}`;
  const label = String(value).trim();
  return label.includes('/') ? label : `${label}${fallbackSuffix}`;
}

function rainfallBandFromValue(value) {
  const rainfall = parseAmount(value);
  if (!Number.isFinite(rainfall)) return 'medium';
  if (rainfall >= 1800) return 'high';
  if (rainfall <= 800) return 'low';
  return 'medium';
}

function resolveSoilFamily(soilType = '', districtIntel = null) {
  const source = normalizeSearch(soilType || districtIntel?.type || '');
  if (source.includes('black')) return 'Black Cotton';
  if (source.includes('laterite')) return 'Laterite';
  if (source.includes('alluvial')) return 'Alluvial';
  return 'Red Sandy';
}

function resolveSeason(season = '') {
  const normalized = normalizeSearch(season);
  if (normalized.includes('rabi')) return 'Rabi';
  if (normalized.includes('zaid')) return 'Zaid';
  return 'Kharif';
}

function resolveIrrigation(irrigation = '') {
  const normalized = normalizeSearch(irrigation);
  if (normalized.includes('drip')) return 'Drip';
  if (normalized.includes('canal')) return 'Canal';
  if (normalized.includes('bore')) return 'Borewell';
  return 'Rainfed';
}

function getRateEntry(cropName) {
  const canonical = canonicalCropName(cropName) || cropName;
  return cropRateCatalog.find((entry) => {
    const candidate = canonicalCropName(entry.name) || entry.name;
    return normalizeSearch(candidate) === normalizeSearch(canonical);
  }) || null;
}

function parseMarketItemDistrict(name = '') {
  const parts = String(name).split(/[—-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[1].split(' ')[0] || parts[1];
}

function mapCuratedListing(item) {
  const cropName = extractCropMention(item.name) || item.name.split(/[—-]/)[0].trim();
  const farmerBits = String(item.detail || '').split('·').map((part) => part.trim()).filter(Boolean);
  return {
    source: 'curated',
    active: true,
    cropName: canonicalCropName(cropName) || cropName,
    displayName: item.name,
    district: parseMarketItemDistrict(item.name),
    farmerName: farmerBits[1] || 'Marketplace listing',
    price: parseAmount(item.price),
    priceLabel: `${item.price}${item.unit || ''}`,
    quantityLabel: farmerBits[0] || '',
    qualityLabel: farmerBits[2] || ''
  };
}

async function getMarketplaceSnapshots() {
  const farmers = await getFarmersFromFirestore();
  const liveListings = farmers.flatMap((farmer) => {
    if (!farmer.listings?.length) return [];
    return farmer.listings
      .filter((listing) => listing.active !== false)
      .map((listing) => ({
        source: 'farmer',
        active: true,
        cropName: canonicalCropName(listing.cropName) || listing.cropName,
        displayName: `${listing.cropName} — ${farmer.district || 'Karnataka'} farmer listing`,
        district: farmer.district,
        farmerName: farmer.name,
        price: parseAmount(listing.price),
        priceLabel: formatRupees(parseAmount(listing.price), `/${listing.unit || 'qt'}`),
        quantityLabel: `${listing.quantity} ${listing.unit || 'qt'}`,
        qualityLabel: listing.description || ''
      }));
  });
  return [
    ...liveListings,
    ...curatedMarketItems.map(mapCuratedListing)
  ];
}

function filterMarketplaceSnapshots(listings, cropName) {
  if (!cropName) return listings.slice(0, 4);
  const canonical = canonicalCropName(cropName) || cropName;
  return listings.filter((listing) => {
    const listingCrop = canonicalCropName(listing.cropName) || listing.cropName;
    return normalizeSearch(listingCrop) === normalizeSearch(canonical) ||
      normalizeSearch(listing.displayName).includes(normalizeSearch(canonical));
  });
}

function getRelevantSchemes({ query = '', cropName = '', irrigation = '', soilType = '', symptoms = '' }) {
  const contextText = normalizeSearch([query, cropName, irrigation, soilType, symptoms].filter(Boolean).join(' '));
  const pickedKeys = [];
  const pick = (key) => {
    if (SCHEME_BY_KEY[key] && !pickedKeys.includes(key)) pickedKeys.push(key);
  };

  pick('pm-kisan');
  pick('pmfby');

  if (/water|irrig|drip|rain|pond|bore|pump/.test(contextText)) {
    pick('krishi-bhagya');
    pick('pm-kusum');
  }
  if (/soil|test|yellow|nutrient|fertili|pest|disease|leaf|spray/.test(contextText)) {
    pick('rsk');
  }
  if (/loan|credit|seed|input|fertili|pesticide|cost/.test(contextText)) {
    pick('kcc');
  }
  if (/market|sell|buyer|price|msp|trade/.test(contextText)) {
    pick('e-nam');
  }

  return pickedKeys.slice(0, 3).map((key) => SCHEME_BY_KEY[key]);
}

function buildDistrictSummary(districtIntel) {
  if (!districtIntel) return '';
  return `${districtIntel.name}: ${districtIntel.type} soil belt, ${districtIntel.rain} annual rainfall, typical borewell depth ${districtIntel.depth}. ${districtIntel.guide}`;
}

function buildWeatherNote({ districtIntel, season, irrigation }) {
  const districtName = districtIntel?.name || 'your district';
  const rainfallBand = rainfallBandFromValue(districtIntel?.rain);
  const seasonName = resolveSeason(season);
  const irrigationType = resolveIrrigation(irrigation);

  if (seasonName === 'Kharif' && irrigationType === 'Rainfed' && rainfallBand === 'low') {
    return `Rainfed Kharif in ${districtName} looks moisture-sensitive. Sow only after 2-3 soaking rains and prioritize drought-tolerant crops.`;
  }
  if (seasonName === 'Kharif' && rainfallBand === 'high') {
    return `${districtName} usually benefits from strong monsoon recharge in Kharif, but leaf disease pressure can rise quickly after repeated showers.`;
  }
  if (seasonName === 'Rabi' && irrigationType !== 'Rainfed') {
    return `Rabi planning in ${districtName} is favorable when irrigation is assured. Protect moisture at flowering and grain-fill stages.`;
  }
  return `Monitor local rain timing in ${districtName} and align sowing with moisture availability rather than calendar alone.`;
}

function buildMarketPulse(cropName, rateEntry, listings) {
  if (!cropName) return '';
  const normalizedPrice = normalizePriceLabel(rateEntry?.price || CROP_PROFILES[cropName]?.priceRef || '₹0');
  const trend = rateEntry?.change ? ` (${rateEntry.change})` : '';
  const listingNote = listings.length
    ? `${listings.length} marketplace listing${listings.length > 1 ? 's' : ''} visible`
    : 'no active marketplace listing yet';
  return `${cropName} is trading around ${normalizedPrice}${trend}, with ${listingNote}.`;
}

async function getOptionalRequestUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return await getUserById(payload.id);
  } catch {
    return null;
  }
}

async function buildFarmIntelligence({
  req,
  district,
  soilType,
  season,
  irrigation,
  landSize,
  cropName,
  query,
  symptoms
}) {
  const user = await getOptionalRequestUser(req);
  const resolvedDistrict = district || user?.district || user?.digilockerData?.district || user?.digilockerData?.city || 'Karnataka';
  const districtIntel = findDistrictIntel(resolvedDistrict);
  const soilFamily = resolveSoilFamily(soilType, districtIntel);
  const seasonName = resolveSeason(season);
  const irrigationType = resolveIrrigation(irrigation);
  const landAcres = parseAmount(landSize) ?? parseAmount(user?.digilockerData?.land);
  const resolvedCrop = canonicalCropName(cropName) || extractCropMention(query) || extractCropMention(symptoms);
  const cropProfile = resolvedCrop ? CROP_PROFILES[resolvedCrop] : null;
  const allListings = await getMarketplaceSnapshots();
  const listings = filterMarketplaceSnapshots(allListings, resolvedCrop);
  const rateEntry = resolvedCrop ? getRateEntry(resolvedCrop) : null;
  const schemes = getRelevantSchemes({
    query,
    cropName: resolvedCrop,
    irrigation: irrigationType,
    soilType: soilFamily,
    symptoms
  });
  const districtSummary = buildDistrictSummary(districtIntel);
  const weatherNote = buildWeatherNote({ districtIntel, season: seasonName, irrigation: irrigationType });
  const marketPulse = buildMarketPulse(resolvedCrop, rateEntry, listings);
  const schemeSummaries = schemes.map((scheme) => `${scheme.name}: ${scheme.benefit}`);
  const integrationSources = [
    user ? 'user_profile' : null,
    districtIntel ? 'district_intelligence' : null,
    rateEntry ? 'rate_board' : null,
    listings.length ? 'marketplace_listings' : null,
    schemes.length ? 'government_schemes' : null
  ].filter(Boolean);
  const userSummary = user
    ? `${user.name} (${user.role}) from ${user.district || resolvedDistrict}${landAcres ? ` with ${landAcres} acres` : ''}`
    : 'Guest farmer profile';

  const contextText = [
    `Farmer profile: ${userSummary}`,
    `Farm setup: district=${resolvedDistrict}, soil=${soilFamily}, season=${seasonName}, irrigation=${irrigationType}, land=${landAcres || 'unknown'} acres`,
    districtSummary ? `District intelligence: ${districtSummary}` : '',
    cropProfile ? `Crop focus: ${cropProfile.name} (${cropProfile.kannadaName}), yield ${cropProfile.yieldPerAcre}, price reference ${normalizePriceLabel(rateEntry?.price || cropProfile.priceRef)}` : '',
    marketPulse ? `Market pulse: ${marketPulse}` : '',
    listings.length ? `Marketplace examples: ${listings.slice(0, 3).map((listing) => `${listing.displayName} @ ${listing.priceLabel}`).join(' | ')}` : '',
    schemeSummaries.length ? `Scheme fit: ${schemeSummaries.join(' | ')}` : '',
    symptoms ? `Reported issue: ${symptoms}` : ''
  ].filter(Boolean).join('\n');

  return {
    user,
    resolvedDistrict,
    districtIntel,
    soilFamily,
    seasonName,
    irrigationType,
    landAcres,
    resolvedCrop,
    cropProfile,
    allListings,
    listings,
    rateEntry,
    schemes,
    districtSummary,
    weatherNote,
    marketPulse,
    schemeSummaries,
    integrationSources,
    contextText
  };
}

function scoreCropRecommendation(profile, intelligence) {
  const districtName = intelligence.districtIntel?.name;
  const rainfallBand = rainfallBandFromValue(intelligence.districtIntel?.rain);
  const irrigationType = intelligence.irrigationType;
  const rateEntry = getRateEntry(profile.name);
  const listingCount = filterMarketplaceSnapshots(intelligence.allListings || [], profile.name).length;
  let score = 60;

  if (profile.idealSoils.some((soil) => normalizeSearch(soil) === normalizeSearch(intelligence.soilFamily))) score += 12;
  if (profile.seasons.includes(intelligence.seasonName)) score += 9;
  if (profile.irrigationFit.includes(irrigationType)) score += 8;
  if (districtName && profile.bestDistricts.includes(districtName)) score += 7;
  if (profile.rainfallBand === rainfallBand) score += 6;
  if (rateEntry?.up) score += 5;
  if (rateEntry && rateEntry.up === false) score -= 3;
  if (listingCount > 0) score += Math.min(6, listingCount * 2);
  if (intelligence.landAcres && intelligence.landAcres <= 3 && profile.risk === 'Low') score += 4;
  if (intelligence.landAcres && intelligence.landAcres >= 5 && profile.baseProfitPerAcre >= 70000) score += 3;

  return Math.max(62, Math.min(96, score));
}

function getCandidateCropNames(intelligence) {
  const candidates = new Set(SOIL_CROP_CANDIDATES[intelligence.soilFamily] || SOIL_CROP_CANDIDATES['Red Sandy']);
  const rainfallBand = rainfallBandFromValue(intelligence.districtIntel?.rain);

  if (rainfallBand === 'high') ['Coffee', 'Coconut', 'Paddy'].forEach((crop) => candidates.add(crop));
  if (rainfallBand === 'low') ['Ragi', 'Groundnut', 'Cotton', 'Sunflower', 'Jowar'].forEach((crop) => candidates.add(crop));
  if (intelligence.irrigationType === 'Rainfed') ['Ragi', 'Groundnut', 'Sunflower', 'Jowar'].forEach((crop) => candidates.add(crop));
  if (intelligence.irrigationType === 'Canal' || intelligence.irrigationType === 'Borewell') ['Paddy', 'Maize', 'Sugarcane'].forEach((crop) => candidates.add(crop));
  if (intelligence.irrigationType === 'Drip') ['Cotton', 'Chilli', 'Groundnut'].forEach((crop) => candidates.add(crop));
  if (intelligence.resolvedCrop) candidates.add(intelligence.resolvedCrop);

  return [...candidates].filter((cropName) => CROP_PROFILES[cropName]);
}

function buildIntegratedCropAdvice(intelligence) {
  const rankedCrops = getCandidateCropNames(intelligence)
    .map((cropName) => ({ profile: CROP_PROFILES[cropName], score: scoreCropRecommendation(CROP_PROFILES[cropName], intelligence) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const topCrop = rankedCrops[0];
  const farmPrefix = intelligence.user
    ? `${intelligence.user.name}'s ${intelligence.landAcres || 'planned'}-acre farm`
    : `${intelligence.landAcres || 'This'}-acre farm`;
  const marketBlend = rankedCrops.map(({ profile }) => buildMarketPulse(profile.name, getRateEntry(profile.name), filterMarketplaceSnapshots(intelligence.allListings || [], profile.name))).filter(Boolean);

  return {
    summary: `${farmPrefix} in ${intelligence.resolvedDistrict} with ${intelligence.soilFamily} soil and ${intelligence.irrigationType.toLowerCase()} irrigation is best aligned to ${rankedCrops.map(({ profile }) => profile.name).join(', ')}.`,
    topCrops: rankedCrops.map(({ profile, score }) => {
      const rateEntry = getRateEntry(profile.name);
      const listingCount = filterMarketplaceSnapshots(intelligence.allListings || [], profile.name).length;
      const priceLabel = normalizePriceLabel(rateEntry?.price || profile.priceRef, profile.name === 'Coconut' ? '/pc' : '/qt');

      return {
        name: profile.name,
        icon: profile.icon,
        kannadaName: profile.kannadaName,
        profitPerAcre: rateEntry?.up ? profile.baseProfitPerAcre + 4000 : profile.baseProfitPerAcre,
        yieldPerAcre: profile.yieldPerAcre,
        risk: profile.risk,
        aiScore: score,
        waterRequirement: profile.waterRequirement,
        msPrice: priceLabel,
        advice: `${profile.keyAdvice} ${intelligence.districtIntel ? `${intelligence.districtIntel.name} conditions are a ${profile.bestDistricts.includes(intelligence.districtIntel.name) ? 'natural fit' : 'workable fit'} for it.` : ''}${listingCount ? ` ${listingCount} marketplace signal${listingCount > 1 ? 's' : ''} support buyer interest.` : ''}`.trim()
      };
    }),
    generalAdvice: [
      intelligence.districtSummary,
      marketBlend[0] || intelligence.marketPulse,
      intelligence.schemeSummaries.length ? `Best support programs: ${intelligence.schemeSummaries.join(' | ')}` : ''
    ].filter(Boolean).join(' '),
    weatherForecast: intelligence.weatherNote,
    aiConfidence: topCrop?.score || 84,
    districtInsight: intelligence.districtSummary,
    marketPulse: marketBlend.join(' | ') || intelligence.marketPulse,
    recommendedSchemes: intelligence.schemeSummaries,
    integrations: intelligence.integrationSources
  };
}

function buildIntegratedPestDiagnosis(cropName, symptoms, intelligence) {
  const resolvedCrop = canonicalCropName(cropName) || intelligence.resolvedCrop || cropName;
  const symptomText = normalizeSearch(symptoms);
  let diagnosis;

  if (/yellow|pale|chlor/.test(symptomText)) {
    diagnosis = {
      name: 'Nutrient Deficiency / Chlorosis',
      kannadaName: 'ಪೋಷಕಾಂಶ ಕೊರತೆ',
      severity: 'Medium',
      cause: `${intelligence.soilFamily} soil may be short on immediately available nitrogen or iron.`,
      treatment: [
        'Apply urea 25-30 kg/acre in split dose after light irrigation or rain.',
        'Spray Ferrous Sulphate 0.5% if young leaves stay pale.',
        'Book a soil test before the next fertilizer round to balance NPK accurately.'
      ],
      prevention: [
        'Use balanced basal fertilizer instead of urea alone.',
        'Get soil testing support from the nearest Raita Samparka Kendra.'
      ],
      timeToTreat: '7-10 days for visible recovery if addressed quickly'
    };
  } else if (/spot|blight|brown|fung|leaf/.test(symptomText)) {
    diagnosis = {
      name: 'Fungal Leaf Disease',
      kannadaName: 'ಶಿಲೀಂಧ್ರ ರೋಗ',
      severity: 'High',
      cause: `${resolvedCrop} is showing symptoms consistent with fungal infection, which rises after repeated leaf wetness.`,
      treatment: [
        'Spray Mancozeb 2.5 g/L or a locally recommended fungicide immediately.',
        'Remove heavily infected leaves and improve air circulation in the field.',
        'Avoid overhead irrigation until the spread slows down.'
      ],
      prevention: [
        'Do not let the canopy stay wet overnight for several days.',
        'Use clean seed material and rotate away from the same crop next cycle.'
      ],
      timeToTreat: 'Act within 3-5 days to avoid yield loss'
    };
  } else if (/hole|borer|chew|cut|dead heart/.test(symptomText)) {
    diagnosis = {
      name: 'Possible Stem Borer / Chewing Pest',
      kannadaName: 'ಕಾಂಡ ಕೊರೆತ ಕೀಟ',
      severity: 'High',
      cause: 'Chewing damage or stem-entry pest activity is likely.',
      treatment: [
        'Inspect 20 plants across the field to confirm fresh entry holes.',
        'Use a locally approved stem-borer control product at label dose.',
        'Remove badly damaged tillers to reduce further spread.'
      ],
      prevention: [
        'Install pheromone traps for early pest monitoring.',
        'Avoid excessive nitrogen that attracts soft, pest-prone growth.'
      ],
      timeToTreat: 'Treat within 48 hours if fresh damage is increasing'
    };
  } else {
    diagnosis = {
      name: 'General Crop Stress',
      kannadaName: 'ಸಾಮಾನ್ಯ ಬೆಳೆ ಒತ್ತಡ',
      severity: 'Low',
      cause: `The symptoms suggest non-specific stress in ${resolvedCrop}, often linked to moisture, nutrient imbalance, or early pest pressure.`,
      treatment: [
        'Check root-zone moisture and irrigation timing.',
        'Inspect the underside of leaves for sucking pests.',
        'Apply a balanced micronutrient spray if no clear pest is found.'
      ],
      prevention: [
        'Walk the field twice a week to catch changes early.',
        'Keep fertilizer and irrigation decisions tied to soil-test results.'
      ],
      timeToTreat: 'Reassess in 3-5 days after corrective action'
    };
  }

  return {
    crop: resolvedCrop,
    symptoms,
    diagnosis,
    confidence: diagnosis.severity === 'High' ? 88 : 82,
    nearbyAgriOffice: intelligence.districtIntel
      ? `Raita Samparka Kendra, ${intelligence.districtIntel.name} — 1800-180-1551`
      : 'Krishi Vigyan Kendra — 1800-180-1551',
    emergencyHelpline: '155333 (Karnataka Raita Samparka)',
    districtAdvice: intelligence.districtSummary,
    recommendedSchemes: intelligence.schemeSummaries,
    integrations: intelligence.integrationSources
  };
}

function buildIntegratedMarketInsight(cropName, intelligence) {
  const resolvedCrop = canonicalCropName(cropName) || intelligence.resolvedCrop || cropName;
  const profile = CROP_PROFILES[resolvedCrop] || {
    name: resolvedCrop,
    priceRef: '₹2,500/qt',
    baseProfitPerAcre: 45000
  };
  const rateEntry = getRateEntry(resolvedCrop);
  const listings = filterMarketplaceSnapshots(intelligence.allListings || [], resolvedCrop);
  const currentPrice = parseAmount(rateEntry?.price || profile.priceRef) || 2500;
  const trend = rateEntry ? (rateEntry.up ? 'Rising' : 'Falling') : 'Stable';
  const pctMove = parseAmount(rateEntry?.change) || (trend === 'Rising' ? 3 : trend === 'Falling' ? 2 : 1);
  const direction = trend === 'Rising' ? 1 : trend === 'Falling' ? -1 : 0;
  const demandScore = Math.min(96, 68 + (rateEntry?.up ? 8 : trend === 'Stable' ? 5 : 1) + listings.length * 4);

  return {
    crop: resolvedCrop,
    trend,
    forecast: `${direction >= 0 ? '+' : '-'}${Math.max(1, pctMove).toFixed(0)}%`,
    sellAdvice: trend === 'Rising'
      ? `Stagger sales of ${resolvedCrop} over the next 1-2 market cycles to capture improving bids.`
      : trend === 'Falling'
        ? `Sell high-quality lots quickly and avoid holding weak-quality stock for too long.`
        : 'Prices look steady, so focus on grading and timing rather than waiting for a big move.',
    bestMarket: listings.length
      ? listings.slice(0, 2).map((listing) => listing.district ? `${listing.district} APMC` : listing.displayName).join(' · ')
      : `${intelligence.resolvedDistrict} APMC`,
    avgPrice: normalizePriceLabel(rateEntry?.price || profile.priceRef, profile.name === 'Coconut' ? '/pc' : '/qt'),
    weekHigh: formatRupees(currentPrice * (1.05 + Math.max(direction, 0) * 0.02), profile.name === 'Coconut' ? '/pc' : '/qt'),
    weekLow: formatRupees(currentPrice * (0.95 - Math.min(direction, 0) * 0.02), profile.name === 'Coconut' ? '/pc' : '/qt'),
    demandScore,
    buyerCount: Math.max(6, listings.length * 3 + (trend === 'Rising' ? 8 : 5)),
    priceHistory: MONTH_LABELS.map((month, index) => {
      const multiplier = 0.88 + (index / 12) * (trend === 'Rising' ? 0.18 : trend === 'Falling' ? 0.08 : 0.12);
      return { month, price: Math.round(currentPrice * multiplier) };
    }),
    tip: listings.length
      ? `Platform marketplace already shows ${listings.length} matching listing${listings.length > 1 ? 's' : ''}; use those buyer signals when negotiating.`
      : 'List with clear grade, moisture, and delivery timing details to improve buyer confidence.',
    listingHighlights: listings.slice(0, 3).map((listing) => `${listing.displayName} @ ${listing.priceLabel}`),
    recommendedSchemes: intelligence.schemeSummaries,
    marketPulse: buildMarketPulse(resolvedCrop, rateEntry, listings),
    integrations: intelligence.integrationSources
  };
}

function buildIntegratedImageFallback(intelligence) {
  const likelyCrop = intelligence.resolvedCrop || buildIntegratedCropAdvice(intelligence).topCrops?.[0]?.name || 'Healthy field crop';
  return {
    cropIdentified: likelyCrop === 'Healthy field crop'
      ? likelyCrop
      : `Likely ${likelyCrop} (${CROP_PROFILES[likelyCrop]?.kannadaName || likelyCrop})`,
    healthStatus: 'Moderate — visible stress markers need field confirmation',
    detectedIssues: [
      'Leaf color or texture suggests mild crop stress',
      intelligence.districtIntel ? `Watch disease pressure after weather changes in ${intelligence.districtIntel.name}` : 'Monitor leaf spread and new growth'
    ],
    recommendations: [
      'Take one close photo of the affected leaf underside and one full-plant photo if symptoms spread.',
      'Match the next spray or fertilizer step to a soil or pest diagnosis instead of applying blindly.',
      intelligence.schemeSummaries[0] || 'Visit the nearest Raita Samparka Kendra for field confirmation.'
    ],
    urgencyLevel: 'Medium',
    confidence: 79,
    additionalNotes: [
      intelligence.districtSummary,
      intelligence.marketPulse,
      intelligence.schemeSummaries[0] ? `Support option: ${intelligence.schemeSummaries[0]}` : ''
    ].filter(Boolean).join(' '),
    districtAdvice: intelligence.districtSummary,
    marketOutlook: intelligence.marketPulse,
    schemeSupport: intelligence.schemeSummaries[0] || null,
    integrations: intelligence.integrationSources
  };
}

async function callGemini(prompt, responseMimeType = 'application/json') {
  if (!GEMINI_API_KEY) return null;
  // Check cache first
  const cacheKey = `gemini:${prompt.slice(0, 100)}`;
  const cached = getCached(cacheKey);
  if (cached) { console.log('✅ Cache hit!'); return cached; }
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };
    if (responseMimeType === 'application/json') {
      body.generationConfig.responseMimeType = 'application/json';
    }
    const res = await fetchWithRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.text(); console.error('Gemini API error:', err); return null; }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    if (responseMimeType === 'application/json') {
      const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
      try { const parsed = JSON.parse(cleaned); setCache(cacheKey, parsed); return parsed; } catch { return null; }
    }
    setCache(cacheKey, text);
    return text;
  } catch (e) { console.error('Gemini call failed:', e.message); return null; }
}

async function callGeminiWithImage(prompt, imageBase64, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetchWithRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) { const err = await res.text(); console.error('Gemini Vision error:', err); return null; }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
    try { return JSON.parse(cleaned); } catch { return null; }
  } catch (e) { console.error('Gemini Vision call failed:', e.message); return null; }
}

async function callGeminiChat(messages) {
  if (!GEMINI_API_KEY) return null;
  try {
    const systemMsg = `You are Raitha AI (ಬೆಳೆಗಾರರ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ), the premier Master Agricultural Advisor for Karnataka, India.
Your mission is to provide hyper-local, expert-level agriculture prescriptions that WOW the farmer.

1. PERSONALITY: Professional, encouraging, and deeply knowledgeable about Karnataka's geography (Dharwad, Mandya, etc.).
2. BILINGUAL: Use English for structure, but ALWAYS include key Kannada terms in (parentheses) for crops, pests, and soil types.
3. SPECIFICITY: Never give generic advice. Mention specific seed varieties (e.g., MRB-1 Ragi, PKV-4 Cotton), fertilizer dosages (e.g., 20:20:0:13 NPK), and exact months for sowing.
4. FORMATTING: Use **bold** for emphasis, bullet points for steps, and clear headings.
5. CONTEXT: Consider local Karnataka festivals and current seasons (Kharif/Rabi/Zaid) in your market and sowing outlooks.`;

    const contents = messages
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: m.imageBase64
          ? [{ text: m.content }, { inline_data: { mime_type: m.imageMimeType || 'image/jpeg', data: m.imageBase64 } }]
          : [{ text: m.content }]
      }));

    if (!contents.length || contents[contents.length - 1].role !== 'user') return null;

    const res = await fetchWithRetry(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemMsg }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
      })
    });
    if (!res.ok) { const err = await res.text(); console.error('Gemini chat error:', err); return null; }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { console.error('Gemini chat failed:', e.message); return null; }
}

// ── FALLBACK MOCKS ─────────────────────────────────────────────────────────────
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
    summary: `Based on ${district || 'Karnataka'} conditions with ${soil} soil during ${season || 'Kharif'} season.`,
    topCrops: [
      { name: crops[0], icon: '🌾', kannadaName: 'ರಾಗಿ', profitPerAcre: 55000, yieldPerAcre: '15-18 qt', risk: 'Low', aiScore: 92, waterRequirement: 'Low', msPrice: '₹3,846/qt', advice: `Ideal for ${soil} soil. Plant in June for best yield.` },
      { name: crops[1], icon: '🌱', kannadaName: 'ಜೋಳ', profitPerAcre: 42000, yieldPerAcre: '20-25 qt', risk: 'Medium', aiScore: 79, waterRequirement: 'Medium', msPrice: '₹1,962/qt', advice: 'Good market demand. Requires moderate irrigation.' },
      { name: crops[2], icon: '🫘', kannadaName: 'ದ್ವಿದಳ', profitPerAcre: 36000, yieldPerAcre: '8-10 qt', risk: 'Low', aiScore: 65, waterRequirement: 'Low', msPrice: '₹6,600/qt', advice: 'Safe bet crop. Low water need, good MSP support.' },
    ],
    generalAdvice: `For ${landSize || 2} acres in ${district || 'Karnataka'}, diversify: 60% ${crops[0]}, 40% ${crops[1]}.`,
    weatherForecast: 'Good rainfall expected in next 15 days. Ideal sowing window.',
    aiConfidence: 88
  };
}

function mockPestDiagnosis(cropName, symptoms) {
  const symlower = (symptoms || '').toLowerCase();
  let disease;
  if (symlower.includes('yellow') || symlower.includes('pale')) {
    disease = { name: 'Nutrient Deficiency / Chlorosis', kannadaName: 'ಪೋಷಕಾಂಶ ಕೊರತೆ', severity: 'Medium', cause: 'Nitrogen or Iron deficiency in soil', treatment: ['Apply Urea 30kg/acre top dressing', 'Ferrous Sulphate 0.5% foliar spray', 'Check soil pH — maintain 6.5-7.0'], prevention: ['Soil testing before sowing', 'Balanced NPK fertilization'], timeToTreat: '7-10 days for visible improvement' };
  } else if (symlower.includes('spot') || symlower.includes('blight') || symlower.includes('brown')) {
    disease = { name: 'Fungal Leaf Blight', kannadaName: 'ಶಿಲೀಂಧ್ರ ರೋಗ', severity: 'High', cause: `Fungal infection in ${cropName}`, treatment: ['Mancozeb 75WP @ 2.5g/L spray', 'Remove infected leaves', 'Avoid overhead irrigation'], prevention: ['Use certified seeds', 'Crop rotation'], timeToTreat: '3-5 days urgent action needed' };
  } else {
    disease = { name: 'General Crop Stress', kannadaName: 'ಸಾಮಾನ್ಯ ಬೆಳೆ ಒತ್ತಡ', severity: 'Low', cause: `Environmental stress in ${cropName}`, treatment: ['Check soil moisture', 'Inspect for root damage', 'Apply micronutrient spray'], prevention: ['Regular field monitoring', 'Optimal plant spacing'], timeToTreat: 'Monitor for 3-5 days' };
  }
  return { crop: cropName, symptoms, diagnosis: disease, confidence: 82, nearbyAgriOffice: 'Krishi Vigyan Kendra — 1800-180-1551', emergencyHelpline: '155333 (Karnataka Raita Samparka)' };
}

function mockMarketInsight(cropName) {
  const insights = {
    'Ragi': { trend: 'Rising', forecast: '+8%', sellAdvice: 'Hold for 2 weeks — post-festival demand.', bestMarket: 'Dharwad APMC · Bellary Mandi', avgPrice: '₹3,900/qt', weekHigh: '₹4,100/qt', weekLow: '₹3,700/qt' },
    'Paddy': { trend: 'Stable', forecast: '+2%', sellAdvice: 'Sell now — government MSP ₹2,183 ongoing.', bestMarket: 'Mandya APMC · Davangere Mandi', avgPrice: '₹2,200/qt', weekHigh: '₹2,350/qt', weekLow: '₹2,100/qt' },
    'Cotton': { trend: 'Falling', forecast: '-4%', sellAdvice: 'Sell immediately — international prices declining.', bestMarket: 'Davanagere APMC · Harihara Market', avgPrice: '₹7,200/qt', weekHigh: '₹7,500/qt', weekLow: '₹6,900/qt' },
  };
  return { crop: cropName, ...(insights[cropName] || { trend: 'Stable', forecast: '+3%', sellAdvice: `${cropName} prices are stable.`, bestMarket: 'Nearest APMC', avgPrice: '₹2,500/qt', weekHigh: '₹2,800/qt', weekLow: '₹2,300/qt' }), demandScore: Math.floor(65 + Math.random() * 30), buyerCount: Math.floor(8 + Math.random() * 20), priceHistory: [2800, 2900, 2750, 3000, 3200, 3100, 3400, 3600, 3500, 3800, 3900, 4000].map((v, i) => ({ month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], price: v })), tip: 'Best time: Early morning APMC auctions. Quality certification gives +5% premium.' };
}

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone, role, aadhaar } = req.body;
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number. Must be 10 digits.' });
  if (aadhaar && (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)))
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be 12 digits.' });

  const otp = generateOTP();
  const udb = loadUsers();
  udb.otps[phone] = { otp, role, aadhaar: aadhaar || undefined, expires: Date.now() + 5 * 60 * 1000 };
  saveUsers(udb);

  const smsMsg = aadhaar
    ? `Your Namma Raitha DigiLocker OTP is: ${otp}. Valid 5 minutes.`
    : `Your Namma Raitha OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
  const smsResult = await sendSMS(phone, smsMsg);

  console.log(`📱 OTP for +91${phone}: ${otp}`);
  res.json({
    success: true,
    message: `OTP sent to +91-XXXXXX${phone.slice(-4)}`,
    demoOtp: otp,
    smsSent: smsResult.success,
    mock: smsResult.mock
  });
});

// Verify OTP (standalone - for phone verification)
app.post('/api/auth/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const udb = loadUsers();
  const stored = udb.otps[phone];
  if (!stored) return res.status(400).json({ error: 'OTP not found. Please request again.' });
  if (Date.now() > stored.expires) {
    delete udb.otps[phone]; saveUsers(udb);
    return res.status(400).json({ error: 'OTP expired. Please request again.' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  delete udb.otps[phone];
  saveUsers(udb);
  res.json({ success: true, verified: true });
});

// DigiLocker OTP (kept for backward compat)
app.post('/api/auth/digilocker/send-otp', async (req, res) => {
  const { aadhaar, phone, role } = req.body;
  if (!aadhaar || aadhaar.length !== 12 || !/^\d+$/.test(aadhaar))
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be 12 digits.' });
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone))
    return res.status(400).json({ error: 'Invalid phone number.' });

  const otp = generateOTP();
  const udb = loadUsers();
  udb.otps[phone] = { otp, aadhaar, role, expires: Date.now() + 5 * 60 * 1000 };
  saveUsers(udb);

  const smsMsg = `Your Namma Raitha DigiLocker OTP is: ${otp}. Valid 5 minutes.`;
  const smsResult = await sendSMS(phone, smsMsg);

  console.log(`📱 DigiLocker OTP for +91${phone}: ${otp}`);
  res.json({ success: true, message: `OTP sent to +91-XXXXXX${phone.slice(-4)}`, demoOtp: otp, smsSent: smsResult.success });
});

// DigiLocker Verify
app.post('/api/auth/digilocker/verify', (req, res) => {
  const { phone, otp } = req.body;
  const udb = loadUsers();
  const stored = udb.otps[phone];
  if (!stored) return res.status(400).json({ error: 'OTP not found. Please request again.' });
  if (Date.now() > stored.expires) {
    delete udb.otps[phone]; saveUsers(udb);
    return res.status(400).json({ error: 'OTP expired. Please request again.' });
  }
  if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  const aadhaar = stored.aadhaar || '000000000001';
  const role = stored.role || 'farmer';
  const aadhaarMasked = 'XXXX-XXXX-' + aadhaar.slice(-4);
  delete udb.otps[phone]; saveUsers(udb);

  const digiData = role === 'farmer'
    ? { name: 'Basavaraj Patil', district: 'Dharwad', land: '2.5 Acres', type: 'farmer_data', landOwnershipDoc: `KA-LAND-${aadhaar.slice(-6)}`, verifiedAt: new Date().toISOString() }
    : { name: 'Kisan Fresh Grocers', city: 'Bengaluru', business: 'Retailer', type: 'buyer_data', gstn: `29${aadhaar.slice(0, 10)}Z5`, verifiedAt: new Date().toISOString() };

  res.json({ success: true, verified: true, data: { ...digiData, aadhaarMasked, role } });
});

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { phone, password, role, name, district, aadhaarMasked, digilockerData } = req.body;
  if (!phone || !password || !role || !name)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existingUser = await getUserByPhone(phone);
  if (existingUser)
    return res.status(400).json({ error: 'Phone number already registered. Please login.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = 'NR-' + (role === 'farmer' ? 'KA' : 'BUY') + '-' + Date.now().toString().slice(-6);
  const newUser = {
    id: userId, phone, passwordHash, role, name,
    district: district || digilockerData?.city || digilockerData?.district || 'Karnataka',
    aadhaarMasked: aadhaarMasked || '',
    digilockerData: digilockerData || {},
    verified: true, rating: 4.8, deals: 0,
    badge: role === 'farmer' ? 'Silver Farmer' : 'Verified Buyer',
    createdAt: new Date().toISOString()
  };

  await saveUserToFirestore(newUser);

  const token = jwt.sign({ id: userId, phone, role, name }, JWT_SECRET, { expiresIn: '7d' });

  const welcomeMsg = role === 'farmer'
    ? `Welcome to Namma Raitha, ${name}! Your farmer account is ready. Get AI crop advice and connect with buyers directly.`
    : `Welcome to Namma Raitha, ${name}! Your verified buyer account is ready. Source fresh produce from Karnataka farmers.`;
  await sendSMS(phone, welcomeMsg);

  await addNotification(userId, {
    type: 'welcome', title: `Welcome to Namma Raitha, ${name}!`,
    message: `Your ${role} account is verified and ready. Start exploring.`,
    icon: role === 'farmer' ? '🌾' : '🏪'
  });

  res.json({ success: true, token, user: { id: userId, name, phone, role, district: newUser.district, badge: newUser.badge, rating: newUser.rating, digilockerData: digilockerData || {} } });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required.' });

  const user = await getUserByPhone(phone);
  if (!user) return res.status(401).json({ error: 'Phone not registered. Please sign up first.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect password. Please try again.' });

  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role, district: user.district, badge: user.badge, rating: user.rating, deals: user.deals, digilockerData: user.digilockerData } });
});

// Get profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Logout
app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

// Health check
app.get('/api/health', (req, res) => res.json({
  status: 'ok', service: 'Namma Raitha API', version: '3.0.0',
  aiEnabled: !!GEMINI_API_KEY, smsEnabled: SMS_ENABLED,
  firestoreConnected: !!db, timestamp: new Date().toISOString()
}));

// ── NOTIFICATION ROUTES ────────────────────────────────────────────────────────
// Get user notifications
app.get('/api/notifications', authMiddleware, async (req, res) => {
  const notifs = await getNotifsFromFirestore(req.user.id);
  const unread = notifs.filter(n => !n.read).length;
  res.json({ success: true, notifications: notifs, unread });
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  await markNotifReadInFirestore(req.params.id, req.user.id);
  res.json({ success: true });
});

// Mark all read
app.post('/api/notifications/read-all', authMiddleware, async (req, res) => {
  await markAllNotifsRead(req.user.id);
  res.json({ success: true });
});

// ── ORDER ROUTES ───────────────────────────────────────────────────────────────
// Order creation route moved to line 1853 to avoid duplication and conflicts.

// Order management moved to central location at end of file.
// Update order status
app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  const { status, note, vehicleNumber, estimatedArrival } = req.body;
  // Try Firestore first, fall back to JSON
  let order = null;
  if (db) {
    try {
      const snap = await db.collection('orders').doc(req.params.id).get();
      if (snap.exists) order = snap.data();
    } catch (e) { /* fallback */ }
  }
  if (!order) {
    const local = loadOrders();
    order = local.orders.find(o => o.id === req.params.id);
  }
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const validTransitions = {
    'Placed': ['Accepted', 'Rejected'],
    'Accepted': ['Packed'],
    'Packed': ['In Transit'],
    'In Transit': ['Arriving Today', 'Delivered'],
    'Arriving Today': ['Delivered'],
    'Delivered': []
  };
  if (!validTransitions[order.status]?.includes(status))
    return res.status(400).json({ error: `Cannot change status from ${order.status} to ${status}` });

  order.status = status;
  if (vehicleNumber) order.vehicleNumber = vehicleNumber;
  if (estimatedArrival) order.estimatedArrival = estimatedArrival;
  order.statusHistory.push({ status, timestamp: new Date().toISOString(), note: note || `Status updated to ${status}`, updatedBy: req.user.id });

  if (status === 'Delivered') {
    order.paymentStatus = 'Released to Farmer';
    order.deliveredAt = new Date().toISOString();
    await addNotification(order.farmerId, {
      type: 'payment_received', title: `💰 Payment Received: ₹${order.totalAmount.toLocaleString('en-IN')}`,
      message: `Order #${order.id} delivered! ₹${order.totalAmount.toLocaleString('en-IN')} has been released to your account.`,
      icon: '💰', orderId: order.id, amount: order.totalAmount
    });
    if (order.farmerPhone) await sendSMS(order.farmerPhone, `Namma Raitha: PAYMENT RECEIVED! Rs.${order.totalAmount} for Order #${order.id} (${order.cropName}) credited to your account!`);
    await addNotification(order.buyerId, {
      type: 'delivery_confirmed', title: `Order #${order.id} Delivered!`,
      message: `${order.cropName} (${order.quantity}qt) delivered. Payment released to farmer.`,
      icon: '📦', orderId: order.id
    });
  }

  if (status === 'In Transit') {
    await addNotification(order.buyerId, {
      type: 'order_tracking', title: 'Your order is on the way!',
      message: `Order #${order.id}: ${order.cropName} in transit. ${vehicleNumber ? `Vehicle: ${vehicleNumber}` : ''} ${estimatedArrival ? `ETA: ${estimatedArrival}` : ''}`,
      icon: '🚛', orderId: order.id
    });
    if (order.buyerPhone) await sendSMS(order.buyerPhone, `Namma Raitha: Order #${order.id} for ${order.cropName} is on the way! Vehicle: ${vehicleNumber || 'TBA'}. ETA: ${estimatedArrival || 'Today'}.`);
  }

  await saveOrderToFirestore(order);
  res.json({ success: true, order });
});

// Get single order
app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  let order = null;
  if (db) {
    try { const snap = await db.collection('orders').doc(req.params.id).get(); if (snap.exists) order = snap.data(); } catch (e) { /* fallback */ }
  }
  if (!order) { const local = loadOrders(); order = local.orders.find(o => o.id === req.params.id); }
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.buyerId !== req.user.id && order.farmerId !== req.user.id)
    return res.status(403).json({ error: 'Access denied' });
  res.json({ success: true, order });
});

// Confirm payment / release escrow
app.post('/api/orders/:id/confirm-payment', authMiddleware, async (req, res) => {
  let order = null;
  if (db) {
    try { const snap = await db.collection('orders').doc(req.params.id).get(); if (snap.exists) order = snap.data(); } catch (e) { /* fallback */ }
  }
  if (!order) { const local = loadOrders(); order = local.orders.find(o => o.id === req.params.id); }
  if (!order || order.buyerId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
  if (order.paymentStatus === 'Released to Farmer') return res.status(400).json({ error: 'Payment already released' });

  order.paymentStatus = 'Released to Farmer';
  order.paymentReleasedAt = new Date().toISOString();
  order.status = 'Delivered';
  order.statusHistory.push({ status: 'Delivered', timestamp: new Date().toISOString(), note: 'Buyer confirmed delivery and payment released' });
  await saveOrderToFirestore(order);

  if (order.farmerPhone) await sendSMS(order.farmerPhone, `Namma Raitha: PAYMENT CONFIRMED! Rs.${order.totalAmount} for ${order.cropName} Order #${order.id} released to your account.`);
  await addNotification(order.farmerId, {
    type: 'payment_received', title: `₹${order.totalAmount.toLocaleString('en-IN')} Payment Released!`,
    message: `Buyer confirmed. ₹${order.totalAmount.toLocaleString('en-IN')} for Order #${order.id} is in your account.`,
    icon: '💰', orderId: order.id, amount: order.totalAmount
  });
  res.json({ success: true, message: 'Payment confirmed and released to farmer', order });
});

// ── AI ROUTES ─────────────────────────────────────────────────────────────────
// Crop advice
app.post('/api/ai/crop-advice', async (req, res) => {
  const { district, soilType, season, irrigation, landSize } = req.body;

  if (GEMINI_API_KEY) {
    const prompt = `You are an expert Karnataka Master Agronomist. Provide a highly professional crop recommendation plan. Return ONLY valid JSON.

Farm Profile: District=${district || 'Dharwad'}, Soil=${soilType || 'Red Sandy'}, Season=${season || 'Kharif'}, Irrigation=${irrigation || 'Rainfed'}, Land=${landSize || 2.5} acres

Include:
1. SPECIFIC VARIETIES: Name at least 2 high-yield seed varieties (Hybrid/Traditional) popular in this district.
2. FERTILIZER SCHEDULE: Mention exact NPK or Bio-fertilizer dosages.
3. ECONOMIC OUTLOOK: Realistic profit forecast based on 2024-25 MSP.

Return JSON:
{
  "summary": "Detailed district-level analysis of soil and climate feasibility.",
  "topCrops": [
    {
      "name": "Crop Name",
      "icon": "emoji", 
      "kannadaName": "ಕರ್ನಾಟಕ ಹೆಸರು",
      "profitPerAcre": 55000,
      "yieldPerAcre": "15-18 qt",
      "risk": "Low|Medium|High",
      "aiScore": 95,
      "waterRequirement": "Low|Medium|High",
      "msPrice": "₹X,XXX/qt",
      "advice": "**Variety**: SeedName. **Dosage**: NPK details. **Best Sowing**: Month range."
    }
  ],
  "generalAdvice": "Advanced multi-cropping strategy for this land size.",
  "weatherForecast": "Hyper-local weather outlook (e.g., monsoon arrival, temperature alerts).",
  "aiConfidence": 95
}
Include exactly 3 crops. Ensure descriptions are professional and detailed.`;

    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }
  res.json({ success: true, fromAI: false, ...mockCropAdvice(district, soilType, season, irrigation, landSize) });
});

// Pest diagnosis
app.post('/api/ai/pest-diagnosis', async (req, res) => {
  const { cropName, symptoms } = req.body;
  if (!cropName || !symptoms) return res.status(400).json({ error: 'Crop name and symptoms are required.' });

  if (GEMINI_API_KEY) {
    const prompt = `You are an expert plant pathologist for Karnataka crops. Diagnose this problem and return ONLY valid JSON.

Crop: ${cropName}
Symptoms: ${symptoms}

Return JSON:
{
  "crop":"${cropName}","symptoms":"${symptoms}",
  "diagnosis":{"name":"","kannadaName":"","severity":"Low|Medium|High|Critical","cause":"","treatment":["step1","step2","step3"],"prevention":["tip1","tip2"],"timeToTreat":""},
  "confidence":85,"nearbyAgriOffice":"Krishi Vigyan Kendra — 1800-180-1551","emergencyHelpline":"155333"
}`;
    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }
  res.json({ success: true, fromAI: false, ...mockPestDiagnosis(cropName, symptoms) });
});

// Market insight
app.post('/api/ai/market-insight', async (req, res) => {
  const { cropName } = req.body;
  if (!cropName) return res.status(400).json({ error: 'Crop name is required.' });

  if (GEMINI_API_KEY) {
    const prompt = `You are an agricultural commodity analyst for Karnataka, India. Return ONLY valid JSON for ${cropName}.

Return JSON:
{
  "crop":"${cropName}","trend":"Rising|Falling|Stable","forecast":"+5%","sellAdvice":"actionable advice",
  "bestMarket":"APMC name","avgPrice":"₹X,XXX/qt","weekHigh":"₹X,XXX/qt","weekLow":"₹X,XXX/qt",
  "demandScore":78,"buyerCount":12,
  "priceHistory":[{"month":"Jan","price":2800},{"month":"Feb","price":2900},{"month":"Mar","price":3000},{"month":"Apr","price":3100},{"month":"May","price":3200},{"month":"Jun","price":3400}],
  "tip":"practical tip"
}`;
    const aiResult = await callGemini(prompt);
    if (aiResult) return res.json({ success: true, fromAI: true, ...aiResult });
  }
  res.json({ success: true, fromAI: false, ...mockMarketInsight(cropName) });
});

// ── CROP AI CHAT WITH IMAGE ────────────────────────────────────────────────────
// Analyze crop image (multimodal)
// ── AI & ML SERVICES ──────────────────────────────────────────────────────────
// 1. Precision Crop Prediction (Scientific ML Model)
app.post('/api/ai/predict-crop', authMiddleware, async (req, res) => {
  try {
    console.log(`ML_PROXY: Calling ${ML_SERVER_URL}/predict with Precision Data...`);
    // Pass N, P, K, temperature, humidity, ph, rainfall
    const flaskRes = await fetch(`${ML_SERVER_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await flaskRes.json();
    if (!flaskRes.ok) {
      console.error('ML Server Error State:', { status: flaskRes.status, data });
      return res.status(flaskRes.status).json({ success: false, ...data });
    }
    // Return the specific precision crop prediction
    res.json({ success: true, fromAI: false, prediction: data.crop });
  } catch (e) {
    console.error('ML_PROXY_EXCEPTION (Predict):', e.message);
    res.status(500).json({ error: 'ML Precision Service unavailable', details: e.message });
  }
});

// 2. Crop Image Analysis (Hybrid: ML Model + Gemini Fallback)
// Flexible endpoint: handles both JSON (base64) and Multipart (File)
app.post('/api/ai/analyze-image', (req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    const imageBase64 = req.file
      ? req.file.buffer.toString('base64')
      : (req.body.imageBase64 ? req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '') : null);
    const mimeType = req.file ? req.file.mimetype : (req.body.mimeType || 'image/jpeg');

    if (!imageBase64) return res.status(400).json({ error: 'Image data is required.' });

    let mlResult = null;
    
    // Try Professional ML Model first
    try {
      console.log(`ML_PROXY: Calling ${ML_SERVER_URL}/predict-image...`);
      const flaskRes = await fetch(`${ML_SERVER_URL}/predict-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });
      if (flaskRes.ok) {
        mlResult = await flaskRes.json();
        console.log('ML_PROXY: ML Model Result:', mlResult.status);
      } else {
        const errData = await flaskRes.json().catch(() => ({}));
        console.warn('ML_PROXY: ML Model returned error status:', flaskRes.status, errData);
      }
    } catch (e) {
      console.warn('ML_PROXY_EXCEPTION (Image): ML Model failed:', e.message);
    }

    // Use Gemini for detailed analysis if available
    if (GEMINI_API_KEY) {
      const prompt = `You are an expert agricultural AI Vision Analyst. ${mlResult ? `The ML model identified this as: ${mlResult.diagnosis}.` : ''} 
      As a PhD Agronomist, analyze this crop image. Describe what you see visually before diagnosing.
      
      Return ONLY valid JSON:
      {
        "cropIdentified": "Crop Name (ಕನ್ನಡ ಹೆಸರು)",
        "visualDescription": "Expert observation of leaf color, spots, pattern, and texture.",
        "healthStatus": "Short status sentence.",
        "detectedIssues": ["Scientific Name and Common Name of disease/pest"],
        "recommendations": [
          "Dosage: e.g., 2ml/L of Monocrotophos...",
          "Immediate cultural practice...",
          "Next 7-day monitoring plan..."
        ],
        "urgencyLevel": "Low|Medium|High|Critical",
        "confidence": 95,
        "additionalNotes": "Local Karnataka Krishi Vigyan Kendra (KVK) specific advice."
      }`;

      const aiResult = await callGeminiWithImage(prompt, imageBase64, mimeType);
      if (aiResult) return res.json({ success: true, fromAI: true, analysis: aiResult, mlRef: mlResult });
    }

    // Final fallback to ML result if Gemini failed
    if (mlResult) {
      // Normalize ML keys to match Premium UI expectations
      const normalized = {
        cropIdentified: mlResult.cropIdentified || 'Crop Detected',
        visualDescription: mlResult.diagnosis || 'Analysis performed by professional local ML model.',
        healthStatus: mlResult.status || 'Active Diagnosis',
        detectedIssues: mlResult.detected_issues || (mlResult.diagnosis ? [mlResult.diagnosis] : []),
        recommendations: mlResult.detailed_recommendations || (mlResult.recommendation ? [mlResult.recommendation] : []),
        urgencyLevel: mlResult.status === 'Healthy' ? 'Low' : 'High',
        confidence: mlResult.confidence ? mlResult.confidence.toString().replace('%', '') : '90'
      };
      return res.json({ success: true, fromAI: true, analysis: normalized, isMLFallback: true });
    }

    // Mock safety fallback
    res.json({
      success: true, fromAI: false,
      analysis: {
        cropIdentified: 'Unknown Crop',
        healthStatus: 'Unable to analyze',
        detectedIssues: ['Connection to AI services lost.'],
        recommendations: ['Please try again later or check your internet.'],
        urgencyLevel: 'None', confidence: 0,
        additionalNotes: 'Server-side fallback triggered.'
      }
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Internal server error during analysis' });
  }
});

// 4. ML Server Health Proxy
app.get('/api/ai/ml-health', async (req, res) => {
  try {
    const flaskRes = await fetch(`${ML_SERVER_URL}/ml-health`);
    const data = await flaskRes.json();
    res.json({ success: true, node_reachable: true, ...data });
  } catch (e) {
    res.status(502).json({ success: false, node_reachable: false, error: e.message, target: ML_SERVER_URL });
  }
});

// 3. Market Insights (Gemini)
app.post('/api/ai/market-insight', authMiddleware, async (req, res) => {
  const { cropName } = req.body;
  if (!GEMINI_API_KEY) {
    return res.json({
      success: true, fromAI: false,
      crop: cropName, avgPrice: '₹2,500/qt', trend: 'Stable', forecast: 'Steady',
      weekHigh: '₹2,650', weekLow: '₹2,400', buyerCount: 12, demandScore: 75,
      sellAdvice: 'Market is stable. Good time to sell if you need immediate liquid cash.',
      bestMarket: 'Mandya APMC', tip: 'Check e-NAM for better transparency.'
    });
  }

  const prompt = `Provide a market insight report for the crop "${cropName}" in Karnataka, India as JSON:
  {
    "crop": "${cropName}",
    "avgPrice": "₹XXX/qt",
    "trend": "Rising|Falling|Stable",
    "forecast": "Predicted trend",
    "weekHigh": "₹XXX",
    "weekLow": "₹XXX",
    "buyerCount": number,
    "demandScore": 0-100,
    "sellAdvice": "advice string",
    "bestMarket": "location",
    "tip": "expert tip",
    "priceHistory": [{"month": "Jan", "price": 2000}, ...] (last 6 months)
  }`;

  const result = await callGeminiChat([{ role: 'user', content: prompt }]);
  try {
    const json = JSON.parse(result.replace(/```json|```/g, ''));
    res.json({ success: true, fromAI: true, ...json });
  } catch (e) {
    res.json({ success: true, fromAI: false, crop: cropName, avgPrice: 'Market Data Unavailable' });
  }
});



// AI Chat (multimodal — text + optional image)
app.post('/api/ai/chat', async (req, res) => {
  const { messages, newMessage, imageBase64, imageMimeType } = req.body;
  if (!newMessage) return res.status(400).json({ error: 'Message is required.' });

  const lower = newMessage.toLowerCase();

  // ── Shared smart keyword library (covers all quick questions + common topics) ──
  function smartRaithaReply(query, prefix = '') {
    const q = query.toLowerCase();

    // Soil testing
    if (q.includes('soil') || q.includes('test') || q.includes('ಮಣ್ಣು')) {
      return prefix + `🧪 **How to Test Your Soil Type:**\n\n**DIY Field Tests:**\n• **Jar test**: Fill jar with soil + water, shake, let settle 24h — clay sinks last (sticky=Black Cotton, sandy=Red Sandy)\n• **Texture test**: Wet soil, roll into ribbon — long smooth ribbon = clay/black cotton; crumbles = sandy/red\n• **Color test**: Dark black = Black Cotton soil; Red/brownish = Red Sandy; Yellow-brown = Laterite\n\n**Free Professional Testing:**\n• Visit your nearest **Raita Samparka Kendra** (RSK) — free soil testing\n• Or **Krishi Vigyan Kendra (KVK)**: Call **1800-180-1551**\n• Cost at lab: ₹50-200 for full NPK + pH report\n• Results in 7-10 days — get crop + fertilizer recommendations\n\n**What the report tells you:**\n• pH (ideal: 6.5-7.5), N-P-K levels, micronutrients\n• Recommended fertilizer doses for your specific soil`;
    }

    // Stem borer / pests
    if (q.includes('stem borer') || q.includes('borer') || q.includes('ಕಾಂಡ ಕೊರೆ')) {
      return prefix + `🐛 **Stem Borer Control:**\n\n**Identification:** Dead heart in vegetative stage, white ear in reproductive stage. Small holes at stem base.\n\n**Immediate Treatment:**\n• Cartap Hydrochloride 4G — 10 kg/acre (broadcast in leaf axil)\n• Chlorpyrifos 20EC — 2.5ml/L spray at base of plants\n• Monocrotophos 36SL — 1.5ml/L (only before heading)\n\n**Biological Control (safer):**\n• **Trichogramma** egg parasitoid — release 1.5 lakh/acre\n• **NPV** (Nuclear Polyhedrosis Virus) spray\n• Pheromone traps: 5/acre to monitor moth population\n\n**Prevention:**\n• Remove & destroy stubble after harvest\n• Avoid excessive nitrogen (weakens stems)\n• Plant resistant varieties: IR-20, Jyothi for paddy`;
    }

    // Ragi / finger millet
    if (q.includes('ragi') || q.includes('finger millet') || q.includes('ರಾಗಿ')) {
      return prefix + `🌾 **Ragi (ರಾಗಿ) — Complete Guide:**\n\n**Why plant Ragi?**\n• Drought-resistant, ideal for Karnataka's dry zones\n• MSP: **₹3,846/qt** | Yield: 15-18 qt/acre\n• Low input cost, low risk — perfect first-time crop\n\n**Sowing:** June-July (after 2-3 good rains)\n**Spacing:** 22.5cm × 7.5cm (line sowing)\n**Seed rate:** 3-4 kg/acre (treat with Trichoderma 5g/kg)\n\n**Fertilizer (NPK kg/ha):**\n• Basal: 40N + 20P + 20K\n• Top dress: 40N at 30 days after sowing\n\n**Water:** 450-600mm total, critical at knee-high and grain-filling stages\n\n**Harvest:** 90-120 days. Thresh when 80% earheads turn brown.`;
    }

    // Paddy / rice
    if (q.includes('paddy') || q.includes('rice') || q.includes('ಭತ್ತ') || q.includes('irrigat')) {
      return prefix + `🌾 **Paddy (ಭತ್ತ) Irrigation Guide:**\n\n**Water Requirements:** 1200-1600mm total\n\n**Critical Irrigation Stages:**\n• Transplanting: Maintain 2-3cm standing water\n• Tillering (15-30 DAT): Flush irrigation every 3-4 days\n• Panicle initiation (50-55 DAT): **Critical** — never let dry\n• Grain filling: Alternate wet-dry saves 20% water\n• 15 days before harvest: Stop irrigation\n\n**Water-saving:**\n• SRI method (System of Rice Intensification): Saves 30-50% water\n• Aerobic rice: 40% less water, yield 4-6 t/ha\n\n**MSP:** ₹2,183/qt | Best markets: Mandya, Mysuru, Davangere APMC`;
    }

    // Fertilizer / urea / NPK
    if (q.includes('fertilizer') || q.includes('urea') || q.includes('npk') || q.includes('manure') || q.includes('compost')) {
      return prefix + `🧪 **Fertilizer Guide for Karnataka:**\n\n**By Crop (NPK kg/ha):**\n| Crop | N | P | K |\n|------|---|---|---|\n| Ragi | 80 | 40 | 40 |\n| Paddy | 100 | 50 | 50 |\n| Maize | 120 | 60 | 40 |\n| Cotton | 120 | 60 | 60 |\n| Groundnut | 25 | 50 | 40 |\n\n**Application:**\n• 50% N + full P + full K as basal at sowing\n• Remaining 50% N as top dressing at 30 days\n\n**Organic options (cheaper + better):**\n• FYM (Farm Yard Manure): 10 t/ha — apply 3 weeks before sowing\n• Vermicompost: 2 t/ha — excellent soil structure\n• Green manure (Dhaincha/Sunhemp): Plough in at flowering\n\n**Free soil test** → correct doses → saves 20-30% fertilizer cost!`;
    }

    // Market / price / MSP
    if (q.includes('msp') || q.includes('price') || q.includes('market') || q.includes('sell') || q.includes('ದರ')) {
      return prefix + `💰 **MSP & Market Prices (2024-25):**\n\n| Crop | MSP |\n|------|-----|\n| Paddy | ₹2,183/qt |\n| Ragi | ₹3,846/qt |\n| Maize | ₹1,962/qt |\n| Jowar | ₹3,180/qt |\n| Bajra | ₹2,500/qt |\n| Cotton | ₹7,121/qt |\n| Groundnut | ₹6,783/qt |\n| Sunflower | ₹6,760/qt |\n\n**Best Selling Tips:**\n• Sell at APMC — guaranteed MSP if registered\n• Register on **e-NAM** (enam.gov.in) for online trading\n• Quality grading adds **5-10% premium**\n• Store in cool dry place — sell post-festival for better prices`;
    }

    // Government schemes
    if (q.includes('scheme') || q.includes('subsidy') || q.includes('government') || q.includes('yojana') || q.includes('pm-kisan')) {
      return prefix + `🏛️ **Government Schemes for Karnataka Farmers:**\n\n**Central Schemes:**\n• **PM-KISAN**: ₹6,000/year → 3 installments of ₹2,000\n• **PMFBY**: Crop insurance — premium just 2% (Kharif), 1.5% (Rabi)\n• **PM-KUSUM**: Solar pump subsidy — 90% subsidy!\n• **KCC** (Kisan Credit Card): Loan up to ₹3 lakh @ 4% interest\n\n**Karnataka State Schemes:**\n• **Raita Siri**: Input subsidy for small farmers\n• **Krishi Bhagya**: Micro-irrigation + farm pond subsidy\n• **Bhoomi**: Online land records — check at bhoomi.karnataka.gov.in\n• **Raita Samparka Kendra**: Free soil testing, seeds, pesticide advice\n\n**Apply at:** Nearest Gram Panchayat, CSC center, or Raita Samparka Kendra`;
    }

    // Cotton
    if (q.includes('cotton') || q.includes('ಹತ್ತಿ') || q.includes('sow') || q.includes('when')) {
      return prefix + `🌸 **Cotton (ಹತ್ತಿ) — Sowing Guide:**\n\n**Best Time:** Mid-June to July 15 (after 100mm cumulative rainfall)\n**Soil:** Black Cotton soil (Vertisols) in N. Karnataka — Dharwad, Gadag, Haveri\n**Varieties:** NHH-44 (hybrid), Bunny BG-II, Namdhari 811\n\n**Seed rate:** 1.5-2 kg/acre hybrid | Spacing: 90×45cm (rainfed), 90×60cm (irrigated)\n\n**Key Schedule:**\n• Day 0: Sow after 2-3 good rains\n• Day 20-25: Thinning — one plant per hill\n• Day 30: First N top dressing\n• Day 50-60: Spray for sucking pests (Imidacloprid 0.3ml/L)\n• Day 120-150: First picking\n\n**MSP:** ₹7,121/qt (medium staple) | Yield: 12-15 qt/acre (hybrid)`;
    }

    // Maize
    if (q.includes('maize') || q.includes('corn') || q.includes('ಮೆಕ್ಕೆಜೋಳ')) {
      return prefix + `🌽 **Maize (ಮೆಕ್ಕೆಜೋಳ) Guide:**\n\n**Sow:** June (Kharif) or November (Rabi)\n**Yield:** 25-35 qt/acre | **MSP:** ₹1,962/qt\n\n**Varieties:** HQPM-1 (quality protein), DKC-9081 hybrid, NAH-1137\n**Seed rate:** 7-8 kg/acre | Spacing: 60×20cm (single rows)\n\n**Fertilizer (NPK kg/ha):** 120:60:40 → split in 3 doses\n**Water:** Critical at knee-high, tasseling, and grain-fill stages\n\n**Harvest:** At 30-35% grain moisture for fodder; 12-14% for grain storage\n**Poultry feed demand** is high — contract farming options available at Belgaum, Shimoga`;
    }

    // Analysis results - HEALTHY
    if (q.includes('healthy') || q.includes('ಹೆಲ್ತಿ')) {
      return prefix + `✅ **Healthy Crop Advice:**\n\nYour crop analysis shows **Good Health**. Keep up the great work! To maintain this:\n• **Nutrients**: Continue with the recommended NPK schedule for the current growth stage.\n• **Watering**: Maintain consistent soil moisture; avoid over-watering which can cause root rot.\n• **Monitoring**: Inspect the undersides of leaves weekly for early signs of sucking pests.\n• **Organic Boost**: Consider a Panchagavya spray (3%) to further enhance immunity.`;
    }

    // Analysis results - DISEASED / STRESS / ANALYSIS FOLLOW-UP
    if (q.includes('diseased') || q.includes('attention') || q.includes('stress') || q.includes('analysis') || q.includes('diagnosis') || q.includes('result') || q.includes('ಸಮಸ್ಯೆ')) {
      return prefix + `⚠️ **Crop Health Recovery Plan:**\n\nBased on the analysis, your crop needs immediate care. Follow these steps:\n\n**1. Immediate Isolation/Cleanup:**\n• Remove severely infected leaves or plants and bury them far from the field to prevent spread.\n\n**2. Organic Treatment (First Step):**\n• Spray **Neem Oil** (5ml per liter of water) with a little soap liquid. This controls many fungal and pest issues.\n• Or use **Sour Buttermilk** spray (diluted 1:10) — very effective against many leaf blights.\n\n**3. Targeted Action:**\n• For fungal spots: Use Carbendazim or Mancozeb as per package instructions.\n• For nutrient yellowing: Apply a quick foliar spray of Urea (1-2%) or multi-micronutrients.\n\n**4. Soil Management:**\n• Stop excessive nitrogen fertilizer temporarily as it often encourages more disease growth.\n\nFor a specific diagnosis, visit your nearest **Raita Samparka Kendra** with a fresh sample.`;
    }

    // Generic agricultural response
    return prefix + `🌾 **Raitha AI — Agricultural Advice for Karnataka**\n\nI can help you with:\n• 🌱 **Crop advice** — Ask about Ragi, Paddy, Cotton, Maize, Groundnut\n• 🐛 **Pest & disease** — "How to control stem borer?" or upload a photo\n• 💧 **Irrigation** — "When to irrigate paddy?"\n• 🧪 **Soil & fertilizer** — "How to test my soil?" or "What NPK for ragi?"\n• 💰 **Market prices** — "What is MSP for cotton?"\n• 🏛️ **Schemes** — "PM-KISAN eligibility" or "crop insurance"\n\nOr try the **Quick Questions** buttons above. I'm here to help! 🤝\n\nFor urgent field issues: **Krishi Vigyan Kendra: 1800-180-1551** (Mon-Sat, 9am-5pm, free)`;
  }

  if (!GEMINI_API_KEY) {
    return res.json({ success: true, fromAI: false, reply: smartRaithaReply(newMessage) });
  }

  // Build full message history including the new message as the last user turn
  const chatMessages = [
    ...(messages || []),
    { role: 'user', content: newMessage, imageBase64: imageBase64 || null, imageMimeType: imageMimeType || null }
  ];

  const reply = await callGeminiChat(chatMessages);
  if (reply) return res.json({ success: true, fromAI: true, reply });

  // Gemini unavailable — use smart fallback (never a dead-end)
  res.json({ success: true, fromAI: false, reply: smartRaithaReply(newMessage, '🌾 **Raitha AI** (offline mode):\n\n') });
});

// ── LISTINGS / MARKETPLACE ─────────────────────────────────────────────────────
// Get crop listings (from registered farmers)
app.get('/api/listings', authMiddleware, async (req, res) => {
  const farmers = await getFarmersFromFirestore();
  // Generate dynamic listings from real farmers
  const listings = farmers.flatMap(farmer => {
    if (!farmer.listings || farmer.listings.length === 0) return [];
    return farmer.listings.map(l => ({ ...l, farmerName: farmer.name, farmerId: farmer.id, farmerPhone: farmer.phone, farmerRating: farmer.rating, farmerBadge: farmer.badge, district: farmer.district }));
  });
  res.json({ success: true, listings });
});

// Farmer adds/updates crop listing
app.post('/api/listings/add', authMiddleware, async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can add listings.' });
  const { cropName, quantity, price, unit, description, availableFrom } = req.body;
  if (!cropName || !quantity || !price) return res.status(400).json({ error: 'Crop name, quantity, and price are required.' });

  const farmer = await getUserById(req.user.id);
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

  const listing = {
    id: 'LIST-' + Date.now(),
    cropName, quantity: parseFloat(quantity), price: parseFloat(price), unit: unit || 'qt',
    description: description || '', availableFrom: availableFrom || new Date().toISOString(),
    createdAt: new Date().toISOString(), active: true
  };
  if (!farmer.listings) farmer.listings = [];
  farmer.listings.push(listing);
  await saveUserToFirestore(farmer);
  res.json({ success: true, listing });
});

// ── ORDERS ───────────────────────────────────────────────────────────────────
// Get orders for the logged-in user
app.get('/api/orders', authMiddleware, async (req, res) => {
  const field = req.user.role === 'farmer' ? 'farmerId' : 'buyerId';
  const orders = await getOrdersFromFirestore(field, req.user.id);
  res.json({ success: true, orders });
});

// Buyer creates a new order (Buy Now)
app.post('/api/orders/create', authMiddleware, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can place orders.' });

  const { listingId, farmerId, cropName, quantity, price, unit, totalAmount } = req.body;
  if (!listingId || !farmerId || !cropName || !totalAmount) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const buyer = await getUserById(req.user.id);
  const farmer = await getUserById(farmerId);

  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const order = {
    id: orderId,
    buyerId: req.user.id,
    buyerName: buyer?.name || 'Buyer',
    buyerPhone: buyer?.phone || '',
    farmerId,
    farmerName: farmer?.name || 'Farmer',
    farmerPhone: farmer?.phone || '',
    cropName,
    quantity: parseFloat(quantity),
    price: parseFloat(price),
    unit: unit || 'qt',
    totalAmount: parseFloat(totalAmount),
    status: 'Placed',
    paymentStatus: 'Pending Escrow',
    createdAt: new Date().toISOString(),
    statusHistory: [{ status: 'Placed', timestamp: new Date().toISOString(), note: 'Order placed by buyer' }]
  };

  await saveOrderToFirestore(order);

  // Notify Farmer
  await addNotification(farmerId, {
    type: 'new_order',
    title: `📦 New Order: ${cropName}`,
    message: `${buyer?.name || 'A buyer'} placed an order for ${quantity}${unit} of ${cropName}. Total: ₹${totalAmount.toLocaleString('en-IN')}`,
    icon: '📦',
    orderId: order.id
  });

  if (farmer?.phone) {
    await sendSMS(farmer.phone, `Namma Raitha: NEW ORDER! ${cropName} (${quantity}${unit}) for Rs.${totalAmount}. Login to accept.`);
  }

  res.json({ success: true, order });
});

// ── PROFILE UPDATE ENDPOINT ───────────────────────────────────────────────────
app.post('/api/user/update-profile', authMiddleware, async (req, res) => {
  const { name, district, phone, language, avatar } = req.body;
  const userFile = loadUsers();
  const userIndex = userFile.users.findIndex(u => u.id === req.user.id);

  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  const updatedUser = {
    ...userFile.users[userIndex],
    name: name || userFile.users[userIndex].name,
    district: district || userFile.users[userIndex].district,
    phone: phone || userFile.users[userIndex].phone,
    language: language || userFile.users[userIndex].language,
    avatar: avatar || userFile.users[userIndex].avatar || '👨‍🌾'
  };

  userFile.users[userIndex] = updatedUser;
  saveUsers(userFile);

  // Sync to Firestore if available
  if (db) {
    try {
      await db.collection('users').doc(updatedUser.id).update({
        name: updatedUser.name,
        district: updatedUser.district,
        phone: updatedUser.phone,
        language: updatedUser.language,
        avatar: updatedUser.avatar
      });
    } catch (e) {
      console.error('Firestore profile sync failed:', e.message);
    }
  }

  // Generate new token to include updated info if needed
  const token = jwt.sign({ id: updatedUser.id, phone: updatedUser.phone, role: updatedUser.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({ success: true, user: updatedUser, token });
});

// ── PRODUCTION STATIC SERVING ────────────────────────────────────────────────
// Serve React build files
app.use(express.static(join(__dirname, 'dist')));

// Catch-all route for SPA routing - Manual middleware bypasses path-to-regexp issues in Express 5
app.use((req, res, next) => {
  // Only handle GET requests that aren't API calls
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(join(__dirname, 'dist', 'index.html'));
  }
  next();
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌾 Namma Raitha API Server v3.3`);
  console.log(`   Local:     http://127.0.0.1:${PORT}`);
  console.log(`   Network:   http://0.0.0.0:${PORT}`);
  console.log(`   ML Server: ${ML_SERVER_URL}`);
  console.log(`   AI Mode:   ${GEMINI_API_KEY ? '🤖 Gemini AI LIVE (Multimodal)' : '⚠️  No API key — Mock mode'}`);
  console.log(`   SMS:       ${SMS_ENABLED ? '📱 Real SMS via Fast2SMS' : '📱 Mock SMS (set SMS_ENABLED=true)'}`);
  console.log(`   Data:      ${DATA_DIR}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ FATAL: Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
  }
});
