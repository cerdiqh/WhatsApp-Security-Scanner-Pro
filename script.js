// ScamBuster - Complete JavaScript

// Global variables
let currentUser = null;
let isAuthenticated = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html' || currentPage === '') {
        initializeLandingPage();
    } else if (currentPage === 'register.html') {
        initializeRegisterPage();
    } else if (currentPage === 'login.html') {
        initializeLoginPage();
    } else if (currentPage === 'dashboard.html') {
        initializeDashboardPage();
    }
    
    // Common initializations
    initializeCommonFeatures();
});

// Initialize Landing Page
function initializeLandingPage() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.feature-card, .pricing-card, .stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
    
    // Developer credits animation trigger
    const developerCredits = document.getElementById('developer-credits');
    if (developerCredits) {
        const creditsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.3 });
        
        developerCredits.style.opacity = '0';
        developerCredits.style.transform = 'translateY(50px)';
        developerCredits.style.transition = 'all 1s ease';
        creditsObserver.observe(developerCredits);
    }
}

// Initialize Register Page
function initializeRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Password toggle functionality
    initializePasswordToggles();
}

// Initialize Login Page
function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Password toggle functionality
    initializePasswordToggles();
}

// Initialize Dashboard Page
function initializeDashboardPage() {
    checkAuthStatus();
    displayUserProfile();
    loadDashboardData();

    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('scanBtn').addEventListener('click', handleScan);
    document.getElementById('reportBtn').addEventListener('click', handleReport);
}

// Initialize Common Features
function initializeCommonFeatures() {
    // Password toggle functionality
    initializePasswordToggles();
    
    // Loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }, 1500); // Reduced time for faster loading feel
}

// Password Toggle Functionality
function initializePasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
}

// Handle Registration
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        businessType: document.getElementById('regBusinessType').value,
        terms: document.getElementById('terms').checked
    };
    
    // Validation
    if (!formData.terms) {
        showNotification('Please accept the terms and conditions', 'error');
        return;
    }
    
    if (formData.password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Registration successful! Please log in.', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            currentUser = data.user;
            isAuthenticated = true;
            
            showNotification('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
    
    // Manual close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 500);
    });
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return 'fa-check-circle';
        case 'error':
            return 'fa-times-circle';
        case 'warning':
            return 'fa-exclamation-triangle';
        default:
            return 'fa-info-circle';
    }
}

// Check auth status for protected pages
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        logout(); // Redirect to login if no token/user
        return;
    }
    
    currentUser = user;
    isAuthenticated = true;
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    isAuthenticated = false;
    window.location.href = 'login.html';
}

// Handle Scan
async function handleScan() {
    const input = document.getElementById('scanInput').value.trim();
    const resultDiv = document.getElementById('scanResult');
    
    if (!input) {
        showNotification('Please enter a phone number or message to scan.', 'warning');
        return;
    }
    
    resultDiv.innerHTML = `<div class="loader"></div>`;
    
    try {
        const response = await apiRequest('/api/scan', {
            method: 'POST',
            body: JSON.stringify({ text: input })
        });
        
        displayScanResult(response);
    } catch (error) {
        console.error('Scan error:', error);
        resultDiv.innerHTML = `<div class="result-card error"><p>An error occurred during the scan.</p></div>`;
    }
}

// Handle Report
async function handleReport() {
    // This is a placeholder. In a real app, this would open a more detailed form.
    const number = prompt("Enter the phone number you want to report:");
    if (!number) return;

    try {
        const response = await apiRequest('/api/report', {
            method: 'POST',
            body: JSON.stringify({ number, type: 'scam' })
        });
        showNotification(response.message, 'success');
        loadDashboardData(); // Refresh data
    } catch (error) {
        console.error('Report error:', error);
        showNotification(error.message || 'Failed to submit report', 'error');
    }
}

// Display User Profile in Dashboard
function displayUserProfile() {
    if (!currentUser) return;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
}

// Load All Dashboard Data
async function loadDashboardData() {
    try {
        const [reports, reputation, community] = await Promise.all([
            apiRequest('/api/reports'),
            apiRequest('/api/reputation'),
            apiRequest('/api/community-reports')
        ]);

        // Populate your dashboard elements here
        // Example:
        // document.getElementById('totalReports').textContent = reports.total;
        // ... etc.

    } catch (error) {
        console.error('Failed to load dashboard data', error);
        showNotification('Could not load dashboard data.', 'error');
    }
}

// Display Scan Result
function displayScanResult(result) {
    const resultDiv = document.getElementById('scanResult');
    let content = `<div class="result-card risk-${result.riskLevel.toLowerCase()}">`;
    content += `<h4>Scan Result: <span class="risk-level">${result.riskLevel}</span></h4>`;
    content += `<p>${result.explanation}</p>`;
    
    if (result.details && result.details.length > 0) {
        content += `<h5>Details:</h5><ul>`;
        result.details.forEach(detail => {
            content += `<li><strong>${detail.pattern}</strong>: ${detail.description}</li>`;
        });
        content += `</ul>`;
    }
    content += `</div>`;
    resultDiv.innerHTML = content;
}

// Generic API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, { ...options, headers });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    return response.json();
}

// Back to Top Button
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
