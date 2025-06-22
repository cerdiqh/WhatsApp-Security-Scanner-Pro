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
    if (!SecurityPro.checkAuthStatus()) {
        window.location.href = 'login.html';
        return;
    }

    // Set user name
    const user = SecurityPro.currentUser();
    if (user) {
        document.getElementById('welcomeName').textContent = user.name || 'User';
        document.getElementById('userName').textContent = user.name || 'User';
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
        const user = SecurityPro.currentUser();
        if (user) {
            // Update profile fields
            document.getElementById('profileName').value = user.name || '';
            document.getElementById('profileEmail').value = user.email || '';
            document.getElementById('profileBusiness').value = user.businessType || 'retail';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        // Simulate loading stats (replace with actual API call)
        const stats = await SecurityPro.apiRequest('stats');
        
        // Update stats display
        document.getElementById('totalScans').textContent = stats.totalScans || 0;
        document.getElementById('threatsDetected').textContent = stats.threatsDetected || 0;
        document.getElementById('successRate').textContent = (stats.successRate || 99.2) + '%';
        document.getElementById('moneySaved').textContent = SecurityPro.formatCurrency(stats.moneySaved || 0);
        
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
    document.getElementById('moneySaved').textContent = SecurityPro.formatCurrency(stats.moneySaved);
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activities = await SecurityPro.apiRequest('activity');
        const activityList = document.getElementById('activityList');
        
        if (activities && activities.length > 0) {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <span class="activity-time">${SecurityPro.formatDate(activity.timestamp)}</span>
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
    switch(type) {
        case 'success': return 'fa-shield-alt';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        default: return 'fa-info-circle';
    }
}

// Scan Message
async function scanMessage() {
    const messageText = document.getElementById('messageText').value.trim();
    const senderNumber = document.getElementById('senderNumber').value.trim();
    
    if (!messageText) {
        SecurityPro.showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    try {
        // Show loading state
        const scanBtn = document.querySelector('#scan .btn-primary');
        const originalText = scanBtn.innerHTML;
        scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        scanBtn.disabled = true;
        
        // Make API call
        const result = await SecurityPro.apiRequest('scan', {
            method: 'POST',
            body: JSON.stringify({
                message: messageText,
                phoneNumber: senderNumber
            })
        });
        
        // Display results
        displayScanResult(result);
        
        // Update stats
        userStats.totalScans++;
        if (result.riskLevel === 'high' || result.riskLevel === 'medium') {
            userStats.threatsDetected++;
        }
        updateStatsDisplay(userStats);
        
        // Add to scan history
        scanHistory.unshift({
            message: messageText,
            result: result,
            timestamp: new Date()
        });
        
        SecurityPro.showNotification('Message scanned successfully', 'success');
        
    } catch (error) {
        console.error('Scan error:', error);
        SecurityPro.showNotification('Error scanning message. Please try again.', 'error');
    } finally {
        // Reset button
        const scanBtn = document.querySelector('#scan .btn-primary');
        scanBtn.innerHTML = originalText;
        scanBtn.disabled = false;
    }
}

// Display Scan Result
function displayScanResult(result) {
    const scanResult = document.getElementById('scanResult');
    const riskBadge = document.getElementById('riskBadge');
    const riskAssessment = document.getElementById('riskAssessment');
    const recommendation = document.getElementById('recommendation');

    if (!scanResult || !result) return;

    // Update risk level and badge
    if (riskBadge) {
        riskBadge.textContent = result.riskLevel + ' Risk';
        riskBadge.className = 'risk-badge ' + result.riskLevel.toLowerCase();
    }

    // Update risk assessment
    if (riskAssessment) {
        riskAssessment.textContent = result.riskDescription || 'Analysis complete';
    }

    // Show AI confidence indicator
    const aiConfidence = document.getElementById('aiConfidence');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceText = document.getElementById('confidenceText');
    
    if (aiConfidence && result.confidence !== undefined) {
        aiConfidence.style.display = 'block';
        confidenceFill.style.width = result.confidence + '%';
        confidenceText.textContent = `AI Confidence: ${result.confidence}%`;
    }

    // Update Threat Indicators
    const threatIndicatorsSection = document.getElementById('threatIndicatorsSection');
    const threatIndicators = document.getElementById('threatIndicators');
    
    if (threatIndicatorsSection && threatIndicators && result.threatIndicators && result.threatIndicators.length > 0) {
        threatIndicatorsSection.style.display = 'block';
        threatIndicators.innerHTML = result.threatIndicators.map(indicator => `<li>${indicator}</li>`).join('');
    }

    // Update AI Insights
    const aiInsightsSection = document.getElementById('aiInsightsSection');
    const aiInsights = document.getElementById('aiInsights');
    
    if (aiInsightsSection && aiInsights && result.aiInsights && result.aiInsights.length > 0) {
        aiInsightsSection.style.display = 'block';
        aiInsights.innerHTML = result.aiInsights.map(insight => `<li>${insight}</li>`).join('');
    }

    // Update Pattern Analysis
    const patternAnalysisSection = document.getElementById('patternAnalysisSection');
    const urgencyScore = document.getElementById('urgencyScore');
    const financialScore = document.getElementById('financialScore');
    const authorityScore = document.getElementById('authorityScore');
    
    if (patternAnalysisSection && result.patternAnalysis) {
        patternAnalysisSection.style.display = 'block';
        if (urgencyScore) urgencyScore.textContent = result.patternAnalysis.urgencyScore || 0;
        if (financialScore) financialScore.textContent = result.patternAnalysis.financialScore || 0;
        if (authorityScore) authorityScore.textContent = result.patternAnalysis.authorityScore || 0;
    }

    // Update Language Analysis
    const languageAnalysisSection = document.getElementById('languageAnalysisSection');
    const grammarScore = document.getElementById('grammarScore');
    const wordCount = document.getElementById('wordCount');
    const complexity = document.getElementById('complexity');
    
    if (languageAnalysisSection && result.languageAnalysis) {
        languageAnalysisSection.style.display = 'block';
        if (grammarScore) grammarScore.textContent = (result.languageAnalysis.grammarScore || 0) + '%';
        if (wordCount) wordCount.textContent = result.languageAnalysis.wordCount || 0;
        if (complexity) complexity.textContent = result.languageAnalysis.languageComplexity || 'Low';
    }

    // Update Sentiment Analysis
    const sentimentAnalysisSection = document.getElementById('sentimentAnalysisSection');
    const sentimentOverall = document.getElementById('sentimentOverall');
    const positiveWords = document.getElementById('positiveWords');
    const negativeWords = document.getElementById('negativeWords');
    const emotionalWords = document.getElementById('emotionalWords');
    
    if (sentimentAnalysisSection && result.sentimentAnalysis) {
        sentimentAnalysisSection.style.display = 'block';
        if (sentimentOverall) sentimentOverall.textContent = result.sentimentAnalysis.overallSentiment || 'Neutral';
        if (positiveWords) positiveWords.textContent = result.sentimentAnalysis.positiveWords || 0;
        if (negativeWords) negativeWords.textContent = result.sentimentAnalysis.negativeWords || 0;
        if (emotionalWords) emotionalWords.textContent = result.sentimentAnalysis.emotionalWords || 0;
    }

    // Update Phone Analysis
    const phoneAnalysisSection = document.getElementById('phoneAnalysisSection');
    const phoneCountry = document.getElementById('phoneCountry');
    const phoneStatus = document.getElementById('phoneStatus');
    const phonePattern = document.getElementById('phonePattern');
    
    if (phoneAnalysisSection && result.phoneAnalysis) {
        phoneAnalysisSection.style.display = 'block';
        if (phoneCountry) phoneCountry.textContent = result.phoneAnalysis.country || 'Unknown';
        if (phoneStatus) {
            phoneStatus.textContent = result.phoneAnalysis.status || 'Unknown';
            phoneStatus.className = result.phoneAnalysis.status === 'BLACKLISTED' ? 'text-danger' : 'text-success';
        }
        if (phonePattern) phonePattern.textContent = result.phoneAnalysis.pattern || 'Normal';
    }

    // Update Business Context
    const businessContextSection = document.getElementById('businessContextSection');
    const businessType = document.getElementById('businessType');
    const industryRisk = document.getElementById('industryRisk');
    
    if (businessContextSection && result.businessContext) {
        businessContextSection.style.display = 'block';
        if (businessType) businessType.textContent = result.businessContext.businessType || 'General';
        if (industryRisk) industryRisk.textContent = result.businessContext.industryRiskScore || 0;
    }

    // Update Geographic Context
    const geographicContextSection = document.getElementById('geographicContextSection');
    const geoCountry = document.getElementById('geoCountry');
    const geoRisk = document.getElementById('geoRisk');
    
    if (geographicContextSection && result.geographicContext) {
        geographicContextSection.style.display = 'block';
        if (geoCountry) geoCountry.textContent = result.geographicContext.phoneCountry || 'Unknown';
        if (geoRisk) geoRisk.textContent = result.geographicContext.geographicRiskScore || 0;
    }

    // Update recommendation
    if (recommendation) {
        let recommendationsHTML = '';
        if (result.recommendations && result.recommendations.length > 0) {
            recommendationsHTML = '<ul>';
            result.recommendations.forEach(rec => {
                recommendationsHTML += `<li>${rec}</li>`;
            });
            recommendationsHTML += '</ul>';
        } else {
            recommendationsHTML = 'You can proceed with this conversation.';
        }
        recommendation.innerHTML = recommendationsHTML;
    }

    // Show the result
    scanResult.style.display = 'block';
    
    // Animate the confidence bar
    setTimeout(() => {
        if (confidenceFill) {
            confidenceFill.style.transition = 'width 1s ease';
        }
    }, 100);
}

// Show Scan Modal
function showScanModal() {
    document.getElementById('scanModal').style.display = 'flex';
}

// Scan From Modal
async function scanFromModal() {
    const messageText = document.getElementById('modalMessage').value.trim();
    const senderNumber = document.getElementById('modalNumber').value.trim();
    
    if (!messageText) {
        SecurityPro.showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    // Close modal
    closeModal('scanModal');
    
    // Switch to scan section
    showSection('scan');
    
    // Set values
    document.getElementById('messageText').value = messageText;
    document.getElementById('senderNumber').value = senderNumber;
    
    // Scan message
    await scanMessage();
}

// Close Modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Report Scammer (quick button in scan result)
window.reportScammer = async function() {
    const senderNumber = document.getElementById('senderNumber')?.value?.trim();
    if (!senderNumber) {
        SecurityPro.showNotification('Please enter the scammer\'s phone number', 'error');
        return;
    }
    try {
        await SecurityPro.apiRequest('report-scammer', {
            method: 'POST',
            body: JSON.stringify({
                phone: senderNumber,
                reason: 'Suspicious activity detected'
            })
        });
        SecurityPro.showNotification('Scammer reported successfully', 'success');
    } catch (error) {
        console.error('Report error:', error);
        SecurityPro.showNotification('Error reporting scammer', 'error');
    }
};

// Submit Report Scammer (modal form)
window.submitReportScammer = async function() {
    const phone = document.getElementById('reportPhone').value.trim();
    const reason = document.getElementById('reportReason').value.trim();
    const evidenceInput = document.getElementById('reportEvidence');
    const evidenceFile = evidenceInput.files[0];
    if (!phone || !reason) {
        SecurityPro.showNotification('Please provide phone number and reason', 'error');
        return;
    }
    // Prepare form data
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('reason', reason);
    if (evidenceFile) {
        formData.append('evidence', evidenceFile);
    }
    try {
        // Use fetch directly for multipart/form-data
        const token = localStorage.getItem('token');
        const response = await fetch('/api/report-scammer', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) throw new Error('Failed to report scammer');
        SecurityPro.showNotification('Scammer reported successfully!', 'success');
        closeModal('reportModal');
    } catch (error) {
        console.error('Report error:', error);
        SecurityPro.showNotification('Error reporting scammer', 'error');
    }
};

// Scan Another
function scanAnother() {
    document.getElementById('messageText').value = '';
    document.getElementById('senderNumber').value = '';
    document.getElementById('scanResult').style.display = 'none';
    document.getElementById('messageText').focus();
}

// Show Report Modal
window.showReportModal = function() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset fields
        document.getElementById('reportPhone').value = '';
        document.getElementById('reportReason').value = '';
        document.getElementById('reportEvidence').value = '';
    } else {
        SecurityPro.showNotification('Report modal not found', 'error');
    }
};

// Show Training Modal
window.showTrainingModal = function() {
    const modal = document.getElementById('trainingModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        SecurityPro.showNotification('Training modal not found', 'error');
    }
};

// Open Training Resource
window.openTrainingResource = function(type) {
    const resources = {
        phone: {
            name: 'Google Scam Spotter',
            url: 'https://scamspotter.org/',
            description: 'Phone Number Scams Training'
        },
        payment: {
            name: 'FTC Scam Alerts',
            url: 'https://consumer.ftc.gov/features/scam-alerts',
            description: 'Payment Scams Training'
        },
        business: {
            name: 'CyberAware Nigeria',
            url: 'https://cyberaware.ng/',
            description: 'Business Scams Training'
        },
        social: {
            name: 'StaySafeOnline',
            url: 'https://staysafeonline.org/',
            description: 'Social Engineering Training'
        }
    };

    const resource = resources[type];
    if (resource) {
        // Show confirmation
        if (confirm(`You are about to visit ${resource.name} for ${resource.description}.\n\nThis will open in a new tab. Continue?`)) {
            window.open(resource.url, '_blank');
            SecurityPro.showNotification(`Opening ${resource.name}...`, 'success');
            closeModal('trainingModal');
        }
    } else {
        SecurityPro.showNotification('Training resource not found', 'error');
    }
};

// Show Subscription Modal
window.showSubscriptionModal = function() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        SecurityPro.showNotification('Subscription modal not found', 'error');
    }
};

// Select Plan
window.selectPlan = function(planType) {
    const plans = {
        basic: {
            name: 'Basic Shield',
            price: '₦2,500',
            features: ['50 message scans per month', 'Basic threat detection', 'Email support']
        },
        pro: {
            name: 'Pro Guard',
            price: '₦5,500',
            features: ['Unlimited message scans', 'Advanced AI detection', 'Real-time alerts']
        },
        enterprise: {
            name: 'Enterprise Fortress',
            price: '₦15,000',
            features: ['Everything in Pro Guard', 'Multiple team members', 'API access']
        }
    };

    const plan = plans[planType];
    if (plan) {
        // Show confirmation
        if (confirm(`You are about to upgrade to ${plan.name} (${plan.price}/month).\n\nThis will redirect you to our payment gateway. Continue?`)) {
            // Mock payment redirect (in real app, redirect to payment gateway)
            SecurityPro.showNotification(`Redirecting to payment for ${plan.name}...`, 'success');
            
            // Simulate payment redirect
            setTimeout(() => {
                SecurityPro.showNotification('Payment gateway integration coming soon!', 'info');
                closeModal('subscriptionModal');
            }, 1500);
        }
    } else {
        SecurityPro.showNotification('Plan not found', 'error');
    }
};

// Start Training
window.startTraining = function(type) {
    const resources = {
        phone: {
            name: 'Google Scam Spotter',
            url: 'https://scamspotter.org/',
            description: 'Phone Number Scams Training'
        },
        payment: {
            name: 'FTC Scam Alerts',
            url: 'https://consumer.ftc.gov/features/scam-alerts',
            description: 'Payment Scams Training'
        },
        business: {
            name: 'CyberAware Nigeria',
            url: 'https://cyberaware.ng/',
            description: 'Business Scams Training'
        },
        social: {
            name: 'StaySafeOnline',
            url: 'https://staysafeonline.org/',
            description: 'Social Engineering Training'
        }
    };

    const resource = resources[type];
    if (resource) {
        // Show confirmation
        if (confirm(`You are about to visit ${resource.name} for ${resource.description}.\n\nThis will open in a new tab. Continue?`)) {
            window.open(resource.url, '_blank');
            SecurityPro.showNotification(`Opening ${resource.name}...`, 'success');
        }
    } else {
        SecurityPro.showNotification('Training resource not found', 'error');
    }
};

// Load Reports (fix for correct backend response)
async function loadReports(filter = 'all') {
    try {
        const response = await SecurityPro.apiRequest('user-reports');
        // Handle both array and object response
        const reports = Array.isArray(response) ? response : response.reports;
        const reportsList = document.getElementById('reportsList');
        if (!reports || reports.length === 0) {
            reportsList.innerHTML = '<div class="empty-state"><p>No reports found</p></div>';
            return;
        }
        // Filter reports
        let filteredReports = reports;
        if (filter !== 'all') {
            filteredReports = reports.filter(report =>
                (report.analysis?.riskLevel || report.riskLevel)?.toLowerCase() === filter
            );
        }
        // Sort by date (newest first)
        filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const reportsHTML = filteredReports.map(report => `
            <div class="report-item">
                <div class="report-header">
                    <div class="report-date">${new Date(report.timestamp).toLocaleDateString()}</div>
                    <div class="report-risk ${(report.analysis?.riskLevel || report.riskLevel)?.toLowerCase()}">
                        ${report.analysis?.riskLevel || report.riskLevel || 'Unknown'}
                    </div>
                </div>
                <div class="report-content">
                    <div class="report-message">${report.message}</div>
                    ${report.phone ? `<div class="report-phone">${report.phone}</div>` : ''}
                    <div class="report-confidence">Confidence: ${report.analysis?.confidence || report.confidence || 0}%</div>
                </div>
                <div class="report-threats">
                    <strong>Threat Indicators:</strong>
                    <ul>
                        ${(report.analysis?.threatIndicators || report.threatIndicators || ['None detected']).map(threat =>
                            `<li>${threat}</li>`
                        ).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
        reportsList.innerHTML = reportsHTML;
    } catch (error) {
        console.error('Error loading reports:', error);
        SecurityPro.showNotification('Error loading reports', 'error');
    }
}

// Load User Settings
function loadUserSettings() {
    const user = SecurityPro.currentUser();
    if (user) {
        document.getElementById('profileName').value = user.name || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileBusiness').value = user.businessType || 'retail';
    }
}

// Logout Function (override from main script)
function logout() {
    SecurityPro.logout();
}

// Export functions for global access
window.Dashboard = {
    showSection,
    scanMessage,
    showScanModal,
    showReportModal,
    showTrainingModal,
    showSubscriptionModal,
    startTraining,
    logout
};

// Global functions for dashboard
window.displayScanResult = function(result) {
    const resultDiv = document.getElementById('scanResult');
    const riskBadge = document.getElementById('riskBadge');
    const riskAssessment = document.getElementById('riskAssessment');
    const detectedPatterns = document.getElementById('detectedPatterns');
    const recommendation = document.getElementById('recommendation');
    
    if (!resultDiv) return;
    
    // Set risk level and styling
    let riskClass = 'low';
    let riskText = 'Low Risk';
    
    switch(result.riskLevel) {
        case 'high':
            riskClass = 'high';
            riskText = 'High Risk';
            break;
        case 'medium':
            riskClass = 'medium';
            riskText = 'Medium Risk';
            break;
        default:
            riskClass = 'low';
            riskText = 'Low Risk';
    }
    
    if (riskBadge) {
        riskBadge.textContent = riskText;
        riskBadge.className = `risk-badge ${riskClass}`;
    }
    
    // Update content
    if (riskAssessment) riskAssessment.textContent = result.assessment || 'Risk assessment completed.';
    
    if (detectedPatterns) {
        if (result.patterns && result.patterns.length > 0) {
            detectedPatterns.innerHTML = result.patterns.map(pattern => 
                `<li>${pattern}</li>`
            ).join('');
        } else {
            detectedPatterns.innerHTML = '<li>No suspicious patterns detected</li>';
        }
    }
    
    if (recommendation) recommendation.textContent = result.recommendation || 'Proceed with caution.';
    
    // Show result
    resultDiv.style.display = 'block';
    resultDiv.scrollIntoView({ behavior: 'smooth' });
};

window.scanFromModal = async function() {
    const messageText = document.getElementById('modalMessage')?.value?.trim();
    const senderNumber = document.getElementById('modalNumber')?.value?.trim();
    
    if (!messageText) {
        SecurityPro.showNotification('Please enter a message to scan', 'error');
        return;
    }
    
    // Close modal
    closeModal('scanModal');
    
    // Switch to scan section
    showSection('scan');
    
    // Set values
    const messageInput = document.getElementById('messageText');
    const numberInput = document.getElementById('senderNumber');
    if (messageInput) messageInput.value = messageText;
    if (numberInput) numberInput.value = senderNumber;
    
    // Scan message
    await scanMessage();
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

window.scanAnother = function() {
    const messageInput = document.getElementById('messageText');
    const numberInput = document.getElementById('senderNumber');
    const resultDiv = document.getElementById('scanResult');
    
    if (messageInput) messageInput.value = '';
    if (numberInput) numberInput.value = '';
    if (resultDiv) resultDiv.style.display = 'none';
    
    if (messageInput) messageInput.focus();
};

// Export Reports Function
window.exportReports = async function() {
    try {
        const reports = await SecurityPro.apiRequest('user-reports');
        
        if (!reports || reports.length === 0) {
            SecurityPro.showNotification('No reports to export', 'info');
            return;
        }
        
        // Create CSV content
        let csvContent = 'Date,Message,Phone Number,Risk Level,Confidence,Threat Indicators\n';
        
        reports.forEach(report => {
            const date = new Date(report.timestamp).toLocaleDateString();
            const message = `"${report.message.replace(/"/g, '""')}"`;
            const phone = report.phone || 'N/A';
            const riskLevel = report.analysis?.riskLevel || 'Unknown';
            const confidence = report.analysis?.confidence || 0;
            const threats = report.analysis?.threatIndicators?.join('; ') || 'None';
            
            csvContent += `${date},${message},${phone},${riskLevel},${confidence}%,${threats}\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-reports-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        SecurityPro.showNotification('Reports exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting reports:', error);
        SecurityPro.showNotification('Error exporting reports', 'error');
    }
};

// Filter Reports Function
window.filterReports = function() {
    const filter = document.getElementById('reportFilter').value;
    loadReports(filter);
};

// Community Functions - Make them global
window.showCommunityReportModal = function() {
    const modal = document.getElementById('communityReportModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Clear form
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Clear individual fields if form reset doesn't work
        const fields = ['reportPhoneNumber', 'reportMessage', 'reportScamType', 'reportDescription', 'reportEvidence'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
    }
};

window.submitCommunityReport = async function() {
    const phoneNumber = document.getElementById('reportPhoneNumber')?.value?.trim();
    const message = document.getElementById('reportMessage')?.value?.trim();
    const scamType = document.getElementById('reportScamType')?.value;
    const description = document.getElementById('reportDescription')?.value?.trim();
    const evidence = document.getElementById('reportEvidence')?.value?.trim();

    if (!phoneNumber || !message || !scamType) {
        SecurityPro.showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const result = await SecurityPro.apiRequest('community/report', {
            method: 'POST',
            body: JSON.stringify({
                phoneNumber,
                message,
                scamType,
                description,
                evidence
            })
        });

        closeModal('communityReportModal');
        SecurityPro.showNotification(`Report submitted successfully! +${result.reputationGained} reputation points`, 'success');
        
        // Refresh community reports
        loadCommunityReports();
        
        // Update user reputation if available
        if (result.newLevel) {
            SecurityPro.showNotification(`Congratulations! You've reached ${result.newLevel} level!`, 'success');
        }
        
    } catch (error) {
        console.error('Error submitting report:', error);
        SecurityPro.showNotification('Error submitting report. Please try again.', 'error');
    }
};

window.showLeaderboard = function() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.style.display = 'flex';
        loadLeaderboard('points');
    }
};

window.showMyReputation = async function() {
    const modal = document.getElementById('reputationModal');
    if (modal) {
        modal.style.display = 'flex';
        
        try {
            const userId = SecurityPro.currentUser()?.id;
            if (userId) {
                const reputation = await SecurityPro.apiRequest(`community/reputation/${userId}`);
                displayReputation(reputation);
            } else {
                SecurityPro.showNotification('User not found', 'error');
            }
        } catch (error) {
            console.error('Error loading reputation:', error);
            SecurityPro.showNotification('Error loading reputation', 'error');
        }
    }
};

window.voteOnReport = async function(reportId, vote) {
    try {
        const result = await SecurityPro.apiRequest('community/vote', {
            method: 'POST',
            body: JSON.stringify({
                reportId,
                vote
            })
        });
        
        // Update vote buttons
        const voteButtons = document.querySelectorAll(`[onclick*="${reportId}"]`);
        voteButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            
            if (icon.classList.contains('fa-thumbs-up')) {
                span.textContent = result.upvotes;
            } else if (icon.classList.contains('fa-thumbs-down')) {
                span.textContent = result.downvotes;
            }
        });
        
        SecurityPro.showNotification('Vote recorded successfully', 'success');
        
    } catch (error) {
        console.error('Error voting on report:', error);
        SecurityPro.showNotification('Error recording vote', 'error');
    }
};

window.loadMoreCommunityReports = function() {
    communityReportsOffset += 10;
    loadCommunityReports();
};

window.filterCommunityReports = function() {
    communityReportsOffset = 0;
    loadCommunityReports();
};

window.switchLeaderboardTab = function(type) {
    currentLeaderboardTab = type;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadLeaderboard(type);
};

// Load Community Reports
async function loadCommunityReports() {
    try {
        const filter = document.getElementById('communityFilter')?.value || 'all';
        const result = await SecurityPro.apiRequest(`community/reports?status=${filter}&limit=10&offset=${communityReportsOffset}`);
        
        displayCommunityReports(result.reports);
        
    } catch (error) {
        console.error('Error loading community reports:', error);
        SecurityPro.showNotification('Error loading community reports', 'error');
    }
}

// Display Community Reports
function displayCommunityReports(reports) {
    const container = document.getElementById('communityReportsList');
    
    if (!container) return;
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No reports found</p></div>';
        return;
    }
    
    const reportsHTML = reports.map(report => `
        <div class="community-report-item">
            <div class="report-header">
                <div class="report-user">
                    <div class="report-user-avatar">
                        ${report.userName ? report.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div class="report-user-info">
                        <h4>${report.userName || 'Unknown User'}</h4>
                        <p>${new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="report-status ${report.status}">
                    ${report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </div>
            </div>
            <div class="report-content">
                <div class="report-phone">${report.phoneNumber}</div>
                <div class="report-message">${report.message}</div>
                <div class="report-scam-type">${report.scamType.replace('_', ' ').toUpperCase()}</div>
                ${report.description ? `<p>${report.description}</p>` : ''}
            </div>
            <div class="report-actions">
                <div class="report-votes">
                    <button class="vote-btn" onclick="voteOnReport('${report.id}', 'up')">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${report.upvotes || 0}</span>
                    </button>
                    <button class="vote-btn" onclick="voteOnReport('${report.id}', 'down')">
                        <i class="fas fa-thumbs-down"></i>
                        <span>${report.downvotes || 0}</span>
                    </button>
                </div>
                <div class="report-time">
                    ${timeAgo(new Date(report.createdAt))}
                </div>
            </div>
        </div>
    `).join('');
    
    if (communityReportsOffset === 0) {
        container.innerHTML = reportsHTML;
    } else {
        container.innerHTML += reportsHTML;
    }
}

// Load Leaderboard
async function loadLeaderboard(type = 'points') {
    try {
        const result = await SecurityPro.apiRequest(`community/leaderboard?type=${type}&limit=20`);
        displayLeaderboard(result, type);
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        SecurityPro.showNotification('Error loading leaderboard', 'error');
    }
}

// Display Leaderboard
function displayLeaderboard(leaderboard, type) {
    const container = document.getElementById('leaderboardList');
    
    if (!container) return;
    
    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No leaderboard data available</p></div>';
        return;
    }
    
    const leaderboardHTML = leaderboard.map((user, index) => {
        let rankClass = 'other';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        let statValue, statLabel;
        if (type === 'points') {
            statValue = user.points;
            statLabel = 'Points';
        } else if (type === 'reports') {
            statValue = user.reportsSubmitted;
            statLabel = 'Reports';
        } else if (type === 'verified') {
            statValue = user.reportsVerified;
            statLabel = 'Verified';
        }
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">
                    ${index + 1}
                </div>
                <div class="leaderboard-user">
                    <h4>${user.userName || 'Unknown User'}</h4>
                    <p>${user.level} • ${user.reportsSubmitted} reports</p>
                </div>
                <div class="leaderboard-stats">
                    <div class="stat-value">${statValue}</div>
                    <div class="stat-label">${statLabel}</div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = leaderboardHTML;
}

// Display Reputation
function displayReputation(reputation) {
    if (!reputation) return;
    
    const levelElement = document.getElementById('userLevel');
    const pointsElement = document.getElementById('userPoints');
    const submittedElement = document.getElementById('userReportsSubmitted');
    const verifiedElement = document.getElementById('userReportsVerified');
    const progressFillElement = document.getElementById('progressFill');
    const progressTextElement = document.getElementById('progressText');
    
    if (levelElement) levelElement.textContent = reputation.level || 'Beginner';
    if (pointsElement) pointsElement.textContent = `${reputation.points || 0} points`;
    if (submittedElement) submittedElement.textContent = reputation.reportsSubmitted || 0;
    if (verifiedElement) verifiedElement.textContent = reputation.reportsVerified || 0;
    
    // Calculate progress to next level
    const progress = calculateReputationProgress(reputation.points || 0);
    if (progressFillElement) progressFillElement.style.width = `${progress.percentage}%`;
    if (progressTextElement) progressTextElement.textContent = `${reputation.points || 0} / ${progress.nextLevel} points to next level`;
    
    // Load badges
    loadUserBadges(reputation);
}

// Calculate Reputation Progress
function calculateReputationProgress(points) {
    const levels = [0, 20, 50, 100, 200, 500, 1000];
    let currentLevel = 0;
    let nextLevel = 20;
    
    for (let i = 0; i < levels.length - 1; i++) {
        if (points >= levels[i] && points < levels[i + 1]) {
            currentLevel = levels[i];
            nextLevel = levels[i + 1];
            break;
        }
    }
    
    const progress = points - currentLevel;
    const total = nextLevel - currentLevel;
    const percentage = Math.min((progress / total) * 100, 100);
    
    return { percentage, nextLevel };
}

// Load User Badges
function loadUserBadges(reputation) {
    const badgesContainer = document.getElementById('userBadges');
    if (!badgesContainer) return;
    
    const badges = [
        { id: 'first_report', name: 'First Report', icon: 'fas fa-flag', desc: 'Submit your first report', earned: (reputation.reportsSubmitted || 0) >= 1 },
        { id: 'contributor', name: 'Contributor', icon: 'fas fa-star', desc: 'Submit 5 reports', earned: (reputation.reportsSubmitted || 0) >= 5 },
        { id: 'trusted', name: 'Trusted', icon: 'fas fa-shield-alt', desc: 'Reach Trusted level', earned: (reputation.points || 0) >= 100 },
        { id: 'expert', name: 'Expert', icon: 'fas fa-crown', desc: 'Reach Expert level', earned: (reputation.points || 0) >= 500 },
        { id: 'verified', name: 'Verified', icon: 'fas fa-check-circle', desc: 'Have a report verified', earned: (reputation.reportsVerified || 0) >= 1 },
        { id: 'legend', name: 'Legend', icon: 'fas fa-trophy', desc: 'Reach Legend level', earned: (reputation.points || 0) >= 1000 }
    ];
    
    const badgesHTML = badges.map(badge => `
        <div class="badge-item ${badge.earned ? 'earned' : ''}">
            <div class="badge-icon">
                <i class="${badge.icon}"></i>
            </div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-desc">${badge.desc}</div>
        </div>
    `).join('');
    
    badgesContainer.innerHTML = badgesHTML;
}

// Helper function for time ago
function timeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Initialize Community
function initializeCommunity() {
    // Load community reports when community section is shown
    const communityLink = document.querySelector('[data-section="community"]');
    if (communityLink) {
        communityLink.addEventListener('click', function() {
            setTimeout(() => {
                loadCommunityReports();
            }, 100);
        });
    }
}

// Initialize theme on page load
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.classList.add('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.classList.remove('dark');
        }
    }
}

// Toggle theme function
window.toggleTheme = function() {
    const themeToggle = document.getElementById('themeToggle');
    const isDark = currentTheme === 'dark';
    
    // Toggle theme
    currentTheme = isDark ? 'light' : 'dark';
    
    // Update DOM
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.classList.remove('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.classList.add('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', currentTheme);
    
    // Show notification
    const themeName = isDark ? 'Light' : 'Dark';
    SecurityPro.showNotification(`${themeName} mode activated`, 'success');
    
    // Add smooth transition effect
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
};

// Enhanced UX Functions
window.showUserDashboard = function() {
    // Close user dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // Show user dashboard modal with enhanced stats
    const modal = document.getElementById('userDashboardModal');
    if (modal) {
        modal.style.display = 'flex';
        loadEnhancedUserStats();
    }
};

// Load enhanced user statistics
async function loadEnhancedUserStats() {
    try {
        const userId = SecurityPro.currentUser()?.id;
        if (!userId) return;
        
        // Get user reports for enhanced analytics
        const reports = await SecurityPro.apiRequest('user-reports');
        const userReports = Array.isArray(reports) ? reports : reports.reports || [];
        
        // Calculate enhanced stats
        const totalScans = userReports.length;
        const highRiskScans = userReports.filter(r => 
            (r.analysis?.riskLevel || r.riskLevel) === 'high'
        ).length;
        const mediumRiskScans = userReports.filter(r => 
            (r.analysis?.riskLevel || r.riskLevel) === 'medium'
        ).length;
        const lowRiskScans = userReports.filter(r => 
            (r.analysis?.riskLevel || r.riskLevel) === 'low'
        ).length;
        
        // Calculate average confidence
        const avgConfidence = userReports.length > 0 
            ? Math.round(userReports.reduce((sum, r) => sum + (r.analysis?.confidence || 0), 0) / userReports.length)
            : 0;
        
        // Update dashboard stats
        updateEnhancedStats({
            totalScans,
            highRiskScans,
            mediumRiskScans,
            lowRiskScans,
            avgConfidence
        });
        
    } catch (error) {
        console.error('Error loading enhanced stats:', error);
    }
}

// Update enhanced statistics display
function updateEnhancedStats(stats) {
    const statsContainer = document.getElementById('enhancedStats');
    if (!statsContainer) return;
    
    const statsHTML = `
        <div class="enhanced-stats-grid">
            <div class="stat-item enhanced">
                <div class="stat-icon">
                    <i class="fas fa-search"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.totalScans}</div>
                    <div class="stat-label">Total Scans</div>
                </div>
            </div>
            <div class="stat-item enhanced high-risk">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.highRiskScans}</div>
                    <div class="stat-label">High Risk</div>
                </div>
            </div>
            <div class="stat-item enhanced medium-risk">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.mediumRiskScans}</div>
                    <div class="stat-label">Medium Risk</div>
                </div>
            </div>
            <div class="stat-item enhanced low-risk">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.lowRiskScans}</div>
                    <div class="stat-label">Low Risk</div>
                </div>
            </div>
            <div class="stat-item enhanced confidence">
                <div class="stat-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.avgConfidence}%</div>
                    <div class="stat-label">Avg Confidence</div>
                </div>
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = statsHTML;
}

// Enhanced loading states
window.showLoading = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('loading');
    }
};

window.hideLoading = function(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('loading');
    }
};

// Enhanced notifications with themes
window.showEnhancedNotification = function(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `enhanced-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
};

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Analytics Functions
async function loadAnalytics() {
    try {
        const response = await fetch('/api/analytics/dashboard', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateAnalyticsDashboard(data.analytics);
                createCharts(data.analytics);
                loadScanHistory();
            }
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
        SecurityPro.showNotification('Failed to load analytics data', 'error');
    }
}

function updateAnalyticsDashboard(analytics) {
    // Update stats cards
    document.getElementById('total-scans').textContent = analytics.userStats.totalScans;
    document.getElementById('high-risk-scans').textContent = analytics.userStats.highRiskScans;
    document.getElementById('avg-confidence').textContent = analytics.userStats.averageConfidence + '%';
    document.getElementById('success-rate').textContent = analytics.trends.scanSuccessRate + '%';
    
    // Update performance metrics
    document.getElementById('avg-scan-time').textContent = analytics.performance.averageScanTime + 's';
    document.getElementById('detection-accuracy').textContent = analytics.performance.detectionAccuracy + '%';
    document.getElementById('user-engagement').textContent = analytics.performance.userEngagement.engagementScore + '%';
    
    // Update top patterns
    updateTopPatterns(analytics.trends.topScamPatterns);
}

function createCharts(analytics) {
    // Create trends chart
    const trendsCtx = document.getElementById('trends-chart');
    if (trendsCtx) {
        new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: analytics.trends.dailyScans.map(day => day.date),
                datasets: [{
                    label: 'Daily Scans',
                    data: analytics.trends.dailyScans.map(day => day.scans),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#fff'
                        }
                    }
                }
            }
        });
    }
    
    // Create risk distribution chart
    const riskCtx = document.getElementById('risk-chart');
    if (riskCtx) {
        new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                labels: analytics.trends.riskDistribution.map(item => item.risk),
                datasets: [{
                    data: analytics.trends.riskDistribution.map(item => item.count),
                    backgroundColor: [
                        '#ff6b6b',
                        '#ffc107',
                        '#28a745',
                        '#6c757d'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#fff',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
}

function updateTopPatterns(patterns) {
    const patternsContainer = document.getElementById('top-patterns');
    if (!patternsContainer) return;
    
    patternsContainer.innerHTML = '';
    
    patterns.forEach(pattern => {
        const patternItem = document.createElement('div');
        patternItem.className = 'pattern-item';
        patternItem.innerHTML = `
            <span class="pattern-name">${pattern.pattern}</span>
            <span class="pattern-count">${pattern.count}</span>
        `;
        patternsContainer.appendChild(patternItem);
    });
}

async function loadScanHistory() {
    try {
        const response = await fetch('/api/analytics/scan-history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayScanHistory(data.scanHistory);
            }
        }
    } catch (error) {
        console.error('Failed to load scan history:', error);
        SecurityPro.showNotification('Failed to load scan history', 'error');
    }
}

function displayScanHistory(history) {
    const tbody = document.getElementById('scan-history-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No scan history available</td></tr>';
        return;
    }
    
    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(item.timestamp).toLocaleDateString()}</td>
            <td>${item.message}</td>
            <td><span class="risk-badge ${item.riskLevel.toLowerCase()}">${item.riskLevel}</span></td>
            <td>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${item.confidence}%"></div>
                </div>
                <span style="margin-left: 10px; font-size: 0.8rem;">${item.confidence}%</span>
            </td>
            <td>
                <div class="history-actions">
                    <button onclick="viewReportDetails('${item.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="shareReport('${item.id}')" title="Share">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function exportReport() {
    try {
        const response = await fetch('/api/analytics/export-report', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                downloadReport(data.exportData);
            }
        }
    } catch (error) {
        console.error('Failed to export report:', error);
        SecurityPro.showNotification('Failed to export report', 'error');
    }
}

function downloadReport(exportData) {
    const reportContent = generateReportContent(exportData);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScamBuster-User-Report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    SecurityPro.showNotification('Report exported successfully!', 'success');
}

function generateReportContent(data) {
    let content = 'ScamBuster - User Report\n';
    content += '='.repeat(50) + '\n\n';
    
    content += `User: ${data.userInfo.name} (${data.userInfo.email})\n`;
    content += `Report Generated: ${new Date(data.generatedAt).toLocaleString()}\n\n`;
    
    content += 'SCAN SUMMARY\n';
    content += '-'.repeat(20) + '\n';
    content += `Total Scans: ${data.scanSummary.totalScans}\n`;
    content += `High Risk: ${data.scanSummary.highRisk}\n`;
    content += `Medium Risk: ${data.scanSummary.mediumRisk}\n`;
    content += `Low Risk: ${data.scanSummary.lowRisk}\n`;
    content += `Safe: ${data.scanSummary.safe}\n\n`;
    
    content += 'DETAILED REPORTS\n';
    content += '-'.repeat(20) + '\n\n';
    
    data.detailedReports.forEach((report, index) => {
        content += `Report ${index + 1}\n`;
        content += `Date: ${new Date(report.timestamp).toLocaleString()}\n`;
        content += `Risk Level: ${report.riskLevel}\n`;
        content += `Confidence: ${report.confidence}%\n`;
        content += `Message: ${report.message}\n`;
        content += `AI Insights: ${report.aiInsights}\n`;
        content += `Patterns: ${report.patterns.join(', ')}\n`;
        content += `Recommendations: ${report.recommendations}\n\n`;
    });
    
    return content;
}

function viewReportDetails(reportId) {
    // This would open a modal with detailed report information
    SecurityPro.showNotification('Report details feature coming soon!', 'info');
}

function shareReport(reportId) {
    // This would implement sharing functionality
    SecurityPro.showNotification('Share feature coming soon!', 'info');
}

// Integration Functions
async function loadIntegrations() {
    try {
        await loadWebhooks();
        await loadUsageStats();
    } catch (error) {
        console.error('Failed to load integrations:', error);
        SecurityPro.showNotification('Failed to load integrations', 'error');
    }
}

async function loadWebhooks() {
    try {
        const response = await fetch('/api/webhooks', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayWebhooks(data.webhooks);
            }
        }
    } catch (error) {
        console.error('Failed to load webhooks:', error);
    }
}

function displayWebhooks(webhooks) {
    const webhooksList = document.getElementById('webhooks-list');
    if (!webhooksList) return;
    
    if (webhooks.length === 0) {
        webhooksList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No webhooks configured</p>';
        return;
    }
    
    webhooksList.innerHTML = webhooks.map(webhook => `
        <div class="webhook-item">
            <div class="webhook-info">
                <div class="webhook-url">${webhook.url}</div>
                <div class="webhook-events">Events: ${webhook.events.join(', ')}</div>
            </div>
            <div class="webhook-status">
                <div class="status-indicator ${webhook.active ? 'active' : 'inactive'}"></div>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">
                    ${webhook.active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="webhook-actions">
                <button onclick="testWebhook('${webhook.id}')" title="Test Webhook">
                    <i class="fas fa-play"></i>
                </button>
                <button onclick="deleteWebhook('${webhook.id}')" class="delete" title="Delete Webhook">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function loadUsageStats() {
    try {
        const response = await fetch('/api/usage', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                displayUsageStats(data.usage);
            }
        }
    } catch (error) {
        console.error('Failed to load usage stats:', error);
    }
}

function displayUsageStats(usage) {
    const usageStats = document.getElementById('usageStats');
    if (!usageStats) return;
    
    const totalRequests = Object.values(usage).reduce((sum, count) => sum + count, 0);
    const scanRequests = usage['/scan'] || 0;
    const webhookRequests = usage['/webhooks'] || 0;
    
    usageStats.innerHTML = `
        <div class="usage-stat">
            <div class="usage-stat-value">${totalRequests}</div>
            <div class="usage-stat-label">Total Requests</div>
        </div>
        <div class="usage-stat">
            <div class="usage-stat-value">${scanRequests}</div>
            <div class="usage-stat-label">Scan Requests</div>
        </div>
        <div class="usage-stat">
            <div class="usage-stat-value">${webhookRequests}</div>
            <div class="usage-stat-label">Webhook Calls</div>
        </div>
    `;
}

// Modal Management
function showWebhookModal() {
    document.getElementById('webhookModal').style.display = 'flex';
}

function showSlackModal() {
    document.getElementById('slackModal').style.display = 'flex';
}

function showEmailModal() {
    document.getElementById('emailModal').style.display = 'flex';
}

function showUsageModal() {
    document.getElementById('usageModal').style.display = 'flex';
    loadUsageStats();
}

function closeIntegrationModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form Submissions
document.addEventListener('DOMContentLoaded', function() {
    // Webhook form submission
    const webhookForm = document.getElementById('webhookForm');
    if (webhookForm) {
        webhookForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(webhookForm);
            const events = Array.from(formData.getAll('events'));
            
            const webhookData = {
                url: formData.get('url'),
                events: events,
                description: formData.get('description')
            };
            
            try {
                const response = await fetch('/api/webhooks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(webhookData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        SecurityPro.showNotification('Webhook created successfully!', 'success');
                        closeIntegrationModal('webhookModal');
                        webhookForm.reset();
                        loadWebhooks();
                    }
                } else {
                    const error = await response.json();
                    SecurityPro.showNotification(error.message || 'Failed to create webhook', 'error');
                }
            } catch (error) {
                console.error('Webhook creation error:', error);
                SecurityPro.showNotification('Failed to create webhook', 'error');
            }
        });
    }
    
    // Slack form submission
    const slackForm = document.getElementById('slackForm');
    if (slackForm) {
        slackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(slackForm);
            const slackData = {
                webhookUrl: formData.get('webhookUrl'),
                channel: formData.get('channel'),
                username: formData.get('username')
            };
            
            try {
                const response = await fetch('/api/integrations/slack', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(slackData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        SecurityPro.showNotification('Slack integration configured successfully!', 'success');
                        closeIntegrationModal('slackModal');
                        slackForm.reset();
                    }
                } else {
                    const error = await response.json();
                    SecurityPro.showNotification(error.message || 'Failed to configure Slack', 'error');
                }
            } catch (error) {
                console.error('Slack configuration error:', error);
                SecurityPro.showNotification('Failed to configure Slack integration', 'error');
            }
        });
    }
    
    // Email form submission
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(emailForm);
            const alertTypes = Array.from(formData.getAll('alertTypes'));
            
            const emailData = {
                email: formData.get('email'),
                frequency: formData.get('frequency'),
                alertTypes: alertTypes
            };
            
            try {
                const response = await fetch('/api/integrations/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(emailData)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        SecurityPro.showNotification('Email integration configured successfully!', 'success');
                        closeIntegrationModal('emailModal');
                        emailForm.reset();
                    }
                } else {
                    const error = await response.json();
                    SecurityPro.showNotification(error.message || 'Failed to configure email', 'error');
                }
            } catch (error) {
                console.error('Email configuration error:', error);
                SecurityPro.showNotification('Failed to configure email integration', 'error');
            }
        });
    }
    
    // Close modals when clicking outside
    document.querySelectorAll('.integration-modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});

// Webhook Actions
async function testWebhook(webhookId) {
    try {
        SecurityPro.showNotification('Testing webhook...', 'info');
        
        // Simulate a test event
        const testData = {
            event: 'test_webhook',
            timestamp: new Date().toISOString(),
            data: {
                message: 'This is a test webhook from ScamBuster',
                test: true
            }
        };
        
        SecurityPro.showNotification('Webhook test completed!', 'success');
    } catch (error) {
        console.error('Webhook test error:', error);
        SecurityPro.showNotification('Failed to test webhook', 'error');
    }
}

async function deleteWebhook(webhookId) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/webhooks/${webhookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                SecurityPro.showNotification('Webhook deleted successfully!', 'success');
                loadWebhooks();
            }
        } else {
            const error = await response.json();
            SecurityPro.showNotification(error.message || 'Failed to delete webhook', 'error');
        }
    } catch (error) {
        console.error('Webhook deletion error:', error);
        SecurityPro.showNotification('Failed to delete webhook', 'error');
    }
}

// Toggle User Menu
function toggleUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('active');
    }
} 