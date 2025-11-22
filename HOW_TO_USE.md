# 🤖 How to Call on Your NOIZYLAB Agent for Help

Your NOIZYLAB Email Agent is like having a personal email assistant. Here's how to ask it for help!

## 🚀 Starting Your Agent

First, make sure your agent is running:

```bash
# Start the agent
npm start

# OR for high-performance cluster mode
npm run cluster
```

You'll see:
```
🚀 NOIZYLAB Email Agent - ULTRA MODE
Server: http://0.0.0.0:3000
⚡ Ready to help!
```

---

## 💬 How to Talk to Your Agent

Your agent responds to HTTP requests (like a conversation, but through code). Here are common ways to call it:

### Method 1: Using curl (Command Line)

```bash
# Ask agent for help sending an email
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "friend@example.com",
    "subject": "Hello!",
    "text": "Can you help me with this?"
  }'
```

### Method 2: Using Python

```python
import requests

# Call your agent
response = requests.post('http://localhost:3000/agent/send-email', json={
    "to": "friend@example.com",
    "subject": "Hello!",
    "text": "The agent sent this for me!"
})

print(response.json())
```

### Method 3: Using JavaScript/Node.js

```javascript
const axios = require('axios');

// Ask agent to send email
axios.post('http://localhost:3000/agent/send-email', {
  to: 'friend@example.com',
  subject: 'Hello!',
  text: 'My agent is helping me!'
})
.then(response => console.log(response.data));
```

### Method 4: Using Your Web Browser

Visit in browser: `http://localhost:3000/health`

You'll see your agent's status!

---

## 🎯 Common Tasks - How to Ask Your Agent

### 1. "Agent, Send an Email for Me"

```bash
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Quick Message",
    "text": "This is my message"
  }'
```

**Agent responds:**
```json
{
  "success": true,
  "messageId": "abc123...",
  "id": 1
}
```

### 2. "Agent, Create a Welcome Email Template"

```bash
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "data": {"name": "John Doe"}
  }'
```

**Agent gives you:**
```json
{
  "success": true,
  "template": {
    "subject": "Welcome to NOIZYLAB!",
    "text": "Hello John Doe, Welcome to NOIZYLAB!...",
    "html": "<h1>Welcome!</h1>..."
  }
}
```

### 3. "Agent, Send to Multiple People"

```bash
curl -X POST http://localhost:3000/agent/bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": ["user1@example.com", "user2@example.com", "user3@example.com"],
    "subject": "Team Update",
    "text": "Hello team! Here is the update..."
  }'
```

**Agent handles it:**
```json
{
  "success": true,
  "total": 3,
  "sent": 3,
  "failed": 0
}
```

### 4. "Agent, Schedule an Email for Later"

```bash
curl -X POST http://localhost:3000/agent/schedule-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Reminder",
    "text": "This is your scheduled reminder",
    "scheduleTime": "2025-12-25 10:00:00"
  }'
```

**Agent confirms:**
```json
{
  "success": true,
  "message": "Email scheduled successfully",
  "scheduleId": 1,
  "scheduledFor": "2025-12-25 10:00:00"
}
```

### 5. "Agent, Check if an Email is Valid"

```bash
curl -X POST http://localhost:3000/agent/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Agent checks:**
```json
{
  "success": true,
  "email": "test@example.com",
  "valid": true
}
```

### 6. "Agent, Show Me Email Statistics"

```bash
curl http://localhost:3000/agent/analytics?days=7
```

**Agent reports:**
```json
{
  "success": true,
  "period": "7 days",
  "totals": {
    "total_sent": 150,
    "total_failed": 5,
    "total_queued": 10
  }
}
```

### 7. "Agent, Show Me Email History"

```bash
curl http://localhost:3000/agent/history?limit=10
```

**Agent shows:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "recipient": "user@example.com",
      "subject": "Hello",
      "status": "sent",
      "created_at": "2025-11-22 10:30:00"
    }
  ]
}
```

### 8. "Agent, Put This Email in the Queue"

```bash
curl -X POST http://localhost:3000/agent/queue-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Queued Message",
    "text": "Send this when you can"
  }'
```

**Agent queues it:**
```json
{
  "success": true,
  "message": "Email added to queue",
  "queueId": 1.234567,
  "queueSize": 1
}
```

### 9. "Agent, How Are You Doing?"

```bash
curl http://localhost:3000/health
```

**Agent status:**
```json
{
  "status": "ok",
  "agent": "noizylab-email-agent",
  "version": "3.0.0",
  "mode": "ULTRA",
  "stats": {
    "totalSent": 150,
    "totalFailed": 5,
    "queueSize": 2
  },
  "uptime": 3600
}
```

### 10. "Agent, What Can You Do?"

```bash
curl http://localhost:3000/agent/info
```

**Agent lists capabilities:**
```json
{
  "name": "noizylab-email-agent",
  "version": "3.0.0",
  "capabilities": [
    "email_sending_with_attachments_and_retry",
    "bulk_email_sending",
    "email_queue_system",
    "scheduled_emails",
    "email_analytics",
    ...
  ]
}
```

---

## 🔥 Real-World Examples

### Example 1: "Help Me Welcome New Users"

```bash
# 1. Generate welcome template
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{"type":"welcome","data":{"name":"Alice"}}' > template.json

# 2. Extract and send
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "alice@example.com",
    "subject": "Welcome to NOIZYLAB!",
    "html": "<h1>Welcome Alice!</h1><p>We are excited to have you.</p>"
  }'
```

### Example 2: "Help Me Send a Newsletter to Everyone"

```bash
curl -X POST http://localhost:3000/agent/bulk-email \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com"
    ],
    "subject": "Monthly Newsletter - November 2025",
    "html": "<h2>Newsletter</h2><p>Here are this month updates...</p>"
  }'
```

### Example 3: "Help Me Send Birthday Reminders"

```bash
# Schedule for midnight on birthday
curl -X POST http://localhost:3000/agent/schedule-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "john@example.com",
    "subject": "Happy Birthday John! 🎂",
    "text": "Wishing you an amazing birthday!",
    "scheduleTime": "2025-12-25 00:00:00"
  }'
```

---

## 📱 Integration Examples

### In a Web App (Express.js)

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.post('/welcome-user', async (req, res) => {
  const { email, name } = req.body;
  
  // Ask your agent to send welcome email
  const response = await axios.post('http://localhost:3000/agent/send-email', {
    to: email,
    subject: 'Welcome!',
    html: `<h1>Welcome ${name}!</h1>`
  });
  
  res.json({ message: 'Welcome email sent!', details: response.data });
});
```

### In a Python Script

```python
import requests

def send_reminder(email, message):
    """Ask agent to send a reminder"""
    response = requests.post('http://localhost:3000/agent/send-email', json={
        'to': email,
        'subject': 'Reminder',
        'text': message
    })
    return response.json()

# Use it
result = send_reminder('user@example.com', 'Don\'t forget your meeting!')
print(f"Sent! Message ID: {result['messageId']}")
```

---

## 🛠️ Troubleshooting

### "How do I know if my agent is listening?"

```bash
curl http://localhost:3000/health
```

If you get a response, your agent is ready!

### "My agent isn't responding"

Check if it's running:
```bash
ps aux | grep agent.js
```

If not running, start it:
```bash
npm start
```

### "I get 'Connection refused'"

Your agent isn't started. Run:
```bash
cd /path/to/NOIZYLAB
npm start
```

---

## 🎓 Tips for Working with Your Agent

1. **Always check health first**: `curl http://localhost:3000/health`
2. **Use templates**: They save time! Generate once, use many times
3. **Check analytics**: See how your agent is performing
4. **Use queue for bulk**: Prevents overwhelming your SMTP server
5. **Schedule ahead**: Set it and forget it
6. **Monitor history**: Track what's been sent

---

## 🆘 Quick Help Commands

```bash
# Is agent running?
curl http://localhost:3000/health

# What can agent do?
curl http://localhost:3000/agent/info

# How many emails sent today?
curl http://localhost:3000/agent/analytics?days=1

# What's in the queue?
curl http://localhost:3000/agent/queue-status

# Recent email history
curl http://localhost:3000/agent/history?limit=5
```

---

## 📚 Next Steps

- **Full API docs**: See `README.md`
- **Setup guide**: See `SETUP_GUIDE.md`  
- **Quick commands**: See `QUICK_START.md`

---

**Your agent is ready to help 24/7!** Just call on it anytime you need to send emails. 🚀
