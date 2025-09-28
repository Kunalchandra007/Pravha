// MongoDB initialization script for Pravha
db = db.getSiblingDB('pravha_flood_management');

// Create collections with indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.predictions.createIndex({ "user_id": 1, "created_at": -1 });
db.alerts.createIndex({ "created_at": -1 });
db.sos_requests.createIndex({ "status": 1, "created_at": -1 });
db.shelters.createIndex({ "location": "2dsphere" });

// Insert sample data
db.users.insertMany([
  {
    "_id": ObjectId(),
    "name": "Admin User",
    "email": "admin@pravha.gov.in",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K5K5K5K", // admin123
    "role": "admin",
    "phone": "+1234567890",
    "location": "Delhi, India",
    "created_at": new Date(),
    "updated_at": new Date()
  },
  {
    "_id": ObjectId(),
    "name": "Test User",
    "email": "user@pravha.com",
    "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K5K5K5K", // user12345
    "role": "user",
    "phone": "+0987654321",
    "location": "Mumbai, India",
    "created_at": new Date(),
    "updated_at": new Date()
  }
]);

db.shelters.insertMany([
  {
    "_id": ObjectId(),
    "name": "Delhi Emergency Shelter",
    "location": {
      "type": "Point",
      "coordinates": [77.2090, 28.6139]
    },
    "address": "Central Delhi, India",
    "capacity": 500,
    "current_occupancy": 0,
    "facilities": ["Food", "Medical", "Water", "Electricity"],
    "contact": "+911234567890",
    "status": "active",
    "created_at": new Date()
  },
  {
    "_id": ObjectId(),
    "name": "Mumbai Flood Shelter",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    },
    "address": "Mumbai, Maharashtra, India",
    "capacity": 300,
    "current_occupancy": 0,
    "facilities": ["Food", "Medical", "Water"],
    "contact": "+912345678901",
    "status": "active",
    "created_at": new Date()
  }
]);

print("✅ Pravha database initialized successfully!");
