// Utility Functions
class Utils {
    // Debounce function for performance
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Format time
    static formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Format date
    static formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Validate email
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate password strength
    static validatePassword(password) {
        const strengths = {
            weak: password.length >= 6,
            medium: password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password),
            strong: password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
        };

        if (strengths.strong) return 'strong';
        if (strengths.medium) return 'medium';
        if (strengths.weak) return 'weak';
        return 'invalid';
    }

    // Create particles for background
    static createParticles() {
        if (!AppConfig.ENABLE_PARTICLES) return;

        const particlesContainer = document.getElementById('particles');
        const particleCount = 12; // Reduced for performance
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 40 + 15; // Smaller particles
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const delay = Math.random() * 6;
            const duration = Math.random() * 3 + 3; // Shorter duration
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}%`;
            particle.style.top = `${posY}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.opacity = Math.random() * 0.08 + 0.02; // Lower opacity
            
            particlesContainer.appendChild(particle);
        }
    }

    // Update time display
    static updateTime() {
        const now = new Date();
        const timeString = Utils.formatTime(now);
        const dateString = Utils.formatDate(now);
        document.getElementById('currentTime').textContent = `${dateString} ${timeString}`;
    }

    // Show loading state
    static setLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    }

    // Check if element is in viewport
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    // Preload images
    static preloadImages(urls) {
        urls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }
}

// Alert Manager
class AlertManager {
    static show(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        
        // Limit number of alerts
        if (alertContainer.children.length >= AppConfig.MAX_ALERTS) {
            alertContainer.removeChild(alertContainer.firstChild);
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${this.getAlertIcon(type)}</span>
            <span>${message}</span>
        `;
        
        alertContainer.appendChild(alert);
        
        // Remove alert after timeout
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'slideInRight 0.3s reverse';
                setTimeout(() => alert.remove(), 300);
            }
        }, AppConfig.ALERT_TIMEOUT);
    }

    static getAlertIcon(type) {
        const icons = {
            'warning': '⚠️',
            'info': '💎',
            'danger': '🚨',
            'success': '✨'
        };
        return icons[type] || '💎';
    }

    static clearAll() {
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.innerHTML = '';
    }
}

// Export utilities
window.Utils = Utils;
window.AlertManager = AlertManager;