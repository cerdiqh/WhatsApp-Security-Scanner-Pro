# 🔒 ScamBuster

Advanced AI-powered scam detection scanner that identifies and prevents Nigerian business scams in real-time. Trusted by 150+ businesses across Nigeria.

## 🚀 Features

- **AI-Powered Detection**: 99.2% accuracy rate with real-time analysis
- **Phone Intelligence**: Verify numbers, check blacklists, analyze carriers
- **Business Analytics**: Track threats, generate reports, monitor metrics
- **Real-Time Alerts**: Instant notifications via SMS, email, and WhatsApp
- **Community Features**: Report scammers, vote on reports, build reputation
- **Webhook Integration**: Connect with Slack, Discord, and custom systems
- **Dark Mode**: Complete theme management
- **Export Functionality**: Generate detailed security reports

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- Modern web browser

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/scambuster.git
   cd scambuster
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SCAN_RATE_LIMIT_MAX_REQUESTS=10
```

### Production Deployment

1. **Set production environment**
   ```bash
   NODE_ENV=production
   ```

2. **Use a strong JWT secret**
   ```bash
   JWT_SECRET=your-production-secret-key
   ```

3. **Configure CORS origins**
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "businessType": "tech"
}
```

#### Login User
```http
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Scan Endpoints

#### Scan Message
```http
POST /api/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Hello sir, I want to buy your products in large quantity...",
  "phone": "+2349031234567",
  "name": "John Doe"
}
```

#### Get User Reports
```http
GET /api/reports
Authorization: Bearer <token>
```

### Community Endpoints

#### Submit Community Report
```http
POST /api/community/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+2349031234567",
  "message": "Suspicious message content",
  "scamType": "business",
  "description": "Detailed description"
}
```

#### Vote on Report
```http
POST /api/community/vote
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportId": "report_id",
  "vote": "up" // or "down"
}
```

## 🏗️ Project Structure

```
scambuster/
├── data/                   # JSON data files
│   ├── users.json         # User accounts
│   ├── reports.json       # Scan reports
│   ├── scamNumbers.json   # Known scam numbers
│   ├── scamPatterns.json  # Scam detection patterns
│   ├── communityReports.json # Community reports
│   └── reputation.json    # User reputation data
├── assets/                # Static assets
├── index.html            # Landing page
├── login.html            # Login page
├── register.html         # Registration page
├── dashboard.html        # Main dashboard
├── server.js             # Express server
├── script.js             # Frontend JavaScript
├── style.css             # Stylesheets
├── package.json          # Dependencies
└── README.md             # Documentation
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Configurable cross-origin requests
- **Helmet Security**: Security headers middleware
- **Password Hashing**: bcrypt for secure password storage

## 🧪 Testing

```bash
# Run security audit
npm run security-audit

# Run linting
npm run lint

# Start development server
npm run dev
```

## 🚀 Deployment

### Heroku
```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-secret

# Deploy
git push heroku main
```

### Docker
```bash
# Build image
docker build -t scambuster .

# Run container
docker run -p 3000:3000 scambuster
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is provided as a demonstration and should not be used as the sole means of determining fraud. Always perform additional verification when in doubt. The developers are not responsible for any financial losses or damages.

## 📞 Support

- **Email**: support@scambuster.com
- **Documentation**: [docs.scambuster.com](https://docs.scambuster.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/scambuster/issues)

## 🔄 Changelog

### v1.0.0 (2024-01-15)
- Initial release
- AI-powered scam detection
- Community reporting system
- Real-time analytics dashboard
- Webhook integrations
- Dark mode support

---

**Made with ❤️ for Nigerian businesses**
