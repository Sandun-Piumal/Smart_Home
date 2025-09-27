class SmartHomeSystem {
    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '192.168.1.100';
        this.isConnected = false;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.updateDateTime();
        this.loadSettings();
        this.startStatusUpdates();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Settings modal
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('settings-modal').style.display = 'none';
        });

        // Click outside modal to close
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('time-display').textContent = 
            now.toLocaleTimeString('si-LK');
        document.getElementById('date-display').textContent = 
            now.toLocaleDateString('si-LK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
    }

    loadSettings() {
        document.getElementById('esp32-ip').value = this.esp32IP;
    }

    saveSettings() {
        this.esp32IP = document.getElementById('esp32-ip').value;
        localStorage.setItem('esp32IP', this.esp32IP);
        document.getElementById('settings-modal').style.display = 'none';
        this.showNotification('Settings saved successfully!', 'success');
    }

    async fetchStatus() {
        try {
            const response = await fetch(`http://${this.esp32IP}/status`, {
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateUI(data);
                this.setConnectionStatus(true);
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.setConnectionStatus(false);
            console.error('Error fetching status:', error);
        }
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connection-status');
        
        if (connected) {
            statusElement.className = 'status online';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
        } else {
            statusElement.className = 'status offline';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
        }
    }

    updateUI(data) {
        // Update gate status
        document.getElementById('gate-status').textContent = 
            data.gateOpen ? 'Open' : 'Closed';
        document.getElementById('gate-status').className = 
            data.gateOpen ? 'status-open' : 'status-closed';

        // Update garage status
        document.getElementById('garage-status').textContent = 
            data.garageOpen ? 'Open' : 'Closed';
        document.getElementById('garage-status').className = 
            data.garageOpen ? 'status-open' : 'status-closed';
        document.getElementById('ultrasonic-distance').textContent = 
            data.ultrasonicDistance;

        // Update LED status
        for (let i = 1; i <= 6; i++) {
            const ledElement = document.getElementById(`led-${i}`);
            if (ledElement) {
                ledElement.checked = data[`led${i}`] || false;
            }
        }

        // Update sensor readings
        document.getElementById('temperature').textContent = data.temperature;
        document.getElementById('fan-status').textContent = 
            data.fanOn ? 'ON' : 'OFF';
        document.getElementById('fan-status').className = 
            data.fanOn ? 'status-on' : 'status-off';

        document.getElementById('rain-status').textContent = 
            data.rainDetected ? 'Raining' : 'No Rain';
        document.getElementById('curtain-status').textContent = 
            data.rainDetected ? 'Inside' : 'Outside';

        document.getElementById('gas-status').textContent = 
            data.gasAlert ? 'Gas Leak!' : 'Safe';
        document.getElementById('gas-status').className = 
            data.gasAlert ? 'status-alert' : 'status-safe';
        document.getElementById('gas-alarm').textContent = 
            data.gasAlert ? 'ON' : 'OFF';

        // Update progress bars
        document.getElementById('battery-level').style.width = `${data.batteryLevel}%`;
        document.getElementById('battery-text').textContent = `${data.batteryLevel}%`;
        
        document.getElementById('water-level').style.width = `${data.waterLevel}%`;
        document.getElementById('water-text').textContent = `${data.waterLevel}%`;

        // Update security alerts
        this.updateAlerts(data.alerts);
    }

    updateAlerts(alerts) {
        const alertPanel = document.getElementById('alert-panel');
        const alertContent = document.getElementById('alert-content');
        
        if (alerts && alerts.length > 0) {
            alertPanel.style.display = 'block';
            alertContent.innerHTML = alerts.map(alert => 
                `<div class="alert-item" style="color: #dc3545; margin: 5px 0;">
                    <i class="fas fa-exclamation-triangle"></i> ${alert}
                </div>`
            ).join('');
        } else {
            alertPanel.style.display = 'none';
        }
    }

    async sendCommand(endpoint, data = {}) {
        try {
            const response = await fetch(`http://${this.esp32IP}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.showNotification('Command sent successfully!', 'success');
                return await response.json();
            } else {
                throw new Error('Command failed');
            }
        } catch (error) {
            this.showNotification('Failed to send command!', 'error');
            console.error('Error sending command:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('.notification')) {
            const style = document.createElement('style');
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px;
                    border-radius: 5px;
                    color: white;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                }
                .notification.success { background: #28a745; }
                .notification.error { background: #dc3545; }
                .notification.info { background: #17a2b8; }
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    startStatusUpdates() {
        // Update time every second
        setInterval(() => this.updateDateTime(), 1000);
        
        // Update status every 2 seconds
        this.updateInterval = setInterval(() => this.fetchStatus(), 2000);
    }
}

// Global functions for HTML onclick events
function controlLED(ledNumber, state) {
    smartHome.sendCommand('control/led', { led: ledNumber, state: state });
}

function controlAllLights(state) {
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`led-${i}`).checked = state;
        controlLED(i, state);
    }
}

function controlGate() {
    smartHome.sendCommand('control/gate');
}

function controlDoor(doorType, open) {
    smartHome.sendCommand('control/door', { door: doorType, action: open ? 'open' : 'close' });
}

function openSettings() {
    document.getElementById('settings-modal').style.display = 'block';
}

function saveSettings() {
    smartHome.saveSettings();
}

// Initialize the system when page loads
let smartHome;
document.addEventListener('DOMContentLoaded', () => {
    smartHome = new SmartHomeSystem();
});

// Simulated data for demo purposes (remove when connected to real ESP32)
function simulateData() {
    return {
        gateOpen: Math.random() > 0.5,
        garageOpen: Math.random() > 0.7,
        ultrasonicDistance: Math.floor(Math.random() * 20),
        led1: Math.random() > 0.5,
        led2: Math.random() > 0.5,
        led3: Math.random() > 0.5,
        led4: Math.random() > 0.5,
        led5: Math.random() > 0.5,
        led6: Math.random() > 0.5,
        temperature: Math.floor(Math.random() * 10) + 22,
        fanOn: Math.random() > 0.7,
        rainDetected: Math.random() > 0.8,
        gasAlert: Math.random() > 0.9,
        batteryLevel: Math.floor(Math.random() * 30) + 70,
        waterLevel: Math.floor(Math.random() * 40) + 60,
        alerts: Math.random() > 0.8 ? ['Security breach detected!'] : []
    };
}