// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnaSf9C37jPD2P3gb22hJm1OkkU2pIZyQ",
    authDomain: "smart-home-5c100.firebaseapp.com",
    databaseURL: "https://smart-home-5c100-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "smart-home-5c100",
    storageBucket: "smart-home-5c100.firebasestorage.app",
    messagingSenderId: "630239699447",
    appId: "1:630239699447:web:7737f4df63a807d2d28ef2",
    measurementId: "G-V9FXP74CBZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const database = firebase.database();
const auth = firebase.auth();

// App Configuration
const AppConfig = {
    // Performance settings
    DEBOUNCE_DELAY: 300,
    ALERT_TIMEOUT: 4000,
    SENSOR_UPDATE_INTERVAL: 2000,
    
    // Feature flags
    ENABLE_ANIMATIONS: true,
    ENABLE_PARTICLES: true,
    
    // UI settings
    MAX_ALERTS: 3,
    SMOOTH_SCROLL: true
};

// Export for use in other modules
window.database = database;
window.auth = auth;
window.AppConfig = AppConfig;