/**
 * GORUNFREEX1TRILLION - AI/ML UTILITIES
 * Machine learning helpers, embeddings, and AI pipelines
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================
// VECTOR OPERATIONS
// ============================================

class VectorOps {
  // Cosine similarity between two vectors
  static cosineSimilarity(a, b) {
    if (a.length !== b.length) throw new Error('Vectors must have same length');

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Euclidean distance
  static euclideanDistance(a, b) {
    if (a.length !== b.length) throw new Error('Vectors must have same length');

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  // Dot product
  static dotProduct(a, b) {
    if (a.length !== b.length) throw new Error('Vectors must have same length');
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  // Normalize vector
  static normalize(v) {
    const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
    return v.map(val => val / norm);
  }

  // Add vectors
  static add(a, b) {
    return a.map((val, i) => val + b[i]);
  }

  // Average multiple vectors
  static average(vectors) {
    const result = new Array(vectors[0].length).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < v.length; i++) {
        result[i] += v[i];
      }
    }
    return result.map(val => val / vectors.length);
  }
}

// ============================================
// VECTOR STORE (In-Memory)
// ============================================

class VectorStore {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 384;
    this.metric = options.metric || 'cosine';
    this.vectors = new Map();
    this.metadata = new Map();
  }

  add(id, vector, metadata = {}) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector must have ${this.dimensions} dimensions`);
    }

    this.vectors.set(id, vector);
    this.metadata.set(id, { ...metadata, id, addedAt: Date.now() });

    return id;
  }

  addMany(items) {
    return items.map(item => this.add(item.id, item.vector, item.metadata));
  }

  get(id) {
    return {
      vector: this.vectors.get(id),
      metadata: this.metadata.get(id)
    };
  }

  delete(id) {
    this.vectors.delete(id);
    this.metadata.delete(id);
  }

  search(queryVector, options = {}) {
    const { topK = 10, threshold = 0, filter = null } = options;

    const results = [];

    for (const [id, vector] of this.vectors) {
      // Apply metadata filter
      if (filter) {
        const meta = this.metadata.get(id);
        if (!this.matchesFilter(meta, filter)) continue;
      }

      let score;
      switch (this.metric) {
        case 'cosine':
          score = VectorOps.cosineSimilarity(queryVector, vector);
          break;
        case 'euclidean':
          score = -VectorOps.euclideanDistance(queryVector, vector);
          break;
        case 'dot':
          score = VectorOps.dotProduct(queryVector, vector);
          break;
        default:
          score = VectorOps.cosineSimilarity(queryVector, vector);
      }

      if (score >= threshold) {
        results.push({
          id,
          score,
          metadata: this.metadata.get(id)
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        if (!value.includes(metadata[key])) return false;
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  size() {
    return this.vectors.size;
  }

  clear() {
    this.vectors.clear();
    this.metadata.clear();
  }
}

// ============================================
// TEXT EMBEDDINGS (Simple TF-IDF based)
// ============================================

class TextEmbedder {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 384;
    this.vocabulary = new Map();
    this.idf = new Map();
    this.documentCount = 0;
  }

  // Simple hash-based embedding (for demo - use real embeddings in production)
  embed(text) {
    const tokens = this.tokenize(text);
    const vector = new Array(this.dimensions).fill(0);

    for (const token of tokens) {
      // Hash token to get dimension indices
      const hash = this.hashString(token);
      const idx1 = hash % this.dimensions;
      const idx2 = (hash >> 8) % this.dimensions;

      vector[idx1] += 1;
      vector[idx2] += 0.5;
    }

    return VectorOps.normalize(vector);
  }

  embedBatch(texts) {
    return texts.map(text => this.embed(text));
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Semantic similarity between texts
  similarity(text1, text2) {
    const v1 = this.embed(text1);
    const v2 = this.embed(text2);
    return VectorOps.cosineSimilarity(v1, v2);
  }
}

// ============================================
// CLASSIFICATION
// ============================================

class TextClassifier {
  constructor() {
    this.classes = new Map();
    this.embedder = new TextEmbedder();
  }

  train(examples) {
    for (const { text, label } of examples) {
      if (!this.classes.has(label)) {
        this.classes.set(label, []);
      }
      this.classes.get(label).push(this.embedder.embed(text));
    }
  }

  predict(text, topK = 1) {
    const embedding = this.embedder.embed(text);
    const scores = [];

    for (const [label, vectors] of this.classes) {
      // Average similarity to all examples of this class
      let totalSim = 0;
      for (const v of vectors) {
        totalSim += VectorOps.cosineSimilarity(embedding, v);
      }
      const avgSim = totalSim / vectors.length;

      scores.push({ label, confidence: avgSim });
    }

    scores.sort((a, b) => b.confidence - a.confidence);
    return topK === 1 ? scores[0] : scores.slice(0, topK);
  }
}

// ============================================
// SENTIMENT ANALYZER
// ============================================

class SentimentAnalyzer {
  constructor() {
    this.positiveWords = new Set([
      'good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful',
      'fantastic', 'love', 'happy', 'joy', 'beautiful', 'perfect',
      'best', 'brilliant', 'outstanding', 'superb', 'pleasant', 'delightful',
      'thanks', 'thank', 'appreciate', 'grateful', 'pleased', 'excited'
    ]);

    this.negativeWords = new Set([
      'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
      'hate', 'sad', 'angry', 'disappointed', 'frustrated', 'annoying',
      'ugly', 'stupid', 'boring', 'waste', 'problem', 'issue',
      'bug', 'error', 'fail', 'failed', 'broken', 'wrong', 'unfortunately'
    ]);

    this.intensifiers = new Set(['very', 'really', 'extremely', 'absolutely', 'totally']);
    this.negators = new Set(['not', 'no', 'never', 'neither', "don't", "doesn't", "didn't", "won't"]);
  }

  analyze(text) {
    const tokens = text.toLowerCase().split(/\s+/);

    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let isNegated = false;
    let intensity = 1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].replace(/[^\w]/g, '');

      if (this.negators.has(token)) {
        isNegated = true;
        continue;
      }

      if (this.intensifiers.has(token)) {
        intensity = 1.5;
        continue;
      }

      let tokenScore = 0;
      if (this.positiveWords.has(token)) {
        tokenScore = 1;
        positiveCount++;
      } else if (this.negativeWords.has(token)) {
        tokenScore = -1;
        negativeCount++;
      }

      if (isNegated) {
        tokenScore *= -1;
        isNegated = false;
      }

      score += tokenScore * intensity;
      intensity = 1;
    }

    // Normalize score to -1 to 1 range
    const maxScore = Math.max(1, positiveCount + negativeCount);
    const normalizedScore = Math.max(-1, Math.min(1, score / maxScore));

    let sentiment;
    if (normalizedScore > 0.2) sentiment = 'positive';
    else if (normalizedScore < -0.2) sentiment = 'negative';
    else sentiment = 'neutral';

    return {
      sentiment,
      score: normalizedScore,
      confidence: Math.abs(normalizedScore),
      positive: positiveCount,
      negative: negativeCount
    };
  }
}

// ============================================
// NAMED ENTITY RECOGNITION (Simple)
// ============================================

class EntityExtractor {
  constructor() {
    this.patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /https?:\/\/[^\s]+/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      date: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      money: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
      time: /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
      hashtag: /#\w+/g,
      mention: /@\w+/g
    };
  }

  extract(text) {
    const entities = {};

    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        entities[type] = [...new Set(matches)];
      }
    }

    return entities;
  }

  extractAll(texts) {
    return texts.map(text => this.extract(text));
  }
}

// ============================================
// AI PIPELINE
// ============================================

class AIPipeline extends EventEmitter {
  constructor() {
    super();
    this.steps = [];
  }

  addStep(name, processor) {
    this.steps.push({ name, processor });
    return this;
  }

  embed() {
    const embedder = new TextEmbedder();
    return this.addStep('embed', (input) => ({
      ...input,
      embedding: embedder.embed(input.text)
    }));
  }

  sentiment() {
    const analyzer = new SentimentAnalyzer();
    return this.addStep('sentiment', (input) => ({
      ...input,
      sentiment: analyzer.analyze(input.text)
    }));
  }

  entities() {
    const extractor = new EntityExtractor();
    return this.addStep('entities', (input) => ({
      ...input,
      entities: extractor.extract(input.text)
    }));
  }

  classify(examples) {
    const classifier = new TextClassifier();
    classifier.train(examples);
    return this.addStep('classify', (input) => ({
      ...input,
      classification: classifier.predict(input.text, 3)
    }));
  }

  custom(name, fn) {
    return this.addStep(name, fn);
  }

  async process(input) {
    let result = typeof input === 'string' ? { text: input } : input;

    for (const step of this.steps) {
      this.emit('stepStart', { step: step.name });
      result = await step.processor(result);
      this.emit('stepComplete', { step: step.name, result });
    }

    return result;
  }

  async processBatch(inputs) {
    return Promise.all(inputs.map(input => this.process(input)));
  }
}

// ============================================
// RECOMMENDATION ENGINE
// ============================================

class RecommendationEngine {
  constructor() {
    this.items = new VectorStore({ dimensions: 384 });
    this.userProfiles = new Map();
    this.embedder = new TextEmbedder();
  }

  addItem(id, text, metadata = {}) {
    const vector = this.embedder.embed(text);
    this.items.add(id, vector, { ...metadata, text });
  }

  recordInteraction(userId, itemId, type = 'view', weight = 1) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        interactions: [],
        vector: null
      });
    }

    const profile = this.userProfiles.get(userId);
    profile.interactions.push({ itemId, type, weight, timestamp: Date.now() });

    // Update user vector
    this.updateUserVector(userId);
  }

  updateUserVector(userId) {
    const profile = this.userProfiles.get(userId);
    if (!profile || profile.interactions.length === 0) return;

    const vectors = [];
    const weights = [];

    for (const interaction of profile.interactions.slice(-50)) {
      const item = this.items.get(interaction.itemId);
      if (item?.vector) {
        vectors.push(item.vector);
        weights.push(interaction.weight);
      }
    }

    if (vectors.length === 0) return;

    // Weighted average
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const result = new Array(vectors[0].length).fill(0);

    for (let i = 0; i < vectors.length; i++) {
      for (let j = 0; j < vectors[i].length; j++) {
        result[j] += vectors[i][j] * (weights[i] / totalWeight);
      }
    }

    profile.vector = VectorOps.normalize(result);
  }

  recommend(userId, options = {}) {
    const { topK = 10, exclude = [] } = options;

    const profile = this.userProfiles.get(userId);
    if (!profile?.vector) {
      // Cold start - return popular items
      return [];
    }

    // Find similar items to user profile
    const results = this.items.search(profile.vector, {
      topK: topK + exclude.length,
      threshold: 0.1
    });

    // Filter out excluded items
    const interactedIds = new Set(profile.interactions.map(i => i.itemId));
    const excludeSet = new Set([...exclude, ...interactedIds]);

    return results
      .filter(r => !excludeSet.has(r.id))
      .slice(0, topK);
  }

  findSimilar(itemId, topK = 10) {
    const item = this.items.get(itemId);
    if (!item?.vector) return [];

    return this.items.search(item.vector, { topK: topK + 1 })
      .filter(r => r.id !== itemId);
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  VectorOps,
  VectorStore,
  TextEmbedder,
  TextClassifier,
  SentimentAnalyzer,
  EntityExtractor,
  AIPipeline,
  RecommendationEngine,

  // Quick helpers
  embed: (text) => new TextEmbedder().embed(text),
  sentiment: (text) => new SentimentAnalyzer().analyze(text),
  entities: (text) => new EntityExtractor().extract(text),
  pipeline: () => new AIPipeline(),
  vectorStore: (opts) => new VectorStore(opts)
};
