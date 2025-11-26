/**
 * GORUNFREEX1TRILLION - CRYPTO UTILITIES
 * Secure encryption, hashing, and token generation
 */

const crypto = require('crypto');

// ============================================
// ENCRYPTION / DECRYPTION
// ============================================

class NoizyCrypto {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.keyLength = options.keyLength || 32;
    this.ivLength = options.ivLength || 16;
    this.saltLength = options.saltLength || 32;
    this.tagLength = options.tagLength || 16;
    this.iterations = options.iterations || 100000;
  }

  // Generate encryption key from password
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      'sha512'
    );
  }

  // Encrypt data
  encrypt(data, key) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
      authTagLength: this.tagLength
    });

    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encrypted,
      tag: authTag.toString('hex')
    };
  }

  // Decrypt data
  decrypt(encryptedData, key) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
      authTagLength: this.tagLength
    });
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  // Encrypt with password (includes salt)
  encryptWithPassword(data, password) {
    const salt = crypto.randomBytes(this.saltLength);
    const key = this.deriveKey(password, salt);
    const encrypted = this.encrypt(data, key);

    return {
      salt: salt.toString('hex'),
      ...encrypted
    };
  }

  // Decrypt with password
  decryptWithPassword(encryptedData, password) {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = this.deriveKey(password, salt);

    return this.decrypt(encryptedData, key);
  }

  // Generate random encryption key
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }
}

// ============================================
// HASHING
// ============================================

class NoizyHash {
  // Hash with SHA-256
  static sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Hash with SHA-512
  static sha512(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // HMAC
  static hmac(data, secret, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  // Verify HMAC
  static verifyHmac(data, secret, expectedHmac, algorithm = 'sha256') {
    const computed = this.hmac(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(expectedHmac)
    );
  }

  // Hash password (for storage)
  static async hashPassword(password, options = {}) {
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

  // Verify password
  static async verifyPassword(password, stored) {
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

    return crypto.timingSafeEqual(
      Buffer.from(stored.hash, 'hex'),
      hash
    );
  }

  // Content hash for integrity
  static contentHash(content) {
    return this.sha256(typeof content === 'string' ? content : JSON.stringify(content));
  }
}

// ============================================
// TOKEN GENERATION
// ============================================

class NoizyTokens {
  // Generate random token
  static generate(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate URL-safe token
  static generateUrlSafe(length = 32) {
    return crypto.randomBytes(length)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Generate numeric OTP
  static generateOTP(digits = 6) {
    const max = Math.pow(10, digits);
    const random = crypto.randomInt(0, max);
    return random.toString().padStart(digits, '0');
  }

  // Generate UUID v4
  static uuid() {
    return crypto.randomUUID();
  }

  // Generate short ID
  static shortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  // Generate time-based token (expires)
  static generateTimedToken(data, secret, expiresIn = 3600) {
    const payload = {
      data,
      exp: Date.now() + (expiresIn * 1000),
      iat: Date.now()
    };

    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = NoizyHash.hmac(payloadStr, secret);

    return `${payloadStr}.${signature}`;
  }

  // Verify time-based token
  static verifyTimedToken(token, secret) {
    const [payloadStr, signature] = token.split('.');

    if (!NoizyHash.verifyHmac(payloadStr, secret, signature)) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());

    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    return payload.data;
  }
}

// ============================================
// SIGNATURE UTILITIES
// ============================================

class NoizySignature {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'RSA-SHA256';
  }

  // Generate key pair
  generateKeyPair(options = {}) {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: options.modulusLength || 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: options.passphrase ? 'aes-256-cbc' : undefined,
        passphrase: options.passphrase
      }
    });
  }

  // Sign data
  sign(data, privateKey, passphrase = null) {
    const sign = crypto.createSign(this.algorithm);
    sign.update(typeof data === 'string' ? data : JSON.stringify(data));
    sign.end();

    return sign.sign(
      passphrase ? { key: privateKey, passphrase } : privateKey,
      'hex'
    );
  }

  // Verify signature
  verify(data, signature, publicKey) {
    const verify = crypto.createVerify(this.algorithm);
    verify.update(typeof data === 'string' ? data : JSON.stringify(data));
    verify.end();

    return verify.verify(publicKey, signature, 'hex');
  }

  // Sign webhook payload
  signWebhook(payload, secret) {
    const timestamp = Date.now();
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = NoizyHash.hmac(data, secret);

    return {
      signature: `t=${timestamp},v1=${signature}`,
      timestamp
    };
  }

  // Verify webhook signature
  verifyWebhook(payload, signatureHeader, secret, tolerance = 300000) {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map(p => p.split('='))
    );

    const timestamp = parseInt(parts.t);
    const signature = parts.v1;

    // Check timestamp is within tolerance
    if (Math.abs(Date.now() - timestamp) > tolerance) {
      throw new Error('Webhook timestamp too old');
    }

    const data = `${timestamp}.${JSON.stringify(payload)}`;
    const expectedSignature = NoizyHash.hmac(data, secret);

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      throw new Error('Invalid webhook signature');
    }

    return true;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  NoizyCrypto,
  NoizyHash,
  NoizyTokens,
  NoizySignature,

  // Quick access
  encrypt: (data, key) => new NoizyCrypto().encrypt(data, key),
  decrypt: (data, key) => new NoizyCrypto().decrypt(data, key),
  hash: NoizyHash.sha256,
  hmac: NoizyHash.hmac,
  token: NoizyTokens.generate,
  uuid: NoizyTokens.uuid,
  hashPassword: NoizyHash.hashPassword,
  verifyPassword: NoizyHash.verifyPassword
};
