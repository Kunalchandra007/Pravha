// Translation service using Survam AI API
import { STATIC_TRANSLATIONS } from '../utils/translations';

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
];

export class TranslationService {
  private apiKey: string;
  private baseUrl: string = 'https://api.sarvam.ai/v1/translate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<TranslationResponse> {
    console.log('TranslationService.translateText called:', { text, targetLanguage, sourceLanguage });
    
    // If it's English, return as is
    if (targetLanguage === 'en') {
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    }

    // Check for hardcoded static translations first
    const staticTranslation = this.getStaticTranslation(text, targetLanguage);
    if (staticTranslation) {
      return {
        translatedText: staticTranslation,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    }

    // For dynamic content, use API translation
    try {
      const response = await fetch('https://api.sarvam.ai/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          input: text,
          source_language_code: sourceLanguage,
          target_language_code: targetLanguage,
          mode: 'formal',
          model: 'sarvam-translate:v1',
          numerals_format: 'native',
          speaker_gender: 'Male',
          enable_preprocessing: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translated_text || data.output || text;
      
      return {
        translatedText: translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    } catch (error) {
      console.error('Translation API error:', error);
      // Return original text if translation fails
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    }
  }

  private getStaticTranslation(text: string, targetLanguage: string): string | null {
    // Check all static translation categories
    const categories = ['landing', 'login', 'common'];
    
    for (const category of categories) {
      const categoryTranslations = (STATIC_TRANSLATIONS as any)[category];
      if (categoryTranslations) {
        for (const key in categoryTranslations) {
          const translations = categoryTranslations[key];
          if (translations && translations[targetLanguage]) {
            // Check if any translation matches our text
            if (translations['en'] === text) {
              return translations[targetLanguage];
            }
          }
        }
      }
    }
    
    return null;
  }

  async translateMultipleTexts(
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<TranslationResponse[]> {
    try {
      // For now, translate texts one by one since Sarvam AI doesn't have batch endpoint
      const results = await Promise.all(
        texts.map(text => this.translateText(text, targetLanguage, sourceLanguage))
      );
      return results;
    } catch (error) {
      console.error('Batch translation error:', error);
      // Return original texts if translation fails
      return texts.map(text => ({
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      }));
    }
  }

  getLanguageByCode(code: string): Language | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  }

  getLanguageName(code: string): string {
    const language = this.getLanguageByCode(code);
    return language ? language.nativeName : code;
  }
}

// Create singleton instance
let translationService: TranslationService | null = null;

export const initializeTranslationService = (apiKey: string): TranslationService => {
  translationService = new TranslationService(apiKey);
  return translationService;
};

export const getTranslationService = (): TranslationService => {
  if (!translationService) {
    throw new Error('Translation service not initialized. Call initializeTranslationService first.');
  }
  return translationService;
};

export default TranslationService;
