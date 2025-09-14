# Pravha 🌊
AI-Powered Flood Forecasting & Emergency Response System

## 🎯 Problem Statement
Developing an AI-driven flood forecasting and autonomous emergency response system to predict, monitor, and coordinate responses to flooding events, ultimately saving lives and minimizing damage through early warning and efficient response coordination.

## 💡 Solution
Pravha integrates real-time sensor data, machine learning, and GIS technology to:
- Predict flood occurrences with timing and severity
- Generate automated early warnings
- Coordinate emergency responses
- Plan evacuation routes intelligently

## 🚀 Key Features
- **Smart Prediction Engine**
  - XGBoost ML model for flood forecasting
  - Location-based feature generation using GPS coordinates
  - Confidence level indicators and uncertainty calculations

- **Real-time Monitoring**
  - Integration with weather stations
  - River sensor data processing
  - Satellite imagery analysis
  - IoT device network integration

- **Automated Alerts**
  - Multi-channel warning system
  - SMS notifications
  - Mobile app alerts
  - Public announcement integration

- **Interactive GIS Mapping**
  - Real-time flood risk visualization
  - 3D flood simulations
  - Affected area mapping
  - Resource location tracking

- **Emergency Response AI**
  - Automated route planning
  - Resource allocation optimization
  - Emergency response coordination
  - Real-time situation assessment

## 🛠️ Tech Stack
- **Frontend**: React.js with TypeScript, Tailwind CSS, Leaflet Maps
- **Backend**: Python (FastAPI), XGBoost ML Model
- **ML/AI**: XGBoost, scikit-learn, NumPy
- **Real-time Features**: Email Alert System, Location-based Predictions
- **Development**: Uvicorn server, CORS enabled

## 📊 Data Sources
- Weather station readings
- River sensor data
- Satellite imagery
- Historical flood records
- Terrain and soil data
- IoT device networks

## 🎯 Impact & Goals
- Early Warning: 24-48 hours advance prediction
- Coverage: 95% of flood-prone areas
- Accuracy: 85% prediction accuracy
- Response Time: 60% reduction

## 🔄 System Architecture
Sensor Data → Data Processing → ML Prediction → Alert Generation → Response Coordination

## 🚀 Getting Started

### Prerequisites
- Python 3.9+ installed
- Node.js 16+ and npm installed
- Git installed

### Setup Instructions

#### Step 1: Clone the Repository
```bash
git clone https://github.com/Kunalchandra007/Pravha.git
cd Pravha
```

#### Step 2: Setup Backend
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r ../requirements.txt

# Start the backend server
uvicorn app_with_alerts:app --host 0.0.0.0 --port 8002
```

#### Step 3: Setup Frontend (Open New Terminal)
```bash
# Navigate to frontend directory
cd pravha-frontend

# Install Node.js dependencies
npm install

# Start the frontend development server
npm start
```

#### Step 4: Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8002
- **API Documentation**: http://localhost:8002/docs

### What Each Component Does
- **Backend**: FastAPI server with ML models for flood prediction
- **Frontend**: React.js web interface for visualization and interaction
- **Models**: Pre-trained XGBoost and Neural Network models for flood forecasting

### Troubleshooting
- If backend fails: Check if all Python packages are installed
- If frontend fails: Run `npm install` again
- If ports are busy: Change ports in the commands above

