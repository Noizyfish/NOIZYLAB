/**
 * NOIZYLAB - Multi-Account Email Client
 * Unified email client for all accounts with AI features
 */

const { EventEmitter } = require('events');
const { NOIZYLAB_ACCOUNTS, PROVIDERS } = require('./email-config-manager');

// ============================================
// EMAIL MESSAGE CLASS
// ============================================

class EmailMessage {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.from = data.from || {};
    this.to = data.to || [];
    this.cc = data.cc || [];
    this.bcc = data.bcc || [];
    this.subject = data.subject || '';
    this.text = data.text || '';
    this.html = data.html || '';
    this.attachments = data.attachments || [];
    this.headers = data.headers || {};
    this.date = data.date || new Date();
    this.flags = data.flags || [];
    this.labels = data.labels || [];
    this.threadId = data.threadId || null;
    this.accountId = data.accountId || null;
  }

  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get isRead() {
    return this.flags.includes('\\Seen');
  }

  get isStarred() {
    return this.flags.includes('\\Flagged');
  }

  get hasAttachments() {
    return this.attachments.length > 0;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      cc: this.cc,
      subject: this.subject,
      text: this.text,
      date: this.date,
      flags: this.flags,
      hasAttachments: this.hasAttachments,
      accountId: this.accountId
    };
  }
}

// ============================================
// EMAIL ACCOUNT CLIENT
// ============================================

class EmailAccountClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.id = config.id;
    this.email = config.email;
    this.connected = false;
    this.folders = [];
    this.messageCache = new Map();
  }

  async connect() {
    // Simulate connection (replace with actual IMAP connection)
    console.log(`Connecting to ${this.email}...`);

    // In production, use node-imap or imapflow
    this.connected = true;
    this.emit('connected', { account: this.email });

    return this;
  }

  async disconnect() {
    this.connected = false;
    this.emit('disconnected', { account: this.email });
  }

  async getFolders() {
    // Standard IMAP folders
    this.folders = [
      { name: 'INBOX', path: 'INBOX', special: 'inbox' },
      { name: 'Sent', path: '[Gmail]/Sent Mail', special: 'sent' },
      { name: 'Drafts', path: '[Gmail]/Drafts', special: 'drafts' },
      { name: 'Spam', path: '[Gmail]/Spam', special: 'spam' },
      { name: 'Trash', path: '[Gmail]/Trash', special: 'trash' },
      { name: 'All Mail', path: '[Gmail]/All Mail', special: 'all' }
    ];

    return this.folders;
  }

  async getMessages(folder = 'INBOX', options = {}) {
    const { limit = 50, offset = 0, search = null } = options;

    // In production, fetch from IMAP
    // This is a simulation
    const messages = [];

    this.emit('messages', { account: this.email, folder, count: messages.length });
    return messages;
  }

  async getMessage(messageId) {
    if (this.messageCache.has(messageId)) {
      return this.messageCache.get(messageId);
    }

    // Fetch from server
    // In production, use IMAP fetch
    return null;
  }

  async sendMessage(message) {
    // In production, use nodemailer SMTP
    const emailMessage = new EmailMessage({
      ...message,
      from: { address: this.email, name: this.config.name },
      accountId: this.id,
      date: new Date()
    });

    console.log(`Sending email from ${this.email} to ${message.to}`);

    this.emit('sent', { account: this.email, message: emailMessage });
    return emailMessage;
  }

  async markAsRead(messageIds) {
    console.log(`Marking ${messageIds.length} messages as read`);
    this.emit('flagsChanged', { messageIds, flags: ['\\Seen'] });
  }

  async markAsUnread(messageIds) {
    console.log(`Marking ${messageIds.length} messages as unread`);
    this.emit('flagsChanged', { messageIds, flags: [] });
  }

  async star(messageIds) {
    console.log(`Starring ${messageIds.length} messages`);
    this.emit('flagsChanged', { messageIds, flags: ['\\Flagged'] });
  }

  async moveToFolder(messageIds, folder) {
    console.log(`Moving ${messageIds.length} messages to ${folder}`);
    this.emit('moved', { messageIds, folder });
  }

  async deleteMessages(messageIds) {
    console.log(`Deleting ${messageIds.length} messages`);
    this.emit('deleted', { messageIds });
  }
}

// ============================================
// MULTI-ACCOUNT EMAIL CLIENT
// ============================================

class MultiAccountEmailClient extends EventEmitter {
  constructor() {
    super();
    this.accounts = new Map();
    this.activeAccount = null;
    this.unifiedInbox = [];
  }

  addAccount(config) {
    const client = new EmailAccountClient(config);

    // Forward events
    client.on('connected', (data) => this.emit('accountConnected', data));
    client.on('disconnected', (data) => this.emit('accountDisconnected', data));
    client.on('messages', (data) => this.emit('messages', data));
    client.on('sent', (data) => this.emit('messageSent', data));

    this.accounts.set(config.id, client);
    return client;
  }

  getAccount(id) {
    return this.accounts.get(id);
  }

  getAccountByEmail(email) {
    for (const account of this.accounts.values()) {
      if (account.email === email) return account;
    }
    return null;
  }

  async connectAll() {
    const results = [];

    for (const account of this.accounts.values()) {
      try {
        await account.connect();
        results.push({ account: account.email, status: 'connected' });
      } catch (error) {
        results.push({ account: account.email, status: 'failed', error: error.message });
      }
    }

    return results;
  }

  async disconnectAll() {
    for (const account of this.accounts.values()) {
      await account.disconnect();
    }
  }

  async getUnifiedInbox(options = {}) {
    const messages = [];

    for (const account of this.accounts.values()) {
      if (!account.connected) continue;

      const accountMessages = await account.getMessages('INBOX', options);
      messages.push(...accountMessages.map(m => ({
        ...m,
        accountId: account.id,
        accountEmail: account.email
      })));
    }

    // Sort by date descending
    messages.sort((a, b) => new Date(b.date) - new Date(a.date));

    this.unifiedInbox = messages;
    return messages;
  }

  async sendFromAccount(accountId, message) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    return account.sendMessage(message);
  }

  async sendFromBestMatch(recipientDomain, message) {
    // Find best account to send from based on recipient domain
    // Prefer matching domain, then primary accounts

    for (const account of this.accounts.values()) {
      if (account.config.domain === recipientDomain) {
        return account.sendMessage(message);
      }
    }

    // Fall back to first account
    const firstAccount = this.accounts.values().next().value;
    if (firstAccount) {
      return firstAccount.sendMessage(message);
    }

    throw new Error('No accounts available');
  }

  getStats() {
    const stats = {
      totalAccounts: this.accounts.size,
      connectedAccounts: 0,
      accountDetails: []
    };

    for (const account of this.accounts.values()) {
      if (account.connected) stats.connectedAccounts++;
      stats.accountDetails.push({
        id: account.id,
        email: account.email,
        connected: account.connected
      });
    }

    return stats;
  }
}

// ============================================
// AI EMAIL FEATURES
// ============================================

class AIEmailAssistant {
  constructor(options = {}) {
    this.client = options.client;
    this.templates = new Map();
    this.smartReplies = new Map();
  }

  // Analyze email content
  analyzeEmail(message) {
    const analysis = {
      sentiment: this.detectSentiment(message.text || message.html),
      priority: this.detectPriority(message),
      category: this.categorize(message),
      suggestedLabels: this.suggestLabels(message),
      isActionRequired: this.detectActionRequired(message),
      summary: this.summarize(message.text || message.html)
    };

    return analysis;
  }

  detectSentiment(text) {
    if (!text) return 'neutral';

    const positiveWords = ['thanks', 'great', 'awesome', 'excellent', 'happy', 'pleased', 'appreciate'];
    const negativeWords = ['urgent', 'problem', 'issue', 'complaint', 'disappointed', 'frustrated', 'asap'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  detectPriority(message) {
    const subject = (message.subject || '').toLowerCase();
    const text = (message.text || '').toLowerCase();

    const urgentIndicators = ['urgent', 'asap', 'immediate', 'emergency', 'critical', 'important'];
    const lowPriorityIndicators = ['fyi', 'no rush', 'when you have time', 'low priority'];

    for (const indicator of urgentIndicators) {
      if (subject.includes(indicator) || text.includes(indicator)) {
        return 'high';
      }
    }

    for (const indicator of lowPriorityIndicators) {
      if (subject.includes(indicator) || text.includes(indicator)) {
        return 'low';
      }
    }

    return 'normal';
  }

  categorize(message) {
    const subject = (message.subject || '').toLowerCase();
    const from = (message.from?.address || '').toLowerCase();

    // Business categories
    if (from.includes('noreply') || from.includes('no-reply')) return 'automated';
    if (subject.includes('invoice') || subject.includes('payment')) return 'finance';
    if (subject.includes('meeting') || subject.includes('calendar')) return 'calendar';
    if (subject.includes('support') || subject.includes('help')) return 'support';
    if (subject.includes('newsletter') || subject.includes('subscribe')) return 'newsletter';
    if (subject.includes('order') || subject.includes('shipping')) return 'orders';

    return 'general';
  }

  suggestLabels(message) {
    const labels = [];
    const category = this.categorize(message);
    const priority = this.detectPriority(message);

    labels.push(category);

    if (priority === 'high') labels.push('urgent');
    if (message.hasAttachments) labels.push('has-attachments');

    return labels;
  }

  detectActionRequired(message) {
    const text = (message.text || message.subject || '').toLowerCase();

    const actionIndicators = [
      'please respond', 'please reply', 'let me know',
      'action required', 'response needed', 'waiting for',
      'could you', 'can you', 'would you', 'need you to',
      '?'
    ];

    return actionIndicators.some(indicator => text.includes(indicator));
  }

  summarize(text, maxLength = 150) {
    if (!text) return '';

    // Simple extractive summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    if (sentences.length === 0) return '';
    if (sentences[0].length <= maxLength) return sentences[0].trim();

    return sentences[0].substring(0, maxLength).trim() + '...';
  }

  // Generate smart reply suggestions
  generateSmartReplies(message) {
    const sentiment = this.detectSentiment(message.text);
    const isQuestion = (message.text || '').includes('?');
    const category = this.categorize(message);

    const replies = [];

    if (isQuestion) {
      replies.push("I'll look into this and get back to you shortly.");
      replies.push("Let me check on that and follow up.");
      replies.push("Thanks for reaching out! I'll have an answer for you soon.");
    } else if (sentiment === 'positive') {
      replies.push("Thank you! I appreciate it.");
      replies.push("Great, thanks for letting me know!");
      replies.push("Awesome, thank you!");
    } else if (sentiment === 'negative') {
      replies.push("I understand your concern. Let me look into this right away.");
      replies.push("I apologize for any inconvenience. I'll address this immediately.");
      replies.push("Thank you for bringing this to my attention. I'll resolve this ASAP.");
    } else {
      replies.push("Thanks for the update!");
      replies.push("Got it, thank you!");
      replies.push("Thanks for letting me know.");
    }

    if (category === 'calendar') {
      replies.push("That time works for me!");
      replies.push("I'll add it to my calendar.");
    }

    return replies.slice(0, 3);
  }

  // Auto-compose email
  composeEmail(params) {
    const { type, recipient, subject, context } = params;

    const templates = {
      'follow-up': {
        subject: `Following up: ${context?.originalSubject || 'Our conversation'}`,
        body: `Hi ${recipient?.name || 'there'},\n\nI wanted to follow up on our previous conversation. ${context?.note || ''}\n\nPlease let me know if you have any questions.\n\nBest regards`
      },
      'thank-you': {
        subject: `Thank you${context?.for ? ` for ${context.for}` : ''}`,
        body: `Hi ${recipient?.name || 'there'},\n\nThank you so much${context?.for ? ` for ${context.for}` : ''}. I really appreciate it.\n\nBest regards`
      },
      'introduction': {
        subject: `Introduction: ${context?.topic || 'Nice to meet you'}`,
        body: `Hi ${recipient?.name || 'there'},\n\nI hope this email finds you well. My name is ${context?.senderName || '[Your Name]'} and I'm reaching out to ${context?.reason || 'introduce myself'}.\n\n${context?.details || ''}\n\nI'd love to connect and learn more about ${context?.interest || 'your work'}.\n\nBest regards`
      },
      'meeting-request': {
        subject: `Meeting Request: ${context?.topic || 'Discussion'}`,
        body: `Hi ${recipient?.name || 'there'},\n\nI'd like to schedule a meeting to discuss ${context?.topic || 'a few items'}.\n\nWould any of the following times work for you?\n${context?.times || '- [Suggest times]'}\n\nPlease let me know what works best for your schedule.\n\nBest regards`
      }
    };

    return templates[type] || templates['follow-up'];
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EmailMessage,
  EmailAccountClient,
  MultiAccountEmailClient,
  AIEmailAssistant,

  // Quick setup with NOIZYLAB accounts
  createNoizyLabClient: () => {
    const client = new MultiAccountEmailClient();

    NOIZYLAB_ACCOUNTS.forEach(account => {
      client.addAccount({
        ...account,
        ...PROVIDERS[account.provider]
      });
    });

    return client;
  }
};
