const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

class SmartHomeServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        
        this.clients = new Set();
        this.sensorData = {
            temperature: 25,
            humidity: 60,
            gasLevel: 0,
            motion: false,
            perimeter: 'secure',
            rain: false,
            lightLevel: 50,
            waterLevel: 80,
            solarPower: 0,
            batteryLevel: 100
        };
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.startSensorSimulation();
    }

    setupMiddleware() {
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());
    }

    setupRoutes() {
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        this.app.get('/api/data', (req, res) => {
            res.json(this.sensorData);
        });

        this.app.post('/api/command', (req, res) => {
            this.handleCommand(req.body);
            res.json({ status: 'success' });
        });

        this.app.get('/api/notifications', (req, res) => {
            res.json(this.getRecentNotifications());
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log('New client connected');
            
            // Send current data to new client
            ws.send(JSON.stringify(this.sensorData));
            
            ws.on('message', (message) => {
                try {
                    const command = JSON.parse(message);
                    this.handleCommand(command);
                } catch (error) {
                    console.error('Invalid message:', error);
                }
            });
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('Client disconnected');
            });
        });
    }

    handleCommand(command) {
        console.log('Received command:', command);
        
        switch (command.command) {
            case 'security':
                this.handleSecurityCommand(command);
                break;
            case 'lights':
                this.handleLightsCommand(command);
                break;
            case 'door':
                this.handleDoorCommand(command);
                break;
            case 'autoMode':
                this.handleAutoModeCommand(command);
                break;
            case 'refresh':
                this.broadcastData();
                break;
        }
    }

    handleSecurityCommand(command) {
        // Implement security system logic
        this.broadcastToClients({
            type: 'security',
            status: command.status,
            timestamp: new Date().toISOString()
        });
    }

    handleLightsCommand(command) {
        // Implement lights control logic
        this.broadcastToClients({
            type: 'lights',
            status: command.status,
            timestamp: new Date().toISOString()
        });
    }

    handleDoorCommand(command) {
        // Implement door control logic
        this.broadcastToClients({
            type: 'door',
            door: command.door,
            status: command.status,
            timestamp: new Date().toISOString()
        });
    }

    handleAutoModeCommand(command) {
        // Implement auto mode logic
        this.broadcastToClients({
            type: 'autoMode',
            status: command.status,
            timestamp: new Date().toISOString()
        });
    }

    broadcastData() {
        this.broadcastToClients(this.sensorData);
    }

    broadcastToClients(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    startSensorSimulation() {
        // Simulate real sensor data changes
        setInterval(() => {
            this.sensorData.temperature = 20 + Math.random() * 15;
            this.sensorData.humidity = 40 + Math.random() * 40;
            this.sensorData.gasLevel = Math.random() * 50;
            this.sensorData.motion = Math.random() > 0.8;
            this.sensorData.lightLevel = 30 + Math.random() * 70;
            this.sensorData.waterLevel = 50 + Math.random() * 50;
            this.sensorData.solarPower = Math.random() * 500;
            
            // Occasionally simulate alerts
            if (Math.random() > 0.95) {
                this.sensorData.gasLevel = 100 + Math.random() * 100;
            }
            if (Math.random() > 0.98) {
                this.sensorData.perimeter = 'breach';
                setTimeout(() => {
                    this.sensorData.perimeter = 'secure';
                }, 5000);
            }
            
            this.broadcastData();
        }, 3000);
    }

    getRecentNotifications() {
        return [
            { message: 'System started', type: 'info', timestamp: new Date() },
            { message: 'All sensors active', type: 'info', timestamp: new Date() }
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