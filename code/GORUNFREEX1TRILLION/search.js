/**
 * GORUNFREEX1TRILLION - SEARCH ENGINE
 * Full-text search with indexing and ranking
 */

const { EventEmitter } = require('events');

// ============================================
// TEXT ANALYZER
// ============================================

class TextAnalyzer {
  constructor(options = {}) {
    this.stopWords = new Set(options.stopWords || [
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
      'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
    ]);

    this.stemmer = options.stemmer || this.defaultStemmer;
  }

  analyze(text) {
    if (!text) return [];

    // Tokenize
    let tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);

    // Remove stop words
    tokens = tokens.filter(t => !this.stopWords.has(t));

    // Stem words
    tokens = tokens.map(t => this.stemmer(t));

    return tokens;
  }

  defaultStemmer(word) {
    // Simple suffix stripping
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('ly')) return word.slice(0, -2);
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es')) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
    return word;
  }

  tokenize(text) {
    return text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  }

  ngrams(text, n = 2) {
    const tokens = this.tokenize(text);
    const ngrams = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }

    return ngrams;
  }
}

// ============================================
// INVERTED INDEX
// ============================================

class InvertedIndex {
  constructor(analyzer) {
    this.analyzer = analyzer || new TextAnalyzer();
    this.index = new Map(); // term -> { docId -> { positions, tf } }
    this.documents = new Map(); // docId -> { fields, length }
    this.fieldLengths = new Map(); // field -> total length
    this.docCount = 0;
  }

  addDocument(docId, fields) {
    // Remove old version if exists
    if (this.documents.has(docId)) {
      this.removeDocument(docId);
    }

    const docData = { fields, termFreqs: {}, length: 0 };

    // Index each field
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      if (typeof fieldValue !== 'string') continue;

      const tokens = this.analyzer.analyze(fieldValue);
      docData.length += tokens.length;

      // Update field lengths
      const currentFieldLength = this.fieldLengths.get(fieldName) || 0;
      this.fieldLengths.set(fieldName, currentFieldLength + tokens.length);

      // Index tokens
      tokens.forEach((token, position) => {
        // Update inverted index
        if (!this.index.has(token)) {
          this.index.set(token, new Map());
        }

        const postings = this.index.get(token);

        if (!postings.has(docId)) {
          postings.set(docId, { positions: [], tf: 0, field: fieldName });
        }

        const posting = postings.get(docId);
        posting.positions.push(position);
        posting.tf++;

        // Update doc term freq
        docData.termFreqs[token] = (docData.termFreqs[token] || 0) + 1;
      });
    }

    this.documents.set(docId, docData);
    this.docCount++;

    return docId;
  }

  removeDocument(docId) {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    // Remove from inverted index
    for (const term of Object.keys(doc.termFreqs)) {
      const postings = this.index.get(term);
      if (postings) {
        postings.delete(docId);
        if (postings.size === 0) {
          this.index.delete(term);
        }
      }
    }

    this.documents.delete(docId);
    this.docCount--;

    return true;
  }

  getDocument(docId) {
    return this.documents.get(docId);
  }

  getTermStats(term) {
    const postings = this.index.get(term);
    if (!postings) return null;

    return {
      term,
      documentFrequency: postings.size,
      totalFrequency: Array.from(postings.values()).reduce((sum, p) => sum + p.tf, 0)
    };
  }

  getStats() {
    return {
      documentCount: this.docCount,
      termCount: this.index.size,
      avgDocLength: this.docCount > 0
        ? Array.from(this.documents.values()).reduce((sum, d) => sum + d.length, 0) / this.docCount
        : 0
    };
  }
}

// ============================================
// SEARCH ENGINE
// ============================================

class SearchEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.analyzer = new TextAnalyzer(options.analyzer);
    this.index = new InvertedIndex(this.analyzer);
    this.k1 = options.k1 || 1.2; // BM25 parameter
    this.b = options.b || 0.75; // BM25 parameter
  }

  // Add document to index
  add(docId, document) {
    this.index.addDocument(docId, document);
    this.emit('indexed', { docId });
    return this;
  }

  // Add multiple documents
  addMany(documents) {
    for (const doc of documents) {
      this.add(doc.id, doc);
    }
    return this;
  }

  // Remove document
  remove(docId) {
    const removed = this.index.removeDocument(docId);
    if (removed) {
      this.emit('removed', { docId });
    }
    return removed;
  }

  // Search with BM25 ranking
  search(query, options = {}) {
    const { limit = 10, offset = 0, fields = null } = options;

    const queryTerms = this.analyzer.analyze(query);
    if (queryTerms.length === 0) return { results: [], total: 0 };

    const scores = new Map();
    const stats = this.index.getStats();
    const avgDocLength = stats.avgDocLength;
    const N = stats.documentCount;

    // Calculate BM25 score for each document
    for (const term of queryTerms) {
      const postings = this.index.index.get(term);
      if (!postings) continue;

      const df = postings.size;
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      for (const [docId, posting] of postings) {
        // Filter by fields if specified
        if (fields && !fields.includes(posting.field)) continue;

        const doc = this.index.documents.get(docId);
        const tf = posting.tf;
        const docLength = doc.length;

        // BM25 scoring
        const tfNorm = (tf * (this.k1 + 1)) /
          (tf + this.k1 * (1 - this.b + this.b * (docLength / avgDocLength)));

        const score = idf * tfNorm;

        scores.set(docId, (scores.get(docId) || 0) + score);
      }
    }

    // Sort by score
    const results = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(offset, offset + limit)
      .map(([docId, score]) => ({
        id: docId,
        score,
        document: this.index.documents.get(docId)?.fields
      }));

    return {
      results,
      total: scores.size,
      query,
      terms: queryTerms
    };
  }

  // Autocomplete suggestions
  suggest(prefix, options = {}) {
    const { limit = 10 } = options;
    const normalizedPrefix = prefix.toLowerCase();
    const suggestions = [];

    for (const term of this.index.index.keys()) {
      if (term.startsWith(normalizedPrefix)) {
        const stats = this.index.getTermStats(term);
        suggestions.push({
          term,
          frequency: stats.documentFrequency
        });
      }

      if (suggestions.length >= limit * 2) break;
    }

    // Sort by frequency
    suggestions.sort((a, b) => b.frequency - a.frequency);

    return suggestions.slice(0, limit);
  }

  // Find similar documents
  findSimilar(docId, options = {}) {
    const { limit = 10 } = options;

    const doc = this.index.documents.get(docId);
    if (!doc) return [];

    // Use document terms as query
    const terms = Object.keys(doc.termFreqs);
    const query = terms.join(' ');

    const results = this.search(query, { limit: limit + 1 });

    // Remove the source document
    return results.results.filter(r => r.id !== docId).slice(0, limit);
  }

  // Highlight matching terms
  highlight(text, query, options = {}) {
    const { tag = 'mark' } = options;

    const terms = this.analyzer.analyze(query);
    let highlighted = text;

    for (const term of terms) {
      const regex = new RegExp(`\\b(${term}\\w*)\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<${tag}>$1</${tag}>`);
    }

    return highlighted;
  }

  // Get excerpt with highlights
  getSnippet(text, query, options = {}) {
    const { length = 150, tag = 'mark' } = options;

    const terms = this.analyzer.analyze(query);
    const lowerText = text.toLowerCase();

    // Find first occurrence of any term
    let startPos = 0;
    for (const term of terms) {
      const pos = lowerText.indexOf(term);
      if (pos !== -1) {
        startPos = Math.max(0, pos - 30);
        break;
      }
    }

    // Extract snippet
    let snippet = text.substring(startPos, startPos + length);

    // Clean up
    if (startPos > 0) snippet = '...' + snippet;
    if (startPos + length < text.length) snippet = snippet + '...';

    // Highlight
    return this.highlight(snippet, query, { tag });
  }

  getStats() {
    return this.index.getStats();
  }
}

// ============================================
// FACETED SEARCH
// ============================================

class FacetedSearch extends SearchEngine {
  constructor(options = {}) {
    super(options);
    this.facetFields = options.facetFields || [];
    this.facetData = new Map();
  }

  add(docId, document) {
    super.add(docId, document);

    // Index facets
    for (const field of this.facetFields) {
      const value = document[field];
      if (value === undefined) continue;

      if (!this.facetData.has(field)) {
        this.facetData.set(field, new Map());
      }

      const facetValues = this.facetData.get(field);
      const values = Array.isArray(value) ? value : [value];

      for (const v of values) {
        if (!facetValues.has(v)) {
          facetValues.set(v, new Set());
        }
        facetValues.get(v).add(docId);
      }
    }

    return this;
  }

  search(query, options = {}) {
    let results = super.search(query, { ...options, limit: Infinity });

    // Apply facet filters
    if (options.filters) {
      const docIds = new Set(results.results.map(r => r.id));

      for (const [field, values] of Object.entries(options.filters)) {
        const facetValues = this.facetData.get(field);
        if (!facetValues) continue;

        const filterValues = Array.isArray(values) ? values : [values];
        const matchingDocs = new Set();

        for (const value of filterValues) {
          const docs = facetValues.get(value);
          if (docs) {
            docs.forEach(id => matchingDocs.add(id));
          }
        }

        // Intersect with current results
        for (const docId of docIds) {
          if (!matchingDocs.has(docId)) {
            docIds.delete(docId);
          }
        }
      }

      results.results = results.results.filter(r => docIds.has(r.id));
      results.total = results.results.length;
    }

    // Calculate facet counts
    const facets = {};
    const resultIds = new Set(results.results.map(r => r.id));

    for (const field of this.facetFields) {
      facets[field] = [];
      const facetValues = this.facetData.get(field);

      if (facetValues) {
        for (const [value, docIds] of facetValues) {
          const count = Array.from(docIds).filter(id => resultIds.has(id)).length;
          if (count > 0) {
            facets[field].push({ value, count });
          }
        }

        // Sort by count
        facets[field].sort((a, b) => b.count - a.count);
      }
    }

    // Apply pagination
    const start = options.offset || 0;
    const end = start + (options.limit || 10);
    results.results = results.results.slice(start, end);

    return { ...results, facets };
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  SearchEngine,
  FacetedSearch,
  TextAnalyzer,
  InvertedIndex,

  // Quick setup
  createSearchEngine: (options) => new SearchEngine(options),
  createFacetedSearch: (options) => new FacetedSearch(options)
};
