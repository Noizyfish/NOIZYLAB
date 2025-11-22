# NOIZYLAB Email Agent 🚀

**AI-Powered Email System Automation at Warp Speed!**

## 🎯 NEW USER? Start Here!

### Complete Setup in 3 Commands:
```bash
bash setup_wizard.sh    # Configure your email
bash test_email.sh      # Test everything works
npm start               # Start sending emails!
```

**📚 Full Setup Guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

## 🔥 Quick Start (HYPER-DRIVE MODE)

```bash
bash deploy_agent.sh && npm install && npm start
```

Agent launches on http://localhost:3000

## ⚡ Super Features

- **Bulk Email Sending** - Send to thousands at once
- **Email Queue System** - Automatic background processing
- **Attachment Support** - Send files with emails
- **Email Validation** - Auto-validate addresses
- **Smart Templates** - 6+ pre-built templates
- **Rate Limiting** - Built-in DDoS protection
- **SMTP Verification** - Test before you send

## 🎯 API Endpoints

### Send Email (with attachments!)
```bash
POST /agent/send-email
{
  "to": "user@example.com",
  "subject": "Test",
  "text": "Hello!",
  "attachments": [{"filename": "file.pdf", "path": "/path/to/file.pdf"}]
}
```

### Bulk Email
```bash
POST /agent/bulk-email
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Newsletter",
  "text": "Hello everyone!"
}
```

### Queue Email
```bash
POST /agent/queue-email
{
  "to": "user@example.com",
  "subject": "Queued",
  "text": "Will be sent automatically"
}
```

### Validate Email
```bash
POST /agent/validate-email
{
  "email": "test@example.com"
}
```

### Templates
```bash
POST /agent/generate-template
{
  "type": "welcome|notification|alert|password-reset|invoice|confirmation",
  "data": {"name": "User", "amount": 99.99}
}
```

### System
- `GET /health` - Health check
- `GET /agent/info` - Capabilities
- `GET /agent/verify` - Test SMTP
- `GET /agent/queue-status` - Check queue

## 🔧 Setup

**First Time?** → [Complete Setup Guide](SETUP_GUIDE.md)

**Quick Setup:**
1. Run wizard: `bash setup_wizard.sh`
2. Test config: `bash test_email.sh`
3. Start agent: `npm start`

**Manual Setup:**
1. Copy config: `cp config/.env.example config/.env`
2. Add SMTP credentials to `config/.env`
3. Run: `npm start`

## 📊 Capabilities

✅ Email sending with attachments  
✅ Bulk email processing  
✅ Background queue system  
✅ Email validation  
✅ 6 template types  
✅ Rate limiting (10 req/min)  
✅ Error handling  
✅ Logging  

## 🛡️ Security

- Nodemailer 7.0.7+ (no vulnerabilities)
- Rate limiting on all endpoints
- Input validation
- Email address validation

## 💻 Requirements

- Node.js v14+
- npm v6+

---
**NOIZYLAB** - Fast. Powerful. Reliable.