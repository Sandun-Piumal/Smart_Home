// Main Application Controller
class SmartHomeApp {
    static init() {
        this.initializeApp();
        this.setupGlobalEventListeners();
        this.startBackgroundTasks();
    }

    static initializeApp() {
        // Initialize utilities
        Utils.createParticles();
        Utils.updateTime();
        
        // Setup smooth scrolling
        if (AppConfig.SMOOTH_SCROLL) {
            this.enableSmoothScrolling();
        }
        
        // Initialize performance optimizations
        this.setupPerformanceOptimizations();
        
        console.log('SmartHome Glass Dashboard initialized');
    }

    static setupGlobalEventListeners() {
        // Window resize handler (debounced)
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));

        // Visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleAppHidden();
            } else {
                this.handleAppVisible();
            }
        });

        // Online/offline detection
        window.addEventListener('online', () => {
            AlertManager.show('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            AlertManager.show('You are currently offline', 'warning');
        });

        // Add ripple effects to interactive elements
        this.setupRippleEffects();
    }

    static setupPerformanceOptimizations() {
        // Use requestAnimationFrame for smooth animations
        this.animationFrameId = null;
        
        // Reduce layout thrashing
        this.batchDOMUpdates();
        
        // Optimize images and assets
        this.preloadCriticalAssets();
    }

    static setupRippleEffects() {
        const interactiveElements = document.querySelectorAll('.btn, .mode-toggle, .device-control, .stat-card');
        
        interactiveElements.forEach(element => {
            element.addEventListener('click', function(e) {
                if (!AppConfig.ENABLE_ANIMATIONS) return;
                
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position: absolute;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.3);
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Add ripple animation to styles
        if (!document.querySelector('#ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    to {
                        transform: scale(2.5);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    static enableSmoothScrolling() {
        document.documentElement.style.scrollBehavior = 'smooth';
    }

    static batchDOMUpdates() {
        // Use requestAnimationFrame to batch UI updates
        this.pendingUpdates = new Set();
        
        this.scheduleUpdate = Utils.debounce(() => {
            if (this.pendingUpdates.size > 0) {
                requestAnimationFrame(() => {
                    this.pendingUpdates.forEach(callback => callback());
                    this.pendingUpdates.clear();
                });
            }
        }, 16); // ~60fps
    }

    static preloadCriticalAssets() {
        // Preload any critical assets here
        const criticalAssets = [
            // Add paths to critical images or fonts
        ];
        
        Utils.preloadImages(criticalAssets);
    }

    static handleResize() {
        // Handle responsive behavior
        this.updateResponsiveClasses();
    }

    static handleAppHidden() {
        // Reduce activity when app is not visible
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        
        // Pause non-essential animations
        document.body.style.animationPlayState = 'paused';
    }

    static handleAppVisible() {
        // Resume activities when app becomes visible
        this.startBackgroundTasks();
        document.body.style.animationPlayState = 'running';
    }

    static startBackgroundTasks() {
        // Update time every second
        this.timeUpdateInterval = setInterval(() => {
            Utils.updateTime();
        }, 1000);

        // Periodic cleanup (every 5 minutes)
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 300000);
    }

    static updateResponsiveClasses() {
        const width = window.innerWidth;
        const body = document.body;
        
        // Remove existing responsive classes
        body.classList.remove('mobile-view', 'tablet-view', 'desktop-view');
        
        // Add appropriate class
        if (width < 768) {
            body.classList.add('mobile-view');
        } else if (width < 1024) {
            body.classList.add('tablet-view');
        } else {
            body.classList.add('desktop-view');
        }
    }

    static cleanup() {
        // Clear old alerts
        const alertContainer = document.getElementById('alertContainer');
        const alerts = alertContainer.children;
        
        if (alerts.length > AppConfig.MAX_ALERTS) {
            const excess = alerts.length - AppConfig.MAX_ALERTS;
            for (let i = 0; i < excess; i++) {
                if (alerts[0]) {
                    alerts[0].remove();
                }
            }
        }
        
        // Force garbage collection (where supported)
        if (window.gc) {
            window.gc();
        }
    }

    static destroy() {
        // Cleanup when app is closed
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Remove all Firebase listeners
        if (database && database.ref) {
            database.ref().off();
        }
    }
}

// Initialize app when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SmartHomeApp.init();
    });
} else {
    SmartHomeApp.init();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    SmartHomeApp.destroy();
});

// Export main app class
window.SmartHomeApp = SmartHomeApp;