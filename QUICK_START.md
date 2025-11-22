# 📧 NOIZYLAB Quick Reference

## 🚀 Getting Started

```bash
# Complete setup
bash setup_wizard.sh && bash test_email.sh && npm start
```

## 📨 Common Tasks

### Send a Simple Email
```bash
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Hello","text":"Hi there!"}'
```

### Send to Multiple People
```bash
curl -X POST http://localhost:3000/agent/bulk-email \
  -H "Content-Type: application/json" \
  -d '{"recipients":["user1@example.com","user2@example.com"],"subject":"News","text":"Update for everyone"}'
```

### Send Welcome Email
```bash
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"newuser@example.com","subject":"Welcome!","html":"<h1>Welcome!</h1><p>Thanks for joining.</p>"}'
```

### Validate Email Address
```bash
curl -X POST http://localhost:3000/agent/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Check System Health
```bash
curl http://localhost:3000/health
```

### Verify SMTP Connection
```bash
curl http://localhost:3000/agent/verify
```

## 📝 Email Templates

### Welcome Email
```bash
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{"type":"welcome","data":{"name":"John Doe"}}'
```

### Password Reset
```bash
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{"type":"password-reset","data":{"name":"John","resetLink":"https://example.com/reset"}}'
```

### Invoice
```bash
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{"type":"invoice","data":{"name":"John","invoiceNumber":"12345","amount":"99.99"}}'
```

## 🔧 Troubleshooting

### Test Configuration
```bash
bash test_email.sh
```

### Check Logs
```bash
# If running in background
tail -f agent.log

# Or check last 50 lines
tail -50 agent.log
```

### Restart Agent
```bash
# Stop
pkill -f "node agent.js"

# Start
npm start
```

### View Configuration
```bash
cat config/.env
```

### Reconfigure
```bash
bash setup_wizard.sh
```

## 📊 Status Checks

### Queue Status
```bash
curl http://localhost:3000/agent/queue-status
```

### Agent Info
```bash
curl http://localhost:3000/agent/info
```

## 🔐 Email Provider Settings

### Gmail
- Host: smtp.gmail.com
- Port: 587
- Need: App Password from https://myaccount.google.com/apppasswords

### Outlook
- Host: smtp-mail.outlook.com
- Port: 587
- Use: Regular password

### Yahoo
- Host: smtp.mail.yahoo.com
- Port: 587
- Need: Enable "Less secure apps"

## ⚡ Quick Tips

1. **Test first**: Always run `bash test_email.sh` after setup
2. **Use templates**: Faster than writing HTML each time
3. **Bulk for newsletters**: Use bulk-email for multiple recipients
4. **Queue for non-urgent**: Use queue-email for background sending
5. **Check health**: Hit /health endpoint to monitor

## 📚 More Help

- Full Setup: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Features: [README.md](README.md)
- Config: [config/.env.example](config/.env.example)

---
**NOIZYLAB** - Send emails at WARP SPEED! 🚀
