class SmartHomeApp {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.notificationSound = document.getElementById('notificationSound');
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.requestNotificationPermission();
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.addNotification('System connected successfully', 'info');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleIncomingData(data);
        };

        this.socket.onclose = () => {
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.addNotification('Connection lost. Attempting to reconnect...', 'warning');
            
            // Attempt reconnect after 5 seconds
            setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.addNotification('Connection error occurred', 'danger');
        };
    }

    setupEventListeners() {
        // Security toggle
        document.getElementById('toggleSecurity').addEventListener('click', () => {
            this.toggleSecuritySystem();
        });

        // Light controls
        document.getElementById('mainLights').addEventListener('change', (e) => {
            this.controlLights(e.target.checked);
        });

        document.getElementById('autoMode').addEventListener('change', (e) => {
            this.setAutoMode(e.target.checked);
        });

        // Door controls
        document.querySelectorAll('.btn-door').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const door = e.target.closest('.btn-door').dataset.door;
                this.toggleDoorLock(door);
            });
        });

        // Refresh button
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshData();
            }
        });
    }

    handleIncomingData(data) {
        // Update sensor readings
        if (data.temperature !== undefined) {
            this.updateTemperature(data.temperature);
        }
        if (data.humidity !== undefined) {
            this.updateHumidity(data.humidity);
        }
        if (data.gasLevel !== undefined) {
            this.updateGasLevel(data.gasLevel);
        }
        if (data.motion !== undefined) {
            this.updateMotionSensor(data.motion);
        }
        if (data.perimeter !== undefined) {
            this.updatePerimeterSecurity(data.perimeter);
        }
        if (data.rain !== undefined) {
            this.updateRainSensor(data.rain);
        }
        if (data.lightLevel !== undefined) {
            this.updateLightLevel(data.lightLevel);
        }
        if (data.waterLevel !== undefined) {
            this.updateWaterLevel(data.waterLevel);
        }
        if (data.solarPower !== undefined) {
            this.updateSolarPower(data.solarPower);
        }
        if (data.batteryLevel !== undefined) {
            this.updateBatteryLevel(data.batteryLevel);
        }

        // Update last update time
        this.updateLastUpdateTime();
    }

    updateTemperature(temp) {
        const element = document.getElementById('temperature');
        element.textContent = `${temp} °C`;
        element.className = `env-value ${temp > 30 ? 'alert' : ''}`;
        
        if (temp > 35) {
            this.addNotification(`High temperature detected: ${temp}°C`, 'warning');
        }
    }

    updateHumidity(humidity) {
        document.getElementById('humidity').textContent = `${humidity} %`;
    }

    updateGasLevel(level) {
        const element = document.getElementById('gasSensor');
        element.querySelector('.sensor-value').textContent = `${level} ppm`;
        
        if (level > 100) {
            element.classList.add('gas-alert', 'alert');
            this.addNotification(`Gas leak detected! Level: ${level} ppm`, 'danger');
            this.playNotificationSound();
        } else {
            element.classList.remove('gas-alert', 'alert');
        }
    }

    updateMotionSensor(motion) {
        const element = document.getElementById('motionSensor');
        const valueElement = element.querySelector('.sensor-value');
        
        if (motion) {
            valueElement.textContent = 'Motion Detected!';
            element.classList.add('motion-alert', 'alert');
            this.addNotification('Motion detected in the house!', 'warning');
            this.playNotificationSound();
        } else {
            valueElement.textContent = 'No Motion';
            element.classList.remove('motion-alert', 'alert');
        }
    }

    updatePerimeterSecurity(status) {
        const element = document.getElementById('perimeterSensor');
        const valueElement = element.querySelector('.sensor-value');
        
        if (status === 'breach') {
            valueElement.textContent = 'Security Breach!';
            element.classList.add('alert');
            this.addNotification('Perimeter security breach detected!', 'danger');
            this.playNotificationSound();
        } else {
            valueElement.textContent = 'Secure';
            element.classList.remove('alert');
        }
    }

    updateRainSensor(raining) {
        const element = document.getElementById('rainStatus');
        element.textContent = raining ? 'Raining' : 'No Rain';
        
        if (raining) {
            this.addNotification('Rain detected - closing windows', 'info');
        }
    }

    updateLightLevel(level) {
        document.getElementById('lightLevel').textContent = `${level}%`;
    }

    updateWaterLevel(level) {
        document.getElementById('waterLevel').textContent = `${level}%`;
        
        if (level < 20) {
            this.addNotification('Water level low!', 'warning');
        }
    }

    updateSolarPower(power) {
        document.getElementById('solarPower').textContent = `${power} W`;
    }

    updateBatteryLevel(level) {
        document.getElementById('batteryLevel').textContent = `${level}%`;
        
        if (level < 30) {
            this.addNotification('Battery level low!', 'warning');
        }
    }

    // Control methods
    toggleSecuritySystem() {
        const btn = document.getElementById('toggleSecurity');
        const status = document.getElementById('securityStatus');
        
        const isArmed = status.textContent === 'Armed';
        const newStatus = isArmed ? 'Disarmed' : 'Armed';
        
        status.textContent = newStatus;
        btn.innerHTML = isArmed ? 
            '<i class="fas fa-power-off"></i> Arm System' : 
            '<i class="fas fa-power-off"></i> Disarm System';
        btn.style.background = isArmed ? 'var(--success)' : 'var(--danger)';
        
        this.sendCommand({ command: 'security', status: newStatus });
        this.addNotification(`Security system ${newStatus.toLowerCase()}`, 'info');
    }

    controlLights(on) {
        this.sendCommand({ command: 'lights', status: on ? 'on' : 'off' });
        this.addNotification(`Main lights turned ${on ? 'on' : 'off'}`, 'info');
    }

    setAutoMode(enabled) {
        this.sendCommand({ command: 'autoMode', status: enabled });
        this.addNotification(`Auto mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }

    toggleDoorLock(door) {
        const btn = document.querySelector(`[data-door="${door}"]`);
        const isLocked = btn.innerHTML.includes('Locked');
        const newStatus = isLocked ? 'Unlocked' : 'Locked';
        
        btn.innerHTML = isLocked ? 
            `<i class="fas fa-unlock"></i> Unlocked` : 
            `<i class="fas fa-lock"></i> Locked`;
        
        this.sendCommand({ command: 'door', door: door, status: newStatus });
        this.addNotification(`${door} ${newStatus.toLowerCase()}`, 'info');
    }

    // Utility methods
    sendCommand(command) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify(command));
        } else {
            this.addNotification('Not connected to system', 'danger');
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            statusElement.className = 'status online';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
            statusElement.className = 'status offline';
        }
    }

    updateLastUpdateTime() {
        document.getElementById('lastUpdate').textContent = 
            `Last update: ${new Date().toLocaleTimeString()}`;
    }

    addNotification(message, type = 'info') {
        const notificationsList = document.getElementById('notificationsList');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${type.toUpperCase()}</strong>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="notification-body">${message}</div>
        `;
        
        notificationsList.insertBefore(notification, notificationsList.firstChild);
        
        // Keep only last 10 notifications
        while (notificationsList.children.length > 10) {
            notificationsList.removeChild(notificationsList.lastChild);
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    playNotificationSound() {
        if (this.notificationSound) {
            this.notificationSound.currentTime = 0;
            this.notificationSound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    refreshData() {
        this.sendCommand({ command: 'refresh' });
        this.addNotification('Refreshing data...', 'info');
    }

    loadInitialData() {
        // Simulate initial data load
        setTimeout(() => {
            this.addNotification('Smart Home System Ready', 'info');
        }, 1000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SmartHomeApp();
});

// Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}