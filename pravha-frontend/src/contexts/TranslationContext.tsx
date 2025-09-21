import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TranslationService, SUPPORTED_LANGUAGES, Language } from '../services/translationService';

interface TranslationContextType {
  currentLanguage: string;
  setCurrentLanguage: (language: string) => void;
  translate: (text: string) => Promise<string>;
  translateMultiple: (texts: string[]) => Promise<string[]>;
  isLoading: boolean;
  supportedLanguages: Language[];
  translationCache: Map<string, string>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  apiKey: string;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children, apiKey }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [translationService, setTranslationService] = useState<TranslationService | null>(null);
  const [translationCache, setTranslationCache] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Initialize translation service
    const service = new TranslationService(apiKey);
    setTranslationService(service);
  }, [apiKey]);

  const translate = async (text: string): Promise<string> => {
    if (!translationService || currentLanguage === 'en') {
      return text;
    }

    // Check cache first
    const cacheKey = `${text}_${currentLanguage}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    setIsLoading(true);
    try {
      const result = await translationService.translateText(text, currentLanguage);
      const translatedText = result.translatedText;
      
      // Cache the result
      setTranslationCache(prev => new Map(prev).set(cacheKey, translatedText));
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    } finally {
      setIsLoading(false);
    }
  };

  const translateMultiple = async (texts: string[]): Promise<string[]> => {
    if (!translationService || currentLanguage === 'en') {
      return texts;
    }

    setIsLoading(true);
    try {
      const results = await translationService.translateMultipleTexts(texts, currentLanguage);
      return results.map((result: any) => result.translatedText);
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts;
    } finally {
      setIsLoading(false);
    }
  };

  const value: TranslationContextType = {
    currentLanguage,
    setCurrentLanguage,
    translate,
    translateMultiple,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES,
    translationCache,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Hook for translating text with automatic re-translation on language change
export const useTranslatedText = (text: string): string => {
  const { currentLanguage, translate, translationCache } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    const cacheKey = `${text}_${currentLanguage}`;
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
    } else if (currentLanguage !== 'en') {
      translate(text).then(setTranslatedText);
    } else {
      setTranslatedText(text);
    }
  }, [text, currentLanguage, translate, translationCache]);

  return translatedText;
};
