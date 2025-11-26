/**
 * GORUNFREEX1TRILLION - AUTHENTICATION SYSTEM
 * JWT, OAuth, Sessions, API Keys, MFA
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ============================================
// PASSWORD UTILITIES
// ============================================

class PasswordUtils {
  static async hash(password, options = {}) {
    const salt = crypto.randomBytes(options.saltLength || 32);
    const iterations = options.iterations || 100000;
    const keyLength = options.keyLength || 64;

    const hash = await new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keyLength, 'sha512', (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });

    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex'),
      iterations,
      keyLength
    };
  }

  static async verify(password, stored) {
    const hash = await new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        Buffer.from(stored.salt, 'hex'),
        stored.iterations,
        stored.keyLength,
        'sha512',
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });

    return crypto.timingSafeEqual(Buffer.from(stored.hash, 'hex'), hash);
  }

  static generatePassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }

    return password;
  }

  static checkStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : score <= 6 ? 'strong' : 'very_strong';

    return { score, strength, maxScore: 7 };
  }
}

// ============================================
// JWT UTILITIES
// ============================================

class JWT {
  constructor(secret, options = {}) {
    this.secret = secret;
    this.algorithm = options.algorithm || 'HS256';
    this.expiresIn = options.expiresIn || 3600; // 1 hour default
    this.issuer = options.issuer || 'noizylab';
  }

  sign(payload, options = {}) {
    const header = {
      alg: this.algorithm,
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);

    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + (options.expiresIn || this.expiresIn),
      iss: options.issuer || this.issuer
    };

    if (options.subject) fullPayload.sub = options.subject;
    if (options.audience) fullPayload.aud = options.audience;

    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(fullPayload));

    const signature = this.createSignature(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  verify(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signature] = parts;

    // Verify signature
    const expectedSignature = this.createSignature(`${headerB64}.${payloadB64}`);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(this.base64UrlDecode(payloadB64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      throw new Error('Token not yet valid');
    }

    return payload;
  }

  decode(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    try {
      return {
        header: JSON.parse(this.base64UrlDecode(parts[0])),
        payload: JSON.parse(this.base64UrlDecode(parts[1]))
      };
    } catch {
      return null;
    }
  }

  refresh(token, options = {}) {
    const decoded = this.verify(token);
    delete decoded.iat;
    delete decoded.exp;
    delete decoded.iss;

    return this.sign(decoded, options);
  }

  createSignature(data) {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  base64UrlEncode(str) {
    return Buffer.from(str).toString('base64url');
  }

  base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString();
  }
}

// ============================================
// SESSION MANAGER
// ============================================

class SessionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessions = new Map();
    this.maxAge = options.maxAge || 86400000; // 24 hours
    this.cleanupInterval = options.cleanupInterval || 3600000; // 1 hour

    this.startCleanup();
  }

  create(userId, data = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');

    const session = {
      id: sessionId,
      userId,
      data,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      expiresAt: Date.now() + this.maxAge
    };

    this.sessions.set(sessionId, session);
    this.emit('created', session);

    return session;
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      this.destroy(sessionId);
      return null;
    }

    // Update last access
    session.lastAccess = Date.now();

    return session;
  }

  update(sessionId, data) {
    const session = this.get(sessionId);
    if (!session) return null;

    session.data = { ...session.data, ...data };
    this.emit('updated', session);

    return session;
  }

  destroy(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.emit('destroyed', session);
    }
  }

  destroyUserSessions(userId) {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.destroy(id);
      }
    }
  }

  touch(sessionId) {
    const session = this.get(sessionId);
    if (session) {
      session.lastAccess = Date.now();
      session.expiresAt = Date.now() + this.maxAge;
    }
    return session;
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (session.expiresAt < now) {
          this.destroy(id);
        }
      }
    }, this.cleanupInterval);
  }

  getActiveSessions(userId) {
    const sessions = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.expiresAt > Date.now()) {
        sessions.push(session);
      }
    }
    return sessions;
  }
}

// ============================================
// API KEY MANAGER
// ============================================

class APIKeyManager {
  constructor() {
    this.keys = new Map();
  }

  generate(name, options = {}) {
    const keyId = crypto.randomBytes(8).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');

    const key = {
      id: keyId,
      name,
      key: `nz_${keyId}_${secret}`,
      hashedSecret: crypto.createHash('sha256').update(secret).digest('hex'),
      scopes: options.scopes || ['*'],
      rateLimit: options.rateLimit || 1000,
      expiresAt: options.expiresAt || null,
      createdAt: Date.now(),
      lastUsed: null,
      usageCount: 0
    };

    this.keys.set(keyId, key);

    // Return full key only once (secret not stored)
    return {
      id: keyId,
      key: key.key,
      name,
      scopes: key.scopes
    };
  }

  validate(apiKey) {
    const match = apiKey.match(/^nz_([a-f0-9]+)_([a-f0-9]+)$/);
    if (!match) return null;

    const [, keyId, secret] = match;
    const keyData = this.keys.get(keyId);

    if (!keyData) return null;

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt < Date.now()) {
      return null;
    }

    // Verify secret
    const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(keyData.hashedSecret), Buffer.from(hashedSecret))) {
      return null;
    }

    // Update usage
    keyData.lastUsed = Date.now();
    keyData.usageCount++;

    return {
      id: keyData.id,
      name: keyData.name,
      scopes: keyData.scopes
    };
  }

  revoke(keyId) {
    return this.keys.delete(keyId);
  }

  list() {
    return Array.from(this.keys.values()).map(k => ({
      id: k.id,
      name: k.name,
      scopes: k.scopes,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      usageCount: k.usageCount
    }));
  }
}

// ============================================
// MFA (TOTP)
// ============================================

class TOTP {
  constructor(options = {}) {
    this.digits = options.digits || 6;
    this.period = options.period || 30;
    this.algorithm = options.algorithm || 'sha1';
  }

  generateSecret(length = 20) {
    const bytes = crypto.randomBytes(length);
    return this.base32Encode(bytes);
  }

  generate(secret, counter = null) {
    const time = counter ?? Math.floor(Date.now() / 1000 / this.period);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const decodedSecret = this.base32Decode(secret);
    const hmac = crypto.createHmac(this.algorithm, decodedSecret);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.digits);
    return otp.toString().padStart(this.digits, '0');
  }

  verify(token, secret, window = 1) {
    const currentCounter = Math.floor(Date.now() / 1000 / this.period);

    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generate(secret, currentCounter + i);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
        return true;
      }
    }

    return false;
  }

  generateURI(secret, account, issuer = 'NOIZYLAB') {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: this.algorithm.toUpperCase(),
      digits: this.digits.toString(),
      period: this.period.toString()
    });

    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${params}`;
  }

  base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = 0;
    let value = 0;
    const output = [];

    for (const char of cleanStr) {
      value = (value << 5) | alphabet.indexOf(char);
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}

// ============================================
// AUTH MIDDLEWARE
// ============================================

function authMiddleware(jwt, options = {}) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      if (options.optional) return next();
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization scheme' });
    }

    try {
      const payload = jwt.verify(token);
      req.user = payload;
      req.token = token;
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  };
}

function apiKeyMiddleware(keyManager) {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyData = keyManager.validate(apiKey);

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.apiKey = keyData;
    next();
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  PasswordUtils,
  JWT,
  SessionManager,
  APIKeyManager,
  TOTP,
  authMiddleware,
  apiKeyMiddleware,

  // Quick helpers
  hashPassword: PasswordUtils.hash,
  verifyPassword: PasswordUtils.verify,
  createJWT: (secret, options) => new JWT(secret, options),
  createSessionManager: (options) => new SessionManager(options),
  createAPIKeyManager: () => new APIKeyManager(),
  createTOTP: (options) => new TOTP(options)
};
