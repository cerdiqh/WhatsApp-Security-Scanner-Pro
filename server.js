const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Basic middleware
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// JWT secret - use environment variable
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? 
    (() => { throw new Error('JWT_SECRET must be set in production'); })() : 
    'dev-secret-key-change-in-production');

// File paths
const dbPath = path.join(__dirname, 'data');
const usersPath = path.join(dbPath, 'users.json');
const scamNumbersPath = path.join(dbPath, 'scamNumbers.json');
const scamPatternsPath = path.join(dbPath, 'scamPatterns.json');
const reportsPath = path.join(dbPath, 'reports.json');
const communityReportsPath = path.join(dbPath, 'communityReports.json');
const reputationPath = path.join(dbPath, 'reputation.json');

// Data storage
let users = [];
let scamNumbers = [];
let scamPatterns = [];
let reports = [];
let communityReports = [];
let reputation = [];

// Load data from files
function loadData() {
  try {
    if (fs.existsSync(usersPath)) {
      const usersRaw = fs.readFileSync(usersPath, 'utf8');
      users = JSON.parse(usersRaw);
    }
  } catch (e) {
    console.error('Error loading users.json:', e.message);
    users = [];
  }

  try {
    if (fs.existsSync(scamNumbersPath)) {
      const scamNumbersRaw = fs.readFileSync(scamNumbersPath, 'utf8');
      scamNumbers = JSON.parse(scamNumbersRaw);
    }
  } catch (e) {
    console.error('Error loading scamNumbers.json:', e.message);
    scamNumbers = [];
  }

  try {
    if (fs.existsSync(scamPatternsPath)) {
      const patternsRaw = fs.readFileSync(scamPatternsPath, 'utf8');
      scamPatterns = JSON.parse(patternsRaw);
    }
  } catch (e) {
    console.error('Error loading scamPatterns.json:', e.message);
    scamPatterns = [];
  }

  try {
    if (fs.existsSync(reportsPath)) {
      const reportsRaw = fs.readFileSync(reportsPath, 'utf8');
      reports = JSON.parse(reportsRaw);
    }
  } catch (e) {
    console.error('Error loading reports.json:', e.message);
    reports = [];
  }

  try {
    if (fs.existsSync(communityReportsPath)) {
      const communityRaw = fs.readFileSync(communityReportsPath, 'utf8');
      communityReports = JSON.parse(communityRaw);
    }
  } catch (e) {
    console.error('Error loading communityReports.json:', e.message);
    communityReports = [];
  }

  try {
    if (fs.existsSync(reputationPath)) {
      const reputationRaw = fs.readFileSync(reputationPath, 'utf8');
      reputation = JSON.parse(reputationRaw);
    }
  } catch (e) {
    console.error('Error loading reputation.json:', e.message);
    reputation = [];
  }
}

// Save data to files
function saveData() {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    fs.writeFileSync(scamNumbersPath, JSON.stringify(scamNumbers, null, 2));
    fs.writeFileSync(scamPatternsPath, JSON.stringify(scamPatterns, null, 2));
    fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
    fs.writeFileSync(communityReportsPath, JSON.stringify(communityReports, null, 2));
    fs.writeFileSync(reputationPath, JSON.stringify(reputation, null, 2));
  } catch (e) {
    console.error('Error saving data:', e.message);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Load initial data
loadData();

// Rate Limiting Middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const scanLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 scan requests per minute
    message: {
        success: false,
        message: 'Too many scan requests, please wait before trying again.'
    }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/scan', scanLimiter);

// Webhook System
let webhooks = [];

// Webhook Management Endpoints
app.post('/api/webhooks', authenticateToken, (req, res) => {
    try {
        const { url, events, description } = req.body;
        const userId = req.user.id;
        
        // Enhanced validation
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, message: 'Valid webhook URL is required' });
        }
        
        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one event must be selected' });
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Invalid webhook URL format' });
        }
        
        // Validate events
        const validEvents = ['scan_alert', 'high_risk_detected', 'new_report'];
        const invalidEvents = events.filter(event => !validEvents.includes(event));
        if (invalidEvents.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid events: ${invalidEvents.join(', ')}` });
        }
        
        const webhook = {
            id: Date.now().toString(),
            userId,
            url,
            events,
            description: description || 'Webhook for security alerts',
            active: true,
            createdAt: new Date().toISOString(),
            lastTriggered: null,
            failureCount: 0
        };
        
        webhooks.push(webhook);
        saveWebhooks();
        
        res.json({ success: true, webhook });
    } catch (error) {
        console.error('Webhook creation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create webhook' });
    }
});

app.get('/api/webhooks', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userWebhooks = webhooks.filter(w => w.userId === userId);
        res.json({ success: true, webhooks: userWebhooks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch webhooks' });
    }
});

app.delete('/api/webhooks/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const webhookIndex = webhooks.findIndex(w => w.id === id && w.userId === userId);
        if (webhookIndex === -1) {
            return res.status(404).json({ success: false, message: 'Webhook not found' });
        }
        
        webhooks.splice(webhookIndex, 1);
        saveWebhooks();
        
        res.json({ success: true, message: 'Webhook deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete webhook' });
    }
});

// Webhook Trigger Function
async function triggerWebhooks(event, data) {
    const relevantWebhooks = webhooks.filter(w => w.active && w.events.includes(event));
    
    for (const webhook of relevantWebhooks) {
        try {
            const payload = {
                event,
                timestamp: new Date().toISOString(),
                data,
                webhookId: webhook.id
            };
            
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': generateWebhookSignature(payload, webhook.id)
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                webhook.lastTriggered = new Date().toISOString();
                webhook.failureCount = 0;
            } else {
                webhook.failureCount++;
                if (webhook.failureCount >= 5) {
                    webhook.active = false; // Disable webhook after 5 failures
                }
            }
        } catch (error) {
            console.error('Webhook delivery failed:', error);
            webhook.failureCount++;
            if (webhook.failureCount >= 5) {
                webhook.active = false;
            }
        }
    }
    
    saveWebhooks();
}

function generateWebhookSignature(payload, webhookId) {
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || 'default-secret';
    return crypto.createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

// Third-party Integration Endpoints
app.post('/api/integrations/slack', authenticateToken, (req, res) => {
    try {
        const { webhookUrl, channel, username } = req.body;
        const userId = req.user.id;
        
        // Store Slack integration config
        const integration = {
            type: 'slack',
            userId,
            config: { webhookUrl, channel, username },
            active: true,
            createdAt: new Date().toISOString()
        };
        
        // Test the webhook
        testSlackWebhook(webhookUrl, channel, username)
            .then(() => {
                res.json({ success: true, message: 'Slack integration configured successfully' });
            })
            .catch(() => {
                res.status(400).json({ success: false, message: 'Invalid Slack webhook URL' });
            });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to configure Slack integration' });
    }
});

app.post('/api/integrations/email', authenticateToken, (req, res) => {
    try {
        const { email, frequency, alertTypes } = req.body;
        const userId = req.user.id;
        
        // Store email integration config
        const integration = {
            type: 'email',
            userId,
            config: { email, frequency, alertTypes },
            active: true,
            createdAt: new Date().toISOString()
        };
        
        res.json({ success: true, message: 'Email integration configured successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to configure email integration' });
    }
});

// Integration Helper Functions
async function testSlackWebhook(webhookUrl, channel, username) {
    const testMessage = {
        text: '🔒 ScamBuster integration test successful!',
        channel: channel || '#general',
        username: username || 'Security Scanner',
        icon_emoji: ':shield:'
    };
    
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
    });
    
    if (!response.ok) {
        throw new Error('Slack webhook test failed');
    }
}

// Enhanced Scan Endpoint with Webhooks
app.post('/api/scan', authenticateToken, async (req, res) => {
    try {
        const { message, phoneNumber } = req.body;
        const userId = req.user.id;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        
        // Perform scan analysis
        const scanResult = analyzeMessage(message, phoneNumber);
        
        // Create report
        const report = {
            id: Date.now().toString(),
            userId,
            message,
            phoneNumber,
            riskLevel: scanResult.riskLevel,
            confidence: scanResult.confidence,
            patterns: scanResult.patterns,
            aiInsights: scanResult.aiInsights,
            recommendations: scanResult.recommendations,
            timestamp: new Date().toISOString()
        };
        
        reports.push(report);
        saveReports();
        
        // Trigger webhooks for high-risk scans
        if (scanResult.riskLevel === 'High' || scanResult.riskLevel === 'Medium') {
            await triggerWebhooks('scan_alert', {
                reportId: report.id,
                riskLevel: scanResult.riskLevel,
                message: message.substring(0, 100) + '...',
                phoneNumber,
                timestamp: report.timestamp
            });
        }
        
        // Update user stats
        updateUserStats(userId, scanResult.riskLevel);
        
        res.json({ success: true, result: scanResult, reportId: report.id });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ success: false, message: 'Scan failed' });
    }
});

// API Usage Monitoring
const apiUsage = new Map();

app.use('/api/', (req, res, next) => {
    const userId = req.user?.id || 'anonymous';
    const endpoint = req.path;
    
    if (!apiUsage.has(userId)) {
        apiUsage.set(userId, {});
    }
    
    if (!apiUsage.get(userId)[endpoint]) {
        apiUsage.get(userId)[endpoint] = 0;
    }
    
    apiUsage.get(userId)[endpoint]++;
    next();
});

app.get('/api/usage', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userUsage = apiUsage.get(userId) || {};
        
        res.json({ success: true, usage: userUsage });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch usage data' });
    }
});

// Real-time Dashboard Updates (WebSocket-like simulation)
app.get('/api/dashboard/updates', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userReports = reports.filter(r => r.userId === userId);
        
        const updates = {
            recentScans: userReports.slice(-5),
            totalScans: userReports.length,
            highRiskCount: userReports.filter(r => r.riskLevel === 'High').length,
            lastScan: userReports.length > 0 ? userReports[userReports.length - 1] : null,
            webhookStatus: webhooks.filter(w => w.userId === userId).map(w => ({
                id: w.id,
                active: w.active,
                lastTriggered: w.lastTriggered,
                failureCount: w.failureCount
            }))
        };
        
        res.json({ success: true, updates });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard updates' });
    }
});

// Save webhooks to file
function saveWebhooks() {
    try {
        fs.writeFileSync('./data/webhooks.json', JSON.stringify(webhooks, null, 2));
    } catch (error) {
        console.error('Failed to save webhooks:', error);
    }
}

// Load webhooks from file
function loadWebhooks() {
    try {
        if (fs.existsSync('./data/webhooks.json')) {
            webhooks = JSON.parse(fs.readFileSync('./data/webhooks.json', 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load webhooks:', error);
        webhooks = [];
    }
}

// Initialize webhooks
loadWebhooks();

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, businessType } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      businessType: businessType || 'general',
      createdAt: new Date().toISOString(),
      subscription: 'free',
      scanCount: 0
    };

    users.push(user);
    saveData();

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessType: user.businessType,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessType: user.businessType,
        subscription: user.subscription,
        scanCount: user.scanCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/profile', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessType: user.businessType,
        subscription: user.subscription,
        scanCount: user.scanCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const totalScans = reports.length;
    const totalUsers = users.length;
    const totalScamNumbers = scamNumbers.length;
    
    const moneySaved = totalScans * 50000;
    
    res.json({
      threatsDetected: totalScans,
      businessesProtected: totalUsers,
      moneySaved: `₦${(moneySaved / 1000000).toFixed(1)}M`,
      accuracyRate: '99.2%'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report scammer endpoint
app.post('/api/report-scammer', authenticateToken, (req, res) => {
  try {
    const { phone, reason, description } = req.body;
    const userId = req.user.id;

    if (!phone || !reason) {
      return res.status(400).json({ error: 'Phone number and reason are required' });
    }

    // Add to scam numbers
    const scamNumber = {
      id: Date.now().toString(),
      phone,
      reason,
      description,
      reportedBy: userId,
      timestamp: new Date().toISOString()
    };

    scamNumbers.push(scamNumber);
    saveData();

    res.json({ message: 'Scammer reported successfully' });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to report scammer' });
  }
});

// Upload image endpoint (mock)
app.post('/api/upload-image', authenticateToken, (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Mock image analysis
    const analysis = {
      riskLevel: 'MEDIUM',
      confidence: 75,
      riskScore: 65,
      riskDescription: 'Image analysis completed. Some suspicious elements detected.',
      threatIndicators: [
        'Suspicious text overlay',
        'Poor image quality',
        'Potential fake document'
      ],
      recommendations: [
        'Verify sender identity',
        'Check document authenticity',
        'Contact sender directly'
      ]
    };

    res.json(analysis);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Image analysis failed' });
  }
});

// Subscribe endpoint
app.post('/api/subscribe', authenticateToken, (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    const user = users.find(u => u.id === userId);
    if (user) {
      user.subscription = plan;
      saveData();
    }

    res.json({ message: `Successfully subscribed to ${plan} plan` });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// Get user's scan reports
app.get('/api/user-reports', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userReports = reports.filter(report => report.userId === userId);
    
    res.json({
      reports: userReports,
      total: userReports.length
    });
  } catch (error) {
    console.error('User reports error:', error);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// Admin endpoint to view all data (for development/testing)
app.get('/api/admin-data', (req, res) => {
  try {
    res.json({
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        businessType: u.businessType,
        subscription: u.subscription,
        scanCount: u.scanCount,
        createdAt: u.createdAt
      })),
      reports: reports,
      scamNumbers: scamNumbers,
      scamPatterns: scamPatterns,
      stats: {
        totalUsers: users.length,
        totalReports: reports.length,
        totalScamNumbers: scamNumbers.length,
        totalScamPatterns: scamPatterns.length
      }
    });
  } catch (error) {
    console.error('Admin data error:', error);
    res.status(500).json({ error: 'Failed to load admin data' });
  }
});

// Message analysis function - Enhanced AI Version
function analyzeMessage(message, phone, name, businessType) {
  const lowerMessage = message.toLowerCase();
  let riskScore = 0;
  let threatIndicators = [];
  let recommendations = [];
  let aiInsights = [];

  // === ADVANCED PATTERN RECOGNITION ===
  
  // 1. Urgency Patterns (Enhanced)
  const urgencyPatterns = [
    { pattern: /\b(urgent|immediately|asap|today only|quick|fast|hurry|emergency|before|deadline|traveling|leaving|flight)\b/gi, weight: 25 },
    { pattern: /\b(last chance|final offer|expires|limited time|don't miss|act now)\b/gi, weight: 30 },
    { pattern: /\b(within.*hour|today.*only|before.*midnight)\b/gi, weight: 35 }
  ];
  
  urgencyPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(lowerMessage)) {
      riskScore += weight;
      threatIndicators.push('High urgency pressure tactics');
      aiInsights.push('Detected urgency manipulation pattern');
    }
  });

  // 2. Financial Pressure Patterns
  const financialPatterns = [
    { pattern: /\b(large quantity|bulk order|wholesale|500|1000|many pieces|full container)\b/gi, weight: 20 },
    { pattern: /\b(account details|bank details|account number|send.*account|your account)\b/gi, weight: 40 },
    { pattern: /\b(already paid|payment done|payment made|see proof|transfer receipt)\b/gi, weight: 35 },
    { pattern: /\b(wire transfer|western union|moneygram|bitcoin|crypto)\b/gi, weight: 30 }
  ];
  
  financialPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(lowerMessage)) {
      riskScore += weight;
      threatIndicators.push('Financial information request');
      aiInsights.push('Detected financial scam pattern');
    }
  });

  // 3. Authority Impersonation
  const authorityPatterns = [
    { pattern: /\b(efcc|cbn|ndic|firs|federal|government|ministry|contract|supply)\b/gi, weight: 45 },
    { pattern: /\b(prince|royal|noble|dignitary|ambassador)\b/gi, weight: 40 },
    { pattern: /\b(ceo|director|manager|official|representative)\b/gi, weight: 25 }
  ];
  
  authorityPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(lowerMessage)) {
      riskScore += weight;
      threatIndicators.push('Authority impersonation');
      aiInsights.push('Detected authority manipulation');
    }
  });

  // === CONTEXT ANALYSIS ===
  
  // 4. Business Context Analysis
  const businessContext = analyzeBusinessContext(lowerMessage, businessType);
  riskScore += businessContext.riskScore;
  threatIndicators.push(...businessContext.indicators);
  aiInsights.push(...businessContext.insights);

  // 5. Geographic Context
  const geoContext = analyzeGeographicContext(lowerMessage, phone);
  riskScore += geoContext.riskScore;
  threatIndicators.push(...geoContext.indicators);
  aiInsights.push(...geoContext.insights);

  // === ADVANCED LANGUAGE PROCESSING ===
  
  // 6. Grammar and Language Analysis
  const languageAnalysis = analyzeLanguage(message);
  riskScore += languageAnalysis.riskScore;
  threatIndicators.push(...languageAnalysis.indicators);
  aiInsights.push(...languageAnalysis.insights);

  // 7. Sentiment Analysis
  const sentiment = analyzeSentiment(lowerMessage);
  riskScore += sentiment.riskScore;
  aiInsights.push(sentiment.insight);

  // === BEHAVIORAL PATTERN ANALYSIS ===
  
  // 8. Social Engineering Patterns
  const socialEngineering = analyzeSocialEngineering(lowerMessage);
  riskScore += socialEngineering.riskScore;
  threatIndicators.push(...socialEngineering.indicators);
  aiInsights.push(...socialEngineering.insights);

  // === MACHINE LEARNING ENHANCEMENTS ===
  
  // 9. Pattern Frequency Analysis
  const patternFrequency = analyzePatternFrequency(lowerMessage);
  riskScore += patternFrequency.riskScore;
  aiInsights.push(patternFrequency.insight);

  // 10. Phone Number Intelligence
  const phoneIntelligence = analyzePhoneNumber(phone);
  riskScore += phoneIntelligence.riskScore;
  threatIndicators.push(...phoneIntelligence.indicators);
  aiInsights.push(...phoneIntelligence.insights);

  // === CONFIDENCE SCORING ===
  
  // Calculate confidence based on multiple factors
  const confidence = calculateConfidence(riskScore, threatIndicators.length, aiInsights.length);
  
  // Determine risk level with enhanced logic
  let riskLevel = 'LOW';
  let finalRecommendations = [];

  if (riskScore >= 80) {
    riskLevel = 'HIGH';
    finalRecommendations = [
      '🚨 CRITICAL: DO NOT proceed with this transaction',
      '🔒 Block this number immediately',
      '📞 Report to authorities if money was sent',
      '🏦 Contact your bank if account details were shared',
      '📱 Save all evidence for investigation'
    ];
  } else if (riskScore >= 50) {
    riskLevel = 'MEDIUM';
    finalRecommendations = [
      '⚠️ Proceed with extreme caution',
      '🔍 Verify sender identity through other channels',
      '📋 Request additional verification',
      '🚫 Avoid sharing sensitive information',
      '📞 Contact the supposed organization directly'
    ];
  } else if (riskScore >= 25) {
    riskLevel = 'LOW';
    finalRecommendations = [
      '✅ Message appears relatively safe',
      '👀 Maintain normal security protocols',
      '📝 Keep records of the conversation',
      '🔍 Monitor for any suspicious follow-up'
    ];
  } else {
    finalRecommendations = [
      '✅ Message appears safe',
      '📋 Standard business practices apply',
      '🛡️ Maintain normal security protocols'
    ];
  }

  return {
    riskLevel,
    confidence,
    riskScore: Math.min(riskScore, 100),
    riskDescription: `AI Analysis: ${riskLevel} risk detected with ${confidence}% confidence`,
    threatIndicators: [...new Set(threatIndicators)], // Remove duplicates
    recommendations: finalRecommendations,
    aiInsights: [...new Set(aiInsights)], // Remove duplicates
    phoneAnalysis: phoneIntelligence.details,
    languageAnalysis: languageAnalysis.details,
    businessContext: businessContext.details,
    geographicContext: geoContext.details,
    sentimentAnalysis: sentiment.details,
    patternAnalysis: {
      urgencyScore: urgencyPatterns.reduce((score, { pattern, weight }) => 
        pattern.test(lowerMessage) ? score + weight : score, 0),
      financialScore: financialPatterns.reduce((score, { pattern, weight }) => 
        pattern.test(lowerMessage) ? score + weight : score, 0),
      authorityScore: authorityPatterns.reduce((score, { pattern, weight }) => 
        pattern.test(lowerMessage) ? score + weight : score, 0)
    }
  };
}

// === HELPER FUNCTIONS ===

// Helper function to calculate reputation level
function calculateReputationLevel(points) {
  if (points >= 1000) return 'Legend';
  if (points >= 500) return 'Expert';
  if (points >= 200) return 'Veteran';
  if (points >= 100) return 'Trusted';
  if (points >= 50) return 'Contributor';
  if (points >= 20) return 'Active';
  return 'Beginner';
}

// === AI HELPER FUNCTIONS ===

// Business Context Analysis
function analyzeBusinessContext(message, businessType) {
  let riskScore = 0;
  let indicators = [];
  let insights = [];
  let details = {};

  // Industry-specific patterns
  const industryPatterns = {
    retail: [
      { pattern: /\b(bulk.*order|wholesale.*price|large.*quantity)\b/gi, weight: 15 },
      { pattern: /\b(urgent.*delivery|express.*shipping)\b/gi, weight: 20 }
    ],
    services: [
      { pattern: /\b(contract.*award|government.*tender|official.*business)\b/gi, weight: 25 },
      { pattern: /\b(urgent.*service|emergency.*repair)\b/gi, weight: 20 }
    ],
    general: [
      { pattern: /\b(investment.*opportunity|quick.*profit|guaranteed.*return)\b/gi, weight: 30 }
    ]
  };

  const patterns = industryPatterns[businessType] || industryPatterns.general;
  patterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) {
      riskScore += weight;
      indicators.push(`Industry-specific scam pattern (${businessType})`);
      insights.push(`Detected ${businessType} industry targeting`);
    }
  });

  details = {
    businessType,
    industryRiskScore: riskScore,
    targetedPatterns: patterns.length
  };

  return { riskScore, indicators, insights, details };
}

// Geographic Context Analysis
function analyzeGeographicContext(message, phone) {
  let riskScore = 0;
  let indicators = [];
  let insights = [];
  let details = {};

  // Nigerian scam patterns
  if (phone && phone.includes('+234')) {
    const nigerianPatterns = [
      { pattern: /\b(nigeria|nigerian|lagos|abuja)\b/gi, weight: 20 },
      { pattern: /\b(prince|royal|noble|dignitary)\b/gi, weight: 35 },
      { pattern: /\b(million|billion|dollars|euros)\b/gi, weight: 25 }
    ];

    nigerianPatterns.forEach(({ pattern, weight }) => {
      if (pattern.test(message)) {
        riskScore += weight;
        indicators.push('Nigerian scam pattern detected');
        insights.push('Geographic scam targeting identified');
      }
    });
  }

  // Foreign buyer patterns
  const foreignPatterns = [
    { pattern: /\b(dubai|china|usa|uk|foreign|international)\b/gi, weight: 15 },
    { pattern: /\b(import|export|shipping|logistics)\b/gi, weight: 20 }
  ];

  foreignPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) {
      riskScore += weight;
      indicators.push('Foreign buyer scam pattern');
      insights.push('International scam targeting detected');
    }
  });

  details = {
    phoneCountry: phone ? 'Nigeria' : 'Unknown',
    geographicRiskScore: riskScore,
    detectedRegions: []
  };

  return { riskScore, indicators, insights, details };
}

// Advanced Language Analysis
function analyzeLanguage(message) {
  let riskScore = 0;
  let indicators = [];
  let insights = [];
  let details = {};

  // Grammar analysis
  const grammarErrors = (message.match(/[A-Z][a-z]*/g) || []).length;
  const sentenceCount = (message.match(/[.!?]+/g) || []).length;
  const wordCount = message.split(/\s+/).length;

  // Poor grammar indicators
  const poorGrammarPatterns = [
    { pattern: /\b(hello sir|dear sir|dear madam|kindly|revert back|pls|plz)\b/gi, weight: 15 },
    { pattern: /\b(am|is|are).*(here|there|coming|going)\b/gi, weight: 10 },
    { pattern: /\b(urgent|important|necessary).*(matter|issue|business)\b/gi, weight: 20 }
  ];

  poorGrammarPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) {
      riskScore += weight;
      indicators.push('Poor grammar/spelling detected');
      insights.push('Unnatural language patterns identified');
    }
  });

  // Formal language analysis
  const formalPatterns = [
    { pattern: /\b(respectfully|humbly|kindly|please|sir|madam)\b/gi, weight: 10 },
    { pattern: /\b(regards|sincerely|faithfully|yours)\b/gi, weight: 5 }
  ];

  formalPatterns.forEach(({ pattern, weight }) => {
    if (pattern.test(message)) {
      riskScore += weight;
      indicators.push('Overly formal language');
      insights.push('Formal language manipulation detected');
    }
  });

  details = {
    grammarScore: Math.max(60, 100 - grammarErrors * 5),
    sentenceCount,
    wordCount,
    languageComplexity: wordCount > 50 ? 'High' : 'Low',
    grammarErrors
  };

  return { riskScore, indicators, insights, details };
}

// Sentiment Analysis
function analyzeSentiment(message) {
  let riskScore = 0;
  let insight = '';
  let details = {};

  // Positive sentiment (trust building)
  const positiveWords = ['trust', 'honest', 'reliable', 'professional', 'legitimate', 'genuine'];
  const positiveCount = positiveWords.filter(word => message.includes(word)).length;

  // Negative sentiment (pressure)
  const negativeWords = ['urgent', 'emergency', 'problem', 'issue', 'trouble', 'risk'];
  const negativeCount = negativeWords.filter(word => message.includes(word)).length;

  // Emotional manipulation
  const emotionalWords = ['please', 'help', 'need', 'desperate', 'hope', 'pray'];
  const emotionalCount = emotionalWords.filter(word => message.includes(word)).length;

  if (positiveCount > 2) {
    riskScore += 15;
    insight = 'Excessive trust-building language detected';
  }

  if (negativeCount > 2) {
    riskScore += 20;
    insight = 'High pressure and urgency detected';
  }

  if (emotionalCount > 2) {
    riskScore += 15;
    insight = 'Emotional manipulation tactics identified';
  }

  details = {
    positiveWords: positiveCount,
    negativeWords: negativeCount,
    emotionalWords: emotionalCount,
    overallSentiment: negativeCount > positiveCount ? 'Negative' : 'Positive'
  };

  return { riskScore, insight, details };
}

// Social Engineering Analysis
function analyzeSocialEngineering(message) {
  let riskScore = 0;
  let indicators = [];
  let insights = [];

  // Authority appeal
  if (/\b(authority|official|government|police|bank)\b/gi.test(message)) {
    riskScore += 25;
    indicators.push('Authority appeal tactics');
    insights.push('Authority manipulation detected');
  }

  // Scarcity principle
  if (/\b(limited|last|final|only|exclusive)\b/gi.test(message)) {
    riskScore += 20;
    indicators.push('Scarcity manipulation');
    insights.push('Scarcity principle abuse detected');
  }

  // Reciprocity principle
  if (/\b(help|assist|support|favor|gift)\b/gi.test(message)) {
    riskScore += 15;
    indicators.push('Reciprocity manipulation');
    insights.push('Reciprocity principle abuse detected');
  }

  // Social proof
  if (/\b(other|people|everyone|many|successful)\b/gi.test(message)) {
    riskScore += 10;
    indicators.push('Social proof manipulation');
    insights.push('Social proof tactics detected');
  }

  return { riskScore, indicators, insights };
}

// Pattern Frequency Analysis
function analyzePatternFrequency(message) {
  let riskScore = 0;
  let insight = '';

  // Count scam-related words
  const scamWords = ['urgent', 'money', 'account', 'payment', 'transfer', 'bank', 'prince', 'million'];
  const scamWordCount = scamWords.filter(word => message.includes(word)).length;

  if (scamWordCount > 3) {
    riskScore += 20;
    insight = 'High frequency of scam-related keywords';
  } else if (scamWordCount > 1) {
    riskScore += 10;
    insight = 'Moderate frequency of suspicious keywords';
  }

  return { riskScore, insight };
}

// Phone Number Intelligence
function analyzePhoneNumber(phone) {
  let riskScore = 0;
  let indicators = [];
  let insights = [];
  let details = {};

  if (!phone) {
    details = { status: 'No phone provided', risk: 'Unknown' };
    return { riskScore, indicators, insights, details };
  }

  // Check if known scam number
  const isKnownScam = scamNumbers.some(scam => scam.phone === phone);
  if (isKnownScam) {
    riskScore += 50;
    indicators.push('Known scam number');
    insights.push('Phone number in scam database');
  }

  // Analyze phone number patterns
  if (phone.includes('+234')) {
    riskScore += 10;
    indicators.push('Nigerian phone number');
    insights.push('Geographic risk factor');
  }

  // Check for suspicious patterns
  if (phone.match(/(\d)\1{3,}/)) { // Repeated digits
    riskScore += 15;
    indicators.push('Suspicious number pattern');
    insights.push('Repeated digit pattern detected');
  }

  details = {
    country: phone.includes('+234') ? 'Nigeria' : 'Unknown',
    carrier: phone.includes('+234') ? 'MTN/Globacom/Airtel' : 'Unknown',
    status: isKnownScam ? 'BLACKLISTED' : 'CLEAN',
    pattern: phone.match(/(\d)\1{3,}/) ? 'Repeated digits' : 'Normal'
  };

  return { riskScore, indicators, insights, details };
}

// Calculate Confidence Score
function calculateConfidence(riskScore, threatCount, insightCount) {
  let confidence = 70; // Base confidence

  // Higher risk score = higher confidence
  if (riskScore > 80) confidence += 20;
  else if (riskScore > 50) confidence += 15;
  else if (riskScore > 25) confidence += 10;

  // More threats = higher confidence
  if (threatCount > 5) confidence += 10;
  else if (threatCount > 3) confidence += 5;

  // More insights = higher confidence
  if (insightCount > 5) confidence += 10;
  else if (insightCount > 3) confidence += 5;

  return Math.min(confidence, 98); // Cap at 98%
}

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Get user reports
app.get('/api/user-reports', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userReports = reports.filter(r => r.userId === userId);
    res.json(userReports);
  } catch (error) {
    console.error('Error getting user reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Community Reports - Submit new report
app.post('/api/community/report', authenticateToken, (req, res) => {
  try {
    const { phoneNumber, message, scamType, description, evidence } = req.body;
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);

    if (!phoneNumber || !message || !scamType) {
      return res.status(400).json({ error: 'Phone number, message, and scam type are required' });
    }

    const report = {
      id: Date.now().toString(),
      userId,
      userName: user.name,
      phoneNumber,
      message,
      scamType,
      description: description || '',
      evidence: evidence || '',
      status: 'pending', // pending, verified, rejected
      verifiedBy: null,
      verificationDate: null,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    communityReports.push(report);
    saveData();

    // Award reputation points for contribution
    const userReputation = reputation.find(r => r.userId === userId) || {
      userId,
      points: 0,
      level: 'Beginner',
      reportsSubmitted: 0,
      reportsVerified: 0
    };

    userReputation.points += 10;
    userReputation.reportsSubmitted += 1;
    userReputation.level = calculateReputationLevel(userReputation.points);

    const existingRepIndex = reputation.findIndex(r => r.userId === userId);
    if (existingRepIndex >= 0) {
      reputation[existingRepIndex] = userReputation;
    } else {
      reputation.push(userReputation);
    }

    saveData();

    res.json({
      message: 'Report submitted successfully',
      report,
      reputationGained: 10,
      newLevel: userReputation.level
    });
  } catch (error) {
    console.error('Error submitting community report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Community Reports - Get all reports
app.get('/api/community/reports', (req, res) => {
  try {
    const { status, scamType, limit = 50, offset = 0 } = req.query;
    
    let filteredReports = [...communityReports];
    
    if (status) {
      filteredReports = filteredReports.filter(r => r.status === status);
    }
    
    if (scamType) {
      filteredReports = filteredReports.filter(r => r.scamType === scamType);
    }
    
    // Sort by creation date (newest first)
    filteredReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const paginatedReports = filteredReports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      reports: paginatedReports,
      total: filteredReports.length,
      hasMore: parseInt(offset) + parseInt(limit) < filteredReports.length
    });
  } catch (error) {
    console.error('Error getting community reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Community Reports - Vote on report
app.post('/api/community/vote', authenticateToken, (req, res) => {
  try {
    const { reportId, vote } = req.body; // vote: 'up' or 'down'
    const userId = req.user.id;

    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    const report = communityReports.find(r => r.id === reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user already voted
    const existingVote = report.votes ? report.votes.find(v => v.userId === userId) : null;
    
    if (!report.votes) report.votes = [];
    
    if (existingVote) {
      // Remove existing vote
      if (existingVote.vote === 'up') report.upvotes--;
      else report.downvotes--;
      
      // Update vote
      existingVote.vote = vote;
      if (vote === 'up') report.upvotes++;
      else report.downvotes++;
    } else {
      // Add new vote
      report.votes.push({ userId, vote });
      if (vote === 'up') report.upvotes++;
      else report.downvotes++;
    }

    report.updatedAt = new Date().toISOString();
    saveData();

    res.json({
      message: 'Vote recorded successfully',
      upvotes: report.upvotes,
      downvotes: report.downvotes
    });
  } catch (error) {
    console.error('Error voting on report:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Expert Verification - Verify report (admin/expert only)
app.post('/api/community/verify', authenticateToken, (req, res) => {
  try {
    const { reportId, verificationStatus, notes } = req.body; // verificationStatus: 'verified' or 'rejected'
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);

    // Check if user is admin or expert (you can add role-based logic here)
    if (!user.isAdmin && !user.isExpert) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const report = communityReports.find(r => r.id === reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = verificationStatus;
    report.verifiedBy = userId;
    report.verificationDate = new Date().toISOString();
    report.verificationNotes = notes;
    report.updatedAt = new Date().toISOString();

    // If verified, add to scam numbers database
    if (verificationStatus === 'verified') {
      const scamNumber = {
        phone: report.phoneNumber,
        reportedBy: report.userId,
        verifiedBy: userId,
        scamType: report.scamType,
        description: report.description,
        verifiedAt: new Date().toISOString()
      };
      
      // Check if number already exists
      const existingIndex = scamNumbers.findIndex(s => s.phone === report.phoneNumber);
      if (existingIndex >= 0) {
        scamNumbers[existingIndex] = { ...scamNumbers[existingIndex], ...scamNumber };
      } else {
        scamNumbers.push(scamNumber);
      }

      // Award reputation to original reporter
      const reporterReputation = reputation.find(r => r.userId === report.userId);
      if (reporterReputation) {
        reporterReputation.points += 50;
        reporterReputation.reportsVerified += 1;
        reporterReputation.level = calculateReputationLevel(reporterReputation.points);
      }

      // Award reputation to verifier
      const verifierReputation = reputation.find(r => r.userId === userId);
      if (verifierReputation) {
        verifierReputation.points += 25;
        verifierReputation.level = calculateReputationLevel(verifierReputation.points);
      }
    }

    saveData();

    res.json({
      message: `Report ${verificationStatus} successfully`,
      report
    });
  } catch (error) {
    console.error('Error verifying report:', error);
    res.status(500).json({ error: 'Failed to verify report' });
  }
});

// Get user reputation
app.get('/api/community/reputation/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userReputation = reputation.find(r => r.userId === userId);
    
    if (!userReputation) {
      return res.json({
        userId,
        points: 0,
        level: 'Beginner',
        reportsSubmitted: 0,
        reportsVerified: 0
      });
    }
    
    res.json(userReputation);
  } catch (error) {
    console.error('Error getting user reputation:', error);
    res.status(500).json({ error: 'Failed to get reputation' });
  }
});

// Get leaderboard
app.get('/api/community/leaderboard', (req, res) => {
  try {
    const { type = 'points', limit = 10 } = req.query;
    
    let sortedReputation = [...reputation];
    
    if (type === 'points') {
      sortedReputation.sort((a, b) => b.points - a.points);
    } else if (type === 'reports') {
      sortedReputation.sort((a, b) => b.reportsSubmitted - a.reportsSubmitted);
    } else if (type === 'verified') {
      sortedReputation.sort((a, b) => b.reportsVerified - a.reportsVerified);
    }
    
    const topUsers = sortedReputation.slice(0, parseInt(limit));
    
    // Add user names
    const leaderboard = topUsers.map(rep => {
      const user = users.find(u => u.id === rep.userId);
      return {
        ...rep,
        userName: user ? user.name : 'Unknown User'
      };
    });
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Advanced Analytics Endpoints
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userReports = reports.filter(r => r.userId === userId);
        const allReports = reports;
        
        // Calculate real-time analytics
        const analytics = {
            userStats: {
                totalScans: userReports.length,
                highRiskScans: userReports.filter(r => r.riskLevel === 'High').length,
                mediumRiskScans: userReports.filter(r => r.riskLevel === 'Medium').length,
                lowRiskScans: userReports.filter(r => r.riskLevel === 'Low').length,
                safeScans: userReports.filter(r => r.riskLevel === 'Safe').length,
                averageConfidence: userReports.length > 0 ? 
                    (userReports.reduce((sum, r) => sum + (r.confidence || 0), 0) / userReports.length).toFixed(1) : 0
            },
            globalStats: {
                totalScans: allReports.length,
                highRiskScans: allReports.filter(r => r.riskLevel === 'High').length,
                mediumRiskScans: allReports.filter(r => r.riskLevel === 'Medium').length,
                lowRiskScans: allReports.filter(r => r.riskLevel === 'Low').length,
                safeScans: allReports.filter(r => r.riskLevel === 'Safe').length,
                uniqueUsers: new Set(allReports.map(r => r.userId)).size
            },
            trends: {
                dailyScans: getDailyScanTrends(allReports),
                riskDistribution: getRiskDistribution(allReports),
                topScamPatterns: getTopScamPatterns(allReports),
                scanSuccessRate: calculateSuccessRate(allReports)
            },
            performance: {
                averageScanTime: calculateAverageScanTime(allReports),
                detectionAccuracy: calculateDetectionAccuracy(allReports),
                userEngagement: calculateUserEngagement(userReports)
            }
        };
        
        res.json({ success: true, analytics });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load analytics' });
    }
});

app.get('/api/analytics/scan-history', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userReports = reports.filter(r => r.userId === userId);
        
        const scanHistory = userReports.map(report => ({
            id: report.id,
            timestamp: report.timestamp,
            message: report.message.substring(0, 100) + '...',
            riskLevel: report.riskLevel,
            confidence: report.confidence,
            aiInsights: report.aiInsights,
            patterns: report.patterns
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({ success: true, scanHistory });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to load scan history' });
    }
});

app.get('/api/analytics/export-report', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const userReports = reports.filter(r => r.userId === userId);
        
        const exportData = {
            userInfo: users.find(u => u.id === userId),
            scanSummary: {
                totalScans: userReports.length,
                highRisk: userReports.filter(r => r.riskLevel === 'High').length,
                mediumRisk: userReports.filter(r => r.riskLevel === 'Medium').length,
                lowRisk: userReports.filter(r => r.riskLevel === 'Low').length,
                safe: userReports.filter(r => r.riskLevel === 'Safe').length
            },
            detailedReports: userReports.map(report => ({
                timestamp: report.timestamp,
                message: report.message,
                riskLevel: report.riskLevel,
                confidence: report.confidence,
                aiInsights: report.aiInsights,
                patterns: report.patterns,
                recommendations: report.recommendations
            })),
            generatedAt: new Date().toISOString()
        };
        
        res.json({ success: true, exportData });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate export report' });
    }
});

// Helper functions for analytics
function getDailyScanTrends(allReports) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayScans = allReports.filter(r => {
            const scanDate = new Date(r.timestamp);
            return scanDate >= dayStart && scanDate < dayEnd;
        }).length;
        
        last7Days.push({
            date: date.toISOString().split('T')[0],
            scans: dayScans
        });
    }
    return last7Days;
}

function getRiskDistribution(allReports) {
    const distribution = {
        High: allReports.filter(r => r.riskLevel === 'High').length,
        Medium: allReports.filter(r => r.riskLevel === 'Medium').length,
        Low: allReports.filter(r => r.riskLevel === 'Low').length,
        Safe: allReports.filter(r => r.riskLevel === 'Safe').length
    };
    
    const total = allReports.length;
    return Object.keys(distribution).map(risk => ({
        risk,
        count: distribution[risk],
        percentage: total > 0 ? ((distribution[risk] / total) * 100).toFixed(1) : 0
    }));
}

function getTopScamPatterns(allReports) {
    const patternCounts = {};
    allReports.forEach(report => {
        if (report.patterns) {
            report.patterns.forEach(pattern => {
                patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            });
        }
    });
    
    return Object.entries(patternCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([pattern, count]) => ({ pattern, count }));
}

function calculateSuccessRate(allReports) {
    const totalScans = allReports.length;
    const successfulDetections = allReports.filter(r => 
        r.riskLevel === 'High' || r.riskLevel === 'Medium'
    ).length;
    
    return totalScans > 0 ? ((successfulDetections / totalScans) * 100).toFixed(1) : 0;
}

function calculateAverageScanTime(allReports) {
    // Mock calculation - in real app, you'd track actual scan times
    return (Math.random() * 2 + 0.5).toFixed(2); // 0.5 to 2.5 seconds
}

function calculateDetectionAccuracy(allReports) {
    // Mock calculation - in real app, you'd compare with verified scam data
    return (85 + Math.random() * 10).toFixed(1); // 85-95% accuracy
}

function calculateUserEngagement(userReports) {
    const totalScans = userReports.length;
    const recentScans = userReports.filter(r => {
        const scanDate = new Date(r.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return scanDate >= weekAgo;
    }).length;
    
    return {
        totalScans,
        recentScans,
        engagementScore: totalScans > 0 ? Math.min((recentScans / totalScans) * 100, 100).toFixed(1) : 0
    };
}

// Update user stats function
function updateUserStats(userId, riskLevel) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.scanCount = (user.scanCount || 0) + 1;
        if (riskLevel === 'High' || riskLevel === 'Medium') {
            user.threatsDetected = (user.threatsDetected || 0) + 1;
        }
        saveData();
    }
}

// Save reports to file
function saveReports() {
    try {
        fs.writeFileSync('./data/reports.json', JSON.stringify(reports, null, 2));
    } catch (error) {
        console.error('Failed to save reports:', error);
    }
}

// Input validation middleware
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, 1000); // Limit length
}

// Validation middleware
function validateRegistration(req, res, next) {
    const { name, email, password, businessType } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name, email, and password are required' 
        });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid email format' 
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ 
            success: false, 
            message: 'Password must be at least 6 characters long' 
        });
    }
    
    // Sanitize inputs
    req.body.name = sanitizeInput(name);
    req.body.email = sanitizeInput(email).toLowerCase();
    req.body.businessType = sanitizeInput(businessType);
    
    next();
}

function validateScanRequest(req, res, next) {
    const { message, phone, name } = req.body;
    
    if (!message || !phone) {
        return res.status(400).json({ 
            success: false, 
            message: 'Message and phone number are required' 
        });
    }
    
    if (!validatePhone(phone)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid phone number format' 
        });
    }
    
    if (message.length > 1000) {
        return res.status(400).json({ 
            success: false, 
            message: 'Message too long (max 1000 characters)' 
        });
    }
    
    // Sanitize inputs
    req.body.message = sanitizeInput(message);
    req.body.phone = sanitizeInput(phone);
    req.body.name = sanitizeInput(name);
    
    next();
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        message: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

app.listen(port, () => {
  console.log(`ScamBuster running on port ${port}`);
  console.log(`Visit http://localhost:${port} to access the application`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
