# 🚀 Pravha Deployment Guide

## Quick Public Deployment Options

### **Option 1: Railway + Vercel (Recommended)**

#### **Backend Deployment (Railway)**

1. **Go to Railway:**
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Pravha repository
   - Select the `backend` folder
   - Railway will auto-detect FastAPI

3. **Configure Environment Variables:**
   ```bash
   SECRET_KEY=your-super-secret-production-key-change-this
   MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/pravha_flood_management
   GMAIL_EMAIL=your-email@gmail.com
   GMAIL_PASSWORD=your-gmail-app-password
   PORT=8000
   ```

4. **Get Backend URL:**
   - Railway will provide: `https://your-app-name.up.railway.app`

#### **Frontend Deployment (Vercel)**

1. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Deploy Frontend:**
   - Click "New Project"
   - Import your GitHub repository
   - Select `pravha-frontend` folder
   - Vercel will auto-detect React

3. **Update API URL:**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add: `REACT_APP_API_URL` = `https://your-railway-backend-url.up.railway.app`

4. **Get Frontend URL:**
   - Vercel will provide: `https://your-app-name.vercel.app`

#### **Final Result:**
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.up.railway.app`
- **API Docs**: `https://your-app-name.up.railway.app/docs`

---

### **Option 2: DigitalOcean App Platform**

#### **Deploy Full Stack:**

1. **Go to DigitalOcean:**
   - Visit [cloud.digitalocean.com](https://cloud.digitalocean.com)
   - Sign up for account

2. **Create App:**
   - Click "Create App"
   - Connect GitHub repository
   - Select your Pravha repository

3. **Configure Services:**
   - **Backend Service:**
     - Source: `/backend`
     - Build Command: `pip install -r requirements_mongodb.txt`
     - Run Command: `gunicorn app_with_mongodb:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   
   - **Frontend Service:**
     - Source: `/pravha-frontend`
     - Build Command: `npm install && npm run build`
     - Output Directory: `build`

4. **Set Environment Variables:**
   ```bash
   SECRET_KEY=your-super-secret-production-key-change-this
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pravha_flood_management
   GMAIL_EMAIL=your-email@gmail.com
   GMAIL_PASSWORD=your-gmail-app-password
   REACT_APP_API_URL=https://your-backend-url.ondigitalocean.app
   ```

5. **Deploy:**
   - Click "Create Resources"
   - Wait for deployment to complete

---

### **Option 3: Quick Demo with ngrok**

#### **For Immediate Testing:**

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com
   # Or use package manager
   npm install -g ngrok
   ```

2. **Start Your Local App:**
   ```bash
   # Terminal 1 - Start Docker
   docker-compose up -d
   
   # Terminal 2 - Expose frontend
   ngrok http 3000
   
   # Terminal 3 - Expose backend
   ngrok http 8000
   ```

3. **Share Links:**
   - Frontend: `https://abc123.ngrok.io`
   - Backend: `https://def456.ngrok.io`

**Note:** ngrok links are temporary and change each time you restart.

---

## 🔧 Production Checklist

### **Before Deployment:**

- [ ] Update `SECRET_KEY` to a strong production key
- [ ] Set up MongoDB Atlas (cloud database)
- [ ] Configure Gmail App Password
- [ ] Update API URLs in frontend
- [ ] Test all functionality locally

### **After Deployment:**

- [ ] Test frontend loads correctly
- [ ] Test backend API endpoints
- [ ] Test user registration/login
- [ ] Test flood prediction
- [ ] Test SOS system
- [ ] Test admin dashboard

### **Environment Variables:**

#### **Backend (Railway/DigitalOcean):**
```bash
SECRET_KEY=your-super-secret-production-key-change-this
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/pravha_flood_management
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-gmail-app-password
PORT=8000
```

#### **Frontend (Vercel):**
```bash
REACT_APP_API_URL=https://your-backend-url.up.railway.app
REACT_APP_SURVAM_AI_API_KEY=your_survam_ai_api_key_here
```

---

## 🌐 Custom Domain (Optional)

### **Railway Custom Domain:**
1. Go to Railway project settings
2. Add custom domain
3. Update DNS records

### **Vercel Custom Domain:**
1. Go to Vercel project settings
2. Add custom domain
3. Update DNS records

---

## 📊 Monitoring & Maintenance

### **Railway:**
- View logs in Railway dashboard
- Monitor resource usage
- Set up alerts

### **Vercel:**
- View analytics in Vercel dashboard
- Monitor performance
- Set up webhooks

---

## 🆘 Troubleshooting

### **Common Issues:**

1. **CORS Errors:**
   - Update backend CORS settings
   - Check frontend API URL

2. **Database Connection:**
   - Verify MongoDB Atlas connection string
   - Check network access settings

3. **Build Failures:**
   - Check environment variables
   - Verify file paths
   - Review build logs

4. **API Not Working:**
   - Test backend endpoints directly
   - Check frontend API URL configuration
   - Verify CORS settings

---

## 🎯 Quick Start Commands

### **Railway + Vercel:**
```bash
# 1. Deploy backend to Railway
# 2. Deploy frontend to Vercel
# 3. Update API URL in Vercel
# 4. Share Vercel URL
```

### **DigitalOcean:**
```bash
# 1. Create DigitalOcean app
# 2. Connect GitHub repo
# 3. Configure services
# 4. Set environment variables
# 5. Deploy
```

### **ngrok (Quick Demo):**
```bash
# 1. Start local app
docker-compose up -d

# 2. Expose with ngrok
ngrok http 3000

# 3. Share ngrok URL
```

---

**Choose the option that best fits your needs! Railway + Vercel is recommended for the best performance and ease of use.**
