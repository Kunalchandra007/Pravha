# Backend Setup Guide

## Local Development Setup

### 1. Backend Server Setup

To run the application locally with MongoDB, you need to start the backend server:

```bash
# Navigate to the backend directory
cd pravha-backend

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

The backend server should start on `http://localhost:8002`

### 2. Environment Configuration

The frontend is configured to automatically detect the environment:

- **Development Mode**: Uses `http://localhost:8002` (local backend)
- **Production Mode**: Uses Railway backend URL

### 3. Database Configuration

For local development, the backend will use MongoDB:
- Default connection: `mongodb://localhost:27017/pravha_flood_system`
- Make sure MongoDB is running locally

### 4. Testing the Setup

1. Start the backend server on port 8002
2. Start the frontend: `npm start`
3. Try to login - you should see "Local backend is not running" error if backend is not started
4. Once backend is running, login should work with MongoDB

### 5. Troubleshooting

**Error: "Local backend is not running"**
- Make sure the backend server is running on port 8002
- Check if there are any errors in the backend console
- Verify MongoDB is running and accessible

**Error: "Remote backend connection failed"**
- Check your internet connection
- Verify Railway backend is accessible
- Check Railway deployment status

### 6. Environment Variables

You can override the default configuration by creating a `.env.local` file:

```env
# Force local backend usage
REACT_APP_USE_LOCAL_BACKEND=true

# Custom API URL
REACT_APP_API_URL=http://localhost:8002

# Enable debug mode
REACT_APP_DEBUG_MODE=true
```

### 7. Production Deployment

For production deployment:
- Set `REACT_APP_USE_LOCAL_BACKEND=false`
- Set `REACT_APP_API_URL` to your production backend URL
- Ensure Railway backend is deployed and accessible
