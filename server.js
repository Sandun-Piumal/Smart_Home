const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const JWT_SECRET = 'your_super_secret_key_here';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./smart_home.db');

// Create advanced tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT,
    value REAL,
    room TEXT,
    floor INTEGER,
    ip_address TEXT,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS energy_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER,
    power_consumption REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Advanced device management
const homeState = {
  devices: {
    'living_room_light': { 
      status: 'off', 
      brightness: 0, 
      color: '#ffffff',
      power: 0,
      lastUpdate: new Date()
    },
    'kitchen_light': { 
      status: 'off', 
      brightness: 0, 
      color: '#ffffff',
      power: 0
    },
    'main_gate': { 
      status: 'locked',
      battery: 85 
    },
    'temperature_sensor': { 
      value: 27.5, 
      unit: '°C',
      trend: 'stable'
    },
    'security_system': {
      status: 'armed',
      zones: {
        'front_door': 'secure',
        'back_door': 'secure',
        'windows': 'secure'
      }
    }
  },
  energy: {
    solar: 0,
    consumption: 0,
    battery: 100
  },
  weather: {
    temperature: 28,
    humidity: 65,
    condition: 'sunny'
  }
};

// AI-Powered Automation Engine
class AutomationEngine {
  constructor() {
    this.rules = [];
    this.learningData = [];
  }

  addRule(condition, action) {
    this.rules.push({ condition, action });
  }

  evaluate(sensorData) {
    this.rules.forEach(rule => {
      if (this.checkCondition(rule.condition, sensorData)) {
        this.executeAction(rule.action);
      }
    });
  }

  checkCondition(condition, data) {
    // Advanced condition checking
    return eval(condition); // In real app, use safe evaluator
  }

  executeAction(action) {
    io.emit('automation_triggered', { action, timestamp: new Date() });
    // Execute the action on devices
  }
}

const automationEngine = new AutomationEngine();

// Add smart rules
automationEngine.addRule('data.temperature > 30 && data.humidity < 60', 'turnOnAC');
automationEngine.addRule('data.lightLevel < 20 && data.presence', 'turnOnLights');

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Advanced API Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // In real app, check against database
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET);
    res.json({ token, user: { username, role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/dashboard/data', authenticateToken, (req, res) => {
  const dashboardData = {
    summary: {
      activeDevices: Object.values(homeState.devices).filter(d => d.status === 'on').length,
      energySavings: 15.2,
      securityStatus: 'active',
      temperature: homeState.devices.temperature_sensor.value
    },
    alerts: [
      { type: 'info', message: 'System running optimally', time: '2 min ago' }
    ],
    weather: homeState.weather
  };
  res.json(dashboardData);
});

app.post('/api/device/control', authenticateToken, (req, res) => {
  const { deviceId, command, value, color } = req.body;
  
  if (homeState.devices[deviceId]) {
    homeState.devices[deviceId].status = command;
    homeState.devices[deviceId].lastUpdate = new Date();
    
    if (value !== undefined) homeState.devices[deviceId].brightness = value;
    if (color) homeState.devices[deviceId].color = color;
    
    // Real-time update to all clients
    io.emit('device_update', {
      deviceId,
      status: command,
      value: value,
      color: color,
      timestamp: new Date()
    });

    // Log energy usage
    if (command === 'on') {
      db.run(`INSERT INTO energy_usage (device_id, power_consumption) VALUES (?, ?)`, 
        [deviceId, homeState.devices[deviceId].power || 10]);
    }
  }
  
  res.json({ success: true });
});

// Real-time sensor data simulation
setInterval(() => {
  // Simulate sensor data changes
  const tempChange = (Math.random() - 0.5) * 2;
  homeState.devices.temperature_sensor.value = 
    Math.max(15, Math.min(35, homeState.devices.temperature_sensor.value + tempChange));
  
  // Simulate energy production/consumption
  homeState.energy.solar = Math.random() * 5000;
  homeState.energy.consumption = Math.random() * 3000;
  
  io.emit('sensor_update', {
    temperature: homeState.devices.temperature_sensor.value,
    energy: homeState.energy,
    timestamp: new Date()
  });
}, 5000);

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Advanced client connected');
  
  // Send initial state
  socket.emit('system_initialized', homeState);
  
  socket.on('control_device', (data) => {
    io.emit('device_control', data);
  });
  
  socket.on('set_automation', (data) => {
    automationEngine.addRule(data.condition, data.action);
    io.emit('automation_added', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Advanced Smart Home Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});