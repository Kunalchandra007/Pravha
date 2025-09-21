# 🌐 Translation Setup Guide

## Survam AI Translation Integration

This guide will help you set up the Survam AI translation service for the Pravha Flood Management System.

## 🔑 API Key Setup

### Method 1: Environment Variable (Recommended)
1. Create a `.env` file in the `pravha-frontend` directory:
```bash
cd pravha-frontend
touch .env
```

2. Add your Survam AI API key to the `.env` file:
```env
REACT_APP_SURVAM_AI_API_KEY=your_actual_survam_ai_api_key_here
```

### Method 2: Direct Configuration
1. Open `src/config/api.ts`
2. Replace `YOUR_SURVAM_AI_API_KEY_HERE` with your actual API key:
```typescript
export const SURVAM_AI_API_KEY = 'your_actual_survam_ai_api_key_here';
```

## 🚀 Features Added

### ✅ Translation Features
- **Multi-language Support**: 12+ Indian languages including Hindi, Bengali, Tamil, Telugu, etc.
- **Real-time Translation**: Automatic translation of all UI text
- **Language Selector**: Available in all major views (Landing, Admin Panel, etc.)
- **Caching**: Translated text is cached for better performance
- **Fallback**: If translation fails, original English text is shown

### ✅ SOS Request Integration
- **Real-time SOS Tracking**: SOS requests from citizens appear immediately in admin panel
- **Location Display**: Shows exact GPS coordinates of emergency
- **User Information**: Displays user details (name, email, phone) with SOS request
- **Status Management**: Admins can update SOS request status
- **Priority Handling**: SOS requests are marked as HIGH PRIORITY
- **Auto-alerts**: SOS requests automatically trigger emergency alerts

## 🌍 Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| English | en | English |
| Hindi | hi | हिन्दी |
| Bengali | bn | বাংলা |
| Telugu | te | తెలుగు |
| Marathi | mr | मराठी |
| Tamil | ta | தமிழ் |
| Gujarati | gu | ગુજરાતી |
| Kannada | kn | ಕನ್ನಡ |
| Malayalam | ml | മലയാളം |
| Punjabi | pa | ਪੰਜਾਬੀ |
| Odia | or | ଓଡ଼ିଆ |
| Assamese | as | অসমীয়া |

## 🔧 How It Works

### Translation Flow
1. User selects language from dropdown
2. Translation service translates all visible text
3. Translated text is cached for performance
4. UI updates with translated content

### SOS Request Flow
1. Citizen sends SOS request with location
2. Backend stores request in MongoDB
3. Admin panel automatically refreshes and shows new SOS
4. Emergency alerts are broadcast to all subscribers
5. Admin can manage and update SOS status

## 📱 Usage

### For Users
1. **Language Selection**: Click the language dropdown (🌐) in the top-right corner
2. **SOS Requests**: Use the SOS system in the citizen panel to send emergency requests

### For Admins
1. **Monitor SOS**: Check the "SOS Management" tab in the admin panel
2. **View Details**: Click on any SOS request to see full details
3. **Update Status**: Change status from PENDING to ASSIGNED/IN_PROGRESS/RESOLVED
4. **Location Tracking**: View exact GPS coordinates of emergency

## 🛠️ Technical Details

### Translation Service
- **API Endpoint**: `https://api.survam.ai/v1/translate`
- **Batch Translation**: Supports translating multiple texts at once
- **Error Handling**: Graceful fallback to original text
- **Performance**: Caching reduces API calls

### SOS Integration
- **Real-time Updates**: Admin panel refreshes every 30 seconds
- **Database Storage**: All SOS requests stored in MongoDB
- **User Context**: Full user information included with requests
- **Alert System**: Automatic emergency alert broadcasting

## 🔒 Security Notes

- API key is stored securely in environment variables
- Translation requests are made client-side
- SOS requests include user authentication
- All sensitive data is properly handled

## 🐛 Troubleshooting

### Translation Issues
- **No Translation**: Check if API key is correctly set
- **Slow Translation**: Check internet connection
- **Partial Translation**: Some text might not be translatable

### SOS Issues
- **SOS Not Appearing**: Check if backend is running
- **Location Issues**: Ensure location permission is granted
- **User Info Missing**: Verify user is logged in

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify API key is correct
3. Ensure backend server is running
4. Check network connectivity

---

**Ready to use multi-language flood management with real-time SOS tracking! 🌊🌐🆘**
