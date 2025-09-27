// Add these new functions to SmartHomeSystem class

class SmartHomeSystem {
    // ... existing code ...

    updateUI(data) {
        // Update gate status
        this.updateStatusElement('gate-status', data.gateOpen, 'Open', 'Closed');
        
        // Update garage status
        this.updateStatusElement('garage-status', data.garageOpen, 'Open', 'Closed');
        document.getElementById('ultrasonic-distance').textContent = 
            `${data.ultrasonicDistance || 0} cm`;
        
        // NEW: Update main door status
        this.updateStatusElement('main-door-status', data.mainDoorOpen, 'Open', 'Closed');
        this.updateStatusElement('door-lock-status', data.doorLocked, 'Locked', 'Unlocked');

        // ... rest of existing updateUI code ...
    }

    // NEW: Main door control functions
    async openMainDoor() {
        return await this.sendCommand('control/door', { 
            door: 'main', 
            action: 'open' 
        });
    }

    async closeMainDoor() {
        return await this.sendCommand('control/door', { 
            door: 'main', 
            action: 'close' 
        });
    }

    async toggleDoorLock() {
        return await this.sendCommand('control/door', { 
            door: 'main', 
            action: 'toggleLock' 
        });
    }

    // Update status element function to handle door lock status
    updateStatusElement(elementId, condition, trueText, falseText) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = condition ? trueText : falseText;
            
            // Special handling for different status types
            if (elementId.includes('lock')) {
                element.className = `status-badge ${condition ? 'status-locked' : 'status-unlocked'}`;
            } else if (elementId.includes('door') || elementId.includes('gate') || elementId.includes('garage')) {
                element.className = `status-badge ${condition ? 'status-open' : 'status-closed'}`;
            } else if (elementId.includes('alarm') && condition) {
                element.className = 'status-badge status-alert';
            } else if (elementId.includes('gas') && condition) {
                element.className = 'status-badge status-alert';
            } else {
                element.className = `status-badge ${condition ? 'status-on' : 'status-off'}`;
            }
        }
    }
}

// NEW: Global functions for main door control
function openMainDoor() {
    smartHome.openMainDoor();
}

function closeMainDoor() {
    smartHome.closeMainDoor();
}

function toggleDoorLock() {
    smartHome.toggleDoorLock();
}

    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '192.168.1.100';
        this.updateInterval = localStorage.getItem('updateInterval') || 2000;
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.init();
    }

    init() {
        this.updateDateTime();
        this.loadSettings();
        this.startStatusUpdates();
        this.setupEventListeners();
        this.showNotification('Smart Home System initialized!', 'success');
    }

    setupEventListeners() {
        // Settings modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closeSettings();
        });

        // Click outside modal to close
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                this.closeSettings();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('time-display').textContent = 
            now.toLocaleTimeString('si-LK', { hour12: false });
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
        document.getElementById('update-interval').value = parseInt(this.updateInterval) / 1000;
        document.getElementById('esp-ip').textContent = this.esp32IP;
    }

    saveSettings() {
        this.esp32IP = document.getElementById('esp32-ip').value;
        const intervalSeconds = parseInt(document.getElementById('update-interval').value);
        this.updateInterval = intervalSeconds * 1000;
        
        localStorage.setItem('esp32IP', this.esp32IP);
        localStorage.setItem('updateInterval', this.updateInterval);
        
        this.restartStatusUpdates();
        this.closeSettings();
        this.showNotification('Settings saved successfully!', 'success');
    }

    async fetchStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`http://${this.esp32IP}/status`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.updateUI(data);
                this.setConnectionStatus(true);
                return true;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            this.setConnectionStatus(false);
            console.error('Error fetching status:', error);
            return false;
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
        this.updateStatusElement('gate-status', data.gateOpen, 'Open', 'Closed');
        
        // Update garage status
        this.updateStatusElement('garage-status', data.garageOpen, 'Open', 'Closed');
        document.getElementById('ultrasonic-distance').textContent = 
            `${data.ultrasonicDistance || 0} cm`;
        
        // Update garage mode
        const garageModeToggle = document.getElementById('garage-mode-toggle');
        if (garageModeToggle) {
            garageModeToggle.checked = data.garageAutoMode !== false;
        }

        // Update LED states
        for (let i = 1; i <= 6; i++) {
            const ledElement = document.getElementById(`led-${i}`);
            if (ledElement && data[`led${i}`] !== undefined) {
                ledElement.checked = data[`led${i}`];
            }
        }

        // Update sensor readings
        document.getElementById('temperature').textContent = 
            `${data.temperature || 0}°C`;
        document.getElementById('temperature-display').textContent = 
            `${data.temperature || 0}°C`;
        document.getElementById('humidity').textContent = 
            `${data.humidity || 0}%`;
        document.getElementById('humidity-display').textContent = 
            `${data.humidity || 0}%`;
        
        this.updateStatusElement('fan-status', data.fanOn, 'ON', 'OFF');
        this.updateStatusElement('rain-status', data.rainDetected, 'Raining', 'No Rain');
        this.updateStatusElement('gas-status', data.gasAlarm, 'Gas Leak!', 'Safe');
        this.updateStatusElement('alarm-status', data.securityBreach, 'ACTIVE', 'Inactive');

        // Update progress bars
        this.updateProgressBar('battery-level', data.batteryLevel || 0, 'battery-text');
        this.updateProgressBar('water-level', data.waterLevel || 0, 'water-text');
        document.getElementById('water-level-display').textContent = 
            `${data.waterLevel || 0}%`;

        // Update curtain status
        document.getElementById('curtain-status').textContent = 
            data.rainDetected ? 'Inside' : 'Outside';

        // Update security status
        this.updateStatusElement('security-status', data.securityActive, 'Active', 'Disabled');

        // Update alerts
        this.updateAlerts(data.alerts || []);

        // Show/hide stop alarm button
        const stopAlarmBtn = document.getElementById('stop-alarm-btn');
        if (stopAlarmBtn) {
            stopAlarmBtn.style.display = data.securityBreach ? 'block' : 'none';
        }
    }

    updateStatusElement(elementId, condition, trueText, falseText) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = condition ? trueText : falseText;
            element.className = `status-badge ${condition ? 'status-on' : 'status-off'}`;
            
            // Special handling for alarm status
            if (elementId === 'alarm-status' && condition) {
                element.className = 'status-badge status-alert';
            }
            if (elementId === 'gas-status' && condition) {
                element.className = 'status-badge status-alert';
            }
        }
    }

    updateProgressBar(barId, percentage, textId) {
        const bar = document.getElementById(barId);
        const text = document.getElementById(textId);
        
        if (bar && text) {
            const clampedPercentage = Math.max(0, Math.min(100, percentage));
            bar.style.width = `${clampedPercentage}%`;
            text.textContent = `${clampedPercentage}%`;
            
            // Change color based on percentage
            if (clampedPercentage < 20) {
                bar.style.background = 'linear-gradient(90deg, #dc3545, #e74c3c)';
            } else if (clampedPercentage < 50) {
                bar.style.background = 'linear-gradient(90deg, #ffc107, #f39c12)';
            }
        }
    }

    updateAlerts(alerts) {
        const alertPanel = document.getElementById('alert-panel');
        const alertContent = document.getElementById('alert-content');
        
        if (alerts && alerts.length > 0) {
            alertPanel.style.display = 'block';
            alertContent.innerHTML = alerts.map(alert => {
                let type = 'info';
                let icon = 'fas fa-info-circle';
                
                if (alert.toLowerCase().includes('breach') || alert.toLowerCase().includes('security')) {
                    type = 'danger';
                    icon = 'fas fa-exclamation-triangle';
                } else if (alert.toLowerCase().includes('gas')) {
                    type = 'warning';
                    icon = 'fas fa-gas-pump';
                }
                
                return `<div class="alert-item ${type}">
                    <i class="${icon}"></i>
                    <span>${alert}</span>
                </div>`;
            }).join('');
        } else {
            alertContent.innerHTML = `<div class="alert-item info">
                <i class="fas fa-info-circle"></i>
                <span>System running normally</span>
            </div>`;
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
                const result = await response.json();
                this.showNotification(result.message || 'Command sent successfully!', 'success');
                return result;
            } else {
                throw new Error('Command failed');
            }
        } catch (error) {
            this.showNotification('Failed to send command! Check connection.', 'error');
            console.error('Error sending command:', error);
            return null;
        }
    }

    // Command functions
    async controlLED(ledNumber, state) {
        return await this.sendCommand('control/led', { led: ledNumber, state: state });
    }

    async controlGate() {
        return await this.sendCommand('control/gate', {});
    }

    async controlGarage(action) {
        return await this.sendCommand('control/garage', { action: action });
    }

    async setGarageMode(autoMode) {
        return await this.sendCommand('control/garage-mode', { autoMode: autoMode });
    }

    async setSecuritySystem(enabled) {
        return await this.sendCommand('control/security', { enabled: enabled });
    }

    async controlAllLights(state) {
        return await this.sendCommand('control/all-lights', { state: state });
    }

    async controlAlarm(action) {
        return await this.sendCommand('control/alarm', { action: action });
    }

    // Modal functions
    openSettings() {
        document.getElementById('settings-modal').style.display = 'block';
    }

    closeSettings() {
        document.getElementById('settings-modal').style.display = 'none';
    }

    // Status update management
    startStatusUpdates() {
        this.fetchStatus(); // Initial fetch
        this.statusUpdateInterval = setInterval(() => {
            this.fetchStatus();
        }, this.updateInterval);
    }

    restartStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        this.startStatusUpdates();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    z-index: 1001;
                    border-left: 4px solid;
                    animation: slideInRight 0.3s ease;
                    max-width: 400px;
                }
                .notification.success { border-left-color: #28a745; }
                .notification.error { border-left-color: #dc3545; }
                .notification.info { border-left-color: #17a2b8; }
                .notification.warning { border-left-color: #ffc107; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .notification-content i:first-child {
                    font-size: 1.2rem;
                }
                .notification-content button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 5px;
                    margin-left: auto;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }
}

// Global functions for HTML event handlers
function controlLED(ledNumber, state) {
    smartHome.controlLED(ledNumber, state);
}

function controlAllLights(state) {
    smartHome.controlAllLights(state);
}

function controlGate() {
    smartHome.controlGate();
}

function openGarage() {
    smartHome.controlGarage('open');
}

function closeGarage() {
    smartHome.controlGarage('close');
}

function toggleGarage() {
    smartHome.controlGarage('toggle');
}

function setGarageMode(autoMode) {
    smartHome.setGarageMode(autoMode);
}

function setSecuritySystem(enabled) {
    smartHome.setSecuritySystem(enabled);
}

function stopAlarm() {
    smartHome.controlAlarm('stop');
}

function testBuzzer() {
    smartHome.controlAlarm('test');
}

function openSettings() {
    smartHome.openSettings();
}

function closeSettings() {
    smartHome.closeSettings();
}

function saveSettings() {
    smartHome.saveSettings();
}

// Add slideOutRight animation
const slideOutStyle = document.createElement('style');
slideOutStyle.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(slideOutStyle);

// Initialize the system when page loads
let smartHome;
document.addEventListener('DOMContentLoaded', () => {
    smartHome = new SmartHomeSystem();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        smartHome.fetchStatus();
    }
});

