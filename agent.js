#!/usr/bin/env node

/**
 * NOIZYLAB Email Agent v3.0 - ULTRA MODE
 * AI-powered email system with analytics, scheduling, and persistence
 */

require('dotenv').config({ path: './config/.env' });
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');
const EmailDatabase = require('./database');

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize database
const db = new EmailDatabase();

// Email cache for performance
const emailCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Simple in-memory rate limiter
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // Increased to 20 requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimiter.get(ip) || [];
  
  // Remove old requests outside the window
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  validRequests.push(now);
  rateLimiter.set(ip, validRequests);
  return true;
}

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }
  
  next();
}

// API Key authentication middleware (optional)
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (process.env.REQUIRE_API_KEY === 'true') {
    if (!apiKey || !db.validateApiKey(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing API key'
      });
    }
  }
  
  next();
}



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

// Email queue for handling multiple emails
const emailQueue = [];
let isProcessingQueue = false;

/**
 * Validate email address
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send an email with optional attachments and retry logic
 */
async function sendEmail(options, retryCount = 0) {
  const { from, to, subject, text, html, attachments, template } = options;
  const MAX_RETRIES = 3;
  
  // Log to database
  const logEntry = db.logEmail({
    recipient: to,
    subject,
    status: 'pending',
    template
  });
  
  try {
    const mailOptions = {
      from: from || config.smtp.auth.user,
      to,
      subject,
      text,
      html
    };
    
    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    const info = await transporter.sendMail(mailOptions);
    
    // Update database
    db.updateEmailStatus(logEntry.lastInsertRowid, 'sent', info.messageId);
    db.updateStats(new Date().toISOString().split('T')[0], 1, 0, 0);
    
    log('info', 'Email sent successfully', { messageId: info.messageId, to });
    return { success: true, messageId: info.messageId, id: logEntry.lastInsertRowid };
  } catch (error) {
    log('error', 'Failed to send email', { error: error.message, to, retryCount });
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      log('info', `Retrying email (attempt ${retryCount + 1}/${MAX_RETRIES})`, { to });
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return sendEmail(options, retryCount + 1);
    }
    
    // Update database with failure
    db.updateEmailStatus(logEntry.lastInsertRowid, 'failed', null, error.message);
    db.updateStats(new Date().toISOString().split('T')[0], 0, 1, 0);
    
    return { success: false, error: error.message, id: logEntry.lastInsertRowid };
  }
}

/**
 * Send bulk emails
 */
async function sendBulkEmails(recipients, emailData) {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendEmail({
      ...emailData,
      to: recipient
    });
    results.push({
      recipient,
      ...result
    });
    
    // Small delay between emails to avoid overwhelming the SMTP server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Add email to queue
 */
function addToQueue(emailData) {
  const queueItem = {
    id: Date.now() + Math.random(),
    ...emailData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  emailQueue.push(queueItem);
  log('info', 'Email added to queue', { id: queueItem.id, to: emailData.to });
  
  // Start processing queue if not already processing
  if (!isProcessingQueue) {
    processQueue();
  }
  
  return queueItem;
}

/**
 * Process email queue
 */
async function processQueue() {
  if (isProcessingQueue || emailQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  log('info', 'Starting queue processing', { queueSize: emailQueue.length });
  
  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    item.status = 'processing';
    
    const result = await sendEmail(item);
    item.status = result.success ? 'sent' : 'failed';
    item.result = result;
    item.completedAt = new Date().toISOString();
    
    log('info', 'Queue item processed', { id: item.id, status: item.status });
  }
  
  isProcessingQueue = false;
  log('info', 'Queue processing completed');
}

/**
 * Process scheduled emails (runs every minute)
 */
async function processScheduledEmails() {
  try {
    const pending = db.getPendingScheduledEmails();
    
    if (pending.length > 0) {
      log('info', `Processing ${pending.length} scheduled emails`);
      
      for (const scheduled of pending) {
        const result = await sendEmail({
          to: scheduled.recipient,
          subject: scheduled.subject,
          text: scheduled.body,
          html: scheduled.html
        });
        
        db.updateScheduledEmail(scheduled.id, result.success ? 'sent' : 'failed');
      }
    }
  } catch (error) {
    log('error', 'Error processing scheduled emails', { error: error.message });
  }
}

// Schedule cron job to process scheduled emails every minute
cron.schedule('* * * * *', processScheduledEmails);
log('info', 'Scheduled email processor started (runs every minute)');

  
  isProcessingQueue = false;
  log('info', 'Queue processing completed');
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
  const stats = db.getTotalStats();
  res.json({
    status: 'ok',
    agent: 'noizylab-email-agent',
    version: '3.0.0',
    mode: 'ULTRA',
    timestamp: new Date().toISOString(),
    stats: {
      totalSent: stats?.total_sent || 0,
      totalFailed: stats?.total_failed || 0,
      queueSize: emailQueue.length
    },
    uptime: process.uptime()
  });
});

// Get agent info
app.get('/agent/info', (req, res) => {
  res.json({
    name: 'noizylab-email-agent',
    version: '3.0.0',
    description: 'AI agent for NOIZYLAB email system automation - ULTRA MODE with analytics, scheduling & persistence',
    capabilities: [
      'email_sending_with_attachments_and_retry',
      'bulk_email_sending',
      'email_queue_system',
      'scheduled_emails',
      'email_validation',
      'template_generation',
      'email_analytics',
      'email_history_tracking',
      'api_key_authentication',
      'smtp_configuration',
      'nodemailer_integration',
      'rate_limiting',
      'cluster_mode',
      'database_persistence'
    ],
    config: {
      smtp_host: config.smtp.host,
      smtp_port: config.smtp.port,
      server_port: config.server.port
    },
    templates: ['welcome', 'notification', 'alert', 'password-reset', 'invoice', 'confirmation']
  });
});

// Verify SMTP connection
app.get('/agent/verify', rateLimitMiddleware, async (req, res) => {
  const result = await verifyConnection();
  res.json(result);
});

// Send email endpoint with attachments support
app.post('/agent/send-email', rateLimitMiddleware, async (req, res) => {
  const { to, subject, text, html, from, attachments } = req.body;
  
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, and text/html'
    });
  }
  
  // Validate email
  if (!validateEmail(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email address'
    });
  }
  
  const result = await sendEmail({ to, subject, text, html, from, attachments });
  res.json(result);
});

// Bulk email endpoint
app.post('/agent/bulk-email', rateLimitMiddleware, async (req, res) => {
  const { recipients, subject, text, html, from, attachments } = req.body;
  
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'recipients must be a non-empty array'
    });
  }
  
  if (!subject || (!text && !html)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: subject, and text/html'
    });
  }
  
  // Validate all emails
  const invalidEmails = recipients.filter(email => !validateEmail(email));
  if (invalidEmails.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email addresses',
      invalidEmails
    });
  }
  
  const results = await sendBulkEmails(recipients, { subject, text, html, from, attachments });
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  res.json({
    success: true,
    total: recipients.length,
    sent: successCount,
    failed: failCount,
    results
  });
});

// Queue email endpoint
app.post('/agent/queue-email', rateLimitMiddleware, (req, res) => {
  const { to, subject, text, html, from, attachments } = req.body;
  
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, and text/html'
    });
  }
  
  if (!validateEmail(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email address'
    });
  }
  
  const queueItem = addToQueue({ to, subject, text, html, from, attachments });
  
  res.json({
    success: true,
    message: 'Email added to queue',
    queueId: queueItem.id,
    queueSize: emailQueue.length
  });
});

// Email validation endpoint
app.post('/agent/validate-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }
  
  const isValid = validateEmail(email);
  
  res.json({
    success: true,
    email,
    valid: isValid
  });
});

// Queue status endpoint
app.get('/agent/queue-status', (req, res) => {
  res.json({
    success: true,
    queueSize: emailQueue.length,
    isProcessing: isProcessingQueue,
    items: emailQueue.map(item => ({
      id: item.id,
      to: item.to,
      status: item.status,
      createdAt: item.createdAt
    }))
  });
});

// NEW: Analytics endpoint
app.get('/agent/analytics', apiKeyAuth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const stats = db.getStats(days);
  const totalStats = db.getTotalStats();
  
  res.json({
    success: true,
    period: `${days} days`,
    daily: stats,
    totals: totalStats
  });
});

// NEW: Email history endpoint
app.get('/agent/history', apiKeyAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;
  
  const history = db.getEmailHistory(limit, offset, status);
  
  res.json({
    success: true,
    count: history.length,
    limit,
    offset,
    data: history
  });
});

// NEW: Schedule email endpoint
app.post('/agent/schedule-email', rateLimitMiddleware, apiKeyAuth, async (req, res) => {
  const { to, subject, text, html, scheduleTime } = req.body;
  
  if (!to || !subject || (!text && !html) || !scheduleTime) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, text/html, and scheduleTime'
    });
  }
  
  if (!validateEmail(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email address'
    });
  }
  
  // Validate schedule time is in the future
  const scheduleDate = new Date(scheduleTime);
  if (scheduleDate <= new Date()) {
    return res.status(400).json({
      success: false,
      error: 'Schedule time must be in the future'
    });
  }
  
  const result = db.scheduleEmail({
    recipient: to,
    subject,
    text,
    html,
    scheduleTime
  });
  
  res.json({
    success: true,
    message: 'Email scheduled successfully',
    scheduleId: result.lastInsertRowid,
    scheduledFor: scheduleTime
  });
});

// NEW: Create API key endpoint
app.post('/agent/create-api-key', (req, res) => {
  const { name, masterKey } = req.body;
  
  // Require master key for creating API keys
  if (masterKey !== process.env.MASTER_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid master key'
    });
  }
  
  const crypto = require('crypto');
  const apiKey = 'nlk_' + crypto.randomBytes(32).toString('hex');
  
  db.createApiKey(apiKey, name || 'Unnamed Key');
  
  res.json({
    success: true,
    apiKey,
    name: name || 'Unnamed Key',
    message: 'Store this key securely - it won\'t be shown again'
  });
});

// Generate email template with MORE templates
app.post('/agent/generate-template', rateLimitMiddleware, (req, res) => {
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
      
    case 'password-reset':
      template.subject = 'Password Reset Request';
      template.text = `Hello ${data?.name || 'there'},\n\nWe received a request to reset your password. Click the link below to reset it:\n\n${data?.resetLink || 'https://example.com/reset'}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe NOIZYLAB Team`;
      template.html = `<h2>Password Reset Request</h2><p>Hello ${data?.name || 'there'},</p><p>We received a request to reset your password.</p><p><a href="${data?.resetLink || 'https://example.com/reset'}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p><p>If you didn't request this, please ignore this email.</p><p>Best regards,<br>The NOIZYLAB Team</p>`;
      break;
      
    case 'invoice':
      template.subject = `Invoice #${data?.invoiceNumber || '12345'}`;
      template.text = `Hello ${data?.name || 'there'},\n\nThank you for your purchase. Your invoice is ready.\n\nInvoice #: ${data?.invoiceNumber || '12345'}\nAmount: $${data?.amount || '0.00'}\nDate: ${data?.date || new Date().toLocaleDateString()}\n\nBest regards,\nThe NOIZYLAB Team`;
      template.html = `<h2>Invoice #${data?.invoiceNumber || '12345'}</h2><p>Hello ${data?.name || 'there'},</p><p>Thank you for your purchase. Your invoice is ready.</p><table style="border-collapse: collapse; width: 100%;"><tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice #:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data?.invoiceNumber || '12345'}</td></tr><tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">$${data?.amount || '0.00'}</td></tr><tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${data?.date || new Date().toLocaleDateString()}</td></tr></table><p>Best regards,<br>The NOIZYLAB Team</p>`;
      break;
      
    case 'confirmation':
      template.subject = 'Confirmation - Action Required';
      template.text = `Hello ${data?.name || 'there'},\n\nPlease confirm your action by clicking the link below:\n\n${data?.confirmLink || 'https://example.com/confirm'}\n\nBest regards,\nThe NOIZYLAB Team`;
      template.html = `<h2>Confirmation Required</h2><p>Hello ${data?.name || 'there'},</p><p>Please confirm your action by clicking the button below:</p><p><a href="${data?.confirmLink || 'https://example.com/confirm'}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Action</a></p><p>Best regards,<br>The NOIZYLAB Team</p>`;
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
    console.log('🚀 NOIZYLAB Email Agent - HYPER-DRIVE MODE');
    console.log('==========================================');
    console.log(`Server: http://${config.server.host}:${config.server.port}`);
    console.log(`Health: http://localhost:${config.server.port}/health`);
    console.log(`Agent Info: http://localhost:${config.server.port}/agent/info`);
    console.log('==========================================');
    console.log('⚡ NEW FEATURES:');
    console.log('  • Bulk Email Sending');
    console.log('  • Email Queue System');
    console.log('  • Attachment Support');
    console.log('  • Email Validation');
    console.log('  • 6 Email Templates');
    console.log('==========================================');
    console.log('');
    log('info', 'Agent ready at WARP SPEED!');
  });
}

// Start the agent
startAgent();

module.exports = { sendEmail, verifyConnection };
