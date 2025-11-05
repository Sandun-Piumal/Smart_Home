// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAP7X4CZh-E5S9Qfpi-hWxDO1R_PvXC8yg",
    authDomain: "smart-ai-chat-app.firebaseapp.com",
    projectId: "smart-ai-chat-app",
    storageBucket: "smart-ai-chat-app.firebasestorage.app",
    messagingSenderId: "195723763663",
    appId: "1:195723763663:web:0892e6392eb77c15813cba",
    measurementId: "G-SWRB896B6Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Language content
const languageContent = {
    sinhala: {
        authTitle: "Smart AI",
        authSubtitle: "Powered by Gemini AI",
        emailLabel: "Email",
        passwordLabel: "Password",
        nameLabel: "Name",
        confirmPasswordLabel: "Confirm Password",
        loginButton: "Login",
        signupButton: "Sign Up",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?",
        showSignup: "Sign Up",
        showLogin: "Login",
        forgotPassword: "Forgot Password?",
        resetPasswordButton: "Reset Password",
        backToLogin: "Back to Login",
        rememberPassword: "Remember your password?",
        logoTitle: "Smart AI",
        headerSubtitle: "Powered by Gemini AI",
        username: "User",
        userStatus: "Online",
        logoutText: "Logout",
        welcomeTitle: "නව Model සාර්ථකව යාවත්කාලීන කරන ලදී! ✨",
        welcomeText: "Gemini AI Model සමඟ වැඩ කිරීමට සූදානම්!<br>ඔබගේ ප්‍රශ්නය පහතින් ටයිප් කර Enter කරන්න. 🚀",
        typingText: "Smart AI is preparing response",
        inputPlaceholder: "Type your question here...",
        themeLabelDark: "Dark",
        themeLabelLight: "Light",
        clearChatText: "Clear Chat",
        exportChatText: "Export Chat",
        suggestionsText: "Suggestions",
        copyright: "Copyright © 2025 SPMods. All Rights Reserved.",
        designCredit: "Developed: Sandun Piumal",
        userLabel: "You",
        aiLabel: "Smart AI",
        historyTitle: "Chat History",
        historyToggleText: "History",
        currentSessionTitle: "Current Session",
        newChatText: "New Chat",
        importChatText: "Import",
        systemPrompt: `ඔබ Smart AI නම් උපකාරක AI වේ. සියලුම ප්‍රශ්නවලට සිංහල භාෂාවෙන් පිළිතුරු දෙන්න. 
        පිළිතුරු සවිස්තරාත්මක, උපයෝගී සහ මිත්‍රශීලී විය යුතුය. 
        කේතය, තාක්ෂණය, විද්‍යාව, ඉතිහාසය සහ සාමාන්‍ය දැනුම පිළිබඳ ප්‍රශ්න සඳහා විස්තරාත්මක පිළිතුරු දෙන්න.`
    },
    english: {
        authTitle: "Smart AI",
        authSubtitle: "Powered by Gemini AI",
        emailLabel: "Email",
        passwordLabel: "Password",
        nameLabel: "Name",
        confirmPasswordLabel: "Confirm Password",
        loginButton: "Login",
        signupButton: "Sign Up",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?",
        showSignup: "Sign Up",
        showLogin: "Login",
        forgotPassword: "Forgot Password?",
        resetPasswordButton: "Reset Password",
        backToLogin: "Back to Login",
        rememberPassword: "Remember your password?",
        logoTitle: "Smart AI",
        headerSubtitle: "Powered by Gemini AI",
        username: "User",
        userStatus: "Online",
        logoutText: "Logout",
        welcomeTitle: "New Model Successfully Updated! ✨",
        welcomeText: "Ready to work with Gemini AI Model!<br>Type your question below and press Enter 🚀",
        typingText: "Smart AI is preparing response",
        inputPlaceholder: "Type your question here...",
        themeLabelDark: "Dark",
        themeLabelLight: "Light",
        clearChatText: "Clear Chat",
        exportChatText: "Export Chat",
        suggestionsText: "Suggestions",
        copyright: "Copyright © 2025 SPMods. All Rights Reserved.",
        designCredit: "Developed: Sandun Piumal",
        userLabel: "You",
        aiLabel: "Smart AI",
        historyTitle: "Chat History",
        historyToggleText: "History",
        currentSessionTitle: "Current Session",
        newChatText: "New Chat",
        importChatText: "Import",
        systemPrompt: `You are Smart AI, a helpful AI assistant. Respond to all questions in English.
        Responses should be detailed, helpful and friendly.
        Provide detailed answers for questions about code, technology, science, history and general knowledge.`
    }
};

// Current state
let currentLanguage = 'english';
let currentTheme = 'dark';
let chatHistory = [];
let chatSessions = [];
let currentSessionId = null;

// Gemini API Key
const GOOGLE_AI_API_KEY = 'AIzaSyAJhruzaSUiKhP8GP7ZLg2h25GBTSKq1gs';

// DOM Elements
const authContainer = document.getElementById('authContainer');
const chatApp = document.getElementById('chatApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const forgotPassword = document.getElementById('forgotPassword');
const backToLogin = document.getElementById('backToLogin');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');
const logoutBtn = document.getElementById('logoutBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
const sinhalaBtn = document.getElementById('sinhalaBtn');
const englishBtn = document.getElementById('englishBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const exportChatBtn = document.getElementById('exportChatBtn');
const suggestionsBtn = document.getElementById('suggestionsBtn');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// New Chat History Elements
const chatSidebar = document.getElementById('chatSidebar');
const historyToggle = document.getElementById('historyToggle');
const sidebarClose = document.getElementById('sidebarClose');
const chatSessionsContainer = document.getElementById('chatSessions');
const historySearch = document.getElementById('historySearch');
const newChatBtn = document.getElementById('newChatBtn');
const importChatBtn = document.getElementById('importChatBtn');
const saveSessionBtn = document.getElementById('saveSessionBtn');
const renameSessionBtn = document.getElementById('renameSessionBtn');
const currentSessionTitle = document.getElementById('currentSessionTitle');
const sessionDate = document.getElementById('sessionDate');

// User-specific data handling functions
function getUserId() {
    const user = auth.currentUser;
    if (!user) return 'anonymous';
    return user.uid;
}

function getStorageKey() {
    return `neura-user-${getUserId()}-sessions`;
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createNewSession() {
    const sessionId = generateSessionId();
    const session = {
        id: sessionId,
        title: currentLanguage === 'sinhala' ? 'නව සංවාදය' : 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: getUserId()
    };
    
    chatSessions.unshift(session);
    currentSessionId = sessionId;
    chatHistory = [];
    
    saveChatSessions();
    renderChatSessions();
    clearChatMessages();
    updateSessionDisplay();
    
    showNotification(
        currentLanguage === 'sinhala' ? 'නව සංවාදය ආරම්භ කරන ලදී' : 'New chat started',
        'success'
    );
}

function loadChatSessions() {
    const storageKey = getStorageKey();
    const savedSessions = localStorage.getItem(storageKey);
    
    if (savedSessions) {
        chatSessions = JSON.parse(savedSessions);
    } else {
        chatSessions = [];
    }
    
    if (chatSessions.length === 0) {
        createNewSession();
    } else {
        currentSessionId = chatSessions[0].id;
        chatHistory = chatSessions[0].messages || [];
        renderChatHistory();
    }
    
    renderChatSessions();
    updateSessionDisplay();
}

function saveChatSessions() {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(chatSessions));
}

function renderChatSessions() {
    chatSessionsContainer.innerHTML = '';
    
    const searchTerm = historySearch.value.toLowerCase();
    const filteredSessions = chatSessions.filter(session => 
        session.title.toLowerCase().includes(searchTerm) ||
        session.messages.some(msg => msg.content.toLowerCase().includes(searchTerm))
    );
    
    filteredSessions.forEach(session => {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'chat-session';
        if (session.id === currentSessionId) {
            sessionElement.classList.add('active');
        }
        
        const lastMessage = session.messages.length > 0 ? 
            session.messages[session.messages.length - 1].content : 
            (currentLanguage === 'sinhala' ? 'සංවාදය ආරම්භ කරන්න' : 'Start conversation');
        
        sessionElement.innerHTML = `
            <div class="session-title">${session.title}</div>
            <div class="session-preview">${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}</div>
            <div class="session-meta">
                <span>${new Date(session.updatedAt).toLocaleDateString()}</span>
                <span>${session.messages.length} ${currentLanguage === 'sinhala' ? 'පණිවිඩ' : 'messages'}</span>
            </div>
        `;
        
        sessionElement.addEventListener('click', () => {
            switchToSession(session.id);
        });
        
        chatSessionsContainer.appendChild(sessionElement);
    });
}

function switchToSession(sessionId) {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
        currentSessionId = sessionId;
        chatHistory = session.messages || [];
        renderChatHistory();
        renderChatSessions();
        updateSessionDisplay();
        
        if (window.innerWidth <= 768) {
            chatSidebar.classList.remove('active');
        }
    }
}

function updateSessionDisplay() {
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
        currentSessionTitle.textContent = currentSession.title;
        sessionDate.textContent = new Date(currentSession.updatedAt).toLocaleDateString();
    }
}

function saveCurrentSession() {
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
        currentSession.messages = chatHistory;
        currentSession.updatedAt = new Date().toISOString();
        saveChatSessions();
        renderChatSessions();
        
        showNotification(
            currentLanguage === 'sinhala' ? 'සංවාදය සුරකින ලදී' : 'Chat saved successfully',
            'success'
        );
    }
}

function renameCurrentSession() {
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
        const newTitle = prompt(
            currentLanguage === 'sinhala' ? 'සංවාදයේ නම ඇතුලත් කරන්න:' : 'Enter chat title:',
            currentSession.title
        );
        
        if (newTitle && newTitle.trim() !== '') {
            currentSession.title = newTitle.trim();
            currentSession.updatedAt = new Date().toISOString();
            saveChatSessions();
            renderChatSessions();
            updateSessionDisplay();
            
            showNotification(
                currentLanguage === 'sinhala' ? 'සංවාදයේ නම වෙනස් කරන ලදී' : 'Chat renamed successfully',
                'success'
            );
        }
    }
}

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        showChatApp();
        updateUserProfile(user);
        loadChatSessions();
    } else {
        showAuthContainer();
        chatSessions = [];
        currentSessionId = null;
        chatHistory = [];
    }
});

// Update user profile
function updateUserProfile(user) {
    const usernameElement = document.getElementById('username');
    if (user.displayName) {
        usernameElement.textContent = user.displayName;
    } else {
        usernameElement.textContent = user.email.split('@')[0];
    }
}

// Show auth container
function showAuthContainer() {
    authContainer.style.display = 'block';
    chatApp.style.display = 'none';
    showLoginForm();
}

// Show chat app
function showChatApp() {
    authContainer.style.display = 'none';
    chatApp.style.display = 'flex';
    messageInput.focus();
}

// Show login form
function showLoginForm() {
    loginForm.style.display = 'flex';
    signupForm.style.display = 'none';
    forgotPasswordForm.style.display = 'none';
    loginError.style.display = 'none';
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';
}

// Show signup form
function showSignupForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'flex';
    forgotPasswordForm.style.display = 'none';
    loginError.style.display = 'none';
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';
}

// Show forgot password form
function showForgotPasswordForm() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    forgotPasswordForm.style.display = 'flex';
    loginError.style.display = 'none';
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';
}

// Show notification
function showNotification(message, type = 'success') {
    notification.className = 'notification';
    notification.classList.add(type);
    notificationText.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Login form
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    loginError.style.display = 'none';
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            loginForm.reset();
            showNotification(
                currentLanguage === 'sinhala' ? 'සාර්ථකව පිවිසියා!' : 'Successfully logged in!',
                'success'
            );
        })
        .catch((error) => {
            loginError.textContent = currentLanguage === 'sinhala' 
                ? 'පිවිසුම අසාර්ථකයි. කරුණාකර ඔබගේ තොරතුරු පරීක්ෂා කරන්න.' 
                : 'Login failed. Please check your credentials.';
            loginError.style.display = 'block';
        });
});

// Signup form
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';
    
    if (password !== confirmPassword) {
        signupError.textContent = currentLanguage === 'sinhala' 
            ? 'මුරපද ගැලපෙන්නේ නැත' 
            : 'Passwords do not match';
        signupError.style.display = 'block';
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            signupSuccess.textContent = currentLanguage === 'sinhala' 
                ? 'ලියාපදිංචිය සාර්ථකයි!' 
                : 'Registration successful!';
            signupSuccess.style.display = 'block';
            signupForm.reset();
            showNotification(
                currentLanguage === 'sinhala' ? 'ලියාපදිංචිය සාර්ථකයි!' : 'Registration successful!',
                'success'
            );
        })
        .catch((error) => {
            signupError.textContent = currentLanguage === 'sinhala' 
                ? 'ලියාපදිංචිය අසාර්ථකයි. කරුණාකර නැවත උත්සාහ කරන්න.' 
                : 'Registration failed. Please try again.';
            signupError.style.display = 'block';
        });
});

// Forgot password form
forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    
    forgotError.style.display = 'none';
    forgotSuccess.style.display = 'none';
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            forgotSuccess.textContent = currentLanguage === 'sinhala' 
                ? 'මුරපද යළි සැකසුම් ඊමේල් එකක් යවන ලදී! ඔබගේ ඊමේල් පරීක්ෂා කරන්න.' 
                : 'Password reset email sent! Check your inbox.';
            forgotSuccess.style.display = 'block';
            forgotPasswordForm.reset();
        })
        .catch((error) => {
            forgotError.textContent = currentLanguage === 'sinhala' 
                ? 'යළි සැකසුම් ඊමේල් යැවීම අසාර්ථකයි. කරුණාකර ඔබගේ ඊමේල් ලිපිනය පරීක්ෂා කරන්න.' 
                : 'Failed to send reset email. Please check your email address.';
            forgotError.style.display = 'block';
        });
});

// Form switching
showSignup.addEventListener('click', showSignupForm);
showLogin.addEventListener('click', showLoginForm);
forgotPassword.addEventListener('click', showForgotPasswordForm);
backToLogin.addEventListener('click', showLoginForm);

// Logout button
logoutBtn.addEventListener('click', () => {
    auth.signOut();
    showNotification(
        currentLanguage === 'sinhala' ? 'සාර්ථකව පිටවිය!' : 'Successfully logged out!',
        'success'
    );
});

// Theme switching
function switchTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('neura-theme', theme);
    
    const content = languageContent[currentLanguage];
    themeLabel.textContent = theme === 'dark' ? content.themeLabelDark : content.themeLabelLight;
}

// Language switching
function switchLanguage(lang) {
    currentLanguage = lang;
    const content = languageContent[lang];
    
    // Update all text content
    document.getElementById('authTitle').textContent = content.authTitle;
    document.getElementById('authSubtitle').textContent = content.authSubtitle;
    document.getElementById('emailLabel').textContent = content.emailLabel;
    document.getElementById('passwordLabel').textContent = content.passwordLabel;
    document.getElementById('nameLabel').textContent = content.nameLabel;
    document.getElementById('signupEmailLabel').textContent = content.emailLabel;
    document.getElementById('signupPasswordLabel').textContent = content.passwordLabel;
    document.getElementById('confirmPasswordLabel').textContent = content.confirmPasswordLabel;
    document.getElementById('loginButton').textContent = content.loginButton;
    document.getElementById('signupButton').textContent = content.signupButton;
    document.getElementById('noAccount').textContent = content.noAccount;
    document.getElementById('haveAccount').textContent = content.haveAccount;
    document.getElementById('showSignup').textContent = content.showSignup;
    document.getElementById('showLogin').textContent = content.showLogin;
    document.getElementById('forgotPassword').textContent = content.forgotPassword;
    document.getElementById('resetPasswordButton').textContent = content.resetPasswordButton;
    document.getElementById('backToLogin').textContent = content.backToLogin;
    
    document.getElementById('logoTitle').textContent = content.logoTitle;
    document.getElementById('headerSubtitle').textContent = content.headerSubtitle;
    document.getElementById('username').textContent = content.username;
    document.getElementById('userStatus').textContent = content.userStatus;
    document.getElementById('logoutText').textContent = content.logoutText;
    document.getElementById('welcomeTitle').textContent = content.welcomeTitle;
    document.getElementById('welcomeText').innerHTML = content.welcomeText;
    document.getElementById('typingText').textContent = content.typingText;
    document.getElementById('messageInput').placeholder = content.inputPlaceholder;
    document.getElementById('clearChatText').textContent = content.clearChatText;
    document.getElementById('exportChatText').textContent = content.exportChatText;
    document.getElementById('suggestionsText').textContent = content.suggestionsText;
    document.getElementById('copyrightText').textContent = content.copyright;
    document.getElementById('designCredit').textContent = content.designCredit;
    document.getElementById('footerCopyright').textContent = content.copyright;
    document.getElementById('footerDesign').textContent = content.designCredit;
    
    // Chat History Texts
    document.getElementById('historyTitle').textContent = content.historyTitle;
    document.getElementById('historyToggleText').textContent = content.historyToggleText;
    document.getElementById('currentSessionTitle').textContent = content.currentSessionTitle;
    document.getElementById('newChatBtn').innerHTML = `<i class="fas fa-plus"></i><span>${content.newChatText}</span>`;
    document.getElementById('importChatBtn').innerHTML = `<i class="fas fa-upload"></i><span>${content.importChatText}</span>`;
    
    themeLabel.textContent = currentTheme === 'dark' ? content.themeLabelDark : content.themeLabelLight;
    
    // Update language switcher animation
    const languageSwitcher = document.querySelector('.language-switcher');
    if (lang === 'sinhala') {
        sinhalaBtn.classList.add('active');
        englishBtn.classList.remove('active');
        languageSwitcher.classList.remove('english-active');
    } else {
        englishBtn.classList.add('active');
        sinhalaBtn.classList.remove('active');
        languageSwitcher.classList.add('english-active');
    }
    
    localStorage.setItem('neura-language', lang);
}

// Load saved preferences
const savedTheme = localStorage.getItem('neura-theme') || 'dark';
const savedLanguage = localStorage.getItem('neura-language') || 'english';

switchTheme(savedTheme);
switchLanguage(savedLanguage);

if (savedTheme === 'light') {
    themeToggle.checked = true;
}

// Event listeners
themeToggle.addEventListener('change', function() {
    switchTheme(this.checked ? 'light' : 'dark');
});

sinhalaBtn.addEventListener('click', () => switchLanguage('sinhala'));
englishBtn.addEventListener('click', () => switchLanguage('english'));

// Chat History Event Listeners
historyToggle.addEventListener('click', () => {
    chatSidebar.classList.toggle('active');
});

sidebarClose.addEventListener('click', () => {
    chatSidebar.classList.remove('active');
});

newChatBtn.addEventListener('click', createNewSession);

importChatBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData.messages)) {
                    const sessionId = generateSessionId();
                    const session = {
                        id: sessionId,
                        title: importedData.title || (currentLanguage === 'sinhala' ? 'ආයාත කළ සංවාදය' : 'Imported Chat'),
                        messages: importedData.messages,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        userId: getUserId()
                    };
                    
                    chatSessions.unshift(session);
                    saveChatSessions();
                    renderChatSessions();
                    
                    showNotification(
                        currentLanguage === 'sinhala' ? 'සංවාදය ආයාත කරන ලදී' : 'Chat imported successfully',
                        'success'
                    );
                }
            } catch (error) {
                showNotification(
                    currentLanguage === 'sinhala' ? 'ආයාත කිරීම අසාර්ථකයි' : 'Import failed',
                    'error'
                );
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
});

saveSessionBtn.addEventListener('click', saveCurrentSession);
renameSessionBtn.addEventListener('click', renameCurrentSession);

historySearch.addEventListener('input', renderChatSessions);

// Chat functionality
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

function addMessage(message, isUser) {
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const content = languageContent[currentLanguage];
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
    
    const messageHeader = document.createElement('div');
    messageHeader.classList.add('message-header');
    messageHeader.innerHTML = isUser ? 
        `<div class="message-avatar"><i class="fas fa-user"></i></div> ${content.userLabel}` : 
        `<div class="message-avatar"><i class="fas fa-robot"></i></div> ${content.aiLabel}`;
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = message.replace(/\n/g, '<br>');
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = new Date().toLocaleTimeString();
    
    // Add message actions for AI messages
    if (!isUser) {
        const messageActions = document.createElement('div');
        messageActions.classList.add('message-actions');
        
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('message-action-btn');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> ' + (currentLanguage === 'sinhala' ? 'පිටපත් කරන්න' : 'Copy');
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(message).then(() => {
                showNotification(
                    currentLanguage === 'sinhala' ? 'පිළිතුරු පිටපත් කරන ලදී' : 'Response copied to clipboard',
                    'success'
                );
            });
        });
        
        messageActions.appendChild(copyBtn);
        messageDiv.appendChild(messageActions);
    }
    
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    
    chatMessages.appendChild(messageDiv);
    
    // Add to chat history and current session
    const messageObj = {
        content: message,
        isUser: isUser,
        timestamp: new Date().toISOString()
    };
    
    chatHistory.push(messageObj);
    
    // Update current session
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    if (currentSession) {
        currentSession.messages = chatHistory;
        currentSession.updatedAt = new Date().toISOString();
        
        // Update session title based on first user message
        if (isUser && currentSession.messages.filter(m => m.isUser).length === 1) {
            currentSession.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        }
        
        saveChatSessions();
        renderChatSessions();
    }
    
    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

function renderChatHistory() {
    chatMessages.innerHTML = '';
    
    if (chatHistory.length === 0) {
        const welcomeMsg = document.createElement('div');
        welcomeMsg.classList.add('welcome-message');
        welcomeMsg.innerHTML = `
            <div class="welcome-icon">
                <i class="fas fa-rocket"></i>
            </div>
            <h2 id="welcome-title">${languageContent[currentLanguage].welcomeTitle}</h2>
            <p id="welcome-text">${languageContent[currentLanguage].welcomeText}</p>
            <div class="feature-buttons">
                <button class="feature-btn" id="clearChatBtn">
                    <i class="fas fa-trash"></i>
                    <span id="clear-chat-text">${languageContent[currentLanguage].clearChatText}</span>
                </button>
                <button class="feature-btn" id="exportChatBtn">
                    <i class="fas fa-download"></i>
                    <span id="export-chat-text">${languageContent[currentLanguage].exportChatText}</span>
                </button>
                <button class="feature-btn" id="suggestionsBtn">
                    <i class="fas fa-lightbulb"></i>
                    <span id="suggestions-text">${languageContent[currentLanguage].suggestionsText}</span>
                </button>
            </div>
        `;
        chatMessages.appendChild(welcomeMsg);
    } else {
        chatHistory.forEach(msg => {
            addMessage(msg.content, msg.isUser);
        });
    }
}

function clearChatMessages() {
    chatMessages.innerHTML = '';
    const welcomeMsg = document.createElement('div');
    welcomeMsg.classList.add('welcome-message');
    welcomeMsg.innerHTML = `
        <div class="welcome-icon">
            <i class="fas fa-rocket"></i>
        </div>
        <h2 id="welcome-title">${languageContent[currentLanguage].welcomeTitle}</h2>
        <p id="welcome-text">${languageContent[currentLanguage].welcomeText}</p>
        <div class="feature-buttons">
            <button class="feature-btn" id="clearChatBtn">
                <i class="fas fa-trash"></i>
                <span id="clear-chat-text">${languageContent[currentLanguage].clearChatText}</span>
            </button>
            <button class="feature-btn" id="exportChatBtn">
                <i class="fas fa-download"></i>
                <span id="export-chat-text">${languageContent[currentLanguage].exportChatText}</span>
            </button>
            <button class="feature-btn" id="suggestionsBtn">
                <i class="fas fa-lightbulb"></i>
                <span id="suggestions-text">${languageContent[currentLanguage].suggestionsText}</span>
            </button>
        </div>
    `;
    chatMessages.appendChild(welcomeMsg);
}

// Gemini API Integration
async function getAIResponse(userMessage) {
    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`;
        
        const languagePrompt = currentLanguage === 'sinhala' ? 
            "කරුණාකර සිංහල භාෂාවෙන් පමණක් පිළිතුරු දෙන්න. පිළිතුර සරල හා පැහැදිලි විය යුතුය. මානව ආකාරයේ ස්වභාවික සංවාද භාෂාව භාවිතා කරන්න." : 
            "Please respond in English only. Keep the response clear, concise and use natural conversational language.";
        
        const prompt = `${userMessage}\n\n${languagePrompt}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response format from Gemini API');
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        return currentLanguage === 'sinhala' ? 
            "කණගාටුයි, දෝෂයක් ඇති විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න." : 
            "Sorry, an error occurred. Please try again later.";
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;
    
    addMessage(message, true);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    sendButton.disabled = true;
    typingIndicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const response = await getAIResponse(message);
        typingIndicator.style.display = 'none';
        addMessage(response, false);
    } catch (error) {
        typingIndicator.style.display = 'none';
        const errorMessage = currentLanguage === 'sinhala' ? 
            "කණගාටුයි, දෝෂයක් ඇති විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න." : 
            "Sorry, an error occurred. Please try again later.";
        addMessage(errorMessage, false);
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Clear chat function
clearChatBtn.addEventListener('click', function() {
    if (chatHistory.length > 0) {
        chatHistory = [];
        
        // Update current session
        const currentSession = chatSessions.find(s => s.id === currentSessionId);
        if (currentSession) {
            currentSession.messages = [];
            currentSession.updatedAt = new Date().toISOString();
            saveChatSessions();
            renderChatSessions();
        }
        
        clearChatMessages();
        
        showNotification(
            currentLanguage === 'sinhala' ? 'සංවාදය හිස් කරන ලදී' : 'Chat cleared successfully',
            'success'
        );
    }
});

// Export chat function
exportChatBtn.addEventListener('click', function() {
    if (chatHistory.length === 0) {
        showNotification(
            currentLanguage === 'sinhala' ? 'අප export කිරීමට සංවාදයක් නොමැත' : 'No chat history to export',
            'warning'
        );
        return;
    }
    
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    const exportData = {
        title: currentSession ? currentSession.title : 'Exported Chat',
        messages: chatHistory,
        exportedAt: new Date().toISOString(),
        language: currentLanguage
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-ai-chat-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(
        currentLanguage === 'sinhala' ? 'සංවාදය බාගත කරන ලදී' : 'Chat exported successfully',
        'success'
    );
});

// Suggestions function
suggestionsBtn.addEventListener('click', function() {
    const suggestions = currentLanguage === 'sinhala' ? [
        "AI ගැන මට තව දැනගන්න ඕන",
        "කොහොමද කේතයක් ලියන්නේ?",
        "මට උදව් කරන්න වර්තමාන තාක්ෂණ ප්‍රවණතා ගැන",
        "මට ඉගෙන ගැනීමට හොඳම ක්‍රමය කුමක්ද?"
    ] : [
        "Tell me more about AI",
        "How do I write code?",
        "Help me with current technology trends",
        "What's the best way to learn?"
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    messageInput.value = randomSuggestion;
    messageInput.focus();
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    
    showNotification(
        currentLanguage === 'sinhala' ? 'යෝජනාවක් ඇතුලත් කරන ලදී' : 'Suggestion added to input',
        'success'
    );
});

// Enter key for form submission
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeForm = document.querySelector('.auth-form[style*="display: flex"]');
        if (activeForm) {
            const submitButton = activeForm.querySelector('.auth-button');
            if (submitButton) {
                submitButton.click();
            }
        }
    }
});

// Initialize chat input height
messageInput.style.height = 'auto';
messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && 
        !chatSidebar.contains(e.target) && 
        !historyToggle.contains(e.target) &&
        chatSidebar.classList.contains('active')) {
        chatSidebar.classList.remove('active');
    }
});
