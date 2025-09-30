# Pravha Frontend Deployment Guide

This guide covers deployment options for the Pravha Flood Management System frontend.

## Prerequisites

- Node.js 18+ and npm
- Git
- Railway account (for Railway deployment)
- Vercel account (for Vercel deployment)
- Docker (for containerized deployment)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:8002

# Survam AI API Key
REACT_APP_SURVAM_AI_API_KEY=your_api_key_here
```

## Deployment Options

### 1. Railway Deployment

Railway is recommended for full-stack applications with backend integration.

#### Setup Steps:

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Set environment variables:**
   ```bash
   railway variables set REACT_APP_API_URL=https://your-backend-url.up.railway.app
   railway variables set REACT_APP_SURVAM_AI_API_KEY=your_api_key_here
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

#### Railway Configuration:

The `railway.json` file is already configured with:
- Production build command (`npm run build:prod`)
- Serve command (`npm run serve`)
- Health check configuration
- Restart policies

### 2. Vercel Deployment

Vercel is excellent for frontend-only deployments with global CDN.

#### Setup Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

#### Vercel Configuration:

The `vercel.json` file includes:
- Production build optimization
- Static asset caching
- Security headers
- SPA routing support

### 3. Docker Deployment

For containerized deployment on any platform supporting Docker.

#### Build and Run:

```bash
# Build the Docker image
docker build -t pravha-frontend .

# Run the container
docker run -p 3000:80 \
  -e REACT_APP_API_URL=https://your-backend-url.com \
  -e REACT_APP_SURVAM_AI_API_KEY=your_api_key_here \
  pravha-frontend
```

#### Using Docker Compose:

```bash
# Create .env file with your variables
cp env.example .env

# Edit .env with your values
# Then run:
docker-compose up -d
```

## Build Commands

### Development:
```bash
npm start
```

### Production Build:
```bash
npm run build:prod
```

### Serve Production Build:
```bash
npm run serve
```

## Environment-Specific Configurations

### Development
- Uses `http://localhost:8002` for API
- Source maps enabled
- Hot reload enabled

### Production
- Uses environment-specific API URL
- Source maps disabled for security
- Optimized build with compression
- Security headers enabled

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Ensure Node.js 18+ is installed
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

2. **Environment Variables Not Loading:**
   - Ensure variables start with `REACT_APP_`
   - Check variable names match exactly
   - Restart development server after changes

3. **API Connection Issues:**
   - Verify `REACT_APP_API_URL` is correct
   - Check CORS settings on backend
   - Ensure backend is running and accessible

4. **Deployment Issues:**
   - Check build logs for errors
   - Verify environment variables are set
   - Ensure all dependencies are in package.json

### Performance Optimization:

1. **Build Optimization:**
   - Use `npm run build:prod` for production
   - Enable gzip compression
   - Optimize images and assets

2. **Runtime Optimization:**
   - Enable service worker for caching
   - Use CDN for static assets
   - Implement lazy loading

## Security Considerations

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform-specific secret management
   - Rotate API keys regularly

2. **Build Security:**
   - Disable source maps in production
   - Use HTTPS in production
   - Implement CSP headers

3. **Dependencies:**
   - Regularly update dependencies
   - Use `npm audit` to check for vulnerabilities
   - Consider using `npm ci` for consistent installs

## Monitoring and Logs

### Railway:
- View logs: `railway logs`
- Monitor metrics in Railway dashboard

### Vercel:
- View logs in Vercel dashboard
- Monitor performance metrics

### Docker:
- View logs: `docker logs <container_id>`
- Monitor with `docker stats`

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review platform-specific documentation
3. Check build logs for specific errors
4. Ensure all environment variables are correctly set
