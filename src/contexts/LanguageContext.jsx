import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    home: "Home", satellite: "Satellite", market: "Market", profile: "Profile", crop_ai: "Crop AI",
    farmer: "Farmer", buy_now: "Buy Now",
    bank: "Bank Account", records: "Land Records", deals: "Transactions", dashboard: "Growth Dashboard",
    support: "Help & Support", logout: "Logout",
    digilocker_verified: "DigiLocker Verified Details",
    language_select: "Language",
    // Language names
    English: "English", Kannada: "Kannada", Hindi: "Hindi", Telugu: "Telugu", Marathi: "Marathi"
  },
  kn: {
    home: "ಮುಖಪುಟ", satellite: "ಉಪಗ್ರಹ", market: "ಮಾರುಕಟ್ಟೆ", profile: "ಪ್ರೊಫೈಲ್", crop_ai: "ಬೆಳೆ AI",
    farmer: "ರೈತ", buy_now: "ಈಗ ಖರೀದಿಸಿ",
    bank: "ಬ್ಯಾಂಕ್ ಖಾತೆ", records: "ಭೂ ದಾಖಲೆ", deals: "ವ್ಯವಹಾರ", dashboard: "ಬೆಳವಣಿಗೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    support: "ಬೆಂಬಲ ಮತ್ತು ಸಹಾಯ", logout: "ಲಾಗ್ ಔಟ್",
    digilocker_verified: "ಡಿಜಿಲಾಕರ್ ಪರಿಶೀಲಿಸಿದ ವಿವರಗಳು",
    language_select: "ಭಾಷೆ",
    English: "English", Kannada: "ಕನ್ನಡ", Hindi: "हिंदी", Telugu: "తెలుగు", Marathi: "मराठी"
  },
  hi: {
    home: "होम", satellite: "सैटेलाइट", market: "बाज़ार", profile: "प्रोफ़ाइल", crop_ai: "फसल AI",
    farmer: "किसान", buy_now: "अभी खरीदें",
    bank: "बैंक खाता", records: "भूमि रिकॉर्ड", deals: "लेन-देन", dashboard: "ग्रोथ डैशबोर्ड",
    support: "मदद और समर्थन", logout: "लॉग आउट",
    digilocker_verified: "डिजिलॉकर सत्यापित विवरण",
    language_select: "भाषा",
    English: "English", Kannada: "ಕನ್ನಡ", Hindi: "हिंदी", Telugu: "తెలుగు", Marathi: "मराठी"
  },
  te: {
    home: "హోమ్", satellite: "ఉపగ్రహం", market: "మార్కెట్", profile: "ప్రొఫైల్", crop_ai: "పంట AI",
    farmer: "రైతు", buy_now: "ఇప్పుడు కొనండి",
    bank: "బ్యాంక్ ఖాతా", records: "భూమి రికార్డులు", deals: "లావాదేవీలు", dashboard: "వృద్ధి డాష్‌బోర్డ్",
    support: "సహాయం", logout: "లాగ్ అవుట్",
    digilocker_verified: "డిజిలాకర్ ధృవీకరించిన వివరాలు",
    language_select: "భాష",
    English: "English", Kannada: "ಕನ್ನಡ", Hindi: "हिंदी", Telugu: "తెలుగు", Marathi: "मराठी"
  },
  mr: {
    home: "होम", satellite: "उपग्रह", market: "बाजार", profile: "प्रोफाइल", crop_ai: "पीक AI",
    farmer: "शेतकरी", buy_now: "आता खरेदी करा",
    bank: "बँक खाते", records: "जमीन रेकॉर्ड", deals: "व्यवहार", dashboard: "वाढ डॅशबोर्ड",
    support: "मदत", logout: "लॉग आउट",
    digilocker_verified: "डिजिलॉकर सत्यापित तपशील",
    language_select: "भाषा",
    English: "English", Kannada: "ಕನ್ನಡ", Hindi: "हिंदी", Telugu: "తెలుగు", Marathi: "मराठी"
  }
};

export function LanguageProvider({ children, currentLang, setLang }) {
  const activeLang = currentLang || 'en';

  const t = (key) => {
    if (!translations[activeLang] || !translations[activeLang][key]) {
      // Fallback to English if translation is missing for the exact key
      return translations['en'][key] || key;
    }
    return translations[activeLang][key];
  };

  return (
    <LanguageContext.Provider value={{ activeLang, setActiveLang: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
