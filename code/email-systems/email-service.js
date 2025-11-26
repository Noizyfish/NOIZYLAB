/**
 * NOIZYLAB Email Service - UPGRADED V2.0
 * Professional async email system with queue, templates, and retry logic
 */

const EventEmitter = require('events');

class NoizyMailService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      smtp: {
        host: config.smtpHost || process.env.SMTP_HOST,
        port: config.smtpPort || 587,
        secure: config.secure || false,
        auth: {
          user: config.user || process.env.SMTP_USER,
          pass: config.pass || process.env.SMTP_PASS
        }
      },
      defaults: {
        from: config.defaultFrom || 'noreply@noizylab.com',
        replyTo: config.replyTo || 'support@noizylab.com'
      },
      queue: {
        maxRetries: config.maxRetries || 3,
        retryDelay: config.retryDelay || 5000,
        concurrency: config.concurrency || 10
      }
    };

    this.queue = [];
    this.processing = false;
    this.stats = { sent: 0, failed: 0, queued: 0 };
  }

  // Template engine
  templates = {
    welcome: (data) => ({
      subject: `Welcome to NOIZYLAB, ${data.name}!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">NOIZYLAB</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">NEW ERA OF INNOVATION</p>
          </div>
          <div style="padding: 40px; background: #f8f9fa;">
            <h2 style="color: #333;">Welcome aboard, ${data.name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              You're now part of the NOIZYLAB community. Get ready for unlimited possibilities.
            </p>
            <a href="${data.activationLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              Activate Your Account
            </a>
          </div>
          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
            NOIZYLAB &copy; ${new Date().getFullYear()} | All Rights Reserved
          </div>
        </div>
      `
    }),

    notification: (data) => ({
      subject: data.subject || 'NOIZYLAB Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-left: 4px solid #667eea; padding-left: 20px;">
            <h3 style="color: #333; margin: 0 0 10px;">${data.title}</h3>
            <p style="color: #666; margin: 0;">${data.message}</p>
          </div>
          ${data.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin-top: 20px;">Take Action</a>` : ''}
        </div>
      `
    }),

    alert: (data) => ({
      subject: `[ALERT] ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ff4757; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">ALERT</h2>
          </div>
          <div style="padding: 30px; background: #fff5f5; border: 1px solid #ffcccc;">
            <h3 style="color: #c0392b;">${data.title}</h3>
            <p style="color: #666;">${data.message}</p>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">${data.details || ''}</pre>
          </div>
        </div>
      `
    }),

    report: (data) => ({
      subject: `NOIZYLAB Report: ${data.reportType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: #2c3e50; color: white; padding: 30px;">
            <h1 style="margin: 0;">NOIZYLAB REPORT</h1>
            <p style="margin: 10px 0 0; opacity: 0.8;">${data.reportType} | ${new Date().toLocaleDateString()}</p>
          </div>
          <div style="padding: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
              ${Object.entries(data.metrics || {}).map(([key, value]) => `
                <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">${key}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${value}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </div>
      `
    })
  };

  // Send email with template
  async send(templateName, to, data, options = {}) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    const { subject, html } = template(data);

    const mailOptions = {
      from: options.from || this.config.defaults.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      ...options
    };

    return this.sendRaw(mailOptions);
  }

  // Send raw email
  async sendRaw(mailOptions) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        mailOptions,
        attempts: 0,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.stats.queued++;
      this.emit('queued', mailOptions);
      this.processQueue();
    });
  }

  // Process email queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.config.queue.concurrency);

    await Promise.allSettled(
      batch.map(item => this.attemptSend(item))
    );

    this.processing = false;

    if (this.queue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  // Attempt to send with retry
  async attemptSend(item) {
    try {
      // Simulated send - replace with actual nodemailer transport
      await this.transport(item.mailOptions);

      this.stats.sent++;
      this.stats.queued--;
      this.emit('sent', item.mailOptions);
      item.resolve({ success: true, messageId: this.generateMessageId() });

    } catch (error) {
      item.attempts++;

      if (item.attempts < this.config.queue.maxRetries) {
        // Retry with exponential backoff
        setTimeout(() => {
          this.queue.unshift(item);
          this.processQueue();
        }, this.config.queue.retryDelay * Math.pow(2, item.attempts - 1));

        this.emit('retry', { mailOptions: item.mailOptions, attempt: item.attempts });
      } else {
        this.stats.failed++;
        this.stats.queued--;
        this.emit('failed', { mailOptions: item.mailOptions, error });
        item.reject(error);
      }
    }
  }

  // Transport layer (override with actual implementation)
  async transport(mailOptions) {
    // Placeholder - integrate with nodemailer or API
    console.log('[NOIZYMAIL] Sending:', mailOptions.to, '-', mailOptions.subject);
    return { messageId: this.generateMessageId() };
  }

  generateMessageId() {
    return `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@noizylab.com>`;
  }

  getStats() {
    return { ...this.stats, queueLength: this.queue.length };
  }
}

// Bulk sender for campaigns
class NoizyBulkMailer {
  constructor(mailService, options = {}) {
    this.mailer = mailService;
    this.batchSize = options.batchSize || 100;
    this.delayBetweenBatches = options.delay || 1000;
  }

  async sendCampaign(template, recipients, getData) {
    const results = { sent: 0, failed: 0, errors: [] };

    for (let i = 0; i < recipients.length; i += this.batchSize) {
      const batch = recipients.slice(i, i + this.batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(recipient =>
          this.mailer.send(template, recipient.email, getData(recipient))
        )
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ recipient: batch[idx], error: result.reason });
        }
      });

      // Rate limiting delay
      if (i + this.batchSize < recipients.length) {
        await new Promise(r => setTimeout(r, this.delayBetweenBatches));
      }
    }

    return results;
  }
}

module.exports = { NoizyMailService, NoizyBulkMailer };
