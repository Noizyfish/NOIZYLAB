# 📧 NOIZYLAB Email Configuration Guide

This guide will help you set up and configure your NOIZYLAB email system.

## 🚀 Quick Setup (3 Steps)

### Step 1: Run the Setup Wizard
```bash
bash setup_wizard.sh
```

The wizard will:
- Help you choose your email provider (Gmail, Outlook, Yahoo, or custom)
- Configure SMTP settings automatically
- Collect your email credentials
- Create the config/.env file
- Install dependencies

### Step 2: Test Your Configuration
```bash
bash test_email.sh
```

This will verify:
- Agent starts correctly
- SMTP connection works
- Email can be sent
- All features are operational

### Step 3: Start Using!
```bash
npm start
```

Your email agent is now running at http://localhost:3000

---

## 📨 Email Provider Setup

### Gmail Configuration

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Use in Setup Wizard**
   - Email: your.email@gmail.com
   - Password: [16-character app password]

**SMTP Settings:**
- Host: smtp.gmail.com
- Port: 587
- Secure: false

---

### Outlook/Hotmail Configuration

1. **No special setup needed** (usually)
2. Use your regular email and password

**SMTP Settings:**
- Host: smtp-mail.outlook.com
- Port: 587
- Secure: false

---

### Yahoo Mail Configuration

1. **Enable "Less secure app access"**
   - Go to Yahoo Account Security
   - Enable "Allow apps that use less secure sign in"

2. Use your regular email and password

**SMTP Settings:**
- Host: smtp.mail.yahoo.com
- Port: 587
- Secure: false

---

### Custom SMTP Server

If you have your own SMTP server or using a service like SendGrid, Mailgun, etc.:

1. Get your SMTP credentials from your provider
2. Run setup wizard and choose option 4
3. Enter your custom settings

---

## 🎯 Usage Examples

### Send a Simple Email
```bash
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from NOIZYLAB",
    "text": "This is my first email!"
  }'
```

### Send Email with HTML
```bash
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Welcome!",
    "html": "<h1>Welcome!</h1><p>Thanks for joining us.</p>"
  }'
```

### Send Bulk Emails
```bash
curl -X POST http://localhost:3000/agent/bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["user1@example.com", "user2@example.com", "user3@example.com"],
    "subject": "Newsletter",
    "text": "Check out our latest updates!"
  }'
```

### Use a Template
```bash
# Generate welcome email
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "data": {"name": "John Doe"}
  }'

# Then send it
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "john@example.com",
    "subject": "Welcome to NOIZYLAB!",
    "html": "<h1>Welcome to NOIZYLAB!</h1><p>Hello John Doe,</p><p>We are excited to have you on board.</p>"
  }'
```

---

## 🔧 Troubleshooting

### "SMTP connection failed"

**Gmail:**
- Make sure you're using an App Password, not your regular password
- Enable 2-Factor Authentication first
- Check https://myaccount.google.com/lesssecureapps is enabled

**Outlook:**
- Verify your email and password are correct
- Check if your account has any security alerts

**Yahoo:**
- Enable "Less secure app access" in settings
- Generate an app-specific password if available

**All Providers:**
- Check your SMTP port (usually 587)
- Verify SMTP host is correct
- Check firewall isn't blocking port 587

### "Connection timeout"

- Your firewall may be blocking outbound connections on port 587
- Try port 465 with `SMTP_SECURE=true`
- Check if your hosting provider blocks SMTP

### "Invalid email address"

- Make sure email addresses are in correct format: user@domain.com
- No spaces or special characters

### "Rate limit exceeded"

- You're sending too many emails too quickly
- Wait 60 seconds and try again
- The agent limits to 10 requests per minute per IP

---

## 📚 Available Templates

1. **welcome** - Welcome new users
   ```json
   {"type": "welcome", "data": {"name": "User Name"}}
   ```

2. **notification** - General notifications
   ```json
   {"type": "notification", "data": {"subject": "Update", "message": "Your message"}}
   ```

3. **alert** - System alerts
   ```json
   {"type": "alert", "data": {"title": "Alert", "message": "Important message"}}
   ```

4. **password-reset** - Password reset emails
   ```json
   {"type": "password-reset", "data": {"name": "User", "resetLink": "https://..."}}
   ```

5. **invoice** - Invoice emails
   ```json
   {"type": "invoice", "data": {"name": "User", "invoiceNumber": "12345", "amount": "99.99"}}
   ```

6. **confirmation** - Confirmation emails
   ```json
   {"type": "confirmation", "data": {"name": "User", "confirmLink": "https://..."}}
   ```

---

## 🔐 Security Best Practices

1. **Never commit your .env file** - It contains your password
2. **Use App Passwords** - Don't use your main email password
3. **Enable 2FA** - On your email account
4. **Rotate passwords** - Change them periodically
5. **Monitor usage** - Check agent logs regularly

---

## 📞 Need Help?

1. Run the test script: `bash test_email.sh`
2. Check agent logs: `tail -f agent.log`
3. Review config: `cat config/.env`
4. Test SMTP manually: `npm start` and visit http://localhost:3000/agent/verify

---

## ✅ Checklist

- [ ] Ran setup wizard: `bash setup_wizard.sh`
- [ ] Configured email provider
- [ ] Created App Password (if using Gmail)
- [ ] Ran test script: `bash test_email.sh`
- [ ] SMTP connection verified
- [ ] Test email sent successfully
- [ ] Agent running: `npm start`
- [ ] First email sent via API

**You're all set! 🎉**
