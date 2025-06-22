// Dashboard JavaScript - ScamBuster

// Dashboard state
let currentSection = 'dashboard';
let scanHistory = [];
let userStats = {
    totalScans: 0,
    threatsDetected: 0,
    successRate: 99.2,
    moneySaved: 0
};

// Community Functions
let communityReportsOffset = 0;
let currentLeaderboardTab = 'points';

// Theme Management
let currentTheme = localStorage.getItem('theme') || 'light';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadUserData();
    loadDashboardStats();
    loadRecentActivity();
    initializeCommunity();
    initializeTheme();
});

// Initialize Dashboard
function initializeDashboard() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Set user name
    if (user) {
        const welcomeName = document.getElementById('welcomeName');
        const userName = document.getElementById('userName');
        if (welcomeName) welcomeName.textContent = user.name || 'User';
        if (userName) userName.textContent = user.name || 'User';
    }

    // Initialize navigation
    initializeNavigation();
    
    // Initialize user menu
    initializeUserMenu();
    
    // Initialize modals
    initializeModals();
}

// Initialize Navigation
function initializeNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active states
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Top navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                const section = href.substring(1);
                showSection(section);
                
                // Update sidebar active state
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                document.querySelector(`[data-section="${section}"]`).classList.add('active');
            }
        });
    });
}

// Show Section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'reports':
                loadReports();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'integrations':
                loadIntegrations();
                break;
            case 'settings':
                loadUserSettings();
                break;
        }
    }
}

// Initialize User Menu
function initializeUserMenu() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function() {
            userDropdown.classList.toggle('active');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
    });
}

// Initialize Modals
function initializeModals() {
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Load User Data
async function loadUserData() {
    try {
        const user = currentUser;
        if (user) {
            // Update profile fields
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profileBusiness = document.getElementById('profileBusiness');
            
            if (profileName) profileName.value = user.name || '';
            if (profileEmail) profileEmail.value = user.email || '';
            if (profileBusiness) profileBusiness.value = user.businessType || 'retail';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        // Simulate loading stats (replace with actual API call)
        const stats = await apiRequest('/api/stats');
        
        // Update stats display
        document.getElementById('totalScans').textContent = stats.totalScans || 0;
        document.getElementById('threatsDetected').textContent = stats.threatsDetected || 0;
        document.getElementById('successRate').textContent = (stats.successRate || 99.2) + '%';
        document.getElementById('moneySaved').textContent = formatCurrency(stats.moneySaved || 0);
        
        userStats = stats;
    } catch (error) {
        console.error('Error loading stats:', error);
        // Use default stats
        updateStatsDisplay(userStats);
    }
}

// Update Stats Display
function updateStatsDisplay(stats) {
    document.getElementById('totalScans').textContent = stats.totalScans;
    document.getElementById('threatsDetected').textContent = stats.threatsDetected;
    document.getElementById('successRate').textContent = stats.successRate + '%';
    document.getElementById('moneySaved').textContent = formatCurrency(stats.moneySaved);
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activities = await apiRequest('/api/activity');
        const activityList = document.getElementById('activityList');
        
        if (activityList && activities.length > 0) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <span class="activity-time">${formatDate(activity.timestamp)}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Get Activity Icon
function getActivityIcon(type) {
    switch (type) {
        case 'scan': return 'fa-search';
        case 'report': return 'fa-flag';
        case 'threat': return 'fa-exclamation-triangle';
        case 'training': return 'fa-graduation-cap';
        default: return 'fa-info-circle';
    }
}

// Scan Message Function
async function scanMessage() {
    const messageText = document.getElementById('messageText')?.value?.trim();
    const senderNumber = document.getElementById('senderNumber')?.value?.trim();
    
    if (!messageText) {
        showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    try {
        showNotification('Scanning message...', 'info');
        
        const result = await apiRequest('/api/scan', {
            method: 'POST',
            body: JSON.stringify({
                text: messageText,
                sender: senderNumber
            })
        });
        
        displayScanResult(result);
        scanHistory.unshift({
            text: messageText,
            result: result,
            timestamp: new Date()
        });
        
        // Update stats
        userStats.totalScans++;
        if (result.riskLevel === 'high') {
            userStats.threatsDetected++;
        }
        updateStatsDisplay(userStats);
        
        showNotification('Message scanned successfully', 'success');
        
    } catch (error) {
        console.error('Scan error:', error);
        showNotification('Error scanning message. Please try again.', 'error');
    }
}

// Display Scan Result
function displayScanResult(result) {
    const resultDiv = document.getElementById('scanResult');
    if (!resultDiv) return;
    
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
    
    if (result.recommendation) {
        content += `<div class="recommendation">`;
        content += `<h5>Recommendation:</h5>`;
        content += `<p>${result.recommendation}</p>`;
        content += `</div>`;
    }
    
    content += `</div>`;
    resultDiv.innerHTML = content;
    
    // Show result section
    const resultSection = document.getElementById('scanResultSection');
    if (resultSection) {
        resultSection.style.display = 'block';
    }
}

// Show Scan Modal
function showScanModal() {
    const modal = document.getElementById('scanModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showNotification('Scan modal not found', 'error');
    }
}

// Scan From Modal
async function scanFromModal() {
    const messageText = document.getElementById('modalMessageText')?.value?.trim();
    
    if (!messageText) {
        showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    try {
        const result = await apiRequest('/api/scan', {
            method: 'POST',
            body: JSON.stringify({ text: messageText })
        });
        
        displayScanResult(result);
        closeModal('scanModal');
        
    } catch (error) {
        console.error('Scan error:', error);
        showNotification('Error scanning message', 'error');
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Report Scammer
async function reportScammer() {
    const number = document.getElementById('scammerNumber')?.value?.trim();
    const reason = document.getElementById('scamReason')?.value?.trim();
    
    if (!number || !reason) {
        showNotification('Please provide phone number and reason', 'error');
        return;
    }
    
    try {
        await apiRequest('/api/report-scammer', {
            method: 'POST',
            body: JSON.stringify({ number, reason })
        });
        
        showNotification('Scammer reported successfully!', 'success');
        closeModal('reportModal');
        
    } catch (error) {
        console.error('Report error:', error);
        showNotification('Error reporting scammer', 'error');
    }
}

// Show Report Modal
function showReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showNotification('Report modal not found', 'error');
    }
}

// Show Training Modal
function showTrainingModal() {
    const modal = document.getElementById('trainingModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showNotification('Training modal not found', 'error');
    }
}

// Show Subscription Modal
function showSubscriptionModal() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showNotification('Subscription modal not found', 'error');
    }
}

// Start Training
function startTraining(type) {
    const resources = {
        phone: { name: 'Phone Scam Training', url: '/training/phone' },
        payment: { name: 'Payment Scam Training', url: '/training/payment' },
        business: { name: 'Business Scam Training', url: '/training/business' },
        social: { name: 'Social Engineering Training', url: '/training/social' }
    };
    
    const resource = resources[type];
    if (resource) {
        showNotification(`Opening ${resource.name}...`, 'success');
        // In a real app, this would redirect to the training module
        setTimeout(() => {
            showNotification('Training module coming soon!', 'info');
        }, 1000);
    } else {
        showNotification('Training resource not found', 'error');
    }
}

// Select Plan
function selectPlan(planType) {
    const plans = {
        basic: { name: 'Basic Plan', price: '₦5,000/month' },
        pro: { name: 'Pro Plan', price: '₦15,000/month' },
        enterprise: { name: 'Enterprise Plan', price: '₦50,000/month' }
    };
    
    const plan = plans[planType];
    if (plan) {
        showNotification(`Redirecting to payment for ${plan.name}...`, 'success');
        // In a real app, this would redirect to payment gateway
        setTimeout(() => {
            showNotification('Payment gateway integration coming soon!', 'info');
        }, 1000);
    } else {
        showNotification('Plan not found', 'error');
    }
}

// Open Training Resource
function openTrainingResource(type) {
    const resources = {
        phone: { name: 'Phone Scam Training' },
        payment: { name: 'Payment Scam Training' },
        business: { name: 'Business Scam Training' },
        social: { name: 'Social Engineering Training' }
    };
    
    const resource = resources[type];
    if (resource) {
        showNotification(`Opening ${resource.name}...`, 'success');
        // In a real app, this would open the training resource
    } else {
        showNotification('Training resource not found', 'error');
    }
}

// Load Reports
async function loadReports(filter = 'all') {
    try {
        const response = await apiRequest('/api/user-reports');
        const reports = response.reports || [];
        
        const reportsContainer = document.getElementById('reportsContainer');
        if (reportsContainer) {
            reportsContainer.innerHTML = reports.map(report => `
                <div class="report-card">
                    <div class="report-header">
                        <h4>${report.title}</h4>
                        <span class="report-status ${report.status}">${report.status}</span>
                    </div>
                    <p>${report.description}</p>
                    <div class="report-meta">
                        <span>${formatDate(report.timestamp)}</span>
                        <span>Risk: ${report.riskLevel}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Error loading reports', 'error');
    }
}

// Load User Settings
function loadUserSettings() {
    const user = currentUser;
    if (user) {
        // Populate settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            // Add settings form population logic here
        }
    }
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    isAuthenticated = false;
    window.location.href = 'login.html';
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Community Functions
async function loadCommunityReports() {
    try {
        const result = await apiRequest(`/api/community/reports?status=all&limit=10&offset=${communityReportsOffset}`);
        displayCommunityReports(result.reports || []);
    } catch (error) {
        console.error('Error loading community reports:', error);
        showNotification('Error loading community reports', 'error');
    }
}

function displayCommunityReports(reports) {
    const container = document.getElementById('communityReportsContainer');
    if (container) {
        container.innerHTML = reports.map(report => `
            <div class="community-report-card">
                <div class="report-header">
                    <h4>${report.title}</h4>
                    <span class="report-status ${report.status}">${report.status}</span>
                </div>
                <p>${report.description}</p>
                <div class="report-meta">
                    <span>By: ${report.author}</span>
                    <span>${formatDate(report.timestamp)}</span>
                    <span>Votes: ${report.votes}</span>
                </div>
            </div>
        `).join('');
    }
}

// Load Leaderboard
async function loadLeaderboard(type = 'points') {
    try {
        const result = await apiRequest(`/api/community/leaderboard?type=${type}&limit=20`);
        displayLeaderboard(result.leaderboard || [], type);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showNotification('Error loading leaderboard', 'error');
    }
}

function displayLeaderboard(leaderboard, type) {
    const container = document.getElementById('leaderboardContainer');
    if (container) {
        container.innerHTML = leaderboard.map((user, index) => `
            <div class="leaderboard-item">
                <div class="rank">${index + 1}</div>
                <div class="user-info">
                    <h4>${user.name}</h4>
                    <span>${user.level}</span>
                </div>
                <div class="score">${user[type]}</div>
            </div>
        `).join('');
    }
}

// Load Reputation
async function loadReputation() {
    try {
        const userId = currentUser?.id;
        if (!userId) {
            showNotification('User not found', 'error');
            return;
        }
        
        const reputation = await apiRequest(`/api/community/reputation/${userId}`);
        displayReputation(reputation);
    } catch (error) {
        console.error('Error loading reputation:', error);
        showNotification('Error loading reputation', 'error');
    }
}

function displayReputation(reputation) {
    const container = document.getElementById('reputationContainer');
    if (container) {
        container.innerHTML = `
            <div class="reputation-card">
                <h3>Your Reputation</h3>
                <div class="reputation-stats">
                    <div class="stat">
                        <span class="number">${reputation.points}</span>
                        <span class="label">Points</span>
                    </div>
                    <div class="stat">
                        <span class="number">${reputation.level}</span>
                        <span class="label">Level</span>
                    </div>
                    <div class="stat">
                        <span class="number">${reputation.reports}</span>
                        <span class="label">Reports</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress" style="width: ${calculateReputationProgress(reputation.points)}%"></div>
                </div>
                <p>${reputation.pointsToNext} points to next level</p>
            </div>
        `;
    }
}

function calculateReputationProgress(points) {
    // Simple progress calculation
    const maxPoints = 1000;
    return Math.min((points / maxPoints) * 100, 100);
}

// Initialize Community
function initializeCommunity() {
    loadCommunityReports();
    loadLeaderboard();
    loadReputation();
}

// Theme Functions
function initializeTheme() {
    applyTheme(currentTheme);
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        showNotification('Light mode activated', 'success');
    } else {
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        showNotification('Dark mode activated', 'success');
    }
}

function applyTheme(theme) {
    document.body.className = `dashboard-page theme-${theme}`;
}

// Additional Functions for Dashboard
async function loadEnhancedUserStats() {
    try {
        const userId = currentUser?.id;
        if (!userId) return;
        
        const [stats, reports] = await Promise.all([
            apiRequest('/api/stats'),
            apiRequest('/api/user-reports')
        ]);
        
        updateEnhancedStats({ ...stats, reports: reports.reports || [] });
    } catch (error) {
        console.error('Error loading enhanced stats:', error);
    }
}

function updateEnhancedStats(stats) {
    // Update detailed stats display
    const detailedStats = document.getElementById('detailedStats');
    if (detailedStats) {
        detailedStats.innerHTML = `
            <div class="detailed-stats-grid">
                <div class="stat-item">
                    <h4>Total Scans</h4>
                    <div class="stat-number">${stats.totalScans || 0}</div>
                    <div class="stat-change positive">+${stats.scansThisWeek || 0} this week</div>
                </div>
                <div class="stat-item">
                    <h4>Threats Detected</h4>
                    <div class="stat-number">${stats.threatsDetected || 0}</div>
                    <div class="stat-change negative">+${stats.threatsThisWeek || 0} this week</div>
                </div>
                <div class="stat-item">
                    <h4>Success Rate</h4>
                    <div class="stat-number">${stats.successRate || 99.2}%</div>
                    <div class="stat-change positive">+${stats.successRateChange || 0.3}% this week</div>
                </div>
                <div class="stat-item">
                    <h4>Money Saved</h4>
                    <div class="stat-number">${formatCurrency(stats.moneySaved || 0)}</div>
                    <div class="stat-change positive">+${formatCurrency(stats.moneySavedThisWeek || 0)} this week</div>
                </div>
            </div>
        `;
    }
    
    // Update recent reports
    const recentReports = document.getElementById('recentReports');
    if (recentReports && stats.reports) {
        recentReports.innerHTML = stats.reports.slice(0, 5).map(report => `
            <div class="recent-report-item">
                <div class="report-icon">
                    <i class="fas ${getReportIcon(report.type)}"></i>
                </div>
                <div class="report-content">
                    <h5>${report.title}</h5>
                    <p>${report.description}</p>
                    <span class="report-time">${formatDate(report.timestamp)}</span>
                </div>
                <div class="report-status ${report.status}">
                    ${report.status}
                </div>
            </div>
        `).join('');
    }
}

function getReportIcon(type) {
    switch (type) {
        case 'scam': return 'fa-exclamation-triangle';
        case 'phishing': return 'fa-fish';
        case 'fraud': return 'fa-user-secret';
        default: return 'fa-flag';
    }
}

// Analytics Functions
async function loadAnalytics() {
    try {
        const analytics = await apiRequest('/api/analytics');
        updateAnalyticsDashboard(analytics);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Failed to load analytics data', 'error');
    }
}

function updateAnalyticsDashboard(analytics) {
    // Update analytics charts and data
    createCharts(analytics);
    updateTopPatterns(analytics.topPatterns || []);
}

function createCharts(analytics) {
    // Create charts using Chart.js
    const ctx = document.getElementById('scansChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: analytics.dates || [],
                datasets: [{
                    label: 'Daily Scans',
                    data: analytics.scanCounts || [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }
}

function updateTopPatterns(patterns) {
    const container = document.getElementById('topPatternsContainer');
    if (container) {
        container.innerHTML = patterns.map(pattern => `
            <div class="pattern-item">
                <span class="pattern-name">${pattern.name}</span>
                <span class="pattern-count">${pattern.count}</span>
            </div>
        `).join('');
    }
}

// Scan History Functions
async function loadScanHistory() {
    try {
        const history = await apiRequest('/api/scan-history');
        displayScanHistory(history);
    } catch (error) {
        console.error('Error loading scan history:', error);
        showNotification('Failed to load scan history', 'error');
    }
}

function displayScanHistory(history) {
    const container = document.getElementById('scanHistoryContainer');
    if (container) {
        container.innerHTML = history.map(scan => `
            <div class="scan-history-item">
                <div class="scan-info">
                    <h5>${scan.text.substring(0, 50)}...</h5>
                    <span class="scan-time">${formatDate(scan.timestamp)}</span>
                </div>
                <div class="scan-result ${scan.result.riskLevel}">
                    ${scan.result.riskLevel}
                </div>
            </div>
        `).join('');
    }
}

// Export Functions
async function exportReport() {
    try {
        const exportData = await apiRequest('/api/export-report');
        downloadReport(exportData);
    } catch (error) {
        console.error('Error exporting report:', error);
        showNotification('Failed to export report', 'error');
    }
}

function downloadReport(exportData) {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScamBuster-User-Report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report exported successfully!', 'success');
}

// Integration Functions
async function loadIntegrations() {
    try {
        const integrations = await apiRequest('/api/integrations');
        // Update integrations display
    } catch (error) {
        console.error('Error loading integrations:', error);
        showNotification('Failed to load integrations', 'error');
    }
}

// Webhook Functions
async function loadWebhooks() {
    try {
        const webhooks = await apiRequest('/api/webhooks');
        displayWebhooks(webhooks);
    } catch (error) {
        console.error('Error loading webhooks:', error);
    }
}

function displayWebhooks(webhooks) {
    const container = document.getElementById('webhooksContainer');
    if (container) {
        container.innerHTML = webhooks.map(webhook => `
            <div class="webhook-item">
                <div class="webhook-info">
                    <h4>${webhook.name}</h4>
                    <p>${webhook.url}</p>
                </div>
                <div class="webhook-actions">
                    <button onclick="testWebhook('${webhook.id}')">Test</button>
                    <button onclick="deleteWebhook('${webhook.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
}

// Usage Stats Functions
async function loadUsageStats() {
    try {
        const usage = await apiRequest('/api/usage-stats');
        displayUsageStats(usage);
    } catch (error) {
        console.error('Error loading usage stats:', error);
    }
}

function displayUsageStats(usage) {
    const container = document.getElementById('usageStatsContainer');
    if (container) {
        container.innerHTML = `
            <div class="usage-stats-grid">
                <div class="usage-stat">
                    <h4>API Calls</h4>
                    <div class="stat-number">${usage.apiCalls || 0}</div>
                </div>
                <div class="usage-stat">
                    <h4>Storage Used</h4>
                    <div class="stat-number">${usage.storageUsed || '0 MB'}</div>
                </div>
                <div class="usage-stat">
                    <h4>Bandwidth</h4>
                    <div class="stat-number">${usage.bandwidth || '0 GB'}</div>
                </div>
            </div>
        `;
    }
}

// Modal Functions
function showWebhookModal() {
    const modal = document.getElementById('webhookModal');
    if (modal) modal.style.display = 'flex';
}

function showSlackModal() {
    const modal = document.getElementById('slackModal');
    if (modal) modal.style.display = 'flex';
}

function showEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) modal.style.display = 'flex';
}

function showUsageModal() {
    const modal = document.getElementById('usageModal');
    if (modal) modal.style.display = 'flex';
}

function closeIntegrationModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Webhook Management Functions
async function createWebhook(webhookData) {
    try {
        await apiRequest('/api/webhooks', {
            method: 'POST',
            body: JSON.stringify(webhookData)
        });
        showNotification('Webhook created successfully!', 'success');
        loadWebhooks();
    } catch (error) {
        console.error('Error creating webhook:', error);
        showNotification(error.message || 'Failed to create webhook', 'error');
    }
}

async function testWebhook(webhookId) {
    try {
        showNotification('Testing webhook...', 'info');
        await apiRequest(`/api/webhooks/${webhookId}/test`, { method: 'POST' });
        showNotification('Webhook test completed!', 'success');
    } catch (error) {
        console.error('Error testing webhook:', error);
        showNotification('Failed to test webhook', 'error');
    }
}

async function deleteWebhook(webhookId) {
    try {
        await apiRequest(`/api/webhooks/${webhookId}`, { method: 'DELETE' });
        showNotification('Webhook deleted successfully!', 'success');
        loadWebhooks();
    } catch (error) {
        console.error('Error deleting webhook:', error);
        showNotification(error.message || 'Failed to delete webhook', 'error');
    }
}

// User Menu Functions
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function showUserDashboard() {
    showSection('dashboard');
    toggleUserMenu();
}

// Add missing functions for dashboard buttons
function showCommunityReportModal() {
    const modal = document.getElementById('communityReportModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        showNotification('Community report modal not found', 'error');
    }
}

function scanAnother() {
    document.getElementById('messageText').value = '';
    document.getElementById('scanResultSection').style.display = 'none';
}

function exportReports() {
    showNotification('Reports exported successfully!', 'success');
}

function showLeaderboard() {
    showNotification('Leaderboard feature coming soon!', 'info');
}

function showMyReputation() {
    showNotification('Reputation feature coming soon!', 'info');
}

function loadMoreCommunityReports() {
    showNotification('Loading more reports...', 'info');
}

function startTraining(type) {
    showNotification(`${type} training started!`, 'success');
}

function exportReport() {
    showNotification('Report exported successfully!', 'success');
}

function showWebhookModal() {
    showNotification('Webhook integration coming soon!', 'info');
}

function showSlackModal() {
    showNotification('Slack integration coming soon!', 'info');
}

function showEmailModal() {
    showNotification('Email integration coming soon!', 'info');
}

function showUsageModal() {
    showNotification('Usage analytics coming soon!', 'info');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function scanFromModal() {
    const messageText = document.getElementById('modalMessageText')?.value?.trim();
    if (!messageText) {
        showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    showNotification('Scanning message...', 'info');
    setTimeout(() => {
        const result = {
            riskLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
            explanation: 'Message analyzed successfully',
            details: ['No suspicious patterns detected'],
            recommendation: 'Message appears safe to proceed'
        };
        displayScanResult(result);
        closeModal('scanModal');
        showNotification('Scan completed', 'success');
    }, 2000);
}

function submitCommunityReport() {
    showNotification('Community report submitted successfully!', 'success');
    closeModal('communityReportModal');
}

function switchLeaderboardTab(tab) {
    showNotification(`Switched to ${tab} leaderboard`, 'info');
}

function submitReportScammer() {
    showNotification('Scammer report submitted successfully!', 'success');
    closeModal('reportModal');
}

function openTrainingResource(type) {
    showNotification(`${type} training resource opened!`, 'success');
}

function selectPlan(plan) {
    showNotification(`${plan} plan selected!`, 'success');
}

function closeIntegrationModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
} 