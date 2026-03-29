// Firebase configuration for Namma Raitha
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBt-9yJyM7iqpNfGNe8kgfclVSF_D5v73A',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'namma-raitha-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'namma-raitha-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'namma-raitha-project.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '393040510208',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:393040510208:web:9fa7e9ce0259689e82c7e5',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-J9HN7LS4HL'
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const auth = getAuth(firebaseApp);
export default firebaseApp;
