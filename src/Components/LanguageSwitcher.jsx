import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FiChevronDown } from 'react-icons/fi';

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (lang) => {
    if (lang === language) return;
    setLanguage(lang);
    setIsOpen(false);
    window.location.reload();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 w-[2.25rem] h-[2.25rem] sm:w-auto sm:h-[2.75rem] rounded-xl border border-border bg-surface-alt hover:bg-surface text-primary text-sm font-medium transition-all duration-200 shadow-sm active:scale-95 select-none p-0 sm:px-3 sm:py-2"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none">🌐</span>
        <span className="hidden xl:inline">
          {language === 'ar' ? 'العربية' : 'English'}
        </span>
        <FiChevronDown className={`hidden xl:inline w-4 h-4 text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`lang-dropdown-menu ${isOpen ? 'open' : ''}`}>
        <button
          type="button"
          onClick={() => handleLanguageChange('en')}
          className={`lang-dropdown-item ${language === 'en' ? 'active' : ''}`}
        >
          <span>🌐 English</span>
          {language === 'en' && <span className="text-xs">✓</span>}
        </button>
        <button
          type="button"
          onClick={() => handleLanguageChange('ar')}
          className={`lang-dropdown-item ${language === 'ar' ? 'active' : ''}`}
        >
          <span>🌐 العربية</span>
          {language === 'ar' && <span className="text-xs">✓</span>}
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
