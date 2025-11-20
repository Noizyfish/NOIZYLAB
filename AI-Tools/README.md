# NOIZYLAB AI Agent

This directory contains the AI agent implementation for the NOIZYLAB email system automation.

## Quick Start

1. Run the deployment script:
   ```bash
   bash deploy_agent.sh
   ```

2. Copy the example environment file:
   ```bash
   cp config/.env.example config/.env
   ```

3. Update `config/.env` with your SMTP credentials

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the agent:
   ```bash
   npm start
   ```

## Agent Capabilities

The NOIZYLAB Email Agent provides:
- **Email sending** via REST API
- **Template generation** for common email types (welcome, notification, alert)
- **SMTP connection verification**
- **Express server** for API endpoints
- **Nodemailer integration** for reliable email delivery

## API Endpoints

### Health Check
```bash
GET /health
```
Returns agent status and version.

### Agent Information
```bash
GET /agent/info
```
Returns agent capabilities and configuration.

### Verify SMTP Connection
```bash
GET /agent/verify
```
Verifies the SMTP connection is working.

### Send Email
```bash
POST /agent/send-email
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "text": "This is a test email",
  "html": "<p>This is a test email</p>"
}
```

### Generate Email Template
```bash
POST /agent/generate-template
Content-Type: application/json

{
  "type": "welcome",
  "data": {
    "name": "John Doe"
  }
}
```

Supported template types:
- `welcome` - Welcome email for new users
- `notification` - General notification
- `alert` - System alert message

## Configuration

The agent is configured via:
- `agent.yml` - Agent metadata and capabilities
- `config/.env` - Environment-specific settings (SMTP, server)
- `package.json` - Node.js dependencies

## Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)

## File Structure

```
AI-Tools/
├── agent.js              # Main agent implementation
├── agent.yml             # Agent configuration
├── package.json          # Node.js dependencies
├── deploy_agent.sh       # Deployment script
├── config/
│   └── .env.example      # Example environment variables
├── templates/            # Email templates directory
└── logs/                 # Logs directory
```

## Example Usage

After starting the agent, you can test it with curl:

```bash
# Check agent health
curl http://localhost:3000/health

# Verify SMTP connection
curl http://localhost:3000/agent/verify

# Send an email
curl -X POST http://localhost:3000/agent/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from NOIZYLAB",
    "text": "This is a test email from the agent"
  }'

# Generate a welcome email template
curl -X POST http://localhost:3000/agent/generate-template \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "data": {
      "name": "Jane Smith"
    }
  }'
```

## Support

For issues or questions, refer to the main NOIZYLAB documentation.
