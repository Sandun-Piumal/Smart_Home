// Device Management System
class DeviceManager {
    static init() {
        this.setupEventListeners();
        this.setupFirebaseListeners();
        this.initializeDeviceStates();
    }

    static setupEventListeners() {
        // Debounced event listeners for better performance
        const debouncedToggle = Utils.debounce(this.toggleLight.bind(this), AppConfig.DEBOUNCE_DELAY);
        
        // Attach event listeners to all light switches
        for (let i = 1; i <= 7; i++) {
            const switchElement = document.getElementById(`light${i}`);
            if (switchElement) {
                switchElement.addEventListener('change', (e) => {
                    debouncedToggle(i, e.target.checked);
                });
            }
        }
    }

    static setupFirebaseListeners() {
        // Listen for device states with error handling
        for (let i = 1; i <= 7; i++) {
            database.ref(`devices/light${i}`).on('value', 
                Utils.throttle(this.handleDeviceUpdate.bind(this, i), 500),
                this.handleDatabaseError.bind(this)
            );
        }

        // Listen for sensor data
        database.ref('sensors').on('value', 
            Utils.throttle(this.handleSensorUpdate.bind(this), 1000),
            this.handleDatabaseError.bind(this)
        );

        // Listen for mode changes
        database.ref('modes').on('value', 
            this.handleModeUpdate.bind(this),
            this.handleDatabaseError.bind(this)
        );

        // Monitor connection status
        database.ref('.info/connected').on('value', 
            this.handleConnectionUpdate.bind(this)
        );
    }

    static initializeDeviceStates() {
        // Set initial states for all devices
        for (let i = 1; i <= 7; i++) {
            this.updateDeviceUI(i, false);
        }
        
        // Set initial modes
        this.updateModeIndicator('security', true);
        this.updateModeIndicator('garden', true);
        this.updateModeIndicator('fan', true);
    }

    static async toggleLight(lightNumber, state) {
        try {
            await database.ref(`devices/light${lightNumber}`).set({
                state: state,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP,
                updatedBy: auth.currentUser?.uid || 'unknown'
            });
            
            AlertManager.show(`Light ${lightNumber} ${state ? 'ON' : 'OFF'}`, 'success');
        } catch (error) {
            console.error('Error toggling light:', error);
            AlertManager.show('Failed to toggle device', 'danger');
            
            // Revert UI state on error
            this.updateDeviceUI(lightNumber, !state);
        }
    }

    static handleDeviceUpdate(lightNumber, snapshot) {
        const data = snapshot.val();
        if (data) {
            this.updateDeviceUI(lightNumber, data.state);
        }
    }

    static updateDeviceUI(lightNumber, state) {
        const checkbox = document.getElementById(`light${lightNumber}`);
        const indicator = document.getElementById(this.getLightIndicator(lightNumber));
        
        if (checkbox && checkbox.checked !== state) {
            checkbox.checked = state;
        }
        
        if (indicator) {
            indicator.className = `status-indicator ${state ? 'status-on' : 'status-off'}`;
        }
    }

    static handleSensorUpdate(snapshot) {
        const data = snapshot.val();
        if (data) {
            this.updateSensorUI(data);
            this.checkSensorAlerts(data);
        }
    }

    static updateSensorUI(data) {
        // Update temperature
        if (data.temperature !== undefined) {
            document.getElementById('temperature').textContent = 
                `${data.temperature.toFixed(1)}°C`;
            
            // Update trend indicator
            const tempTrend = document.getElementById('tempTrend');
            if (tempTrend && data.temperature > 25) {
                tempTrend.textContent = '+2.1°';
                tempTrend.className = 'stat-trend trend-up';
            }
        }

        // Update humidity
        if (data.humidity !== undefined) {
            document.getElementById('humidity').textContent = 
                `${data.humidity.toFixed(1)}%`;
        }

        // Update LDR value
        if (data.ldrValue !== undefined) {
            document.getElementById('ldrValue').textContent = data.ldrValue;
        }

        // Update motion status
        if (data.motionDetected !== undefined) {
            const motionElement = document.getElementById('motionStatus');
            const motionTrend = document.getElementById('motionTrend');
            
            if (motionElement) {
                motionElement.textContent = data.motionDetected ? 'Active' : 'Inactive';
            }
            
            if (motionTrend) {
                motionTrend.textContent = data.motionDetected ? 'Alert' : 'Safe';
                motionTrend.className = `stat-trend ${data.motionDetected ? 'trend-up' : 'trend-down'}`;
            }
        }
    }

    static checkSensorAlerts(data) {
        // Motion detection alert
        if (data.motionDetected) {
            AlertManager.show('Motion detected in secured area!', 'warning');
        }

        // High temperature alert
        if (data.temperature >= 28.0) {
            AlertManager.show('High temperature detected!', 'danger');
        }

        // Low temperature alert
        if (data.temperature <= 15.0) {
            AlertManager.show('Low temperature detected', 'warning');
        }
    }

    static handleModeUpdate(snapshot) {
        const data = snapshot.val();
        if (data) {
            this.updateModeIndicator('security', data.security === 'Auto');
            this.updateModeIndicator('garden', data.garden === 'Auto');
            this.updateModeIndicator('fan', data.fan === 'Auto');
        }
    }

    static updateModeIndicator(type, isAuto) {
        const modeText = document.getElementById(`${type}ModeText`);
        const modeIcon = document.getElementById(`${type}ModeIcon`);
        const switchElem = document.getElementById(`${type}Switch`);

        if (modeText) modeText.textContent = isAuto ? 'Auto' : 'Manual';
        if (modeIcon) modeIcon.textContent = isAuto ? '🔄' : '✋';
        
        if (switchElem) {
            if (isAuto) {
                switchElem.classList.add('disabled');
            } else {
                switchElem.classList.remove('disabled');
            }
        }
    }

    static handleConnectionUpdate(snapshot) {
        const connected = snapshot.val();
        const indicator = document.getElementById('connectionIndicator');
        const status = document.getElementById('connectionStatus');
        const firebaseStatus = document.getElementById('firebaseStatus');

        if (indicator) {
            indicator.style.background = connected ? '#10b981' : '#ef4444';
        }
        
        if (status) {
            status.textContent = connected ? 'Connected' : 'Disconnected';
        }
        
        if (firebaseStatus) {
            firebaseStatus.textContent = connected ? 'Firebase (Online)' : 'Firebase (Offline)';
        }

        if (!connected) {
            AlertManager.show('Connection lost - attempting to reconnect...', 'danger');
        } else if (this.wasDisconnected) {
            AlertManager.show('Connection restored!', 'success');
            this.wasDisconnected = false;
        }
        
        this.wasDisconnected = !connected;
    }

    static handleDatabaseError(error) {
        console.error('Database error:', error);
        AlertManager.show('Database connection error', 'danger');
    }

    // Mode toggle functions
    static async toggleSecurityMode() {
        const currentMode = document.getElementById('securityModeText').textContent;
        const newMode = currentMode === 'Auto' ? 'Manual' : 'Auto';
        
        try {
            await database.ref('modes/security').set(newMode);
            AlertManager.show(`Security mode: ${newMode}`, 'info');
        } catch (error) {
            AlertManager.show('Failed to update security mode', 'danger');
        }
    }

    static async toggleGardenMode() {
        const currentMode = document.getElementById('gardenModeText').textContent;
        const newMode = currentMode === 'Auto' ? 'Manual' : 'Auto';
        
        try {
            await database.ref('modes/garden').set(newMode);
            AlertManager.show(`Garden mode: ${newMode}`, 'info');
        } catch (error) {
            AlertManager.show('Failed to update garden mode', 'danger');
        }
    }

    static async toggleFanMode() {
        const currentMode = document.getElementById('fanModeText').textContent;
        const newMode = currentMode === 'Auto' ? 'Manual' : 'Auto';
        
        try {
            await database.ref('modes/fan').set(newMode);
            AlertManager.show(`Fan mode: ${newMode}`, 'info');
        } catch (error) {
            AlertManager.show('Failed to update fan mode', 'danger');
        }
    }

    // Bulk operations
    static async allLightsOn() {
        try {
            const updates = {};
            for (let i = 1; i <= 7; i++) {
                updates[`devices/light${i}/state`] = true;
            }
            
            await database.ref().update(updates);
            AlertManager.show('All lights turned on', 'success');
        } catch (error) {
            AlertManager.show('Failed to turn on all lights', 'danger');
        }
    }

    static async allLightsOff() {
        try {
            const updates = {};
            for (let i = 1; i <= 7; i++) {
                updates[`devices/light${i}/state`] = false;
            }
            
            await database.ref().update(updates);
            AlertManager.show('All lights turned off', 'success');
        } catch (error) {
            AlertManager.show('Failed to turn off all lights', 'danger');
        }
    }

    static async armSystem() {
        try {
            await database.ref('security/armed').set(true);
            AlertManager.show('Security system armed', 'warning');
        } catch (error) {
            AlertManager.show('Failed to arm security system', 'danger');
        }
    }

    static async createScene(scene) {
        try {
            await database.ref('scenes/active').set(scene);
            AlertManager.show(`"${scene}" scene activated`, 'info');
        } catch (error) {
            AlertManager.show('Failed to activate scene', 'danger');
        }
    }

    static getLightIndicator(num) {
        const indicators = {
            '1': 'gardenStatusIndicator',
            '2': 'bedroomStatusIndicator', 
            '3': 'kitchenStatusIndicator',
            '4': 'livingroomStatusIndicator',
            '5': 'garageStatusIndicator',
            '6': 'securityStatusIndicator',
            '7': 'fanStatusIndicator'
        };
        return indicators[num] || '';
    }
}

// Export for global access
window.DeviceManager = DeviceManager;