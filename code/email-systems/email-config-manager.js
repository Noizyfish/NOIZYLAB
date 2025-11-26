/**
 * NOIZYLAB - Email Configuration Manager
 * Centralized multi-account email management
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// ENCRYPTION FOR CREDENTIALS
// ============================================

class CredentialVault {
  constructor(masterKey) {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(masterKey, 'noizylab-salt', 32);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText) {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// ============================================
// EMAIL ACCOUNT CONFIGURATION
// ============================================

const PROVIDERS = {
  'google-workspace': {
    name: 'Google Workspace',
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
    oauth: true,
    appPasswordRequired: true,
    setupUrl: 'https://myaccount.google.com/apppasswords'
  },
  'gmail': {
    name: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
    oauth: true,
    appPasswordRequired: true,
    setupUrl: 'https://myaccount.google.com/apppasswords'
  },
  'outlook': {
    name: 'Microsoft Outlook',
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false, requireTLS: true },
    oauth: true
  },
  'yahoo': {
    name: 'Yahoo Mail',
    imap: { host: 'imap.mail.yahoo.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false, requireTLS: true },
    appPasswordRequired: true
  },
  'custom': {
    name: 'Custom Server',
    imap: { host: '', port: 993, secure: true },
    smtp: { host: '', port: 587, secure: false, requireTLS: true }
  }
};

// ============================================
// NOIZYLAB EMAIL ACCOUNTS
// ============================================

const NOIZYLAB_ACCOUNTS = [
  {
    id: 'rp-fishmusic',
    email: 'rp@fishmusicinc.com',
    name: 'RP - Fish Music Inc',
    provider: 'google-workspace',
    domain: 'fishmusicinc.com',
    type: 'primary'
  },
  {
    id: 'gofish-fishmusic',
    email: 'gofish@fishmusicinc.com',
    name: 'Go Fish - Fish Music Inc',
    provider: 'google-workspace',
    domain: 'fishmusicinc.com',
    type: 'business'
  },
  {
    id: 'rsp-noizylab',
    email: 'rsp@noizylab.ca',
    name: 'RSP - NoizyLab',
    provider: 'google-workspace',
    domain: 'noizylab.ca',
    type: 'primary'
  },
  {
    id: 'help-noizylab',
    email: 'help@noizylab.ca',
    name: 'Help - NoizyLab',
    provider: 'google-workspace',
    domain: 'noizylab.ca',
    type: 'support'
  },
  {
    id: 'hello-noizylab',
    email: 'hello@noizylab.ca',
    name: 'Hello - NoizyLab',
    provider: 'google-workspace',
    domain: 'noizylab.ca',
    type: 'contact'
  }
];

// ============================================
// EMAIL CONFIGURATION MANAGER
// ============================================

class EmailConfigManager {
  constructor(options = {}) {
    this.configPath = options.configPath || './.email-config.json';
    this.vault = options.masterKey ? new CredentialVault(options.masterKey) : null;
    this.accounts = new Map();
    this.providers = { ...PROVIDERS };
  }

  async initialize() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      for (const account of config.accounts || []) {
        this.accounts.set(account.id, account);
      }

      console.log(`Loaded ${this.accounts.size} email accounts`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      console.log('No existing config found, starting fresh');
    }

    return this;
  }

  addAccount(account) {
    const provider = this.providers[account.provider];
    if (!provider) {
      throw new Error(`Unknown provider: ${account.provider}`);
    }

    const fullAccount = {
      ...account,
      id: account.id || this.generateId(account.email),
      imap: { ...provider.imap, ...account.imap },
      smtp: { ...provider.smtp, ...account.smtp },
      createdAt: Date.now()
    };

    // Encrypt password if vault is available
    if (this.vault && account.password) {
      fullAccount.encryptedPassword = this.vault.encrypt(account.password);
      delete fullAccount.password;
    }

    this.accounts.set(fullAccount.id, fullAccount);
    return fullAccount;
  }

  getAccount(id) {
    const account = this.accounts.get(id);
    if (!account) return null;

    // Decrypt password if needed
    if (this.vault && account.encryptedPassword) {
      return {
        ...account,
        password: this.vault.decrypt(account.encryptedPassword)
      };
    }

    return account;
  }

  getAccountByEmail(email) {
    for (const account of this.accounts.values()) {
      if (account.email === email) {
        return this.getAccount(account.id);
      }
    }
    return null;
  }

  getAllAccounts() {
    return Array.from(this.accounts.values()).map(acc => ({
      ...acc,
      password: undefined,
      encryptedPassword: undefined
    }));
  }

  getAccountsByDomain(domain) {
    return this.getAllAccounts().filter(acc => acc.domain === domain);
  }

  removeAccount(id) {
    return this.accounts.delete(id);
  }

  async save() {
    const config = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      accounts: Array.from(this.accounts.values())
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    console.log(`Saved ${this.accounts.size} accounts to ${this.configPath}`);
  }

  generateId(email) {
    return email.replace(/[@.]/g, '-').toLowerCase();
  }

  // Generate Mac Mail configuration profile (mobileconfig)
  generateMacMailProfile(accountId) {
    const account = this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const uuid = () => crypto.randomUUID().toUpperCase();

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>EmailAccountDescription</key>
      <string>${account.name}</string>
      <key>EmailAccountName</key>
      <string>${account.name}</string>
      <key>EmailAccountType</key>
      <string>EmailTypeIMAP</string>
      <key>EmailAddress</key>
      <string>${account.email}</string>
      <key>IncomingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>IncomingMailServerHostName</key>
      <string>${account.imap.host}</string>
      <key>IncomingMailServerPortNumber</key>
      <integer>${account.imap.port}</integer>
      <key>IncomingMailServerUseSSL</key>
      <${account.imap.secure}/>
      <key>IncomingMailServerUsername</key>
      <string>${account.email}</string>
      <key>OutgoingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>OutgoingMailServerHostName</key>
      <string>${account.smtp.host}</string>
      <key>OutgoingMailServerPortNumber</key>
      <integer>${account.smtp.port}</integer>
      <key>OutgoingMailServerUseSSL</key>
      <${account.smtp.secure}/>
      <key>OutgoingMailServerUsername</key>
      <string>${account.email}</string>
      <key>OutgoingPasswordSameAsIncomingPassword</key>
      <true/>
      <key>PayloadDescription</key>
      <string>Email account configuration for ${account.email}</string>
      <key>PayloadDisplayName</key>
      <string>${account.name}</string>
      <key>PayloadIdentifier</key>
      <string>com.noizylab.email.${account.id}</string>
      <key>PayloadType</key>
      <string>com.apple.mail.managed</string>
      <key>PayloadUUID</key>
      <string>${uuid()}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>NOIZYLAB Email - ${account.email}</string>
  <key>PayloadIdentifier</key>
  <string>com.noizylab.emailconfig.${account.id}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${uuid()}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;
  }

  // Generate setup instructions
  generateSetupInstructions(accountId) {
    const account = this.getAccount(accountId);
    if (!account) throw new Error('Account not found');

    const provider = this.providers[account.provider];

    return `
╔══════════════════════════════════════════════════════════════╗
║  MAC MAIL SETUP: ${account.email.padEnd(40)} ║
╠══════════════════════════════════════════════════════════════╣

STEP 1: Generate App Password
${provider.appPasswordRequired ? `
  1. Go to: ${provider.setupUrl}
  2. Sign in as: ${account.email}
  3. Enable 2-Step Verification (if not enabled)
  4. Go to App Passwords
  5. Select: Mail + Mac
  6. Copy the 16-character password
` : '  (Not required for this provider)'}

STEP 2: Add to Mac Mail

  1. Open Mail → Settings (Cmd + ,)
  2. Click Accounts → Click +
  3. Select "Other Mail Account"
  4. Enter:
     • Name: ${account.name}
     • Email: ${account.email}
     • Password: [Your App Password]

STEP 3: Server Settings (if prompted)

  INCOMING (IMAP):
  ┌────────────────────────────────────────┐
  │ Server: ${account.imap.host.padEnd(28)} │
  │ Port:   ${String(account.imap.port).padEnd(28)} │
  │ SSL:    ${(account.imap.secure ? 'ON ✓' : 'OFF').padEnd(28)} │
  └────────────────────────────────────────┘

  OUTGOING (SMTP):
  ┌────────────────────────────────────────┐
  │ Server: ${account.smtp.host.padEnd(28)} │
  │ Port:   ${String(account.smtp.port).padEnd(28)} │
  │ TLS:    ${(account.smtp.requireTLS ? 'ON ✓' : 'OFF').padEnd(28)} │
  └────────────────────────────────────────┘

STEP 4: Verify

  • Send a test email to yourself
  • Check that sent mail appears in Sent folder
  • Verify emails sync properly

╚══════════════════════════════════════════════════════════════╝
`;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EmailConfigManager,
  CredentialVault,
  PROVIDERS,
  NOIZYLAB_ACCOUNTS,

  // Quick setup
  createManager: (options) => new EmailConfigManager(options),

  // Get default NOIZYLAB accounts
  getNoizyLabAccounts: () => NOIZYLAB_ACCOUNTS
};
