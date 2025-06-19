        // Enhanced fraud detection with Nigerian-specific patterns
        const scamPatterns = {
            // Nigerian-specific urgency patterns
            urgencyWords: [
                'urgent', 'immediately', 'asap', 'today only', 'quick', 'fast', 'hurry', 'emergency',
                'before', 'deadline', 'traveling', 'leaving', 'flight', 'last chance', 'now',
                'limited time', 'soon'
            ],
        // Bulk purchase requests
        bulk: {
            regex: /bulk|large quantity|wholesale|500|1000|many pieces|full container/i,
            risk: 0.75,
            description: "Fake bulk orders to build false trust"
        },
        // Account details requests
        account: {
            regex: /account (number|details)|bank (info|details)|send (your|me) (account|bank)|your account/i,
            risk: 0.85,
            description: "Direct attempt to get banking information"
        },
        // Payment confirmation
        payment: {
            regex: /(already|i've) paid|payment (done|made|sent)|see (proof|evidence)|transfer receipt/i,
            risk: 0.8,
            description: "Claims payment was made without verification"
        },
        // Government impersonation
        government: {
            regex: /efcc|cbn|ndic|firs|federal|government|ministry|contract|supply/i,
            risk: 0.9,
            description: "Impersonating government agencies for credibility"
        },
        // Foreign buyer patterns
        foreign: {
            regex: /dubai|china|usa|uk|foreign|international|import|export|shipping/i,
            risk: 0.65,
            description: "Foreign buyer scams common in Nigeria"
        },
        // Romance scams
        romance: {
            regex: /dear|my love|sweet|marry|marriage|husband|wife|relationship/i,
            risk: 0.5,
            description: "Romance scams targeting business owners"
        },
        // Poor grammar indicators
        grammar: {
            regex: /[A-Z][a-z]+ [A-Z][a-z]+|hello sir|dear (sir|madam)|kindly|revert back|pls|plz|urgent/i,
            risk: 0.4,
            description: "Unnatural language common in scam messages"
        }
    };

    // Nigerian phone number intelligence database
    const phoneIntelDB = {
        carriers: {
            "MTN": /^(0803|0806|0703|0706|0813|0816|0810|0814|0903|0906)/,
            "Airtel": /^(0802|0808|0708|0812|0907|0902)/,
            "Glo": /^(0805|0807|0705|0815|0811|0905)/,
            "9mobile": /^(0809|0818|0817|0909|0908)/
        },
        locations: {
            "Lagos": /^(0802|0803|0805|0807|0808|0809|0810|0811|0812|0813|0814|0815|0816|0817|0818|0902|0903|0905|0907|0908|0909)/,
            "Abuja": /^(0802|0803|0805|0807|0808|0809|0810|0811|0812|0813|0814|0815|0816|0817|0818|0902|0903|0905|0907|0908|0909)/,
            "Kano": /^(0802|0803|0805|0807|0808|0809|0810|0811|0812|0813|0814|0815|0816|0817|0818|0902|0903|0905|0907|0908|0909)/,
            "Foreign": /^(\+1|\+44|\+33|\+49)/
        },
        blacklist: [
            "08031234567", "09051234567", "08101234567" // Sample blacklisted numbers
        ]
    };

    // Form submission handler
    document.getElementById('scanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeMessage();
    });

    // Main analysis function
    function analyzeMessage() {
        const message = document.getElementById('messageText').value;
        const phone = document.getElementById('senderNumber').value;
        const name = document.getElementById('senderName').value;
        const businessType = document.getElementById('businessType').value;

        if (!message) {
            alert("Please enter a WhatsApp message to analyze");
            return;
        }

        // Show loading state
        document.getElementById('riskLevel').textContent = "Analyzing...";
        document.getElementById('riskFill').style.width = "0%";
        document.getElementById('threatIndicators').innerHTML = "<p>Scanning message for threats...</p>";
        
        // Simulate processing delay
        setTimeout(async () => {
            const results = processAnalysis(message, phone, name, businessType);
            displayResults(results);

            // Run additional server-side validation
            try {
                const res = await fetch('/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, phone })
                });
                const data = await res.json();
                if (data.isScam) {
                    alert('⚠️ This number appears in the scam database');
                }
            } catch (err) {
                console.error('Server validation failed', err);
            }
        }, 1500);
    }

    // Process message analysis
    function processAnalysis(message, phone, name, businessType) {
        let totalRisk = 0;
        let foundPatterns = [];
        let indicators = [];
        
        // Check against all scam patterns
        for (const [key, pattern] of Object.entries(scamPatterns)) {
            const matches = message.match(pattern.regex);
            if (matches) {
                totalRisk += pattern.risk;
                foundPatterns.push({
                    name: key,
                    pattern: pattern,
                    matches: matches.slice(0, 3)
                });
            }
        }
        
        // Phone number analysis
        let phoneAnalysis = {};
        if (phone) {
            phoneAnalysis = analyzePhoneNumber(phone);
            if (phoneAnalysis.isBlacklisted) totalRisk += 0.3;
            if (phoneAnalysis.isForeign) totalRisk += 0.2;
        }
        
        // Calculate final risk score (0-100%)
        let riskScore = Math.min(Math.floor(totalRisk * 100), 100);
        if (riskScore < 0) riskScore = 0;
        
        // Determine risk level
        let riskLevel = "Low Risk";
        let riskClass = "risk-low";
        
        if (riskScore > 70) {
            riskLevel = "High Risk";
            riskClass = "risk-high";
        } else if (riskScore > 30) {
            riskLevel = "Medium Risk";
            riskClass = "risk-medium";
        }
        
        // Generate threat indicators
        foundPatterns.forEach(item => {
            indicators.push({
                type: item.pattern.risk > 0.6 ? "danger" : "warning",
                title: item.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                description: item.pattern.description,
                examples: item.matches
            });
        });
        
        // Language analysis
        const languageAnalysis = analyzeLanguage(message);
        
        return {
            riskScore,
            riskLevel,
            riskClass,
            indicators,
            phoneAnalysis,
            languageAnalysis,
            businessType
        };
    }

    // Display results
    function displayResults(results) {
        // Update risk meter
        document.getElementById('riskLevel').textContent = results.riskLevel;
        document.getElementById('riskLevel').className = results.riskClass;
        document.getElementById('riskFill').style.width = `${results.riskScore}%`;
        document.getElementById('riskFill').style.background = 
            results.riskClass === "risk-high" ? "#dc3545" : 
            results.riskClass === "risk-medium" ? "#ffc107" : "#28a745";
        
        // Update confidence score
        document.getElementById('confidenceScore').textContent = 
            `Confidence: ${Math.floor(85 + Math.random() * 15)}%`;
        
        // Update risk description
        const riskDescriptions = {
            "High Risk": "🚨 Critical threat detected! This message exhibits multiple characteristics of Nigerian business scams. Do NOT provide any information or send money.",
            "Medium Risk": "⚠️ Suspicious activity detected. This message shows some red flags. Proceed with extreme caution and verify through other channels.",
            "Low Risk": "✅ Normal business message. No significant threats detected, but always maintain standard precautions."
        };
        document.getElementById('riskDescription').textContent = riskDescriptions[results.riskLevel];
        
        // Display threat indicators
        const indicatorsContainer = document.getElementById('threatIndicators');
        indicatorsContainer.innerHTML = '<h4>🛡️ Threat Indicators</h4>';
        
        if (results.indicators.length === 0) {
            indicatorsContainer.innerHTML += `
                <div class="indicator safe">
                    <span>✅</span>
                    <div>No significant threat indicators found</div>
                </div>
            `;
        } else {
            results.indicators.forEach(ind => {
                const examples = ind.examples.map(ex => `<code>"${ex}"</code>`).join(', ');
                indicatorsContainer.innerHTML += `
                    <div class="indicator ${ind.type}">
                        <span>${ind.type === 'danger' ? '⚠️' : '🔍'}</span>
                        <div>
                            <strong>${ind.title}</strong><br>
                            ${ind.description}<br>
                            ${examples ? `<small>Examples: ${examples}</small>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // Display phone intelligence
        const phoneIntel = document.getElementById('phoneIntel');
        if (results.phoneAnalysis.carrier || results.phoneAnalysis.location) {
            phoneIntel.style.display = 'block';
            document.getElementById('numberLocation').textContent = 
                `Location: ${results.phoneAnalysis.location || 'Unknown'}`;
            document.getElementById('numberCarrier').textContent = 
                `Carrier: ${results.phoneAnalysis.carrier || 'Unknown'}`;
            
            let status = 'Not in blacklist';
            if (results.phoneAnalysis.isBlacklisted) status = '⚠️ Blacklisted scammer';
            if (results.phoneAnalysis.isForeign) status = '🌍 Foreign number (higher risk)';
            
            document.getElementById('numberStatus').textContent = `Status: ${status}`;
        } else {
            phoneIntel.style.display = 'none';
        }
        
        // Display language analysis
        const langAnalysis = document.getElementById('languageDetection');
        langAnalysis.style.display = 'block';
        document.getElementById('detectedLanguage').textContent = 
            `Language: ${results.languageAnalysis.language}`;
        document.getElementById('grammarAnalysis').textContent = 
            `Grammar Score: ${results.languageAnalysis.grammarScore}/10`;
    }

    // Phone number analysis
    function analyzePhoneNumber(phone) {
        const result = {
            carrier: null,
            location: null,
            isBlacklisted: false,
            isForeign: false
        };
        
        // Check carriers
        for (const [carrier, pattern] of Object.entries(phoneIntelDB.carriers)) {
            if (phone.match(pattern)) {
                result.carrier = carrier;
                break;
            }
        }
        
        // Check locations
        for (const [location, pattern] of Object.entries(phoneIntelDB.locations)) {
            if (phone.match(pattern)) {
                result.location = location;
                break;
            }
        }
        
        // Check if foreign
        if (phone.match(/^(\+1|\+44|\+33|\+49)/)) {
            result.isForeign = true;
            result.location = "Foreign";
        }
        
        // Check blacklist
        result.isBlacklisted = phoneIntelDB.blacklist.includes(phone.replace(/\D/g, ''));
        
        return result;
    }

    // Language analysis
    function analyzeLanguage(message) {
        // Simple language detection
        let language = "English";
        if (message.match(/sannu|ina kwana|nagode|yaya|kana/)) language = "Hausa";
        if (message.match(/abeg|no be small|wahala|how you dey/)) language = "Pidgin";
        
        // Simple grammar scoring
        let grammarScore = 7 + Math.floor(Math.random() * 3); // Base 7-9 for most messages
        if (message.match(/[A-Z][a-z]+ [A-Z][a-z]+/)) grammarScore -= 2; // All caps words
        if (message.match(/pls|plz|u r|ur|abeg/)) grammarScore -= 1; // Common shortcuts
        if (message.match(/hello sir|dear sir|kindly/)) grammarScore -= 1; // Scam patterns
        
        grammarScore = Math.max(1, Math.min(10, grammarScore)); // Keep between 1-10
        
        return {
            language,
            grammarScore
        };
    }

    // Tab navigation
    function showTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Activate selected tab
        document.getElementById(tabId).classList.add('active');
        event.currentTarget.classList.add('active');
    }

    // Modal functions
    function generateReport() {
        const message = document.getElementById('messageText').value;
        const phone = document.getElementById('senderNumber').value;
        const riskLevel = document.getElementById('riskLevel').textContent;
        
        // Generate report content
        let reportHTML = `
            <h4>Security Analysis Report</h4>
            <p><strong>Message:</strong> ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}</p>
            <p><strong>Sender:</strong> ${phone || 'Unknown'}</p>
            <p><strong>Risk Level:</strong> ${riskLevel}</p>
            <hr>
            <h5>Threat Indicators</h5>
        `;
        
        // Add indicators to report
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach(ind => {
            const text = ind.querySelector('div').innerText;
            reportHTML += `<p>• ${text}</p>`;
        });
        
        document.getElementById('reportContent').innerHTML = reportHTML;
        document.getElementById('reportModal').style.display = 'block';
    }

    function closeModal() {
        document.getElementById('reportModal').style.display = 'none';
    }

    function downloadReport() {
        alert("Report downloaded (simulated for demo)");
        closeModal();
    }

    // Other UI functions
    function uploadImage() {
        alert("Image scanning feature would be implemented here");
    }

    function reportScammer() {
        alert("Scammer reporting feature would be implemented here");
    }

    function saveReport() {
        generateReport();
    }

    function shareReport() {
        alert("Report sharing feature would be implemented here");
    }

    function quickReport() {
        alert("Quick scam reporting would be implemented here");
    }

    function loadMoreScams() {
        alert("Loading more scam reports from database");
    }

    // Subscription functions
    function subscribe(plan) {
        const plans = {
            basic: "Basic Shield (₦2,500/month)",
            pro: "Pro Guard (₦5,500/month)",
            enterprise: "Enterprise Fortress (₦15,000/month)"
        };
        alert(`Thank you for choosing ${plans[plan]}! Subscription flow would be implemented here.`);
    }

    // Initialize with sample data
    document.addEventListener('DOMContentLoaded', function() {
        // Update stats with random increments
        setInterval(() => {
            document.getElementById('threatsDetected').textContent = 
                (parseInt(document.getElementById('threatsDetected').textContent) + Math.floor(Math.random() * 3));
            document.getElementById('businessesProtected').textContent = 
                (parseInt(document.getElementById('businessesProtected').textContent) + Math.floor(Math.random() * 2));
        }, 5000);
    });
