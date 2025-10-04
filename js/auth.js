// Authentication Manager
class AuthManager {
    static init() {
        this.setupEventListeners();
        this.checkAuthState();
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
        const confirmPasswordInput = document.getElementById('registerConfirmPassword');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', Utils.debounce(this.validatePasswordStrength, 300));
        }
        
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', Utils.debounce(this.validatePasswordMatch, 300));
        }
    }

    static async handleLogin() {
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
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Save remember me preference
            const rememberMe = document.getElementById('rememberMe').checked;
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
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
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
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

        if (!acceptTerms) {
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
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile with display name
            await user.updateProfile({
                displayName: name
            });

            // Save user data to database
            await database.ref('users/' + user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            AlertManager.show('Account created successfully!', 'success');
            this.showLogin();
            
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
                message = 'Password is too weak. Please use a stronger password.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many attempts. Please try again later.';
                break;
        }
        
        AlertManager.show(message, 'danger');
    }

    static validatePasswordStrength() {
        const password = document.getElementById('registerPassword').value;
        const strength = Utils.validatePassword(password);
        const strengthBar = document.querySelector('.strength-bar');
        
        if (!strengthBar) return;

        strengthBar.className = 'strength-bar';
        
        if (password.length > 0) {
            strengthBar.classList.add(`strength-${strength}`);
        }
    }

    static validatePasswordMatch() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const confirmInput = document.getElementById('registerConfirmPassword');
        
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
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.handleUserSignedIn(user);
            } else {
                this.handleUserSignedOut();
            }
        });
    }

    static handleUserSignedIn(user) {
        document.getElementById('dashboard').style.display = 'block';
        this.hideAllModals();
        
        // Update UI with user info
        const userNameElement = document.getElementById('userName');
        if (userNameElement && user.displayName) {
            userNameElement.textContent = user.displayName;
        }
        
        // Initialize dashboard components
        if (typeof DeviceManager !== 'undefined') {
            DeviceManager.init();
        }
    }

    static handleUserSignedOut() {
        document.getElementById('dashboard').style.display = 'none';
        this.showLogin();
    }

    static showLogin() {
        this.hideAllModals();
        document.getElementById('loginModal').style.display = 'flex';
        this.clearForms();
    }

    static showRegister() {
        this.hideAllModals();
        document.getElementById('registerModal').style.display = 'flex';
        this.clearForms();
    }

    static showForgotPassword() {
        this.hideAllModals();
        document.getElementById('forgotPasswordModal').style.display = 'flex';
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
            form.reset();
        });
        
        // Clear validation states
        const strengthBar = document.querySelector('.strength-bar');
        if (strengthBar) {
            strengthBar.className = 'strength-bar';
        }
        
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
        });
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});

// Export for global access
window.AuthManager = AuthManager;