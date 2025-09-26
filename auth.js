// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.checkAuthState();
        this.setupEventListeners();
        this.setupFormValidation();
    }

    checkAuthState() {
        const user = localStorage.getItem('smartHomeUser');
        const token = localStorage.getItem('smartHomeToken');
        
        if (user && token) {
            this.currentUser = JSON.parse(user);
            this.isAuthenticated = true;
            this.redirectToDashboard();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Signup form
        document.getElementById('signupFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Form switching
        window.showSignup = () => this.showForm('signup');
        window.showLogin = () => this.showForm('login');
        
        // Password toggle
        window.togglePassword = (id) => this.togglePasswordVisibility(id);
    }

    setupFormValidation() {
        // Real-time validation for signup form
        const signupPassword = document.getElementById('signupPassword');
        const signupConfirmPassword = document.getElementById('signupConfirmPassword');

        if (signupConfirmPassword) {
            signupConfirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    showForm(formType) {
        document.querySelectorAll('.form-container').forEach(form => {
            form.classList.remove('active');
        });
        
        document.getElementById(formType + 'Form').classList.add('active');
    }

    togglePasswordVisibility(fieldId) {
        const field = document.getElementById(fieldId);
        const icon = field.nextElementSibling?.querySelector('i');
        
        if (field.type === 'password') {
            field.type = 'text';
            icon?.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            field.type = 'password';
            icon?.classList.replace('fa-eye-slash', 'fa-eye');
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('signupPassword');
        const confirmPassword = document.getElementById('signupConfirmPassword');
        
        if (password.value !== confirmPassword.value) {
            confirmPassword.style.borderColor = 'var(--danger)';
        } else {
            confirmPassword.style.borderColor = 'var(--success)';
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call
            await this.simulateAPICall();
            
            const user = {
                id: 1,
                email: email,
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1234567890',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('John Doe')}&background=2563eb&color=fff`
            };

            this.loginUser(user, rememberMe);
            
        } catch (error) {
            this.showToast('Login failed. Please check your credentials.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup() {
        const firstName = document.getElementById('signupFirstName').value;
        const lastName = document.getElementById('signupLastName').value;
        const email = document.getElementById('signupEmail').value;
        const phone = document.getElementById('signupPhone').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        if (!this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Simulate API call
            await this.simulateAPICall();
            
            const user = {
                id: Date.now(),
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + ' ' + lastName)}&background=2563eb&color=fff`
            };

            this.loginUser(user, true);
            this.showToast('Account created successfully!', 'success');
            
        } catch (error) {
            this.showToast('Signup failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loginWithGoogle() {
        this.showLoading(true);
        
        // Simulate Google OAuth flow
        setTimeout(() => {
            const user = {
                id: 1,
                email: 'user@gmail.com',
                firstName: 'Google',
                lastName: 'User',
                phone: '+1234567890',
                avatar: `https://ui-avatars.com/api/?name=Google User&background=2563eb&color=fff`
            };

            this.loginUser(user, true);
            this.showToast('Signed in with Google successfully!', 'success');
            this.showLoading(false);
        }, 2000);
    }

    loginUser(user, rememberMe) {
        this.currentUser = user;
        this.isAuthenticated = true;

        // Store user data
        localStorage.setItem('smartHomeUser', JSON.stringify(user));
        localStorage.setItem('smartHomeToken', this.generateToken());
        
        if (rememberMe) {
            localStorage.setItem('smartHomeRemember', 'true');
        }

        this.showToast(`Welcome back, ${user.firstName}!`, 'success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            this.redirectToDashboard();
        }, 1000);
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('smartHomeUser');
        localStorage.removeItem('smartHomeToken');
        
        window.location.href = 'index.html';
    }

    redirectToDashboard() {
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.endsWith('/')) {
            window.location.href = 'dashboard.html';
        } else {
            this.initializeDashboard();
        }
    }

    initializeDashboard() {
        if (this.currentUser) {
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
            
            const userAvatarElement = document.querySelector('.user-avatar');
            if (userAvatarElement && this.currentUser.avatar) {
                userAvatarElement.src = this.currentUser.avatar;
            }
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    generateToken() {
        return 'smart_home_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    simulateAPICall() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate 10% chance of failure for demo purposes
                if (Math.random() < 0.1) {
                    reject(new Error('API Error'));
                } else {
                    resolve();
                }
            }, 1500);
        });
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Password strength indicator (enhancement)
class PasswordStrength {
    constructor() {
        this.levels = {
            0: { text: 'Very Weak', color: '#ef4444' },
            1: { text: 'Weak', color: '#f59e0b' },
            2: { text: 'Fair', color: '#eab308' },
            3: { text: 'Good', color: '#84cc16' },
            4: { text: 'Strong', color: '#10b981' }
        };
    }

    checkStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (password.length >= 12) score++;

        return Math.min(score, 4);
    }

    getStrengthText(password) {
        const strength = this.checkStrength(password);
        return this.levels[strength];
    }
}

// Initialize authentication manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Add password strength indicator to signup form
    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        const passwordStrength = new PasswordStrength();
        
        passwordInput.addEventListener('input', (e) => {
            const strength = passwordStrength.getStrengthText(e.target.value);
            // You can add a visual indicator here
        });
    }
});

// Global logout function
window.logout = function() {
    if (window.authManager) {
        window.authManager.logout();
    }
};