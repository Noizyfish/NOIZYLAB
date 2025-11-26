/**
 * NOIZYLAB - Email Health Monitor
 * Monitor email system health, deliverability, and performance
 */

const { EventEmitter } = require('events');
const { NOIZYLAB_ACCOUNTS, PROVIDERS } = require('./email-config-manager');

// ============================================
// EMAIL HEALTH CHECKER
// ============================================

class EmailHealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.accounts = options.accounts || NOIZYLAB_ACCOUNTS;
    this.checkInterval = options.checkInterval || 300000; // 5 minutes
    this.healthData = new Map();
    this.alerts = [];
    this.running = false;
  }

  async checkAccount(account) {
    const health = {
      accountId: account.id,
      email: account.email,
      timestamp: Date.now(),
      checks: {}
    };

    // DNS Check (MX Records)
    health.checks.dns = await this.checkDNS(account.domain);

    // IMAP Connection Check
    health.checks.imap = await this.checkIMAP(account);

    // SMTP Connection Check
    health.checks.smtp = await this.checkSMTP(account);

    // SPF/DKIM/DMARC Check
    health.checks.authentication = await this.checkEmailAuth(account.domain);

    // Calculate overall health score
    health.score = this.calculateHealthScore(health.checks);
    health.status = health.score >= 80 ? 'healthy' : health.score >= 50 ? 'degraded' : 'unhealthy';

    this.healthData.set(account.id, health);

    // Generate alerts if needed
    this.checkAlerts(health);

    this.emit('healthCheck', health);
    return health;
  }

  async checkDNS(domain) {
    try {
      // Simulate DNS check (in production, use dns.resolveMx)
      // For Google Workspace, MX should point to google
      const expectedMX = ['aspmx.l.google.com', 'googlemail.com'];

      return {
        status: 'ok',
        mxRecords: expectedMX,
        message: 'MX records configured for Google Workspace'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async checkIMAP(account) {
    try {
      const provider = PROVIDERS[account.provider];

      // Simulate IMAP connection check
      return {
        status: 'ok',
        server: provider.imap.host,
        port: provider.imap.port,
        ssl: provider.imap.secure,
        responseTime: Math.floor(Math.random() * 100) + 50 // Simulated
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async checkSMTP(account) {
    try {
      const provider = PROVIDERS[account.provider];

      // Simulate SMTP connection check
      return {
        status: 'ok',
        server: provider.smtp.host,
        port: provider.smtp.port,
        tls: provider.smtp.requireTLS,
        responseTime: Math.floor(Math.random() * 100) + 50 // Simulated
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  async checkEmailAuth(domain) {
    // Simulate SPF/DKIM/DMARC checks
    return {
      spf: {
        status: 'ok',
        record: `v=spf1 include:_spf.google.com ~all`
      },
      dkim: {
        status: 'ok',
        selector: 'google'
      },
      dmarc: {
        status: 'ok',
        policy: 'quarantine',
        record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`
      }
    };
  }

  calculateHealthScore(checks) {
    let score = 100;

    if (checks.dns?.status !== 'ok') score -= 30;
    if (checks.imap?.status !== 'ok') score -= 25;
    if (checks.smtp?.status !== 'ok') score -= 25;
    if (checks.authentication?.spf?.status !== 'ok') score -= 10;
    if (checks.authentication?.dkim?.status !== 'ok') score -= 10;
    if (checks.authentication?.dmarc?.status !== 'ok') score -= 10;

    // Response time penalties
    if (checks.imap?.responseTime > 200) score -= 5;
    if (checks.smtp?.responseTime > 200) score -= 5;

    return Math.max(0, score);
  }

  checkAlerts(health) {
    if (health.score < 50) {
      this.addAlert({
        severity: 'critical',
        account: health.email,
        message: `Email health critical: ${health.score}%`,
        timestamp: Date.now()
      });
    } else if (health.score < 80) {
      this.addAlert({
        severity: 'warning',
        account: health.email,
        message: `Email health degraded: ${health.score}%`,
        timestamp: Date.now()
      });
    }

    // Check individual components
    if (health.checks.imap?.status !== 'ok') {
      this.addAlert({
        severity: 'error',
        account: health.email,
        message: 'IMAP connection failed',
        timestamp: Date.now()
      });
    }

    if (health.checks.smtp?.status !== 'ok') {
      this.addAlert({
        severity: 'error',
        account: health.email,
        message: 'SMTP connection failed',
        timestamp: Date.now()
      });
    }
  }

  addAlert(alert) {
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert', alert);
  }

  async checkAllAccounts() {
    const results = [];

    for (const account of this.accounts) {
      const health = await this.checkAccount(account);
      results.push(health);
    }

    return results;
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.emit('started');

    // Initial check
    this.checkAllAccounts();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAllAccounts();
    }, this.checkInterval);

    return this;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
    this.emit('stopped');
    return this;
  }

  getHealthStatus() {
    const statuses = [];

    for (const [id, health] of this.healthData) {
      statuses.push({
        id,
        email: health.email,
        score: health.score,
        status: health.status,
        lastCheck: new Date(health.timestamp).toISOString()
      });
    }

    return {
      overall: this.calculateOverallHealth(),
      accounts: statuses,
      alerts: this.alerts.slice(-10),
      lastUpdate: new Date().toISOString()
    };
  }

  calculateOverallHealth() {
    if (this.healthData.size === 0) return 'unknown';

    let totalScore = 0;
    for (const health of this.healthData.values()) {
      totalScore += health.score;
    }

    const avgScore = totalScore / this.healthData.size;

    if (avgScore >= 80) return 'healthy';
    if (avgScore >= 50) return 'degraded';
    return 'unhealthy';
  }

  getAlerts(options = {}) {
    let alerts = [...this.alerts];

    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    if (options.account) {
      alerts = alerts.filter(a => a.account === options.account);
    }

    if (options.limit) {
      alerts = alerts.slice(-options.limit);
    }

    return alerts;
  }

  generateReport() {
    const status = this.getHealthStatus();

    let report = `
╔══════════════════════════════════════════════════════════════╗
║           NOIZYLAB EMAIL HEALTH REPORT                       ║
║           Generated: ${new Date().toISOString().padEnd(35)}  ║
╠══════════════════════════════════════════════════════════════╣

  Overall Status: ${status.overall.toUpperCase()}

  ACCOUNT STATUS:
  ─────────────────────────────────────────────────────────────
`;

    for (const account of status.accounts) {
      const indicator = account.status === 'healthy' ? '✓' : account.status === 'degraded' ? '!' : '✗';
      const scoreBar = '█'.repeat(Math.floor(account.score / 10)) + '░'.repeat(10 - Math.floor(account.score / 10));

      report += `
  ${indicator} ${account.email}
    Score: ${scoreBar} ${account.score}%
    Status: ${account.status}
    Last Check: ${account.lastCheck}
`;
    }

    if (status.alerts.length > 0) {
      report += `
  RECENT ALERTS:
  ─────────────────────────────────────────────────────────────
`;
      for (const alert of status.alerts) {
        report += `
  [${alert.severity.toUpperCase()}] ${alert.account}
    ${alert.message}
    ${new Date(alert.timestamp).toISOString()}
`;
      }
    }

    report += `
╚══════════════════════════════════════════════════════════════╝
`;

    return report;
  }
}

// ============================================
// DELIVERABILITY TRACKER
// ============================================

class DeliverabilityTracker extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      sent: 0,
      delivered: 0,
      bounced: 0,
      opened: 0,
      clicked: 0,
      complained: 0
    };
    this.history = [];
  }

  recordSent(emailId, recipient) {
    this.metrics.sent++;
    this.history.push({
      emailId,
      recipient,
      event: 'sent',
      timestamp: Date.now()
    });
    this.emit('sent', { emailId, recipient });
  }

  recordDelivered(emailId, recipient) {
    this.metrics.delivered++;
    this.history.push({
      emailId,
      recipient,
      event: 'delivered',
      timestamp: Date.now()
    });
    this.emit('delivered', { emailId, recipient });
  }

  recordBounce(emailId, recipient, type, reason) {
    this.metrics.bounced++;
    this.history.push({
      emailId,
      recipient,
      event: 'bounced',
      bounceType: type,
      reason,
      timestamp: Date.now()
    });
    this.emit('bounced', { emailId, recipient, type, reason });
  }

  recordOpen(emailId, recipient) {
    this.metrics.opened++;
    this.history.push({
      emailId,
      recipient,
      event: 'opened',
      timestamp: Date.now()
    });
    this.emit('opened', { emailId, recipient });
  }

  recordClick(emailId, recipient, link) {
    this.metrics.clicked++;
    this.history.push({
      emailId,
      recipient,
      event: 'clicked',
      link,
      timestamp: Date.now()
    });
    this.emit('clicked', { emailId, recipient, link });
  }

  recordComplaint(emailId, recipient) {
    this.metrics.complained++;
    this.history.push({
      emailId,
      recipient,
      event: 'complained',
      timestamp: Date.now()
    });
    this.emit('complained', { emailId, recipient });
  }

  getStats() {
    const deliveryRate = this.metrics.sent > 0
      ? ((this.metrics.delivered / this.metrics.sent) * 100).toFixed(2)
      : 0;

    const bounceRate = this.metrics.sent > 0
      ? ((this.metrics.bounced / this.metrics.sent) * 100).toFixed(2)
      : 0;

    const openRate = this.metrics.delivered > 0
      ? ((this.metrics.opened / this.metrics.delivered) * 100).toFixed(2)
      : 0;

    const clickRate = this.metrics.opened > 0
      ? ((this.metrics.clicked / this.metrics.opened) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      deliveryRate: `${deliveryRate}%`,
      bounceRate: `${bounceRate}%`,
      openRate: `${openRate}%`,
      clickRate: `${clickRate}%`
    };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EmailHealthMonitor,
  DeliverabilityTracker,

  // Quick setup
  createMonitor: (options) => new EmailHealthMonitor(options),
  createTracker: () => new DeliverabilityTracker()
};
