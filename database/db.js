const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'disaster.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'citizen',
    phone TEXT,
    state TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    district TEXT,
    state TEXT,
    lat REAL,
    lng REAL,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'active',
    reported_by INTEGER,
    responders INTEGER DEFAULT 0,
    affected_people INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS shelters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT,
    state TEXT,
    lat REAL,
    lng REAL,
    capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    contact TEXT,
    facilities TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    type TEXT DEFAULT 'general',
    incident_id INTEGER,
    state TEXT,
    district TEXT,
    active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS rescue_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    team_name TEXT NOT NULL,
    team_type TEXT DEFAULT 'NDRF',
    personnel INTEGER DEFAULT 0,
    status TEXT DEFAULT 'deployed',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  const citizenHash = bcrypt.hashSync('citizen123', 10);

  db.prepare(`INSERT INTO users (name, email, password, role, phone, state) VALUES (?, ?, ?, ?, ?, ?)`).run(
    'Admin NDRF', 'admin@ndrf.gov.in', hash, 'admin', '011-24363260', 'Delhi'
  );
  db.prepare(`INSERT INTO users (name, email, password, role, phone, state) VALUES (?, ?, ?, ?, ?, ?)`).run(
    'Rahul Sharma', 'rahul@citizen.in', citizenHash, 'citizen', '9876543210', 'Maharashtra'
  );

  // Seed shelters
  const shelterStmt = db.prepare(`INSERT INTO shelters (name, address, district, state, lat, lng, capacity, current_occupancy, contact, facilities, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const shelters = [
    ['Rajiv Gandhi Community Hall', 'Sector 15, Rohini', 'North Delhi', 'Delhi', 28.7225, 77.1123, 500, 230, '011-27559900', 'Food,Water,Medical,Beds', 'open'],
    ['VMSS Relief Camp', 'Andheri West, Near Station', 'Mumbai Suburban', 'Maharashtra', 19.1197, 72.8464, 800, 450, '022-26241234', 'Food,Water,Medical,Beds,Toilets', 'open'],
    ['Red Cross Shelter', 'Mylapore, Chennai', 'Chennai', 'Tamil Nadu', 13.0337, 80.2674, 300, 120, '044-28521131', 'Food,Water,Medical', 'open'],
    ['Odisha Shelter Unit 3', 'Puri Beach Road', 'Puri', 'Odisha', 19.7999, 85.8179, 600, 540, '0674-2598765', 'Food,Water,Medical,Beds', 'full'],
    ['Army Relief Camp', 'Srinagar Cantonment', 'Srinagar', 'Jammu & Kashmir', 34.0837, 74.7973, 400, 180, '0194-2452521', 'Food,Water,Medical,Beds,Heating', 'open'],
    ['SDRF Camp Assam', 'Guwahati Sarusajai', 'Kamrup Metro', 'Assam', 26.1445, 91.7362, 700, 290, '0361-2237782', 'Food,Water,Medical,Beds', 'open'],
    ['Uttarakhand Relief Hub', 'Dehradun Clock Tower Area', 'Dehradun', 'Uttarakhand', 30.3165, 78.0322, 350, 210, '0135-2657382', 'Food,Water,Medical', 'open'],
    ['Gujarat SRSG Camp', 'Bhuj Town Hall', 'Kutch', 'Gujarat', 23.2519, 69.6669, 450, 310, '02832-220099', 'Food,Water,Medical,Beds', 'open'],
  ];
  shelters.forEach(s => shelterStmt.run(...s));

  // Seed incidents
  const incidentStmt = db.prepare(`INSERT INTO incidents (title, type, description, location, district, state, lat, lng, severity, status, reported_by, responders, affected_people) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const incidents = [
    ['Brahmaputra River Flooding', 'flood', 'Heavy rainfall causing severe flooding. Multiple villages submerged. Evacuation underway.', 'Kaziranga, Assam', 'Golaghat', 'Assam', 26.5775, 93.3687, 'critical', 'active', 1, 45, 3200],
    ['Cyclone Biparjoy Landfall', 'cyclone', 'Category 3 cyclone making landfall near Dwarka coast. Coastal evacuation ordered.', 'Dwarka, Gujarat', 'Devbhoomi Dwarka', 'Gujarat', 22.2393, 68.9678, 'critical', 'active', 1, 120, 15000],
    ['Uttarkashi Landslide', 'landslide', 'Cloudburst triggered multiple landslides blocking NH-34. Rescue teams deployed.', 'Uttarkashi, Uttarakhand', 'Uttarkashi', 'Uttarakhand', 30.7268, 78.4354, 'high', 'active', 1, 30, 500],
    ['Mumbai Building Collapse', 'earthquake', 'Old structure collapsed following tremors. NDRF team conducting search and rescue.', 'Kurla West, Mumbai', 'Mumbai', 'Maharashtra', 19.0728, 72.8826, 'high', 'active', 2, 25, 85],
    ['Forest Fire Uttarakhand', 'fire', 'Wildfire spreading across Chilla wildlife range. Air Force helicopter deployed.', 'Rishikesh, Uttarakhand', 'Haridwar', 'Uttarakhand', 30.0869, 78.2676, 'medium', 'active', 1, 20, 200],
    ['Earthquake Tremors Delhi NCR', 'earthquake', 'Magnitude 4.2 earthquake felt across Delhi NCR. No major damage reported. Teams on standby.', 'New Delhi', 'Central Delhi', 'Delhi', 28.6139, 77.209, 'low', 'resolved', 1, 10, 0],
    ['Chemical Leak Bhopal', 'industrial', 'Minor gas leak at industrial unit. Area cordoned off. Residents evacuated as precaution.', 'Mandideep, Bhopal', 'Raisen', 'Madhya Pradesh', 23.0857, 77.5082, 'high', 'active', 1, 35, 420],
    ['Chennai Cyclone Warning', 'cyclone', 'IMD red alert issued. Bay of Bengal depression intensifying. Fishermen warned not to venture.', 'Marina Beach, Chennai', 'Chennai', 'Tamil Nadu', 13.0499, 80.2824, 'medium', 'active', 1, 15, 50000],
  ];
  incidents.forEach(i => incidentStmt.run(...i));

  // Seed alerts
  const alertStmt = db.prepare(`INSERT INTO alerts (title, message, severity, type, state, district, active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const alerts = [
    ['RED ALERT - Assam Floods', 'Brahmaputra river water level critical. Immediate evacuation of low-lying areas in Kaziranga, Jorhat, Majuli. Contact SDRF: 0361-2237782', 'critical', 'evacuation', 'Assam', 'Golaghat', 1, 1],
    ['Cyclone Warning - Gujarat Coast', 'Cyclone Biparjoy: All coastal residents within 5km of shoreline must evacuate immediately. Relief camps ready.', 'critical', 'evacuation', 'Gujarat', 'Devbhoomi Dwarka', 1, 1],
    ['IMD Weather Alert - Uttarakhand', 'Heavy to very heavy rainfall predicted for next 48 hours. Avoid river banks and landslide-prone areas.', 'high', 'weather', 'Uttarakhand', null, 1, 1],
    ['Heat Wave Advisory - Rajasthan', 'Severe heat wave conditions. Temperature exceeding 45°C. Avoid outdoor activity 11am-4pm. Stay hydrated.', 'medium', 'health', 'Rajasthan', null, 1, 1],
    ['Rescue Operation Update', 'NDRF teams have successfully rescued 240 persons from flood-affected areas in Assam. Operations continuing.', 'info', 'update', 'Assam', null, 1, 1],
  ];
  alerts.forEach(a => alertStmt.run(...a));

  // Seed rescue operations
  const rescueStmt = db.prepare(`INSERT INTO rescue_operations (incident_id, team_name, team_type, personnel, status, notes) VALUES (?, ?, ?, ?, ?, ?)`);
  const ops = [
    [1, 'NDRF Team Alpha', 'NDRF', 45, 'active', 'Boat rescue operations ongoing in Kaziranga sector'],
    [1, 'SDRF Assam Unit 3', 'SDRF', 30, 'active', 'Distributing relief materials at Jorhat camp'],
    [2, 'NDRF Gujarat 04', 'NDRF', 80, 'active', 'Coastal evacuation of Dwarka district'],
    [3, 'BRO Team Uttarkashi', 'BRO', 25, 'active', 'Road clearing operations NH-34 landslide point'],
    [4, 'NDRF Mumbai Fast Response', 'NDRF', 20, 'active', 'Search and rescue at Kurla collapse site'],
  ];
  ops.forEach(o => rescueStmt.run(...o));
}

module.exports = db;
