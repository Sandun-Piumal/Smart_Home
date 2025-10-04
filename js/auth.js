// Authentication Manager
class AuthManager {
    static init() {
        console.log('AuthManager initializing...');
        this.setupEventListeners();
        this.checkAuthState();
        this.showLogin(); // Always show login first
    }

    static setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        // Real-time password validation
        const passwordInput = document.getElementById('registerPassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', Utils.debounce(this.validatePasswordStrength, 300));
        }

        const confirmPasswordInput = document.getElementById('registerConfirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', Utils.debounce(this.validatePasswordMatch, 300));
        }

        console.log('Auth event listeners setup complete');
    }

    static async handleLogin() {
        console.log('Login attempt started');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');

        // Basic validation
        if (!email || !password) {
            AlertManager.show('Please fill in all fields', 'danger');
            return;
        }

        if (!Utils.validateEmail(email)) {
            AlertManager.show('Please enter a valid email address', 'danger');
            return;
        }

        Utils.setLoading(loginBtn, true);

        try {
            console.log('Attempting Firebase login...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login successful:', user.email);
            
            // Save remember me preference
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('userEmail', email);
            }
            
            AlertManager.show(`Welcome back, ${user.displayName || 'User'}!`, 'success');
            this.hideAllModals();
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error);
        } finally {
            Utils.setLoading(loginBtn, false);
        }
    }

    static async handleRegister() {
        console.log('Registration attempt started');
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms');
        const registerBtn = document.getElementById('registerBtn');

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            AlertManager.show('Please fill in all fields', 'danger');
            return;
        }

        if (!Utils.validateEmail(email)) {
            AlertManager.show('Please enter a valid email address', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            AlertManager.show('Passwords do not match', 'danger');
            return;
        }

        if (!acceptTerms || !acceptTerms.checked) {
            AlertManager.show('Please accept the terms and conditions', 'danger');
            return;
        }

        const passwordStrength = Utils.validatePassword(password);
        if (passwordStrength === 'invalid') {
            AlertManager.show('Password must be at least 6 characters long', 'danger');
            return;
        }

        Utils.setLoading(registerBtn, true);

        try {
            console.log('Attempting Firebase registration...');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('User created:', user.uid);

            // Update profile with display name
            await user.updateProfile({
                displayName: name
            });

            console.log('Profile updated with display name');

            // Save user data to database
            await database.ref('users/' + user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            console.log('User data saved to database');

            AlertManager.show('Account created successfully! Welcome to SmartHome!', 'success');
            
            // Auto login after registration
            this.hideAllModals();
            
        } catch (error) {
            console.error('Registration error:', error);
            this.handleAuthError(error);
        } finally {
            Utils.setLoading(registerBtn, false);
        }
    }

    static async handleForgotPassword() {
        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetBtn');

        if (!email || !Utils.validateEmail(email)) {
            AlertManager.show('Please enter a valid email address', 'danger');
            return;
        }

        Utils.setLoading(resetBtn, true);

        try {
            await auth.sendPasswordResetEmail(email);
            AlertManager.show('Password reset email sent! Check your inbox.', 'success');
            this.showLogin();
        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error);
        } finally {
            Utils.setLoading(resetBtn, false);
        }
    }

    static handleAuthError(error) {
        console.log('Auth error code:', error.code);
        let message = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'Invalid email address format.';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                message = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password. Please try again.';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak. Please use at least 6 characters.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your internet connection.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/operation-not-allowed':
                message = 'Email/password accounts are not enabled. Please contact support.';
                break;
            default:
                message = error.message || 'Authentication failed. Please try again.';
        }
        
        AlertManager.show(message, 'danger');
    }

    static validatePasswordStrength() {
        const passwordInput = document.getElementById('registerPassword');
        if (!passwordInput) return;
        
        const password = passwordInput.value;
        const strength = Utils.validatePassword(password);
        
        // Create or update strength indicator
        let strengthBar = document.querySelector('.strength-bar');
        if (!strengthBar) {
            const passwordStrength = document.createElement('div');
            passwordStrength.className = 'password-strength';
            passwordStrength.innerHTML = '<div class="strength-bar"></div>';
            passwordInput.parentNode.appendChild(passwordStrength);
            strengthBar = document.querySelector('.strength-bar');
        }
        
        strengthBar.className = 'strength-bar';
        
        if (password.length > 0) {
            strengthBar.classList.add(`strength-${strength}`);
        }
    }

    static validatePasswordMatch() {
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerConfirmPassword')?.value;
        const confirmInput = document.getElementById('registerConfirmPassword');
        
        if (!confirmInput) return;
        
        if (confirmPassword.length === 0) {
            confirmInput.classList.remove('error', 'success');
            return;
        }
        
        if (password === confirmPassword && password.length >= 6) {
            confirmInput.classList.remove('error');
            confirmInput.classList.add('success');
        } else {
            confirmInput.classList.remove('success');
            confirmInput.classList.add('error');
        }
    }

    static async logout() {
        try {
            await auth.signOut();
            AlertManager.show('Logged out successfully', 'info');
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
            AlertManager.show('Logout failed. Please try again.', 'danger');
        }
    }

    static checkAuthState() {
        console.log('Setting up auth state listener...');
        
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
            
            if (user) {
                this.handleUserSignedIn(user);
            } else {
                this.handleUserSignedOut();
            }
        }, (error) => {
            console.error('Auth state listener error:', error);
        });
    }

    static handleUserSignedIn(user) {
        console.log('User signed in:', user.email);
        
        // Show dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
        }
        
        this.hideAllModals();
        
        // Update UI with user info
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.displayName || user.email || 'User';
        }
        
        // Initialize dashboard components
        if (typeof DeviceManager !== 'undefined') {
            DeviceManager.init();
        }
        
        // Update last login
        if (user.uid) {
            database.ref('users/' + user.uid + '/lastLogin').set(
                firebase.database.ServerValue.TIMESTAMP
            );
        }
    }

    static handleUserSignedOut() {
        console.log('User signed out');
        
        // Hide dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'none';
        }
        
        this.showLogin();
    }

    static showLogin() {
        console.log('Showing login modal');
        this.hideAllModals();
        
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'flex';
        }
        
        // Pre-fill email if remembered
        const rememberMe = localStorage.getItem('rememberMe');
        const savedEmail = localStorage.getItem('userEmail');
        const emailInput = document.getElementById('loginEmail');
        const rememberCheckbox = document.getElementById('rememberMe');
        
        if (rememberMe === 'true' && savedEmail && emailInput) {
            emailInput.value = savedEmail;
        }
        
        if (rememberCheckbox) {
            rememberCheckbox.checked = rememberMe === 'true';
        }
        
        this.clearForms();
    }

    static showRegister() {
        this.hideAllModals();
        
        const registerModal = document.getElementById('registerModal');
        if (registerModal) {
            registerModal.style.display = 'flex';
        }
        
        this.clearForms();
    }

    static showForgotPassword() {
        this.hideAllModals();
        
        const forgotModal = document.getElementById('forgotPasswordModal');
        if (forgotModal) {
            forgotModal.style.display = 'flex';
        }
        
        this.clearForms();
    }

    static hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    static clearForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (form.id !== 'loginForm') { // Don't clear login form completely
                form.reset();
            }
        });
        
        // Clear validation states
        const strengthBar = document.querySelector('.strength-bar');
        if (strengthBar) {
            strengthBar.className = 'strength-bar';
        }
        
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            if (input.id !== 'loginEmail') { // Keep remembered email
                input.classList.remove('error', 'success');
            }
        });
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing AuthManager...');
    AuthManager.init();
});

// Export for global access
window.AuthManager = AuthManager;
window.showLogin = () => AuthManager.showLogin();
window.showRegister = () => AuthManager.showRegister();
window.showForgotPassword = () => AuthManager.showForgotPassword();