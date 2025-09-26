// Smart Home Dashboard Application
class SmartHomeDashboard {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.sensorData = {};
        this.notifications = [];
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.initializeWebSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.startDataSimulation();
    }

    checkAuthentication() {
        const user = localStorage.getItem('smartHomeUser');
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Initialize user info in dashboard
        if (window.authManager) {
            window.authManager.initializeDashboard();
        }
    }

    initializeWebSocket() {
        // Simulate WebSocket connection
        this.simulateWebSocket();
    }

    simulateWebSocket() {
        // Simulate real-time data updates
        setInterval(() => {
            this.updateSensorData();
        }, 3000);
    }

    setupEventListeners() {
        // Security controls
        document.getElementById('securityArmBtn')?.addEventListener('click', () => {
            this.armSecuritySystem();
        });

        document.getElementById('securityDisarmBtn')?.addEventListener('click', () => {
            this.disarmSecuritySystem();
        });

        // Lighting controls
        document.querySelectorAll('input[data-light]').forEach(switchEl => {
            switchEl.addEventListener('change', (e) => {
                this.controlLight(e.target.dataset.light, e.target.checked);
            });
        });

        // Climate controls
        document.querySelectorAll('.btn-mode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setClimateMode(e.currentTarget.dataset.mode);
            });
        });

        // Quick actions
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.executeQuickAction(e.currentTarget.dataset.action);
            });
        });

        // Lighting presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyLightingPreset(e.currentTarget.dataset.preset);
            });
        });

        // Clear notifications
        document.getElementById('clearNotifications')?.addEventListener('click', () => {
            this.clearNotifications();
        });

        // Energy optimization
        document.getElementById('optimizeEnergy')?.addEventListener('click', () => {
            this.optimizeEnergyUsage();
        });
    }

    updateSensorData() {
        // Simulate sensor data updates
        const newData = {
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

        this.sensorData = { ...this.sensorData, ...newData };
        this.updateDashboard();
        
        // Check for alerts
        this.checkAlerts(newData);
    }

    updateDashboard() {
        // Update temperature
        const tempElement = document.getElementById('currentTemp');
        const climateTempElement = document.getElementById('climateTemp');
        if (tempElement && climateTempElement) {
            const temp = Math.round(this.sensorData.temperature);
            tempElement.textContent = `${temp}°C`;
            climateTempElement.textContent = `${temp}°C`;
        }

        // Update humidity
        const humidityElement = document.getElementById('climateHumidity');
        if (humidityElement) {
            humidityElement.textContent = `${Math.round(this.sensorData.humidity)}%`;
        }

        // Update energy stats
        const energyElement = document.getElementById('energyUsage');
        const solarElement = document.getElementById('solarProduction');
        const batteryElement = document.getElementById('batteryLevel');
        const devicesElement = document.getElementById('onlineDevices');

        if (energyElement) energyElement.textContent = `${this.sensorData.energyUsage} kWh`;
        if (solarElement) solarElement.textContent = `${this.sensorData.solarProduction} kWh`;
        if (batteryElement) batteryElement.textContent = `${Math.round(this.sensorData.batteryLevel)}%`;
        if (devicesElement) devicesElement.textContent = this.sensorData.onlineDevices;

        // Update security sensors
        this.updateSecuritySensors();
    }

    updateSecuritySensors() {
        const motionSensor = document.getElementById('motionSensor');
        const doorSensor = document.getElementById('doorSensor');
        const windowSensor = document.getElementById('windowSensor');

        if (motionSensor) {
            const indicator = motionSensor.querySelector('.sensor-indicator');
            const status = motionSensor.querySelector('.sensor-status');
            
            if (this.sensorData.motion) {
                indicator.style.background = 'var(--danger)';
                status.textContent = 'Motion detected!';
                motionSensor.style.borderLeftColor = 'var(--danger)';
            } else {
                indicator.style.background = 'var(--success)';
                status.textContent = 'No activity';
                motionSensor.style.borderLeftColor = 'var(--success)';
            }
        }

        if (doorSensor) {
            const status = doorSensor.querySelector('.sensor-status');
            status.textContent = this.sensorData.doorsLocked ? 'All locked' : 'Doors unlocked';
            doorSensor.style.borderLeftColor = this.sensorData.doorsLocked ? 'var(--success)' : 'var(--danger)';
        }

        if (windowSensor) {
            const status = windowSensor.querySelector('.sensor-status');
            status.textContent = this.sensorData.windowsClosed ? 'All closed' : 'Windows open';
            windowSensor.style.borderLeftColor = this.sensorData.windowsClosed ? 'var(--success)' : 'var(--warning)';
        }
    }

    checkAlerts(data) {
        // Temperature alert
        if (data.temperature > 30) {
            this.addNotification('High temperature detected', 'warning', 'Temperature above 30°C');
        }

        // Motion alert when system is armed
        if (data.motion && this.isSecurityArmed()) {
            this.addNotification('Motion detected while system armed', 'danger', 'Security alert!');
        }

        // Low battery alert
        if (data.batteryLevel < 20) {
            this.addNotification('Battery level low', 'warning', 'Consider charging soon');
        }
    }

    armSecuritySystem() {
        localStorage.setItem('securityArmed', 'true');
        this.updateSecurityStatus();
        this.addNotification('Security system armed', 'info', 'All sensors active');
    }

    disarmSecuritySystem() {
        localStorage.setItem('securityArmed', 'false');
        this.updateSecurityStatus();
        this.addNotification('Security system disarmed', 'info', 'System in standby');
    }

    isSecurityArmed() {
        return localStorage.getItem('securityArmed') === 'true';
    }

    updateSecurityStatus() {
        const statusElement = document.getElementById('securityStatus');
        const armBtn = document.getElementById('securityArmBtn');
        const disarmBtn = document.getElementById('securityDisarmBtn');

        if (this.isSecurityArmed()) {
            if (statusElement) statusElement.textContent = 'Armed';
            if (armBtn) armBtn.style.display = 'none';
            if (disarmBtn) disarmBtn.style.display = 'flex';
        } else {
            if (statusElement) statusElement.textContent = 'Disarmed';
            if (armBtn) armBtn.style.display = 'flex';
            if (disarmBtn) disarmBtn.style.display = 'none';
        }
    }

    controlLight(lightId, state) {
        const lightElement = document.querySelector(`input[data-light="${lightId}"]`);
        if (lightElement) {
            const status = lightElement.closest('.light-item').querySelector('.light-status');
            status.textContent = state ? 'On' : 'Off';
        }

        this.addNotification(
            `${this.formatLightName(lightId)} turned ${state ? 'on' : 'off'}`,
            'info'
        );
    }

    formatLightName(lightId) {
        const names = {
            'living-room': 'Living Room Lights',
            'kitchen': 'Kitchen Lights',
            'bedroom': 'Bedroom Lights',
            'outdoor': 'Outdoor Lights'
        };
        return names[lightId] || lightId;
    }

    setClimateMode(mode) {
        document.querySelectorAll('.btn-mode').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        this.addNotification(`Climate mode set to ${mode}`, 'info');
    }

    adjustThermo(change) {
        const thermoElement = document.getElementById('thermostatValue');
        if (thermoElement) {
            const currentTemp = parseInt(thermoElement.textContent);
            const newTemp = Math.max(16, Math.min(30, currentTemp + change));
            thermoElement.textContent = `${newTemp}°C`;
            
            this.addNotification(`Temperature set to ${newTemp}°C`, 'info');
        }
    }

    applyLightingPreset(preset) {
        const actions = {
            'all-on': () => this.turnAllLights(true),
            'all-off': () => this.turnAllLights(false),
            'evening': () => this.setEveningLights()
        };

        if (actions[preset]) {
            actions[preset]();
            this.addNotification(`Applied ${preset} lighting preset`, 'info');
        }
    }

    turnAllLights(state) {
        document.querySelectorAll('input[data-light]').forEach(switchEl => {
            switchEl.checked = state;
            this.controlLight(switchEl.dataset.light, state);
        });
    }

    setEveningLights() {
        const lights = {
            'living-room': true,
            'kitchen': true,
            'bedroom': false,
            'outdoor': true
        };

        Object.entries(lights).forEach(([lightId, state]) => {
            const switchEl = document.querySelector(`input[data-light="${lightId}"]`);
            if (switchEl) {
                switchEl.checked = state;
                this.controlLight(lightId, state);
            }
        });
    }

    executeQuickAction(action) {
        const actions = {
            'away-mode': () => this.setAwayMode(),
            'goodnight': () => this.setGoodNightMode(),
            'wake-up': () => this.setWakeUpMode(),
            'entertainment': () => this.setEntertainmentMode()
        };

        if (actions[action]) {
            actions[action]();
            this.addNotification(`Executed ${action.replace('-', ' ')} action`, 'info');
        }
    }

    setAwayMode() {
        this.armSecuritySystem();
        this.turnAllLights(false);
        this.addNotification('Away mode activated', 'info', 'Home secured for departure');
    }

    setGoodNightMode() {
        this.turnAllLights(false);
        const bedroomLight = document.querySelector('input[data-light="bedroom"]');
        if (bedroomLight) {
            bedroomLight.checked = true;
            this.controlLight('bedroom', true);
        }
        this.addNotification('Good night mode activated', 'info', 'Sweet dreams!');
    }

    setWakeUpMode() {
        this.turnAllLights(true);
        this.adjustThermo(2); // Increase temperature slightly
        this.addNotification('Wake up mode activated', 'info', 'Good morning!');
    }

    setEntertainmentMode() {
        const lights = {
            'living-room': true,
            'kitchen': false,
            'bedroom': false,
            'outdoor': false
        };

        Object.entries(lights).forEach(([lightId, state]) => {
            const switchEl = document.querySelector(`input[data-light="${lightId}"]`);
            if (switchEl) {
                switchEl.checked = state;
                this.controlLight(lightId, state);
            }
        });
        
        this.addNotification('Entertainment mode activated', 'info', 'Perfect for movie night!');
    }

    optimizeEnergyUsage() {
        // Simulate energy optimization
        this.addNotification('Energy usage optimized', 'success', 'Potential savings identified');
        
        // Show simulated savings
        setTimeout(() => {
            this.addNotification('Energy report ready', 'info', 'View savings analysis');
        }, 2000);
    }

    addNotification(title, type, message = '') {
        const notification = {
            id: Date.now(),
            title,
            type,
            message,
            timestamp: new Date(),
            read: false
        };

        this.notifications.unshift(notification);
        this.updateNotificationsUI();

        // Play sound for important notifications
        if (type === 'danger' || type === 'warning') {
            this.playNotificationSound();
        }

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
    }

    updateNotificationsUI() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        container.innerHTML = this.notifications.map(notif => `
            <div class="notification-item">
                <div class="notification-icon ${notif.type}">
                    <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${this.formatTime(notif.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'warning': 'exclamation-triangle',
            'danger': 'exclamation-circle',
            'success': 'check-circle'
        };
        return icons[type] || 'bell';
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleDateString();
    }

    clearNotifications() {
        this.notifications = [];
        this.updateNotificationsUI();
        this.addNotification('Notifications cleared', 'info');
    }

    playNotificationSound() {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    loadInitialData() {
        // Load saved security state
        this.updateSecurityStatus();
        
        // Load any saved preferences
        const savedMode = localStorage.getItem('climateMode');
        if (savedMode) {
            this.setClimateMode(savedMode);
        }

        // Add welcome notification
        this.addNotification('System initialized', 'info', 'Smart home dashboard is ready');
    }

    startDataSimulation() {
        // Initial data load
        this.updateSensorData();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the dashboard page
    if (document.querySelector('.dashboard-grid')) {
        window.smartHomeDashboard = new SmartHomeDashboard();
    }
});

// Global thermostat adjustment function
window.adjustThermo = function(change) {
    if (window.smartHomeDashboard) {
        window.smartHomeDashboard.adjustThermo(change);
    }
};

// Global logout function
window.logout = function() {
    if (window.authManager) {
        window.authManager.logout();
    }
};