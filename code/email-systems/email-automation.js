/**
 * NOIZYLAB - Email Automation & Workflows
 * Automated email processing, rules, and integrations
 */

const { EventEmitter } = require('events');

// ============================================
// EMAIL RULES ENGINE
// ============================================

class EmailRulesEngine extends EventEmitter {
  constructor() {
    super();
    this.rules = [];
  }

  addRule(rule) {
    const fullRule = {
      id: rule.id || `rule_${Date.now()}`,
      name: rule.name,
      enabled: rule.enabled !== false,
      priority: rule.priority || 0,
      conditions: rule.conditions || [],
      actions: rule.actions || [],
      stopProcessing: rule.stopProcessing || false,
      createdAt: Date.now()
    };

    this.rules.push(fullRule);
    this.rules.sort((a, b) => b.priority - a.priority);

    return fullRule;
  }

  removeRule(ruleId) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  async processEmail(email) {
    const appliedRules = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateConditions(email, rule.conditions)) {
        await this.executeActions(email, rule.actions);
        appliedRules.push(rule);

        this.emit('ruleApplied', { email, rule });

        if (rule.stopProcessing) break;
      }
    }

    return appliedRules;
  }

  evaluateConditions(email, conditions) {
    return conditions.every(condition => {
      const value = this.getEmailField(email, condition.field);

      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'not_contains':
          return !String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'starts_with':
          return String(value).toLowerCase().startsWith(String(condition.value).toLowerCase());
        case 'ends_with':
          return String(value).toLowerCase().endsWith(String(condition.value).toLowerCase());
        case 'matches':
          return new RegExp(condition.value, 'i').test(value);
        case 'greater_than':
          return value > condition.value;
        case 'less_than':
          return value < condition.value;
        case 'in':
          return condition.value.includes(value);
        case 'not_in':
          return !condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  getEmailField(email, field) {
    const fieldMap = {
      'from': email.from?.address,
      'from_name': email.from?.name,
      'from_domain': email.from?.address?.split('@')[1],
      'to': email.to?.[0]?.address,
      'subject': email.subject,
      'body': email.text || email.html,
      'has_attachments': email.attachments?.length > 0,
      'attachment_count': email.attachments?.length || 0,
      'date': email.date,
      'size': email.size
    };

    return fieldMap[field];
  }

  async executeActions(email, actions) {
    for (const action of actions) {
      switch (action.type) {
        case 'move':
          email._actions = email._actions || [];
          email._actions.push({ type: 'move', folder: action.folder });
          break;

        case 'label':
          email.labels = email.labels || [];
          email.labels.push(action.label);
          break;

        case 'star':
          email.flags = email.flags || [];
          email.flags.push('\\Flagged');
          break;

        case 'mark_read':
          email.flags = email.flags || [];
          email.flags.push('\\Seen');
          break;

        case 'mark_important':
          email.labels = email.labels || [];
          email.labels.push('important');
          break;

        case 'forward':
          this.emit('forward', { email, to: action.to });
          break;

        case 'reply':
          this.emit('autoReply', { email, template: action.template });
          break;

        case 'webhook':
          this.emit('webhook', { email, url: action.url, payload: action.payload });
          break;

        case 'notify':
          this.emit('notification', { email, channel: action.channel, message: action.message });
          break;

        case 'archive':
          email._actions = email._actions || [];
          email._actions.push({ type: 'archive' });
          break;

        case 'delete':
          email._actions = email._actions || [];
          email._actions.push({ type: 'delete' });
          break;
      }
    }
  }

  getRules() {
    return this.rules;
  }

  exportRules() {
    return JSON.stringify(this.rules, null, 2);
  }

  importRules(rulesJson) {
    const rules = JSON.parse(rulesJson);
    rules.forEach(rule => this.addRule(rule));
    return rules.length;
  }
}

// ============================================
// AUTO-RESPONDER
// ============================================

class AutoResponder extends EventEmitter {
  constructor(options = {}) {
    super();
    this.templates = new Map();
    this.schedules = new Map();
    this.responseLog = [];
    this.cooldown = options.cooldown || 3600000; // 1 hour default
    this.recentResponses = new Map();
  }

  addTemplate(id, template) {
    this.templates.set(id, {
      id,
      subject: template.subject,
      body: template.body,
      html: template.html,
      attachments: template.attachments || [],
      conditions: template.conditions || [],
      enabled: template.enabled !== false
    });
  }

  setSchedule(scheduleId, schedule) {
    this.schedules.set(scheduleId, {
      id: scheduleId,
      templateId: schedule.templateId,
      startDate: schedule.startDate ? new Date(schedule.startDate) : null,
      endDate: schedule.endDate ? new Date(schedule.endDate) : null,
      daysOfWeek: schedule.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      startTime: schedule.startTime || '00:00',
      endTime: schedule.endTime || '23:59',
      enabled: schedule.enabled !== false
    });
  }

  shouldRespond(email) {
    // Check cooldown
    const senderKey = email.from?.address;
    if (senderKey && this.recentResponses.has(senderKey)) {
      const lastResponse = this.recentResponses.get(senderKey);
      if (Date.now() - lastResponse < this.cooldown) {
        return { respond: false, reason: 'cooldown' };
      }
    }

    // Check if it's a no-reply address
    const noReplyPatterns = ['noreply', 'no-reply', 'donotreply', 'mailer-daemon'];
    if (noReplyPatterns.some(p => senderKey?.toLowerCase().includes(p))) {
      return { respond: false, reason: 'no-reply-address' };
    }

    // Check schedules
    const now = new Date();
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      if (schedule.startDate && now < schedule.startDate) continue;
      if (schedule.endDate && now > schedule.endDate) continue;

      const dayOfWeek = now.getDay();
      if (!schedule.daysOfWeek.includes(dayOfWeek)) continue;

      const currentTime = now.toTimeString().slice(0, 5);
      if (currentTime < schedule.startTime || currentTime > schedule.endTime) continue;

      const template = this.templates.get(schedule.templateId);
      if (template && template.enabled) {
        return { respond: true, templateId: schedule.templateId };
      }
    }

    return { respond: false, reason: 'no-active-schedule' };
  }

  generateResponse(email, templateId) {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Variable substitution
    const variables = {
      '{{sender_name}}': email.from?.name || 'there',
      '{{sender_email}}': email.from?.address || '',
      '{{subject}}': email.subject || '',
      '{{date}}': new Date().toLocaleDateString(),
      '{{time}}': new Date().toLocaleTimeString()
    };

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(key, 'g'), value);
      body = body.replace(new RegExp(key, 'g'), value);
    }

    // Record response
    if (email.from?.address) {
      this.recentResponses.set(email.from.address, Date.now());
    }

    this.responseLog.push({
      timestamp: Date.now(),
      to: email.from?.address,
      templateId,
      originalSubject: email.subject
    });

    this.emit('responseGenerated', {
      to: email.from,
      subject,
      body,
      originalEmail: email
    });

    return { to: email.from, subject, body };
  }

  getResponseLog(limit = 100) {
    return this.responseLog.slice(-limit);
  }
}

// ============================================
// EMAIL WORKFLOW AUTOMATION
// ============================================

class EmailWorkflow extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.steps = [];
    this.triggers = [];
    this.context = {};
  }

  trigger(type, conditions = {}) {
    this.triggers.push({ type, conditions });
    return this;
  }

  step(name, action) {
    this.steps.push({ name, action, index: this.steps.length });
    return this;
  }

  condition(predicate, trueBranch, falseBranch = null) {
    this.steps.push({
      name: 'condition',
      type: 'condition',
      predicate,
      trueBranch,
      falseBranch
    });
    return this;
  }

  delay(ms) {
    this.steps.push({
      name: 'delay',
      type: 'delay',
      duration: ms
    });
    return this;
  }

  async execute(triggerData) {
    this.context = { triggerData, results: [] };
    this.emit('start', { workflow: this.name, triggerData });

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];

      try {
        this.emit('stepStart', { workflow: this.name, step: step.name, index: i });

        let result;

        if (step.type === 'delay') {
          await new Promise(r => setTimeout(r, step.duration));
          result = { delayed: step.duration };
        } else if (step.type === 'condition') {
          const conditionResult = await step.predicate(this.context);
          if (conditionResult && step.trueBranch) {
            result = await step.trueBranch(this.context);
          } else if (!conditionResult && step.falseBranch) {
            result = await step.falseBranch(this.context);
          }
        } else {
          result = await step.action(this.context);
        }

        this.context.results.push({ step: step.name, result });
        this.emit('stepComplete', { workflow: this.name, step: step.name, result });

      } catch (error) {
        this.emit('stepError', { workflow: this.name, step: step.name, error });
        throw error;
      }
    }

    this.emit('complete', { workflow: this.name, context: this.context });
    return this.context;
  }
}

// ============================================
// PRESET RULES FOR NOIZYLAB
// ============================================

const NOIZYLAB_RULES = [
  {
    id: 'support-labeling',
    name: 'Label Support Emails',
    priority: 100,
    conditions: [
      { field: 'to', operator: 'contains', value: 'help@noizylab.ca' }
    ],
    actions: [
      { type: 'label', label: 'support' },
      { type: 'mark_important' }
    ]
  },
  {
    id: 'urgent-detection',
    name: 'Detect Urgent Emails',
    priority: 90,
    conditions: [
      { field: 'subject', operator: 'matches', value: '(urgent|asap|emergency|critical)' }
    ],
    actions: [
      { type: 'label', label: 'urgent' },
      { type: 'star' },
      { type: 'notify', channel: 'push', message: 'Urgent email received!' }
    ]
  },
  {
    id: 'fishmusic-business',
    name: 'Fish Music Business Emails',
    priority: 80,
    conditions: [
      { field: 'to', operator: 'contains', value: '@fishmusicinc.com' }
    ],
    actions: [
      { type: 'label', label: 'fish-music' },
      { type: 'label', label: 'business' }
    ]
  },
  {
    id: 'newsletter-filter',
    name: 'Filter Newsletters',
    priority: 50,
    conditions: [
      { field: 'subject', operator: 'matches', value: '(newsletter|unsubscribe|weekly digest)' }
    ],
    actions: [
      { type: 'label', label: 'newsletter' },
      { type: 'move', folder: 'Newsletters' }
    ]
  },
  {
    id: 'contact-form',
    name: 'Contact Form Submissions',
    priority: 70,
    conditions: [
      { field: 'to', operator: 'contains', value: 'hello@noizylab.ca' }
    ],
    actions: [
      { type: 'label', label: 'contact' },
      { type: 'reply', template: 'contact-autoresponse' }
    ]
  }
];

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EmailRulesEngine,
  AutoResponder,
  EmailWorkflow,
  NOIZYLAB_RULES,

  // Quick setup
  createRulesEngine: () => {
    const engine = new EmailRulesEngine();
    NOIZYLAB_RULES.forEach(rule => engine.addRule(rule));
    return engine;
  },

  createWorkflow: (name) => new EmailWorkflow(name)
};
