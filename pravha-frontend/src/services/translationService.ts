// Translation service using Survam AI API
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
    
    // Mock translations for demonstration
    const mockTranslations: { [key: string]: { [key: string]: string } } = {
      'Flood Safety Portal': {
        'hi': 'बाढ़ सुरक्षा पोर्टल',
        'bn': 'বন্যা নিরাপত্তা পোর্টাল',
        'te': 'వరద భద్రతా పోర్టల్',
        'ta': 'வெள்ளம் பாதுகாப்பு போர்டல்',
        'mr': 'पूर सुरक्षा पोर्टल',
        'gu': 'પૂર સુરક્ષા પોર્ટલ',
        'kn': 'ವೈಪತ್ತು ಸುರಕ್ಷತೆ ಪೋರ್ಟಲ್',
        'ml': 'വെള്ളപ്പൊക്ക സുരക്ഷാ പോർട്ടൽ',
        'pa': 'ਹੜ੍ਹ ਸੁਰੱਖਿਆ ਪੋਰਟਲ',
        'or': 'ବନ୍ୟା ସୁରକ୍ଷା ପୋର୍ଟାଲ',
        'as': 'বানপানী সুৰক্ষা পোৰ্টেল'
      },
      'Citizen Emergency Management System': {
        'hi': 'नागरिक आपातकालीन प्रबंधन प्रणाली',
        'bn': 'নাগরিক জরুরি ব্যবস্থাপনা ব্যবস্থা',
        'te': 'పౌర అత్యవసర నిర్వహణ వ్యవస్థ',
        'ta': 'குடிமகன் அவசரகால மேலாண்மை அமைப்பு',
        'mr': 'नागरिक आणीबाणी व्यवस्थापन प्रणाली',
        'gu': 'નાગરિક આપત્તિકાળીન વ્યવસ્થાપન સિસ્ટમ',
        'kn': 'ನಾಗರಿಕ ತುರ್ತು ನಿರ್ವಹಣೆ ವ್ಯವಸ್ಥೆ',
        'ml': 'പൗര അടിയന്തര നിർവഹണ സിസ്റ്റം',
        'pa': 'ਨਾਗਰਿਕ ਐਮਰਜੈਂਸੀ ਪ੍ਰਬੰਧਨ ਸਿਸਟਮ',
        'or': 'ନାଗରିକ ଜରୁରୀକାଳୀନ ପରିଚାଳନା ବ୍ୟବସ୍ଥା',
        'as': 'নাগৰিক জৰুৰীকালীন ব্যৱস্থাপনা ব্যৱস্থা'
      }
    };

    // If it's English, return as is
    if (targetLanguage === 'en') {
      return {
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    }

    // Check if we have a mock translation
    if (mockTranslations[text] && mockTranslations[text][targetLanguage]) {
      return {
        translatedText: mockTranslations[text][targetLanguage],
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      };
    }

    // For other text, return original for now
    return {
      translatedText: text,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
    };
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
