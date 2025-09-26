const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class SmartHomeServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.clients = new Set();
        this.users = new Map();
        this.sensorData = {};
        this.JWT_SECRET = 'smart_home_secret_2024';
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.initializeSampleData();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname)));
        
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            next();
        });
    }

    setupRoutes() {
        // Serve login page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Serve dashboard page
        this.app.get('/dashboard', (req, res) => {
            res.sendFile(path.join(__dirname, 'dashboard.html'));
        });

        // Authentication endpoints
        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;
                const user = await this.authenticateUser(email, password);
                
                if (user) {
                    const token = this.generateToken(user);
                    res.json({ success: true, user, token });
                } else {
                    res.status(401).json({ success: false, message: 'Invalid credentials' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        this.app.post('/api/auth/signup', async (req, res) => {
            try {
                const { firstName, lastName, email, phone, password } = req.body;
                
                if (this.users.has(email)) {
                    return res.status(400).json({ success: false, message: 'User already exists' });
                }

                const user = await this.createUser({ firstName, lastName, email, phone, password });
                const token = this.generateToken(user);
                
                res.json({ success: true, user, token });
            } catch (error) {
                res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        this.app.post('/api/auth/google', async (req, res) => {
            try {
                const { email, name } = req.body;
                let user = this.users.get(email);

                if (!user) {
                    const names = name.split(' ');
                    user = await this.createUser({
                        firstName: names[0],
                        lastName: names.slice(1).join(' '),
                        email,
                        phone: '',
                        password: null // Google users don't have password
                    });
                }

                const token = this.generateToken(user);
                res.json({ success: true, user, token });
            } catch (error) {
                res.status(500).json({ success: false, message: 'Server error' });
            }
        });

        // Device control endpoints
        this.app.post('/api/control/security', this.authenticateToken, (req, res) => {
            const { action } = req.body;
            this.broadcastToClients({ type: 'security', action, timestamp: new Date() });
            res.json({ success: true });
        });

        this.app.post('/api/control/lights', this.authenticateToken, (req, res) => {
            const { device, state } = req.body;
            this.broadcastToClients({ type: 'lights', device, state, timestamp: new Date() });
            res.json({ success: true });
        });

        this.app.post('/api/control/climate', this.authenticateToken, (req, res) => {
            const { mode, temperature } = req.body;
            this.broadcastToClients({ type: 'climate', mode, temperature, timestamp: new Date() });
            res.json({ success: true });
        });

        // Data endpoints
        this.app.get('/api/data/sensors', this.authenticateToken, (req, res) => {
            res.json(this.sensorData);
        });

        this.app.get('/api/data/notifications', this.authenticateToken, (req, res) => {
            res.json(this.getRecentNotifications());
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            // Extract token from query string
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            
            try {
                const user = this.verifyToken(token);
                ws.user = user;
                this.clients.add(ws);
                
                console.log(`User ${user.email} connected via WebSocket`);
                
                // Send current sensor data
                ws.send(JSON.stringify({ type: 'sensor_data', data: this.sensorData }));
                
                ws.on('message', (message) => {
                    this.handleWebSocketMessage(ws, message);
                });
                
                ws.on('close', () => {
                    this.clients.delete(ws);
                    console.log(`User ${user.email} disconnected`);
                });
                
            } catch (error) {
                ws.close(1008, 'Authentication failed');
            }
        });

        // Start sensor data simulation
        this.startSensorSimulation();
    }

    async authenticateUser(email, password) {
        const user = this.users.get(email);
        if (!user) return null;
        
        if (user.password) {
            const valid = await bcrypt.compare(password, user.password);
            return valid ? user : null;
        }
        
        return null; // Google users can't login with password
    }

    async createUser(userData) {
        const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
        
        const user = {
            id: Date.now(),
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.firstName + ' ' + userData.lastName)}&background=2563eb&color=fff`,
            createdAt: new Date()
        };
        
        this.users.set(userData.email, user);
        return user;
    }

    generateToken(user) {
        return jwt.sign(
            { userId: user.id, email: user.email },
            this.JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    verifyToken(token) {
        return jwt.verify(token, this.JWT_SECRET);
    }

    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        try {
            req.user = this.verifyToken(token);
            next();
        } catch (error) {
            return res.status(403).json({ message: 'Invalid token' });
        }
    }

    handleWebSocketMessage(ws, message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'control':
                    this.handleControlMessage(data);
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    }

    handleControlMessage(data) {
        this.broadcastToClients({
            type: 'control_update',
            ...data,
            timestamp: new Date()
        });
    }

    broadcastToClients(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    initializeSampleData() {
        // Create sample user
        this.createUser({
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@smarthome.com',
            phone: '+1234567890',
            password: 'password123'
        });

        // Initialize sensor data
        this.sensorData = {
            temperature: 22.5,
            humidity: 45,
            motion: false,
            doorsLocked: true,
            windowsClosed: true,
            energyUsage: 2.3,
            solarProduction: 1.2,
            batteryLevel: 85,
            onlineDevices: 8
        };
    }

    startSensorSimulation() {
        setInterval(() => {
            // Simulate sensor data changes
            this.sensorData = {
                temperature: 20 + Math.random() * 15,
                humidity: 40 + Math.random() * 40,
                motion: Math.random() > 0.9,
                doorsLocked: Math.random() > 0.1,
                windowsClosed: Math.random() > 0.1,
                energyUsage: (Math.random() * 10).toFixed(1),
                solarProduction: (Math.random() * 5).toFixed(1),
                batteryLevel: 20 + Math.random() * 80,
                onlineDevices: 5 + Math.floor(Math.random() * 10)
            };

            // Broadcast to connected clients
            this.broadcastToClients({
                type: 'sensor_data',
                data: this.sensorData,
                timestamp: new Date()
            });
        }, 5000);
    }

    getRecentNotifications() {
        return [
            {
                id: 1,
                title: 'System Started',
                message: 'Smart home system initialized successfully',
                type: 'info',
                timestamp: new Date()
            }
        ];
    }

    start(port = 3000) {
        this.server.listen(port, () => {
            console.log(`Smart Home Server running on port ${port}`);
            console.log(`Open http://localhost:${port} in your browser`);
        });
    }
}

// Start the server
const server = new SmartHomeServer();
server.start(process.env.PORT || 3000);