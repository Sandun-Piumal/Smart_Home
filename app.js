class SmartHomeApp {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharts();
        this.updateDateTime();
        this.setupSocketListeners();
        setInterval(() => this.updateDateTime(), 1000);
    }

    setupEventListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchPage(item.dataset.page);
            });
        });

        // Device controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.controlDevice(btn.dataset.device);
            });
        });

        // Quick actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.executeQuickAction(btn.dataset.action);
            });
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                localStorage.setItem('token', data.token);
                this.showApp();
            } else {
                this.showNotification('Login failed!', 'error');
            }
        } catch (error) {
            this.showNotification('Connection error!', 'error');
        }
    }

    showApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this.loadDashboardData();
    }

    switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(pageName + 'Page').classList.add('active');

        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Update page title
        document.getElementById('pageTitle').textContent = 
            pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }

    setupCharts() {
        // Energy Chart
        const energyCtx = document.getElementById('energyChart').getContext('2d');
        this.charts.energy = new Chart(energyCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + ':00'),
                datasets: [{
                    label: 'Consumption (kW)',
                    data: Array.from({length: 24}, () => Math.random() * 5),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Temperature Chart
        const tempCtx = document.getElementById('tempChart').getContext('2d');
        this.charts.temperature = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 12}, (_, i) => {
                    const date = new Date();
                    date.setHours(date.getHours() - 12 + i);
                    return date.getHours() + ':00';
                }),
                datasets: [{
                    label: 'Temperature (°C)',
                    data: Array.from({length: 12}, () => 20 + Math.random() * 10),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    setupSocketListeners() {
        this.socket.on('system_initialized', (data) => {
            this.updateDashboard(data);
        });

        this.socket.on('device_update', (data) => {
            this.updateDeviceStatus(data);
        });

        this.socket.on('sensor_update', (data) => {
            this.updateSensorData(data);
        });

        this.socket.on('alert', (alert) => {
            this.showNotification(alert.message, alert.priority);
        });
    }

    updateDashboard(data) {
        // Update all dashboard elements with real data
        document.getElementById('tempValue').textContent = 
            data.devices.temperature_sensor.value + '°C';
        
        document.getElementById('energyValue').textContent = 
            data.energy.consumption.toFixed(1) + ' kW';
        
        document.getElementById('securityValue').textContent = 
            data.devices.security_system.status;
        
        document.getElementById('devicesValue').textContent = 
            Object.values(data.devices).filter(d => d.status === 'on').length + '/12';
    }

    updateDeviceStatus(data) {
        // Update specific device in UI
        const deviceElement = document.querySelector(`[data-device="${data.deviceId}"]`);
        if (deviceElement) {
            deviceElement.classList.toggle('active', data.status === 'on');
        }
    }

    updateSensorData(data) {
        // Update charts with new data
        this.charts.energy.data.datasets[0].data.push(data.energy.consumption);
        this.charts.energy.data.datasets[0].data.shift();
        this.charts.energy.update();

        this.charts.temperature.data.datasets[0].data.push(data.temperature);
        this.charts.temperature.data.datasets[0].data.shift();
        this.charts.temperature.update();
    }

    async controlDevice(deviceId, command, value) {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/device/control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ deviceId, command, value })
            });

            if (!response.ok) {
                throw new Error('Control failed');
            }
        } catch (error) {
            this.showNotification('Device control failed!', 'error');
        }
    }

    executeQuickAction(action) {
        switch (action) {
            case 'all_lights':
                this.controlDevice('all_lights', 'toggle');
                break;
            case 'security_arm':
                this.controlDevice('security_system', 'arm');
                break;
            case 'climate_comfort':
                this.setComfortMode();
                break;
            case 'energy_save':
                this.setEnergySavingMode();
                break;
        }
    }

    setComfortMode() {
        // Set optimal temperature and lighting
        this.controlDevice('living_room_ac', 'set_temperature', 22);
        this.controlDevice('living_room_light', 'set_brightness', 80);
        this.showNotification('Comfort mode activated', 'success');
    }

    setEnergySavingMode() {
        // Reduce energy consumption
        this.controlDevice('all_lights', 'set_brightness', 50);
        this.controlDevice('ac_system', 'set_temperature', 25);
        this.showNotification('Energy saving mode activated', 'success');
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = 
            now.toLocaleTimeString('en-US', { hour12: false });
        document.getElementById('currentDate').textContent = 
            now.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;

        document.getElementById('notificationsList').prepend(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'error': 'exclamation-triangle',
            'success': 'check-circle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    loadDashboardData() {
        const token = localStorage.getItem('token');
        
        fetch('/api/dashboard/data', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => this.updateDashboard(data))
        .catch(error => console.error('Error loading dashboard:', error));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SmartHomeApp();
});

// Voice Control Feature
class VoiceControl {
    constructor() {
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.setupVoiceRecognition();
    }

    setupVoiceRecognition() {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
            this.processVoiceCommand(command);
        };

        this.recognition.start();
    }

    processVoiceCommand(command) {
        if (command.includes('turn on lights')) {
            app.controlDevice('all_lights', 'on');
        } else if (command.includes('set temperature')) {
            const temp = command.match(/\d+/)[0];
            app.controlDevice('ac_system', 'set_temperature', parseInt(temp));
        }
        // Add more voice commands
    }
}

// Initialize voice control if supported
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    // new VoiceControl(); // Uncomment to enable voice control
}