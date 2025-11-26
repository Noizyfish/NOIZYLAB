#!/usr/bin/env node

/**
 * NOIZYLAB - Email CLI
 * Command-line interface for email management
 */

const { CLI, styles, Spinner, Table, prompt } = require('../GORUNFREEX1TRILLION/cli');
const { EmailConfigManager, NOIZYLAB_ACCOUNTS, PROVIDERS } = require('./email-config-manager');
const { MultiAccountEmailClient, AIEmailAssistant, createNoizyLabClient } = require('./multi-account-client');

// ============================================
// CLI SETUP
// ============================================

const cli = new CLI({
  name: 'noizy-mail',
  version: '2.1.0',
  description: 'NOIZYLAB Email Management CLI'
});

// Global options
cli.option('config', { alias: 'c', description: 'Config file path', default: './.email-config.json' });
cli.option('verbose', { alias: 'V', description: 'Verbose output', type: 'boolean' });

// ============================================
// COMMANDS
// ============================================

// List all accounts
cli.command('list', {
  description: 'List all email accounts',
  handler: async (args) => {
    console.log(styles.bold('\n📧 NOIZYLAB Email Accounts\n'));

    const table = new Table({
      headers: ['#', 'Email', 'Domain', 'Type', 'Provider']
    });

    NOIZYLAB_ACCOUNTS.forEach((account, index) => {
      table.addRow([
        index + 1,
        styles.cyan(account.email),
        account.domain,
        account.type,
        PROVIDERS[account.provider].name
      ]);
    });

    table.print();

    console.log(`\n${styles.gray('Total:')} ${NOIZYLAB_ACCOUNTS.length} accounts\n`);
  }
});

// Show setup instructions
cli.command('setup', {
  description: 'Show setup instructions for an account',
  handler: async (args) => {
    console.log(styles.bold('\n📧 Email Account Setup\n'));

    // Show account selection
    const choices = NOIZYLAB_ACCOUNTS.map(acc => ({
      name: `${acc.email} (${acc.type})`,
      value: acc.id
    }));

    const accountId = await prompt.select('Select account to setup:', choices);
    const account = NOIZYLAB_ACCOUNTS.find(a => a.id === accountId);

    if (!account) {
      console.log(styles.error('Account not found'));
      return;
    }

    const manager = new EmailConfigManager();
    manager.addAccount(account);

    console.log(manager.generateSetupInstructions(account.id));
  }
});

// Generate Mac Mail profile
cli.command('profile', {
  description: 'Generate Mac Mail configuration profile',
  handler: async (args) => {
    console.log(styles.bold('\n📧 Generate Mac Mail Profile\n'));

    const choices = NOIZYLAB_ACCOUNTS.map(acc => ({
      name: `${acc.email} (${acc.type})`,
      value: acc.id
    }));

    const accountId = await prompt.select('Select account:', choices);
    const account = NOIZYLAB_ACCOUNTS.find(a => a.id === accountId);

    if (!account) {
      console.log(styles.error('Account not found'));
      return;
    }

    const manager = new EmailConfigManager();
    manager.addAccount(account);

    const profile = manager.generateMacMailProfile(account.id);
    const filename = `${account.id}.mobileconfig`;

    require('fs').writeFileSync(filename, profile);
    console.log(styles.success(`\n✓ Profile saved to: ${filename}`));
    console.log(styles.gray('\nDouble-click the file to install in Mac Mail\n'));
  }
});

// Quick setup all accounts
cli.command('setup-all', {
  description: 'Show setup instructions for all accounts',
  handler: async (args) => {
    console.log(styles.bold('\n📧 Setup All NOIZYLAB Email Accounts\n'));

    const manager = new EmailConfigManager();

    console.log(styles.yellow('═'.repeat(60)));
    console.log(styles.bold('\n STEP 1: Generate App Passwords\n'));
    console.log(styles.yellow('═'.repeat(60)));

    console.log(`
For each account below, generate an App Password:

1. Go to: ${styles.cyan('https://myaccount.google.com/apppasswords')}
2. Sign in with each email
3. Select "Mail" + "Mac"
4. Copy the 16-character password

`);

    const table = new Table({
      headers: ['Email', 'App Password Status']
    });

    NOIZYLAB_ACCOUNTS.forEach(account => {
      table.addRow([
        styles.cyan(account.email),
        '☐ Generate at myaccount.google.com'
      ]);
    });

    table.print();

    console.log(styles.yellow('\n' + '═'.repeat(60)));
    console.log(styles.bold('\n STEP 2: Add to Mac Mail\n'));
    console.log(styles.yellow('═'.repeat(60)));

    console.log(`
For each account:

1. Open ${styles.bold('Mail')} → ${styles.bold('Settings')} (Cmd + ,)
2. Click ${styles.bold('Accounts')} → Click ${styles.bold('+')}
3. Select ${styles.bold('Google')}
4. Enter email address
5. Use ${styles.bold('App Password')} (not regular password)
6. Done!

`);

    console.log(styles.yellow('═'.repeat(60)));
    console.log(styles.bold('\n SERVER SETTINGS (if needed)\n'));
    console.log(styles.yellow('═'.repeat(60)));

    console.log(`
${styles.bold('ALL ACCOUNTS USE THESE SETTINGS:')}

┌─────────────────────────────────────────┐
│  INCOMING (IMAP)                        │
│  Server: ${styles.cyan('imap.gmail.com')}                │
│  Port:   ${styles.cyan('993')}                           │
│  SSL:    ${styles.green('ON ✓')}                          │
├─────────────────────────────────────────┤
│  OUTGOING (SMTP)                        │
│  Server: ${styles.cyan('smtp.gmail.com')}                │
│  Port:   ${styles.cyan('587')}                           │
│  TLS:    ${styles.green('ON ✓')}                          │
└─────────────────────────────────────────┘
`);
  }
});

// Test connection
cli.command('test', {
  description: 'Test email account connection',
  handler: async (args) => {
    console.log(styles.bold('\n📧 Test Email Connection\n'));

    const spinner = new Spinner({ message: 'Testing connections...' });
    spinner.start();

    const client = createNoizyLabClient();
    const results = await client.connectAll();

    spinner.stop();

    const table = new Table({
      headers: ['Email', 'Status']
    });

    results.forEach(result => {
      const status = result.status === 'connected'
        ? styles.green('✓ Connected')
        : styles.red(`✗ ${result.error || 'Failed'}`);

      table.addRow([result.account, status]);
    });

    table.print();
    console.log();
  }
});

// Status command
cli.command('status', {
  description: 'Show email system status',
  handler: async (args) => {
    console.log(styles.bold('\n📧 NOIZYLAB Email System Status\n'));

    console.log(styles.cyan('Domains:'));
    console.log('  • fishmusicinc.com (Google Workspace)');
    console.log('  • noizylab.ca (Google Workspace)');

    console.log(styles.cyan('\nDNS:'));
    console.log('  • GoDaddy → Cloudflare → Google Workspace');
    console.log(styles.green('  ✓ MX Records: Configured'));

    console.log(styles.cyan('\nAccounts:'));
    NOIZYLAB_ACCOUNTS.forEach(acc => {
      console.log(`  • ${acc.email} (${acc.type})`);
    });

    console.log(styles.cyan('\nServer Settings:'));
    console.log('  • IMAP: imap.gmail.com:993 (SSL)');
    console.log('  • SMTP: smtp.gmail.com:587 (TLS)');

    console.log();
  }
});

// AI Analysis
cli.command('analyze', {
  description: 'Analyze email with AI',
  handler: async (args) => {
    console.log(styles.bold('\n🤖 AI Email Analysis\n'));

    const subject = await prompt.input('Email subject:');
    const body = await prompt.input('Email body (brief):');

    const ai = new AIEmailAssistant();
    const message = { subject, text: body };

    const analysis = ai.analyzeEmail(message);

    console.log(styles.cyan('\nAnalysis Results:\n'));
    console.log(`  Sentiment:  ${analysis.sentiment}`);
    console.log(`  Priority:   ${analysis.priority}`);
    console.log(`  Category:   ${analysis.category}`);
    console.log(`  Action:     ${analysis.isActionRequired ? 'Required' : 'Not required'}`);
    console.log(`  Labels:     ${analysis.suggestedLabels.join(', ')}`);

    console.log(styles.cyan('\nSmart Reply Suggestions:\n'));
    const replies = ai.generateSmartReplies(message);
    replies.forEach((reply, i) => {
      console.log(`  ${i + 1}. "${reply}"`);
    });

    console.log();
  }
});

// Compose with AI
cli.command('compose', {
  description: 'Compose email with AI assistance',
  handler: async (args) => {
    console.log(styles.bold('\n🤖 AI Email Composer\n'));

    const type = await prompt.select('Email type:', [
      { name: 'Follow-up', value: 'follow-up' },
      { name: 'Thank You', value: 'thank-you' },
      { name: 'Introduction', value: 'introduction' },
      { name: 'Meeting Request', value: 'meeting-request' }
    ]);

    const recipientName = await prompt.input('Recipient name:');

    const ai = new AIEmailAssistant();
    const email = ai.composeEmail({
      type,
      recipient: { name: recipientName },
      context: {}
    });

    console.log(styles.cyan('\nGenerated Email:\n'));
    console.log(styles.bold(`Subject: ${email.subject}`));
    console.log(styles.gray('─'.repeat(50)));
    console.log(email.body);
    console.log();
  }
});

// Help command override
cli.command('help', {
  description: 'Show help',
  handler: () => {
    console.log(`
${styles.bold('╔══════════════════════════════════════════════════════════╗')}
${styles.bold('║')}       ${styles.cyan('NOIZYLAB Email Management CLI')}                    ${styles.bold('║')}
${styles.bold('║')}           ${styles.gray('noizy-mail v2.1.0')}                            ${styles.bold('║')}
${styles.bold('╠══════════════════════════════════════════════════════════╣')}
${styles.bold('║')}                                                          ${styles.bold('║')}
${styles.bold('║')}  ${styles.yellow('COMMANDS:')}                                            ${styles.bold('║')}
${styles.bold('║')}                                                          ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('list')}        List all email accounts                  ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('setup')}       Setup instructions for one account       ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('setup-all')}   Setup instructions for all accounts      ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('profile')}     Generate Mac Mail profile (.mobileconfig)${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('test')}        Test email connections                   ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('status')}      Show email system status                 ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('analyze')}     AI-powered email analysis                ${styles.bold('║')}
${styles.bold('║')}  ${styles.cyan('compose')}     AI-assisted email composer               ${styles.bold('║')}
${styles.bold('║')}                                                          ${styles.bold('║')}
${styles.bold('║')}  ${styles.yellow('USAGE:')}                                              ${styles.bold('║')}
${styles.bold('║')}                                                          ${styles.bold('║')}
${styles.bold('║')}  node email-cli.js list                                  ${styles.bold('║')}
${styles.bold('║')}  node email-cli.js setup-all                             ${styles.bold('║')}
${styles.bold('║')}  node email-cli.js analyze                               ${styles.bold('║')}
${styles.bold('║')}                                                          ${styles.bold('║')}
${styles.bold('╚══════════════════════════════════════════════════════════╝')}
`);
  }
});

// ============================================
// RUN CLI
// ============================================

if (require.main === module) {
  cli.run().catch(console.error);
}

module.exports = cli;
