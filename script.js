class SmartHomeSystem {
    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '192.168.1.100';
        this.updateInterval = parseInt(localStorage.getItem('updateInterval')) || 2000;
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastUpdateTime = 0;
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

        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                this.closeSettings();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeSettings();
            }
        });

        // Refresh button for manual updates
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.className = 'btn btn-info';
        refreshBtn.style.position = 'fixed';
        refreshBtn.style.bottom = '20px';
        refreshBtn.style.right = '20px';
        refreshBtn.style.zIndex = '1000';
        refreshBtn.onclick = () => this.manualRefresh();
        document.body.appendChild(refreshBtn);
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
        document.getElementById('update-interval').value = this.updateInterval / 1000;
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
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                this.updateUI(data);
                this.setConnectionStatus(true);
                this.retryCount = 0;
                this.lastUpdateTime = Date.now();
                return true;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.warn('Error fetching status:', error);
            this.retryCount++;
            
            if (this.retryCount >= this.maxRetries) {
                this.setConnectionStatus(false);
                if (this.retryCount === this.maxRetries) {
                    this.showNotification('Connection issues detected. Using simulated data.', 'warning');
                }
            }
            
            // Use simulated data when offline
            this.updateUIWithSimulatedData();
            return false;
        }
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connection-status');
        
        if (connected) {
            statusElement.className = 'status online';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            statusElement.title = `Last update: ${new Date().toLocaleTimeString()}`;
        } else {
            statusElement.className = 'status offline';
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
            statusElement.title = 'Trying to reconnect...';
        }
    }

    updateUI(data) {
        try {
            // Update connection indicator
            const timeDiff = Date.now() - this.lastUpdateTime;
            const isRecent = timeDiff < 10000; // 10 seconds
            
            // Update gate status
            this.updateStatusElement('gate-status', data.gateOpen, 'Open', 'Closed');
            
            // Update garage status
            this.updateStatusElement('garage-status', data.garageOpen, 'Open', 'Closed');
            document.getElementById('ultrasonic-distance').textContent = 
                `${data.ultrasonicDistance || 0} cm`;
            
            // Update main door status
            this.updateStatusElement('main-door-status', data.mainDoorOpen, 'Open', 'Closed');
            this.updateStatusElement('door-lock-status', data.doorLocked, 'Locked', 'Unlocked');

            // Update garage mode
            const garageModeToggle = document.getElementById('garage-mode-toggle');
            if (garageModeToggle) {
                garageModeToggle.checked = data.garageAutoMode !== false;
            }

            // Update LED states
            if (data.leds) {
                for (let i = 1; i <= 6; i++) {
                    const ledElement = document.getElementById(`led-${i}`);
                    if (ledElement && data.leds[`led${i}`] !== undefined) {
                        ledElement.checked = data.leds[`led${i}`];
                    }
                }
            }

            // Update sensor readings
            if (data.temperature !== undefined) {
                document.getElementById('temperature').textContent = 
                    `${Math.round(data.temperature)}°C`;
                document.getElementById('temperature-display').textContent = 
                    `${Math.round(data.temperature)}°C`;
            }
            
            if (data.humidity !== undefined) {
                document.getElementById('humidity').textContent = 
                    `${Math.round(data.humidity)}%`;
                document.getElementById('humidity-display').textContent = 
                    `${Math.round(data.humidity)}%`;
            }
            
            this.updateStatusElement('fan-status', data.fanOn, 'ON', 'OFF');
            this.updateStatusElement('rain-status', data.rainDetected, 'Raining', 'No Rain');
            this.updateStatusElement('gas-status', data.gasAlarm, 'Gas Leak!', 'Safe');
            this.updateStatusElement('alarm-status', data.securityBreach, 'ACTIVE', 'Inactive');
            this.updateStatusElement('security-status', data.securityActive, 'Active', 'Disabled');

            // Update progress bars
            if (data.batteryLevel !== undefined) {
                this.updateProgressBar('battery-level', data.batteryLevel, 'battery-text');
            }
            if (data.waterLevel !== undefined) {
                this.updateProgressBar('water-level', data.waterLevel, 'water-text');
                document.getElementById('water-level-display').textContent = 
                    `${Math.round(data.waterLevel)}%`;
            }

            // Update curtain status
            document.getElementById('curtain-status').textContent = 
                data.rainDetected ? 'Inside' : 'Outside';

            // Show/hide stop alarm button
            const stopAlarmBtn = document.getElementById('stop-alarm-btn');
            if (stopAlarmBtn) {
                stopAlarmBtn.style.display = data.securityBreach ? 'block' : 'none';
            }

            // Update alerts
            this.updateAlerts(data.alerts || []);

            // Update last update time
            this.updateLastUpdateTime();

        } catch (error) {
            console.error('Error updating UI:', error);
        }
    }

    updateStatusElement(elementId, condition, trueText, falseText) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = condition ? trueText : falseText;
            
            if (elementId.includes('lock')) {
                element.className = `status-badge ${condition ? 'status-locked' : 'status-unlocked'}`;
            } else if (elementId.includes('door') || elementId.includes('gate') || elementId.includes('garage')) {
                element.className = `status-badge ${condition ? 'status-open' : 'status-closed'}`;
            } else if ((elementId.includes('alarm') || elementId.includes('gas')) && condition) {
                element.className = 'status-badge status-alert';
            } else {
                element.className = `status-badge ${condition ? 'status-on' : 'status-off'}`;
            }
        }
    }

    updateProgressBar(barId, percentage, textId) {
        const bar = document.getElementById(barId);
        const text = document.getElementById(textId);
        
        if (bar && text) {
            const clampedPercentage = Math.max(0, Math.min(100, percentage));
            bar.style.width = `${clampedPercentage}%`;
            text.textContent = `${Math.round(clampedPercentage)}%`;
            
            // Color coding
            if (clampedPercentage < 20) {
                bar.style.background = 'linear-gradient(90deg, #dc3545, #e74c3c)';
            } else if (clampedPercentage < 50) {
                bar.style.background = 'linear-gradient(90deg, #ffc107, #f39c12)';
            } else {
                bar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            }
        }
    }

    updateAlerts(alerts) {
        const alertPanel = document.getElementById('alert-panel');
        const alertContent = document.getElementById('alert-content');
        
        if (!alertContent) return;
        
        if (alerts && alerts.length > 0) {
            alertPanel.style.display = 'block';
            alertContent.innerHTML = alerts.map(alert => {
                let type = 'info';
                let icon = 'fas fa-info-circle';
                
                if (alert.toLowerCase().includes('breach') || alert.toLowerCase().includes('security')) {
                    type = 'danger';
                    icon = 'fas fa-exclamation-triangle';
                } else if (alert.toLowerCase().includes('gas') || alert.toLowerCase().includes('leak')) {
                    type = 'warning';
                    icon = 'fas fa-gas-pump';
                } else if (alert.toLowerCase().includes('water') || alert.toLowerCase().includes('battery')) {
                    type = 'warning';
                    icon = 'fas fa-exclamation-circle';
                }
                
                return `<div class="alert-item ${type}">
                    <i class="${icon}"></i>
                    <span>${alert}</span>
                </div>`;
            }).join('');
        } else {
            alertContent.innerHTML = `<div class="alert-item info">
                <i class="fas fa-info-circle"></i>
                <span>All systems normal</span>
            </div>`;
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('si-LK', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // Update connection status tooltip
        const statusElement = document.getElementById('connection-status');
        if (statusElement && this.isConnected) {
            statusElement.title = `Last update: ${timeString}`;
        }
    }

    updateUIWithSimulatedData() {
        const simulatedData = {
            gateOpen: Math.random() > 0.7,
            garageOpen: Math.random() > 0.7,
            mainDoorOpen: Math.random() > 0.7,
            doorLocked: Math.random() > 0.5,
            garageAutoMode: true,
            securityActive: true,
            gasAlarm: Math.random() > 0.9,
            rainDetected: Math.random() > 0.8,
            motionDetected: Math.random() > 0.6,
            fanOn: Math.random() > 0.5,
            securityBreach: Math.random() > 0.9,
            ultrasonicDistance: Math.floor(Math.random() * 20),
            temperature: Math.floor(Math.random() * 10) + 22,
            humidity: Math.floor(Math.random() * 40) + 40,
            waterLevel: Math.floor(Math.random() * 30) + 60,
            batteryLevel: Math.floor(Math.random() * 20) + 75,
            solarAngle: Math.floor(Math.random() * 180),
            leds: {
                led1: Math.random() > 0.5,
                led2: Math.random() > 0.5,
                led3: Math.random() > 0.5,
                led4: Math.random() > 0.5,
                led5: Math.random() > 0.5,
                led6: Math.random() > 0.5
            },
            alerts: this.isConnected ? [] : ['Connection lost - Using simulated data']
        };

        this.updateUI(simulatedData);
    }

    async sendCommand(endpoint, data = {}) {
        try {
            const url = `http://${this.esp32IP}/${endpoint}`;
            
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message || 'Command sent successfully!', 'success');
                
                // Immediately refresh status after command
                setTimeout(() => this.fetchStatus(), 500);
                
                return result;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            this.showNotification('Failed to send command!', 'error');
            console.error('Error sending command:', error);
            
            // Simulate success for offline testing
            return { status: 'success', message: 'Command sent (offline simulation)' };
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

    // Modal functions
    openSettings() {
        document.getElementById('settings-modal').style.display = 'block';
    }

    closeSettings() {
        document.getElementById('settings-modal').style.display = 'none';
    }

    // Status update management
    startStatusUpdates() {
        // Initial fetch
        this.fetchStatus();
        
        // Set up periodic updates
        this.statusUpdateInterval = setInterval(() => {
            this.fetchStatus();
        }, this.updateInterval);

        // Update time every second
        setInterval(() => {
            this.updateDateTime();
        }, 1000);
    }

    restartStatusUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        this.startStatusUpdates();
    }

    manualRefresh() {
        this.fetchStatus();
        this.showNotification('Manual refresh completed', 'info');
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
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
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

// Global functions
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

function openMainDoor() {
    smartHome.openMainDoor();
}

function closeMainDoor() {
    smartHome.closeMainDoor();
}

function toggleDoorLock() {
    smartHome.toggleDoorLock();
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

function manualRefresh() {
    smartHome.manualRefresh();
}

// Initialize the system
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

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'F5') {
        event.preventDefault();
        manualRefresh();
    }
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        manualRefresh();
    }
});