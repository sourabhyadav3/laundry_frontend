import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';
import { getFlatTranslationMap, translateString } from './flatTranslations';

const LanguageContext = createContext();
const STORAGE_KEY = 'language';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

const translateAttributes = (el, map) => {
  ['placeholder', 'title', 'aria-label', 'value'].forEach((attr) => {
    const val = el.getAttribute(attr);
    if (!val) return;
    const trimmed = val.trim();
    if (map[trimmed]) {
      el.setAttribute(attr, map[trimmed]);
    }
  });
};

const translateTextValue = (text, map) => {
  if (!text || !text.trim()) return text;
  const trimmed = text.trim();
  if (map[trimmed]) {
    return text.replace(trimmed, map[trimmed]);
  }
  return text;
};

const translateDOM = (root, map) => {
  if (!root || !map) return;

  const walk = (node) => {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const translated = translateTextValue(node.nodeValue, map);
      if (translated !== node.nodeValue) {
        node.nodeValue = translated;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP_TAGS.has(node.tagName)) return;
    if (node.hasAttribute('data-no-translate')) return;

    translateAttributes(node, map);

    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
      return;
    }

    if (node.tagName === 'OPTION') {
      const translated = translateTextValue(node.textContent, map);
      if (translated !== node.textContent) {
        node.textContent = translated;
      }
      return;
    }

    for (let i = 0; i < node.childNodes.length; i += 1) {
      walk(node.childNodes[i]);
    }
  };

  walk(root);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  });

  const flatMap = useMemo(
    () => (language === 'ar' ? getFlatTranslationMap() : {}),
    [language]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const tr = useCallback(
    (text) => translateString(text, language),
    [language]
  );

  const t = useCallback(
    (key) => {
      const keys = key.split('.');
      let value = translations[language];
      for (const k of keys) {
        if (value && value[k] !== undefined) {
          value = value[k];
        } else {
          let engValue = translations.en;
          for (const ek of keys) {
            if (engValue && engValue[ek] !== undefined) {
              engValue = engValue[ek];
            } else {
              return key;
            }
          }
          return engValue;
        }
      }
      return value;
    },
    [language]
  );

  // DOM fallback: translates hardcoded English in JSX (modals portaled to body, etc.)
  useEffect(() => {
    if (language !== 'ar') return undefined;

    const map = getFlatTranslationMap();
    let rafId = null;

    const scheduleTranslate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        translateDOM(document.body, map);
      });
    };

    scheduleTranslate();

    const observer = new MutationObserver(() => {
      scheduleTranslate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t, tr, flatMap }),
    [language, t, tr, flatMap]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
