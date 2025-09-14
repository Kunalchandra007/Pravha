#!/usr/bin/env python3
"""
Test script for enhanced Pravha API
Tests all the new GIS and location-based features
"""

import requests
import json
import time

BASE_URL = "http://localhost:8002"

def test_endpoint(endpoint, method="GET", data=None):
    """Test an API endpoint and return the result"""
    try:
        url = f"{BASE_URL}{endpoint}"
        
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    print("🧪 Testing Enhanced Pravha API")
    print("=" * 50)
    
    # Test basic system status
    print("\n1. Testing System Status...")
    result = test_endpoint("/system/status")
    if result["success"]:
        print("✅ System Status: OK")
        print(f"   Model Status: {result['data']['components']['ml_model']['status']}")
        print(f"   Alert System: {result['data']['components']['alert_system']['status']}")
    else:
        print(f"❌ System Status: {result['error']}")
    
    # Test prediction system
    print("\n2. Testing Prediction System...")
    result = test_endpoint("/system/test-prediction")
    if result["success"]:
        print("✅ Prediction System: OK")
        for test in result["data"]["test_results"]:
            print(f"   {test['scenario']}: {test['probability']}% ({test['risk_level']})")
    else:
        print(f"❌ Prediction System: {result['error']}")
    
    # Test GIS flood zones
    print("\n3. Testing Dynamic Flood Zones...")
    result = test_endpoint("/gis/flood-zones")
    if result["success"]:
        zones = result["data"]
        print(f"✅ Generated {len(zones)} flood zones")
        for zone in zones[:3]:  # Show first 3
            print(f"   {zone['name']}: {zone['probability']}% ({zone['risk_level']})")
    else:
        print(f"❌ Flood Zones: {result['error']}")
    
    # Test sensor data
    print("\n4. Testing Dynamic Sensor Network...")
    result = test_endpoint("/gis/sensors")
    if result["success"]:
        sensors = result["data"]
        print(f"✅ Generated {len(sensors)} sensors")
        critical_sensors = [s for s in sensors if s["status"] == "CRITICAL"]
        print(f"   Critical sensors: {len(critical_sensors)}")
        if critical_sensors:
            print(f"   Example: {critical_sensors[0]['name']} - {critical_sensors[0]['value']} {critical_sensors[0]['unit']}")
    else:
        print(f"❌ Sensor Data: {result['error']}")
    
    # Test location-based prediction
    print("\n5. Testing Location-Based Prediction...")
    # Test for Delhi coordinates
    result = test_endpoint("/gis/predict-location?latitude=28.6139&longitude=77.2090", method="POST")
    if result["success"]:
        pred = result["data"]
        print(f"✅ Location Prediction: {pred['probability']}% ({pred['risk_level']})")
        print(f"   Recommendations: {len(pred['recommendations'])} items")
        print(f"   Nearby sensors: {len(pred['nearby_sensors'])}")
    else:
        print(f"❌ Location Prediction: {result['error']}")
    
    # Test real-time GIS data
    print("\n6. Testing Real-time GIS Dashboard...")
    result = test_endpoint("/gis/realtime-data")
    if result["success"]:
        data = result["data"]
        print(f"✅ Real-time Data: Overall Status {data['overall_status']}")
        stats = data["statistics"]
        print(f"   Zones: {stats['total_zones']} total, {stats['high_risk_zones']} high-risk")
        print(f"   Sensors: {stats['total_sensors']} total, {stats['critical_sensors']} critical")
    else:
        print(f"❌ Real-time Data: {result['error']}")
    
    # Test evacuation centers
    print("\n7. Testing Evacuation Centers...")
    result = test_endpoint("/gis/evacuation-centers")
    if result["success"]:
        centers = result["data"]
        print(f"✅ Evacuation Centers: {len(centers['evacuation_centers'])} available")
        print(f"   Total capacity: {centers['total_capacity']} people")
        print(f"   Emergency hotline: {centers['emergency_hotline']}")
    else:
        print(f"❌ Evacuation Centers: {result['error']}")
    
    # Test bulk prediction
    print("\n8. Testing Bulk Location Prediction...")
    test_locations = [
        {"latitude": 28.6139, "longitude": 77.2090, "name": "Central Delhi"},
        {"latitude": 28.7041, "longitude": 77.1025, "name": "Rohini"},
        {"latitude": 28.5244, "longitude": 77.1588, "name": "Vasant Kunj"}
    ]
    result = test_endpoint("/gis/bulk-predict", method="POST", data=test_locations)
    if result["success"]:
        predictions = result["data"]
        print(f"✅ Bulk Prediction: {predictions['total_locations']} locations analyzed")
        print(f"   High risk locations: {predictions['high_risk_count']}")
        for pred in predictions["predictions"]:
            print(f"   {pred['name']}: {pred['probability']}% ({pred['risk_level']})")
    else:
        print(f"❌ Bulk Prediction: {result['error']}")
    
    # Test incident reporting
    print("\n9. Testing Incident Reporting...")
    test_incident = {
        "location": [28.6139, 77.2090],
        "severity": "HIGH",
        "description": "Water level rising rapidly near Yamuna bridge",
        "reporter": "Field Team Alpha",
        "contact": "+91-9876543210"
    }
    result = test_endpoint("/gis/report-incident", method="POST", data=test_incident)
    if result["success"]:
        incident = result["data"]
        print(f"✅ Incident Reported: {incident['incident']['id']}")
        print(f"   Response: {incident['response']}")
    else:
        print(f"❌ Incident Reporting: {result['error']}")
    
    # Test regular prediction with location
    print("\n10. Testing Enhanced Prediction API...")
    test_prediction = {
        "features": [6, 4, 3, 7, 8, 6, 3, 6, 5, 7, 3, 4, 6, 5, 6, 7, 8, 3, 6, 4],
        "location": "28.6139, 77.2090 (Central Delhi)",
        "enable_alerts": False  # Don't spam alerts during testing
    }
    result = test_endpoint("/predict", method="POST", data=test_prediction)
    if result["success"]:
        pred = result["data"]
        print(f"✅ Enhanced Prediction: {pred['probability']:.3f} ({pred['risk_level']})")
        print(f"   Alert: {pred['alert']}")
        print(f"   Uncertainty: ±{pred['uncertainty']:.3f}")
    else:
        print(f"❌ Enhanced Prediction: {result['error']}")
    
    print("\n" + "=" * 50)
    print("🎉 API Testing Complete!")
    print("💡 Start the frontend to see the enhanced GIS features in action")
    print("🌐 Frontend: npm start (in pravha-frontend directory)")
    print("📊 API Docs: http://localhost:8002/docs")

if __name__ == "__main__":
    main()