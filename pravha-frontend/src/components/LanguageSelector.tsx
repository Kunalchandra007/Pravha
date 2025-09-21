import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { currentLanguage, setCurrentLanguage, supportedLanguages, isLoading } = useTranslation();

  console.log('LanguageSelector rendered:', { currentLanguage, supportedLanguages, isLoading });

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Language changed to:', event.target.value);
    setCurrentLanguage(event.target.value);
  };

  return (
    <div className={`language-selector ${className}`}>
      <span className="language-icon">🌐</span>
      <select
        id="language-select"
        value={currentLanguage}
        onChange={handleLanguageChange}
        disabled={isLoading}
        className="language-select"
      >
        {supportedLanguages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.nativeName}
          </option>
        ))}
      </select>
      {isLoading && (
        <span className="translation-loading">...</span>
      )}
    </div>
  );
};

export default LanguageSelector;
