# Pravha Flood Management System - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set build command: `npm run build`
5. Set output directory: `build`
6. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.railway.app`

#### Backend (Railway)
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Select your backend folder
4. Add MongoDB service
5. Set environment variables:
   - `MONGODB_URL` (auto-generated)
   - `SECRET_KEY` (generate a secure key)
   - `ENVIRONMENT=production`

### Option 2: Netlify + Render

#### Frontend (Netlify)
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `build`
4. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.onrender.com`

#### Backend (Render)
1. Connect GitHub repository
2. Select backend folder
3. Build command: `pip install -r requirements_mongodb.txt`
4. Start command: `python3 app_with_mongodb.py`
5. Add MongoDB Atlas database

### Option 3: Heroku (Paid)

#### Frontend
1. Create Heroku app
2. Add buildpack: `https://github.com/mars/create-react-app-buildpack`
3. Deploy from GitHub

#### Backend
1. Create Heroku app
2. Add MongoDB Atlas addon
3. Set environment variables
4. Deploy from GitHub

## 🔧 Pre-Deployment Checklist

### Frontend
- [ ] Update API URL in config
- [ ] Test production build: `npm run build`
- [ ] Verify all environment variables

### Backend
- [ ] Update CORS settings for production domain
- [ ] Set secure SECRET_KEY
- [ ] Configure MongoDB connection
- [ ] Test all API endpoints

### Database
- [ ] Set up MongoDB Atlas (free tier available)
- [ ] Configure network access
- [ ] Create database user
- [ ] Test connection

## 🌐 Environment Variables

### Frontend
```
REACT_APP_API_URL=https://your-backend-url.com
```

### Backend
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/pravha_flood_management
SECRET_KEY=your-super-secure-secret-key-here
ENVIRONMENT=production
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 📱 Custom Domain (Optional)
1. Purchase domain from Namecheap/GoDaddy
2. Configure DNS settings
3. Add domain to hosting platform
4. Update CORS settings

## 🔒 Security Considerations
- Use HTTPS in production
- Set secure SECRET_KEY
- Configure CORS properly
- Use MongoDB Atlas security features
- Enable API rate limiting
- Regular security updates

## 📊 Monitoring
- Set up error tracking (Sentry)
- Monitor API performance
- Database monitoring
- User analytics
