class SmartHomeSystem {
    constructor() {
        this.esp32IP = localStorage.getItem('esp32IP') || '192.168.1.100';
        this.updateInterval = parseInt(localStorage.getItem('updateInterval')) || 2000;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastUpdateTime = 0;
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
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
            this.esp32IP = ipInput.value;
            const intervalSeconds = parseInt(intervalInput.value);
            this.updateInterval = intervalSeconds * 1000;
            
            localStorage.setItem('esp32IP', this.esp32IP);
            localStorage.setItem('updateInterval', this.updateInterval);
            
            this.restartStatusUpdates();
            this.closeSettings();
            this.showNotification('Settings saved successfully!', 'success');
        }
    }

    async fetchStatus() {
        try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const url = `http://${this.esp32IP}/status?t=${timestamp}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
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
        
        if (statusElement) {
            if (connected) {
                statusElement.className = 'status online';
                statusElement.innerHTML = '<span class="connection-dot connected"></span><i class="fas fa-wifi"></i> Connected';
            } else {
                statusElement.className = 'status offline';
                statusElement.innerHTML = '<span class="connection-dot disconnected"></span><i class="fas fa-wifi"></i> Disconnected';
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
            this.showNotification('Failed to send command! Check connection.', 'error');
            console.error('Error sending command:', error);
            
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
        }
    }

    closeSettings() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async testConnection() {
        try {
            const response = await fetch(`http://${this.esp32IP}/status`, {
                method: 'GET',
                mode: 'cors',
                timeout: 3000
            });
            
            if (response.ok) {
                this.showNotification('Connection test successful!', 'success');
                return true;
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.showNotification('Connection test failed!', 'error');
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
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .notification.success { 
                    border-left-color: #28a745;
                    background: linear-gradient(135deg, #d4edda, #c3e6cb);
                    color: #155724;
                }
                .notification.error { 
                    border-left-color: #dc3545;
                    background: linear-gradient(135deg, #f8d7da, #f5c6cb);
                    color: #721c24;
                }
                .notification.info { 
                    border-left-color: #17a2b8;
                    background: linear-gradient(135deg, #d1ecf1, #bee5eb);
                    color: #0c5460;
                }
                .notification.warning { 
                    border-left-color: #ffc107;
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    color: #856404;
                }
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
                    color: inherit;
                    opacity: 0.7;
                    transition: opacity 0.3s ease;
                }
                .notification-content button:hover {
                    opacity: 1;
                }
                @keyframes slideInRight {
                    from { 
                        transform: translateX(100%); 
                        opacity: 0; 
                    }
                    to { 
                        transform: translateX(0); 
                        opacity: 1; 
                    }
                }
                @keyframes slideOutRight {
                    from { 
                        transform: translateX(0); 
                        opacity: 1; 
                    }
                    to { 
                        transform: translateX(100%); 
                        opacity: 0; 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
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
    if (smartHome) {
        smartHome.controlLED(ledNumber, state);
    }
}

function controlAllLights(state) {
    if (smartHome) {
        smartHome.controlAllLights(state);
    }
}

function controlGate() {
    if (smartHome) {
        smartHome.controlGate();
    }
}

function openGarage() {
    if (smartHome) {
        smartHome.controlGarage('open');
    }
}

function closeGarage() {
    if (smartHome) {
        smartHome.controlGarage('close');
    }
}

function setGarageMode(autoMode) {
    if (smartHome) {
        smartHome.setGarageMode(autoMode);
    }
}

function setSecuritySystem(enabled) {
    if (smartHome) {
        smartHome.setSecuritySystem(enabled);
    }
}

function stopAlarm() {
    if (smartHome) {
        smartHome.controlAlarm('stop');
    }
}

function testBuzzer() {
    if (smartHome) {
        smartHome.controlAlarm('test');
    }
}

function openMainDoor() {
    if (smartHome) {
        smartHome.openMainDoor();
    }
}

function closeMainDoor() {
    if (smartHome) {
        smartHome.closeMainDoor();
    }
}

function toggleDoorLock() {
    if (smartHome) {
        smartHome.toggleDoorLock();
    }
}

function toggleTheme() {
    if (smartHome) {
        smartHome.toggleTheme();
    }
}

function setTheme(theme) {
    if (smartHome) {
        smartHome.setTheme(theme);
    }
}

function openSettings() {
    if (smartHome) {
        smartHome.openSettings();
    }
}

function closeSettings() {
    if (smartHome) {
        smartHome.closeSettings();
    }
}

function saveSettings() {
    if (smartHome) {
        smartHome.saveSettings();
    }
}

function testConnection() {
    if (smartHome) {
        smartHome.testConnection();
    }
}

function manualRefresh() {
    if (smartHome) {
        smartHome.manualRefresh();
    }
}

// Initialize the system when page loads
let smartHome;

document.addEventListener('DOMContentLoaded', () => {
    smartHome = new SmartHomeSystem();
});

// System theme change listener
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (smartHome && localStorage.getItem('theme') === 'auto') {
            smartHome.applyTheme('auto');
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && smartHome) {
        smartHome.fetchStatus();
    }
});

// Error handling for uncaught errors
window.addEventListener('error', function(e) {
    console.error('Uncaught error:', e.error);
});

// Export for debugging (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartHomeSystem;
}