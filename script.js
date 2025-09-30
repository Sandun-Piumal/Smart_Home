class SmartHomeSystem {
    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '[file name]: script.js
[file content begin]
class SmartHomeSystem {
    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '10.175.165.116';
        this.updateInterval = parseInt(localStorage.getItem('updateInterval')) || 2000;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.lastUpdateTime = 0;
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.updateDateTime();
        this.loadSettings();
        this.setupEventListeners();
        this.startStatusUpdates();
        this.setupNetworkListeners();
        this.showNotification('Smart Home System initialized!', 'success');
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Network connection restored', 'success');
            this.fetchStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Network connection lost', 'error');
            this.setConnectionStatus(false);
        });
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F5') {
                event.preventDefault();
                this.manualRefresh();
            }
            if (event.ctrlKey && event.key === 'r') {
                event.preventDefault();
                this.manualRefresh();
            }
            if (event.key === 'Escape') {
                this.closeSettings();
            }
            // Theme toggle shortcut (Ctrl+T)
            if (event.ctrlKey && event.key === 't') {
                event.preventDefault();
                this.toggleTheme();
            }
        });

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchStatus();
            }
        });
    }

    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('light-theme', 'dark-theme');
        
        if (theme === 'auto') {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
        }
        
        // Apply selected theme
        document.body.classList.add(theme + '-theme');
        this.currentTheme = theme;
        
        // Update theme indicator
        this.updateThemeIndicator();
        
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }

    updateThemeIndicator() {
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        const currentTheme = document.getElementById('current-theme');
        
        if (this.currentTheme === 'dark') {
            if (themeIcon) themeIcon.className = 'fas fa-sun';
            if (themeText) themeText.textContent = 'Light';
            if (currentTheme) currentTheme.textContent = 'Dark';
        } else {
            if (themeIcon) themeIcon.className = 'fas fa-moon';
            if (themeText) themeText.textContent = 'Dark';
            if (currentTheme) currentTheme.textContent = 'Light';
        }
        
        // Update radio buttons in settings
        const radioButtons = document.querySelectorAll('input[name="theme"]');
        radioButtons.forEach(radio => {
            radio.checked = radio.value === localStorage.getItem('theme');
        });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.showNotification(`Theme changed to ${newTheme} mode`, 'info');
    }

    setTheme(theme) {
        this.applyTheme(theme);
        if (theme !== 'auto') {
            this.showNotification(`Theme set to ${theme} mode`, 'info');
        } else {
            this.showNotification('Theme set to auto (system preference)', 'info');
        }
    }

    updateDateTime() {
        const now = new Date();
        const timeElement = document.getElementById('time-display');
        const dateElement = document.getElementById('date-display');
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('si-LK', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('si-LK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    loadSettings() {
        const ipInput = document.getElementById('esp32-ip');
        const intervalInput = document.getElementById('update-interval');
        const espIpSpan = document.getElementById('esp-ip');
        
        if (ipInput) ipInput.value = this.esp32IP;
        if (intervalInput) intervalInput.value = this.updateInterval / 1000;
        if (espIpSpan) espIpSpan.textContent = this.esp32IP;
        
        // Set theme radio buttons
        const theme = localStorage.getItem('theme') || 'light';
        const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (radio) radio.checked = true;
    }

    saveSettings() {
        const ipInput = document.getElementById('esp32-ip');
        const intervalInput = document.getElementById('update-interval');
        
        if (ipInput && intervalInput) {
            this.esp32IP = ipInput.value.trim();
            const intervalSeconds = parseInt(intervalInput.value);
            this.updateInterval = Math.max(1000, intervalSeconds * 1000);
            
            localStorage.setItem('esp32IP', this.esp32IP);
            localStorage.setItem('updateInterval', this.updateInterval);
            
            this.restartStatusUpdates();
            this.closeSettings();
            this.showNotification('Settings saved successfully!', 'success');
        }
    }

    async fetchStatus() {
        // If we're offline, use simulated data immediately
        if (!this.isOnline) {
            this.setConnectionStatus(false);
            this.updateUIWithSimulatedData();
            return false;
        }

        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            console.log(`Fetching status from: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
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
                this.updateLastUpdateTime();
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
                    this.showNotification(`Cannot connect to ESP32 at ${this.esp32IP}. Using simulated data.`, 'warning');
                }
            }
            
            // Use simulated data when connection fails
            this.updateUIWithSimulatedData();
            return false;
        }
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connection-status');
        
        if (statusElement) {
            if (connected) {
                statusElement.className = 'status online';
                statusElement.innerHTML = '<span class="connection-dot connected"></span><i class="fas fa-wifi"></i> Connected';
                statusElement.title = `Connected to ${this.esp32IP}`;
            } else {
                statusElement.className = 'status offline';
                statusElement.innerHTML = '<span class="connection-dot disconnected"></span><i class="fas fa-wifi"></i> Disconnected';
                statusElement.title = 'Disconnected - Using simulated data';
            }
        }
    }

    updateUI(data) {
        try {
            // Update gate status
            this.updateStatusElement('gate-status', data.gateOpen, 'Open', 'Closed');
            
            // Update garage status
            this.updateStatusElement('garage-status', data.garageOpen, 'Open', 'Closed');
            this.updateTextContent('ultrasonic-distance', `${data.ultrasonicDistance || 0} cm`);
            
            // Update main door status
            this.updateStatusElement('main-door-status', data.mainDoorOpen, 'Open', 'Closed');
            this.updateStatusElement('door-lock-status', data.doorLocked, 'Locked', 'Unlocked');

            // Update garage mode
            const garageModeToggle = document.getElementById('garage-mode-toggle');
            if (garageModeToggle && data.garageAutoMode !== undefined) {
                garageModeToggle.checked = data.garageAutoMode;
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
                this.updateTextContent('temperature', `${Math.round(data.temperature)}°C`);
                this.updateTextContent('temperature-display', `${Math.round(data.temperature)}°C`);
            }
            
            if (data.humidity !== undefined) {
                this.updateTextContent('humidity', `${Math.round(data.humidity)}%`);
                this.updateTextContent('humidity-display', `${Math.round(data.humidity)}%`);
            }
            
            this.updateStatusElement('fan-status', data.fanOn, 'ON', 'OFF');
            this.updateStatusElement('rain-status', data.rainDetected, 'Raining', 'No Rain');
            this.updateStatusElement('gas-status', data.gasAlarm, 'Gas Leak!', 'Safe');
            this.updateStatusElement('alarm-status', data.securityBreach, 'ACTIVE', 'Inactive');
            this.updateStatusElement('security-status', data.securityActive, 'Active', 'Disabled');
            this.updateStatusElement('motion-status', data.motionDetected, 'Motion', 'No Motion');
            this.updateStatusElement('laser-status', data.securityActive, 'Active', 'Inactive');

            // Update progress bars
            if (data.batteryLevel !== undefined) {
                this.updateProgressBar('battery-level', data.batteryLevel, 'battery-text');
            }
            if (data.waterLevel !== undefined) {
                this.updateProgressBar('water-level', data.waterLevel, 'water-text');
                this.updateTextContent('water-level-display', `${Math.round(data.waterLevel)}%`);
            }

            // Update other values
            if (data.solarAngle !== undefined) {
                this.updateTextContent('solar-angle', `${data.solarAngle}°`);
            }
            
            // Update curtain status
            this.updateTextContent('curtain-status', data.rainDetected ? 'Inside' : 'Outside');

            // Show/hide stop alarm button
            this.toggleElement('stop-alarm-btn', data.securityBreach);
            this.toggleElement('stop-alarm-main-btn', data.securityBreach);

            // Update alerts
            this.updateAlerts(data.alerts || []);

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

    updateTextContent(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
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

    toggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    updateAlerts(alerts) {
        const alertPanel = document.getElementById('alert-panel');
        const alertContent = document.getElementById('alert-content');
        
        if (!alertContent) return;
        
        if (alerts && alerts.length > 0) {
            if (alertPanel) alertPanel.style.display = 'block';
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
        
        this.updateTextContent('last-update', timeString);
        
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
        // If offline, simulate success for testing
        if (!this.isOnline) {
            this.showNotification('Command sent (offline simulation)', 'info');
            setTimeout(() => this.fetchStatus(), 500);
            return { status: 'success', message: 'Command sent (offline simulation)' };
        }

        try {
            const url = `http://${this.esp32IP}/${endpoint}`;
            
            console.log(`Sending command to: ${url}`, data);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            clearTimeout(timeoutId);
            
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
            console.error('Error sending command:', error);
            
            if (error.name === 'AbortError') {
                this.showNotification('Command timeout! ESP32 may be unreachable.', 'error');
            } else {
                this.showNotification('Failed to send command! Check connection.', 'error');
            }
            
            // Simulate success for offline testing
            setTimeout(() => this.fetchStatus(), 500);
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
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSettings();
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async testConnection() {
        this.showNotification('Testing connection...', 'info');
        
        try {
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.showNotification('Connection test successful! ESP32 is responding.', 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showNotification('Connection test failed: Timeout reached', 'error');
            } else {
                this.showNotification(`Connection test failed: ${error.message}`, 'error');
            }
            return false;
        }
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
        existingNotifications.forEach(notification => {
            if (notification.parentElement) {
                notification.remove();
            }
        });

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
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
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
    if (window.smartHome) {
        window.smartHome.controlLED(ledNumber, state);
    }
}

function controlAllLights(state) {
    if (window.smartHome) {
        window.smartHome.controlAllLights(state);
    }
}

function controlGate() {
    if (window.smartHome) {
        window.smartHome.controlGate();
    }
}

function openGarage() {
    if (window.smartHome) {
        window.smartHome.controlGarage('open');
    }
}

function closeGarage() {
    if (window.smartHome) {
        window.smartHome.controlGarage('close');
    }
}

function setGarageMode(autoMode) {
    if (window.smartHome) {
        window.smartHome.setGarageMode(autoMode);
    }
}

function setSecuritySystem(enabled) {
    if (window.smartHome) {
        window.smartHome.setSecuritySystem(enabled);
    }
}

function stopAlarm() {
    if (window.smartHome) {
        window.smartHome.controlAlarm('stop');
    }
}

function testBuzzer() {
    if (window.smartHome) {
        window.smartHome.controlAlarm('test');
    }
}

function openMainDoor() {
    if (window.smartHome) {
        window.smartHome.openMainDoor();
    }
}

function closeMainDoor() {
    if (window.smartHome) {
        window.smartHome.closeMainDoor();
    }
}

function toggleDoorLock() {
    if (window.smartHome) {
        window.smartHome.toggleDoorLock();
    }
}

function toggleTheme() {
    if (window.smartHome) {
        window.smartHome.toggleTheme();
    }
}

function setTheme(theme) {
    if (window.smartHome) {
        window.smartHome.setTheme(theme);
    }
}

function openSettings() {
    if (window.smartHome) {
        window.smartHome.openSettings();
    }
}

function closeSettings() {
    if (window.smartHome) {
        window.smartHome.closeSettings();
    }
}

function saveSettings() {
    if (window.smartHome) {
        window.smartHome.saveSettings();
    }
}

function testConnection() {
    if (window.smartHome) {
        window.smartHome.testConnection();
    }
}

function manualRefresh() {
    if (window.smartHome) {
        window.smartHome.manualRefresh();
    }
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.smartHome = new SmartHomeSystem();
});

// System theme change listener
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (window.smartHome && localStorage.getItem('theme') === 'auto') {
            window.smartHome.applyTheme('auto');
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.smartHome) {
        window.smartHome.fetchStatus();
    }
});

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Uncaught error:', e.error);
});
[file content end]';
        this.updateInterval = parseInt(localStorage.getItem('updateInterval')) || 2000;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.lastUpdateTime = 0;
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.updateDateTime();
        this.loadSettings();
        this.setupEventListeners();
        this.startStatusUpdates();
        this.setupNetworkListeners();
        this.showNotification('Smart Home System initialized!', 'success');
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Network connection restored', 'success');
            this.fetchStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Network connection lost', 'error');
            this.setConnectionStatus(false);
        });
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F5') {
                event.preventDefault();
                this.manualRefresh();
            }
            if (event.ctrlKey && event.key === 'r') {
                event.preventDefault();
                this.manualRefresh();
            }
            if (event.key === 'Escape') {
                this.closeSettings();
            }
            // Theme toggle shortcut (Ctrl+T)
            if (event.ctrlKey && event.key === 't') {
                event.preventDefault();
                this.toggleTheme();
            }
        });

        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchStatus();
            }
        });
    }

    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('light-theme', 'dark-theme');
        
        if (theme === 'auto') {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
        }
        
        // Apply selected theme
        document.body.classList.add(theme + '-theme');
        this.currentTheme = theme;
        
        // Update theme indicator
        this.updateThemeIndicator();
        
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }

    updateThemeIndicator() {
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        const currentTheme = document.getElementById('current-theme');
        
        if (this.currentTheme === 'dark') {
            if (themeIcon) themeIcon.className = 'fas fa-sun';
            if (themeText) themeText.textContent = 'Light';
            if (currentTheme) currentTheme.textContent = 'Dark';
        } else {
            if (themeIcon) themeIcon.className = 'fas fa-moon';
            if (themeText) themeText.textContent = 'Dark';
            if (currentTheme) currentTheme.textContent = 'Light';
        }
        
        // Update radio buttons in settings
        const radioButtons = document.querySelectorAll('input[name="theme"]');
        radioButtons.forEach(radio => {
            radio.checked = radio.value === localStorage.getItem('theme');
        });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        this.showNotification(`Theme changed to ${newTheme} mode`, 'info');
    }

    setTheme(theme) {
        this.applyTheme(theme);
        if (theme !== 'auto') {
            this.showNotification(`Theme set to ${theme} mode`, 'info');
        } else {
            this.showNotification('Theme set to auto (system preference)', 'info');
        }
    }

    updateDateTime() {
        const now = new Date();
        const timeElement = document.getElementById('time-display');
        const dateElement = document.getElementById('date-display');
        
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('si-LK', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('si-LK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
    }

    loadSettings() {
        const ipInput = document.getElementById('esp32-ip');
        const intervalInput = document.getElementById('update-interval');
        const espIpSpan = document.getElementById('esp-ip');
        
        if (ipInput) ipInput.value = this.esp32IP;
        if (intervalInput) intervalInput.value = this.updateInterval / 1000;
        if (espIpSpan) espIpSpan.textContent = this.esp32IP;
        
        // Set theme radio buttons
        const theme = localStorage.getItem('theme') || 'light';
        const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
        if (radio) radio.checked = true;
    }

    saveSettings() {
        const ipInput = document.getElementById('esp32-ip');
        const intervalInput = document.getElementById('update-interval');
        
        if (ipInput && intervalInput) {
            this.esp32IP = ipInput.value.trim();
            const intervalSeconds = parseInt(intervalInput.value);
            this.updateInterval = Math.max(1000, intervalSeconds * 1000);
            
            localStorage.setItem('esp32IP', this.esp32IP);
            localStorage.setItem('updateInterval', this.updateInterval);
            
            this.restartStatusUpdates();
            this.closeSettings();
            this.showNotification('Settings saved successfully!', 'success');
        }
    }

    async fetchStatus() {
        // If we're offline, use simulated data immediately
        if (!this.isOnline) {
            this.setConnectionStatus(false);
            this.updateUIWithSimulatedData();
            return false;
        }

        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            console.log(`Fetching status from: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
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
                this.updateLastUpdateTime();
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
                    this.showNotification(`Cannot connect to ESP32 at ${this.esp32IP}. Using simulated data.`, 'warning');
                }
            }
            
            // Use simulated data when connection fails
            this.updateUIWithSimulatedData();
            return false;
        }
    }

    setConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connection-status');
        
        if (statusElement) {
            if (connected) {
                statusElement.className = 'status online';
                statusElement.innerHTML = '<span class="connection-dot connected"></span><i class="fas fa-wifi"></i> Connected';
                statusElement.title = `Connected to ${this.esp32IP}`;
            } else {
                statusElement.className = 'status offline';
                statusElement.innerHTML = '<span class="connection-dot disconnected"></span><i class="fas fa-wifi"></i> Disconnected';
                statusElement.title = 'Disconnected - Using simulated data';
            }
        }
    }

    updateUI(data) {
        try {
            // Update gate status
            this.updateStatusElement('gate-status', data.gateOpen, 'Open', 'Closed');
            
            // Update garage status
            this.updateStatusElement('garage-status', data.garageOpen, 'Open', 'Closed');
            this.updateTextContent('ultrasonic-distance', `${data.ultrasonicDistance || 0} cm`);
            
            // Update main door status
            this.updateStatusElement('main-door-status', data.mainDoorOpen, 'Open', 'Closed');
            this.updateStatusElement('door-lock-status', data.doorLocked, 'Locked', 'Unlocked');

            // Update garage mode
            const garageModeToggle = document.getElementById('garage-mode-toggle');
            if (garageModeToggle && data.garageAutoMode !== undefined) {
                garageModeToggle.checked = data.garageAutoMode;
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
                this.updateTextContent('temperature', `${Math.round(data.temperature)}°C`);
                this.updateTextContent('temperature-display', `${Math.round(data.temperature)}°C`);
            }
            
            if (data.humidity !== undefined) {
                this.updateTextContent('humidity', `${Math.round(data.humidity)}%`);
                this.updateTextContent('humidity-display', `${Math.round(data.humidity)}%`);
            }
            
            this.updateStatusElement('fan-status', data.fanOn, 'ON', 'OFF');
            this.updateStatusElement('rain-status', data.rainDetected, 'Raining', 'No Rain');
            this.updateStatusElement('gas-status', data.gasAlarm, 'Gas Leak!', 'Safe');
            this.updateStatusElement('alarm-status', data.securityBreach, 'ACTIVE', 'Inactive');
            this.updateStatusElement('security-status', data.securityActive, 'Active', 'Disabled');
            this.updateStatusElement('motion-status', data.motionDetected, 'Motion', 'No Motion');
            this.updateStatusElement('laser-status', data.securityActive, 'Active', 'Inactive');

            // Update progress bars
            if (data.batteryLevel !== undefined) {
                this.updateProgressBar('battery-level', data.batteryLevel, 'battery-text');
            }
            if (data.waterLevel !== undefined) {
                this.updateProgressBar('water-level', data.waterLevel, 'water-text');
                this.updateTextContent('water-level-display', `${Math.round(data.waterLevel)}%`);
            }

            // Update other values
            if (data.solarAngle !== undefined) {
                this.updateTextContent('solar-angle', `${data.solarAngle}°`);
            }
            
            // Update curtain status
            this.updateTextContent('curtain-status', data.rainDetected ? 'Inside' : 'Outside');

            // Show/hide stop alarm button
            this.toggleElement('stop-alarm-btn', data.securityBreach);
            this.toggleElement('stop-alarm-main-btn', data.securityBreach);

            // Update alerts
            this.updateAlerts(data.alerts || []);

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

    updateTextContent(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
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

    toggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    updateAlerts(alerts) {
        const alertPanel = document.getElementById('alert-panel');
        const alertContent = document.getElementById('alert-content');
        
        if (!alertContent) return;
        
        if (alerts && alerts.length > 0) {
            if (alertPanel) alertPanel.style.display = 'block';
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
        
        this.updateTextContent('last-update', timeString);
        
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
        // If offline, simulate success for testing
        if (!this.isOnline) {
            this.showNotification('Command sent (offline simulation)', 'info');
            setTimeout(() => this.fetchStatus(), 500);
            return { status: 'success', message: 'Command sent (offline simulation)' };
        }

        try {
            const url = `http://${this.esp32IP}/${endpoint}`;
            
            console.log(`Sending command to: ${url}`, data);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            clearTimeout(timeoutId);
            
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
            console.error('Error sending command:', error);
            
            if (error.name === 'AbortError') {
                this.showNotification('Command timeout! ESP32 may be unreachable.', 'error');
            } else {
                this.showNotification('Failed to send command! Check connection.', 'error');
            }
            
            // Simulate success for offline testing
            setTimeout(() => this.fetchStatus(), 500);
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
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'block';
            this.loadSettings();
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async testConnection() {
        this.showNotification('Testing connection...', 'info');
        
        try {
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                mode: 'cors'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.showNotification('Connection test successful! ESP32 is responding.', 'success');
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showNotification('Connection test failed: Timeout reached', 'error');
            } else {
                this.showNotification(`Connection test failed: ${error.message}`, 'error');
            }
            return false;
        }
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
        existingNotifications.forEach(notification => {
            if (notification.parentElement) {
                notification.remove();
            }
        });

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
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
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
    if (window.smartHome) {
        window.smartHome.controlLED(ledNumber, state);
    }
}

function controlAllLights(state) {
    if (window.smartHome) {
        window.smartHome.controlAllLights(state);
    }
}

function controlGate() {
    if (window.smartHome) {
        window.smartHome.controlGate();
    }
}

function openGarage() {
    if (window.smartHome) {
        window.smartHome.controlGarage('open');
    }
}

function closeGarage() {
    if (window.smartHome) {
        window.smartHome.controlGarage('close');
    }
}

function setGarageMode(autoMode) {
    if (window.smartHome) {
        window.smartHome.setGarageMode(autoMode);
    }
}

function setSecuritySystem(enabled) {
    if (window.smartHome) {
        window.smartHome.setSecuritySystem(enabled);
    }
}

function stopAlarm() {
    if (window.smartHome) {
        window.smartHome.controlAlarm('stop');
    }
}

function testBuzzer() {
    if (window.smartHome) {
        window.smartHome.controlAlarm('test');
    }
}

function openMainDoor() {
    if (window.smartHome) {
        window.smartHome.openMainDoor();
    }
}

function closeMainDoor() {
    if (window.smartHome) {
        window.smartHome.closeMainDoor();
    }
}

function toggleDoorLock() {
    if (window.smartHome) {
        window.smartHome.toggleDoorLock();
    }
}

function toggleTheme() {
    if (window.smartHome) {
        window.smartHome.toggleTheme();
    }
}

function setTheme(theme) {
    if (window.smartHome) {
        window.smartHome.setTheme(theme);
    }
}

function openSettings() {
    if (window.smartHome) {
        window.smartHome.openSettings();
    }
}

function closeSettings() {
    if (window.smartHome) {
        window.smartHome.closeSettings();
    }
}

function saveSettings() {
    if (window.smartHome) {
        window.smartHome.saveSettings();
    }
}

function testConnection() {
    if (window.smartHome) {
        window.smartHome.testConnection();
    }
}

function manualRefresh() {
    if (window.smartHome) {
        window.smartHome.manualRefresh();
    }
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.smartHome = new SmartHomeSystem();
});

// System theme change listener
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (window.smartHome && localStorage.getItem('theme') === 'auto') {
            window.smartHome.applyTheme('auto');
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && window.smartHome) {
        window.smartHome.fetchStatus();
    }
});

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Uncaught error:', e.error);
});
[file content end]
