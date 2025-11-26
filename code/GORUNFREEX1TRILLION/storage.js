/**
 * GORUNFREEX1TRILLION - FILE STORAGE
 * Multi-provider file storage abstraction
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// ============================================
// STORAGE PROVIDERS
// ============================================

class LocalStorageProvider {
  constructor(config = {}) {
    this.basePath = config.basePath || './storage';
    this.name = 'local';
  }

  async initialize() {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  async put(key, data, options = {}) {
    const filePath = this.getPath(key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });

    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await fs.writeFile(filePath, content);

    // Store metadata
    if (options.metadata) {
      await fs.writeFile(`${filePath}.meta`, JSON.stringify(options.metadata));
    }

    return {
      key,
      size: content.length,
      path: filePath
    };
  }

  async get(key) {
    const filePath = this.getPath(key);

    try {
      const data = await fs.readFile(filePath);
      let metadata = {};

      try {
        metadata = JSON.parse(await fs.readFile(`${filePath}.meta`, 'utf8'));
      } catch { }

      return { data, metadata };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async delete(key) {
    const filePath = this.getPath(key);

    try {
      await fs.unlink(filePath);
      await fs.unlink(`${filePath}.meta`).catch(() => { });
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  async exists(key) {
    const filePath = this.getPath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = '') {
    const dir = path.join(this.basePath, prefix);
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && !entry.name.endsWith('.meta')) {
          files.push(path.join(prefix, entry.name));
        } else if (entry.isDirectory()) {
          const subFiles = await this.list(path.join(prefix, entry.name));
          files.push(...subFiles);
        }
      }
    } catch { }

    return files;
  }

  async getMetadata(key) {
    const filePath = this.getPath(key);

    try {
      const stats = await fs.stat(filePath);
      let customMeta = {};

      try {
        customMeta = JSON.parse(await fs.readFile(`${filePath}.meta`, 'utf8'));
      } catch { }

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        ...customMeta
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  getPath(key) {
    return path.join(this.basePath, key);
  }

  getUrl(key) {
    return `file://${path.resolve(this.getPath(key))}`;
  }
}

class MemoryStorageProvider {
  constructor() {
    this.storage = new Map();
    this.metadata = new Map();
    this.name = 'memory';
  }

  async put(key, data, options = {}) {
    const content = Buffer.isBuffer(data) ? data : Buffer.from(data);

    this.storage.set(key, content);
    this.metadata.set(key, {
      size: content.length,
      created: new Date(),
      ...options.metadata
    });

    return { key, size: content.length };
  }

  async get(key) {
    const data = this.storage.get(key);
    if (!data) return null;

    return {
      data,
      metadata: this.metadata.get(key)
    };
  }

  async delete(key) {
    const existed = this.storage.has(key);
    this.storage.delete(key);
    this.metadata.delete(key);
    return existed;
  }

  async exists(key) {
    return this.storage.has(key);
  }

  async list(prefix = '') {
    const keys = [];
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async getMetadata(key) {
    return this.metadata.get(key) || null;
  }

  getUrl(key) {
    return `memory://${key}`;
  }
}

class S3StorageProvider {
  constructor(config) {
    this.bucket = config.bucket;
    this.region = config.region || 'us-east-1';
    this.endpoint = config.endpoint;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.name = 's3';
  }

  async put(key, data, options = {}) {
    // In production, use AWS SDK
    console.log(`[S3] Putting ${key} to bucket ${this.bucket}`);

    return {
      key,
      bucket: this.bucket,
      url: this.getUrl(key)
    };
  }

  async get(key) {
    console.log(`[S3] Getting ${key} from bucket ${this.bucket}`);
    return null;
  }

  async delete(key) {
    console.log(`[S3] Deleting ${key} from bucket ${this.bucket}`);
    return true;
  }

  async exists(key) {
    console.log(`[S3] Checking ${key} in bucket ${this.bucket}`);
    return false;
  }

  async list(prefix = '') {
    console.log(`[S3] Listing ${prefix} in bucket ${this.bucket}`);
    return [];
  }

  async getMetadata(key) {
    return null;
  }

  getUrl(key) {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key, expiresIn = 3600) {
    // Generate pre-signed URL
    return `${this.getUrl(key)}?signature=xxx&expires=${Date.now() + expiresIn * 1000}`;
  }
}

// ============================================
// FILE STORAGE MANAGER
// ============================================

class FileStorage extends EventEmitter {
  constructor(options = {}) {
    super();
    this.providers = new Map();
    this.defaultProvider = options.default || 'local';
  }

  registerProvider(name, provider) {
    this.providers.set(name, provider);
    return this;
  }

  getProvider(name) {
    return this.providers.get(name || this.defaultProvider);
  }

  async put(key, data, options = {}) {
    const provider = this.getProvider(options.provider);

    // Generate unique key if not provided
    const finalKey = options.generateKey ? this.generateKey(key, options) : key;

    const result = await provider.put(finalKey, data, options);

    this.emit('put', { key: finalKey, provider: provider.name, ...result });

    return { ...result, key: finalKey, url: provider.getUrl(finalKey) };
  }

  async get(key, options = {}) {
    const provider = this.getProvider(options.provider);
    const result = await provider.get(key);

    if (result) {
      this.emit('get', { key, provider: provider.name });
    }

    return result;
  }

  async delete(key, options = {}) {
    const provider = this.getProvider(options.provider);
    const result = await provider.delete(key);

    if (result) {
      this.emit('delete', { key, provider: provider.name });
    }

    return result;
  }

  async exists(key, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.exists(key);
  }

  async list(prefix = '', options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.list(prefix);
  }

  async copy(sourceKey, destKey, options = {}) {
    const source = await this.get(sourceKey, { provider: options.sourceProvider });
    if (!source) throw new Error('Source file not found');

    return this.put(destKey, source.data, {
      provider: options.destProvider,
      metadata: source.metadata
    });
  }

  async move(sourceKey, destKey, options = {}) {
    await this.copy(sourceKey, destKey, options);
    await this.delete(sourceKey, { provider: options.sourceProvider });
  }

  generateKey(originalName, options = {}) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');

    if (options.preserveName) {
      const name = path.basename(originalName, ext);
      return `${options.prefix || ''}${name}-${random}${ext}`;
    }

    return `${options.prefix || ''}${timestamp}-${random}${ext}`;
  }

  getUrl(key, options = {}) {
    const provider = this.getProvider(options.provider);
    return provider.getUrl(key);
  }

  async getSignedUrl(key, options = {}) {
    const provider = this.getProvider(options.provider);
    if (typeof provider.getSignedUrl !== 'function') {
      throw new Error('Provider does not support signed URLs');
    }
    return provider.getSignedUrl(key, options.expiresIn);
  }
}

// ============================================
// IMAGE PROCESSOR
// ============================================

class ImageProcessor {
  constructor(storage) {
    this.storage = storage;
  }

  async resize(key, options = {}) {
    // In production, use sharp or similar
    console.log(`[ImageProcessor] Resizing ${key} to ${options.width}x${options.height}`);

    return {
      key: `resized/${key}`,
      width: options.width,
      height: options.height
    };
  }

  async thumbnail(key, size = 150) {
    return this.resize(key, { width: size, height: size, fit: 'cover' });
  }

  async optimize(key, options = {}) {
    console.log(`[ImageProcessor] Optimizing ${key}`);
    return { key, optimized: true };
  }

  async convert(key, format) {
    console.log(`[ImageProcessor] Converting ${key} to ${format}`);
    const newKey = key.replace(/\.[^.]+$/, `.${format}`);
    return { key: newKey, format };
  }
}

// ============================================
// UPLOAD MANAGER
// ============================================

class UploadManager extends EventEmitter {
  constructor(storage, options = {}) {
    super();
    this.storage = storage;
    this.allowedTypes = options.allowedTypes || ['image/*', 'application/pdf', 'text/*'];
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.uploads = new Map();
  }

  validateFile(file) {
    const errors = [];

    // Check size
    if (file.size > this.maxSize) {
      errors.push(`File too large. Max size: ${this.maxSize / 1024 / 1024}MB`);
    }

    // Check type
    const typeAllowed = this.allowedTypes.some(pattern => {
      if (pattern.endsWith('/*')) {
        return file.type.startsWith(pattern.slice(0, -1));
      }
      return file.type === pattern;
    });

    if (!typeAllowed) {
      errors.push(`File type not allowed: ${file.type}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async upload(file, options = {}) {
    const uploadId = crypto.randomUUID();

    // Validate
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Track upload
    this.uploads.set(uploadId, {
      id: uploadId,
      filename: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      startedAt: Date.now()
    });

    this.emit('start', { uploadId, file });

    try {
      // Upload to storage
      const result = await this.storage.put(file.name, file.data, {
        generateKey: true,
        prefix: options.prefix || 'uploads/',
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          uploadedAt: new Date().toISOString()
        }
      });

      // Update status
      const upload = this.uploads.get(uploadId);
      upload.status = 'completed';
      upload.progress = 100;
      upload.completedAt = Date.now();
      upload.result = result;

      this.emit('complete', { uploadId, result });

      return result;

    } catch (error) {
      const upload = this.uploads.get(uploadId);
      upload.status = 'failed';
      upload.error = error.message;

      this.emit('error', { uploadId, error });
      throw error;
    }
  }

  async uploadMultiple(files, options = {}) {
    return Promise.all(files.map(file => this.upload(file, options)));
  }

  getUploadStatus(uploadId) {
    return this.uploads.get(uploadId);
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  FileStorage,
  LocalStorageProvider,
  MemoryStorageProvider,
  S3StorageProvider,
  ImageProcessor,
  UploadManager,

  // Quick setup
  createStorage: (options = {}) => {
    const storage = new FileStorage(options);

    storage.registerProvider('local', new LocalStorageProvider(options.local || {}));
    storage.registerProvider('memory', new MemoryStorageProvider());

    if (options.s3) {
      storage.registerProvider('s3', new S3StorageProvider(options.s3));
    }

    return storage;
  }
};
