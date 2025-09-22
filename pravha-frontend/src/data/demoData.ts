// Demo data for shelters, alerts, and SOS requests across different Indian states

export interface DemoLocation {
  name: string;
  coordinates: [number, number];
  state: string;
}

export interface DemoShelter {
  id: string;
  name: string;
  address: string;
  capacity: number;
  currentOccupancy: number;
  coordinates: [number, number];
  facilities: string[];
  contact: string;
  state: string;
  isDemo: boolean;
}

export interface DemoAlert {
  id: string;
  alert_type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  location: string;
  message: string;
  coordinates: [number, number];
  state: string;
  timestamp: string;
  status: string;
  isDemo: boolean;
}

export interface DemoSOS {
  id: string;
  user_id: string;
  location: [number, number];
  message: string;
  emergency_type: string;
  state: string;
  timestamp: string;
  status: string;
  isDemo: boolean;
}

// Major Indian cities with coordinates
export const INDIAN_CITIES: DemoLocation[] = [
  // Delhi NCR
  { name: "New Delhi", coordinates: [28.6139, 77.2090], state: "Delhi" },
  { name: "Gurgaon", coordinates: [28.4595, 77.0266], state: "Haryana" },
  { name: "Noida", coordinates: [28.5355, 77.3910], state: "Uttar Pradesh" },
  
  // Maharashtra
  { name: "Mumbai", coordinates: [19.0760, 72.8777], state: "Maharashtra" },
  { name: "Pune", coordinates: [18.5204, 73.8567], state: "Maharashtra" },
  { name: "Nagpur", coordinates: [21.1458, 79.0882], state: "Maharashtra" },
  
  // Karnataka
  { name: "Bangalore", coordinates: [12.9716, 77.5946], state: "Karnataka" },
  { name: "Mysore", coordinates: [12.2958, 76.6394], state: "Karnataka" },
  { name: "Mangalore", coordinates: [12.9141, 74.8560], state: "Karnataka" },
  
  // Tamil Nadu
  { name: "Chennai", coordinates: [13.0827, 80.2707], state: "Tamil Nadu" },
  { name: "Coimbatore", coordinates: [11.0168, 76.9558], state: "Tamil Nadu" },
  { name: "Madurai", coordinates: [9.9252, 78.1198], state: "Tamil Nadu" },
  
  // West Bengal
  { name: "Kolkata", coordinates: [22.5726, 88.3639], state: "West Bengal" },
  { name: "Durgapur", coordinates: [23.5204, 87.3119], state: "West Bengal" },
  
  // Gujarat
  { name: "Ahmedabad", coordinates: [23.0225, 72.5714], state: "Gujarat" },
  { name: "Surat", coordinates: [21.1702, 72.8311], state: "Gujarat" },
  { name: "Vadodara", coordinates: [22.3072, 73.1812], state: "Gujarat" },
  
  // Rajasthan
  { name: "Jaipur", coordinates: [26.9124, 75.7873], state: "Rajasthan" },
  { name: "Jodhpur", coordinates: [26.2389, 73.0243], state: "Rajasthan" },
  { name: "Udaipur", coordinates: [24.5854, 73.7125], state: "Rajasthan" },
  
  // Kerala
  { name: "Kochi", coordinates: [9.9312, 76.2673], state: "Kerala" },
  { name: "Thiruvananthapuram", coordinates: [8.5241, 76.9366], state: "Kerala" },
  { name: "Kozhikode", coordinates: [11.2588, 75.7804], state: "Kerala" },
  
  // Andhra Pradesh
  { name: "Hyderabad", coordinates: [17.3850, 78.4867], state: "Andhra Pradesh" },
  { name: "Visakhapatnam", coordinates: [17.6868, 83.2185], state: "Andhra Pradesh" },
  
  // Uttar Pradesh
  { name: "Lucknow", coordinates: [26.8467, 80.9462], state: "Uttar Pradesh" },
  { name: "Kanpur", coordinates: [26.4499, 80.3319], state: "Uttar Pradesh" },
  { name: "Agra", coordinates: [27.1767, 78.0081], state: "Uttar Pradesh" },
  
  // Bihar
  { name: "Patna", coordinates: [25.5941, 85.1376], state: "Bihar" },
  { name: "Gaya", coordinates: [24.7953, 85.0000], state: "Bihar" },
  
  // Odisha
  { name: "Bhubaneswar", coordinates: [20.2961, 85.8245], state: "Odisha" },
  { name: "Cuttack", coordinates: [20.4625, 85.8820], state: "Odisha" },
  
  // Assam
  { name: "Guwahati", coordinates: [26.1445, 91.7362], state: "Assam" },
  { name: "Dibrugarh", coordinates: [27.4728, 94.9119], state: "Assam" },
  
  // Punjab
  { name: "Chandigarh", coordinates: [30.7333, 76.7794], state: "Punjab" },
  { name: "Amritsar", coordinates: [31.6340, 74.8737], state: "Punjab" },
  { name: "Ludhiana", coordinates: [30.9010, 75.8573], state: "Punjab" }
];

// Generate demo shelters across different states
export const generateDemoShelters = (): DemoShelter[] => {
  const shelterTypes = [
    'Emergency Relief Center',
    'Community Shelter',
    'Flood Relief Camp',
    'Temporary Housing',
    'Emergency Shelter',
    'Disaster Relief Center',
    'Evacuation Center',
    'Rescue Camp',
    'Safety Shelter',
    'Crisis Center'
  ];

  const facilities = [
    'Medical Aid', 'Food & Water', 'Blankets', 'Sanitation', 'Power Backup',
    'Communication', 'First Aid', 'Emergency Supplies', 'Sleeping Arrangements',
    'Childcare', 'Elderly Care', 'Pet Care', 'Transportation'
  ];

  const shelters: DemoShelter[] = [];
  
  INDIAN_CITIES.forEach((city, cityIndex) => {
    // Generate 1-3 shelters per city
    const numShelters = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numShelters; i++) {
      // Generate coordinates within 5km radius of city center
      const radius = 0.05; // ~5km
      const angle = (Math.PI * 2 * i) / numShelters + (Math.random() - 0.5) * 0.5;
      const distance = Math.random() * radius;
      
      const lat = city.coordinates[0] + Math.cos(angle) * distance;
      const lng = city.coordinates[1] + Math.sin(angle) * distance;
      
      const shelterType = shelterTypes[Math.floor(Math.random() * shelterTypes.length)];
      const shelterFacilities = facilities
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 5) + 3);
      
      shelters.push({
        id: `demo-shelter-${cityIndex}-${i}`,
        name: `${shelterType} - ${city.name}`,
        address: `Near ${city.name} City Center, ${city.state}`,
        capacity: Math.floor(Math.random() * 300) + 50,
        currentOccupancy: Math.floor(Math.random() * 150),
        coordinates: [lat, lng],
        facilities: shelterFacilities,
        contact: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        state: city.state,
        isDemo: true
      });
    }
  });
  
  return shelters;
};

// Generate demo alerts across different states
export const generateDemoAlerts = (): DemoAlert[] => {
  const alertTypes = [
    'FLOOD_PREDICTION',
    'HEAVY_RAIN_WARNING',
    'RIVER_OVERFLOW',
    'DAM_BREACH_RISK',
    'URBAN_FLOODING',
    'LANDSLIDE_RISK',
    'CYCLONE_WARNING',
    'STORM_SURGE'
  ];

  const severityLevels: ('LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL')[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  
  const alertMessages = {
    FLOOD_PREDICTION: [
      'Heavy rainfall predicted in the area',
      'River levels rising rapidly',
      'Flood risk assessment indicates danger',
      'Water levels approaching critical threshold'
    ],
    HEAVY_RAIN_WARNING: [
      'Heavy rainfall expected for next 24 hours',
      'Monsoon activity intensifying in region',
      'Flash flood warning issued',
      'Precipitation levels exceeding normal limits'
    ],
    RIVER_OVERFLOW: [
      'River water levels above danger mark',
      'Banks may overflow causing flooding',
      'Evacuation recommended for low-lying areas',
      'River monitoring indicates overflow risk'
    ],
    DAM_BREACH_RISK: [
      'Dam water levels at critical capacity',
      'Emergency release may be required',
      'Downstream areas at risk of flooding',
      'Dam structural integrity under review'
    ],
    URBAN_FLOODING: [
      'Drainage systems overwhelmed',
      'Water logging in city areas',
      'Traffic disruptions due to flooding',
      'Urban infrastructure at risk'
    ],
    LANDSLIDE_RISK: [
      'Heavy rainfall increasing landslide risk',
      'Hilly terrain unstable due to moisture',
      'Evacuation advised for vulnerable areas',
      'Geological assessment indicates danger'
    ],
    CYCLONE_WARNING: [
      'Cyclone formation detected in region',
      'High wind speeds and heavy rain expected',
      'Coastal areas at risk of storm surge',
      'Emergency preparedness measures activated'
    ],
    STORM_SURGE: [
      'Coastal flooding due to storm surge',
      'High tide combined with storm conditions',
      'Low-lying coastal areas at risk',
      'Evacuation recommended for coastal regions'
    ]
  };

  const alerts: DemoAlert[] = [];
  
  INDIAN_CITIES.forEach((city, cityIndex) => {
    // Generate 0-2 alerts per city (not all cities will have alerts)
    const numAlerts = Math.random() < 0.6 ? Math.floor(Math.random() * 2) + 1 : 0;
    
    for (let i = 0; i < numAlerts; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
      const messageOptions = alertMessages[alertType as keyof typeof alertMessages];
      const message = messageOptions[Math.floor(Math.random() * messageOptions.length)];
      
      // Generate coordinates within 10km radius of city center
      const radius = 0.1; // ~10km
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const lat = city.coordinates[0] + Math.cos(angle) * distance;
      const lng = city.coordinates[1] + Math.sin(angle) * distance;
      
      // Generate timestamp within last 7 days
      const now = new Date();
      const randomHours = Math.floor(Math.random() * 168); // 0-168 hours (7 days)
      const timestamp = new Date(now.getTime() - randomHours * 60 * 60 * 1000);
      
      alerts.push({
        id: `demo-alert-${cityIndex}-${i}`,
        alert_type: alertType,
        severity,
        location: `${city.name}, ${city.state}`,
        message: `${message} in ${city.name}`,
        coordinates: [lat, lng],
        state: city.state,
        timestamp: timestamp.toISOString(),
        status: 'ACTIVE',
        isDemo: true
      });
    }
  });
  
  return alerts;
};

// Generate demo SOS requests across different states
export const generateDemoSOS = (): DemoSOS[] => {
  const emergencyTypes = [
    'FLOOD',
    'LANDSLIDE',
    'CYCLONE',
    'HEAVY_RAIN',
    'RIVER_OVERFLOW',
    'URBAN_FLOODING',
    'STORM_SURGE',
    'DAM_BREACH',
    'FLASH_FLOOD',
    'WATER_LOGGING'
  ];

  const sosMessages = [
    'Trapped in flooded area, need immediate rescue',
    'Water level rising rapidly, evacuation required',
    'Family stranded due to heavy rainfall',
    'Vehicle stuck in flood water, help needed',
    'House surrounded by water, emergency assistance required',
    'Elderly person needs immediate evacuation',
    'Medical emergency during flood situation',
    'Children trapped in school due to flooding',
    'Power outage and flooding, urgent help needed',
    'Road blocked due to landslide, rescue required'
  ];

  const sosRequests: DemoSOS[] = [];
  
  INDIAN_CITIES.forEach((city, cityIndex) => {
    // Generate 0-3 SOS requests per city
    const numSOS = Math.random() < 0.4 ? Math.floor(Math.random() * 3) + 1 : 0;
    
    for (let i = 0; i < numSOS; i++) {
      const emergencyType = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
      const message = sosMessages[Math.floor(Math.random() * sosMessages.length)];
      
      // Generate coordinates within 15km radius of city center
      const radius = 0.15; // ~15km
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const lat = city.coordinates[0] + Math.cos(angle) * distance;
      const lng = city.coordinates[1] + Math.sin(angle) * distance;
      
      // Generate timestamp within last 3 days
      const now = new Date();
      const randomHours = Math.floor(Math.random() * 72); // 0-72 hours (3 days)
      const timestamp = new Date(now.getTime() - randomHours * 60 * 60 * 1000);
      
      sosRequests.push({
        id: `demo-sos-${cityIndex}-${i}`,
        user_id: `demo-user-${cityIndex}-${i}`,
        location: [lat, lng],
        message: `${message} in ${city.name}`,
        emergency_type: emergencyType,
        state: city.state,
        timestamp: timestamp.toISOString(),
        status: 'PENDING',
        isDemo: true
      });
    }
  });
  
  return sosRequests;
};

// Helper function to get random coordinates within a state
export const getRandomCoordinatesInState = (state: string): [number, number] => {
  const stateCities = INDIAN_CITIES.filter(city => city.state === state);
  if (stateCities.length === 0) {
    return [28.6139, 77.2090]; // Default to Delhi
  }
  
  const randomCity = stateCities[Math.floor(Math.random() * stateCities.length)];
  const radius = 0.05; // 5km radius
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  
  const lat = randomCity.coordinates[0] + Math.cos(angle) * distance;
  const lng = randomCity.coordinates[1] + Math.sin(angle) * distance;
  
  return [lat, lng];
};

// Helper function to get state from coordinates
export const getStateFromCoordinates = (lat: number, lng: number): string => {
  // Simple approximation - in a real app, you'd use a proper geocoding service
  for (const city of INDIAN_CITIES) {
    const distance = Math.sqrt(
      Math.pow(lat - city.coordinates[0], 2) + 
      Math.pow(lng - city.coordinates[1], 2)
    );
    if (distance < 0.5) { // Within ~50km
      return city.state;
    }
  }
  return 'Unknown';
};
