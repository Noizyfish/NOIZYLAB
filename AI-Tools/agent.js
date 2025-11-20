#!/usr/bin/env node

/**
 * NOIZYLAB Email Agent
 * AI-powered email system automation agent
 */

require('dotenv').config({ path: './config/.env' });
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration from environment variables
const config = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'user@example.com',
      pass: process.env.SMTP_PASS || 'password'
    }
  },
  server: {
    port: parseInt(process.env.SERVER_PORT) || 3000,
    host: process.env.SERVER_HOST || '0.0.0.0'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Create nodemailer transporter
let transporter;
try {
  transporter = nodemailer.createTransport(config.smtp);
  console.log('✓ Email transporter configured');
} catch (error) {
  console.error('✗ Failed to configure email transporter:', error.message);
}

// Logging helper
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logMessage);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Agent capabilities

/**
 * Send an email
 */
async function sendEmail(options) {
  const { from, to, subject, text, html } = options;
  
  try {
    const mailOptions = {
      from: from || config.smtp.auth.user,
      to,
      subject,
      text,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    log('info', 'Email sent successfully', { messageId: info.messageId, to });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    log('error', 'Failed to send email', { error: error.message, to });
    return { success: false, error: error.message };
  }
}

/**
 * Verify SMTP connection
 */
async function verifyConnection() {
  try {
    await transporter.verify();
    log('info', 'SMTP connection verified');
    return { success: true, message: 'SMTP connection is ready' };
  } catch (error) {
    log('error', 'SMTP connection failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'noizylab-email-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get agent info
app.get('/agent/info', (req, res) => {
  res.json({
    name: 'noizylab-email-agent',
    version: '1.0.0',
    description: 'AI agent for NOIZYLAB email system automation',
    capabilities: [
      'email_template_generation',
      'smtp_configuration',
      'nodemailer_integration',
      'express_server_setup'
    ],
    config: {
      smtp_host: config.smtp.host,
      smtp_port: config.smtp.port,
      server_port: config.server.port
    }
  });
});

// Verify SMTP connection
app.get('/agent/verify', async (req, res) => {
  const result = await verifyConnection();
  res.json(result);
});

// Send email endpoint
app.post('/agent/send-email', async (req, res) => {
  const { to, subject, text, html, from } = req.body;
  
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, and text/html'
    });
  }
  
  const result = await sendEmail({ to, subject, text, html, from });
  res.json(result);
});

// Generate email template
app.post('/agent/generate-template', (req, res) => {
  const { type, data } = req.body;
  
  let template = {
    subject: '',
    text: '',
    html: ''
  };
  
  switch (type) {
    case 'welcome':
      template.subject = 'Welcome to NOIZYLAB!';
      template.text = `Hello ${data?.name || 'there'},\n\nWelcome to NOIZYLAB! We're excited to have you on board.\n\nBest regards,\nThe NOIZYLAB Team`;
      template.html = `<h1>Welcome to NOIZYLAB!</h1><p>Hello ${data?.name || 'there'},</p><p>We're excited to have you on board.</p><p>Best regards,<br>The NOIZYLAB Team</p>`;
      break;
      
    case 'notification':
      template.subject = data?.subject || 'Notification from NOIZYLAB';
      template.text = data?.message || 'You have a new notification.';
      template.html = `<p>${data?.message || 'You have a new notification.'}</p>`;
      break;
      
    case 'alert':
      template.subject = `Alert: ${data?.title || 'System Alert'}`;
      template.text = `ALERT: ${data?.message || 'An alert has been triggered.'}`;
      template.html = `<div style="background-color: #fff3cd; padding: 15px; border: 1px solid #ffc107;"><strong>ALERT:</strong> ${data?.message || 'An alert has been triggered.'}</div>`;
      break;
      
    default:
      template.subject = 'Message from NOIZYLAB';
      template.text = data?.message || 'This is a message from NOIZYLAB.';
      template.html = `<p>${data?.message || 'This is a message from NOIZYLAB.'}</p>`;
  }
  
  res.json({
    success: true,
    template
  });
});

// Error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start the agent
function startAgent() {
  app.listen(config.server.port, config.server.host, () => {
    console.log('');
    console.log('==========================================');
    console.log('NOIZYLAB Email Agent Started');
    console.log('==========================================');
    console.log(`Server: http://${config.server.host}:${config.server.port}`);
    console.log(`Health: http://localhost:${config.server.port}/health`);
    console.log(`Agent Info: http://localhost:${config.server.port}/agent/info`);
    console.log('==========================================');
    console.log('');
    log('info', 'Agent is ready to process requests');
  });
}

// Start the agent
startAgent();

module.exports = { sendEmail, verifyConnection };
