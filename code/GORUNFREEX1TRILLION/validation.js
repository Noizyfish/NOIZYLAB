/**
 * GORUNFREEX1TRILLION - VALIDATION
 * Comprehensive data validation library
 */

// ============================================
// VALIDATION ERRORS
// ============================================

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      message: this.message,
      errors: this.errors
    };
  }
}

// ============================================
// SCHEMA BUILDER
// ============================================

class Schema {
  constructor() {
    this.rules = [];
    this._required = false;
    this._nullable = false;
    this._default = undefined;
    this._label = '';
    this._transform = [];
  }

  // Core validators
  required(message = 'This field is required') {
    this._required = true;
    this.rules.push({
      name: 'required',
      message,
      validate: (value) => value !== undefined && value !== null && value !== ''
    });
    return this;
  }

  optional() {
    this._required = false;
    return this;
  }

  nullable() {
    this._nullable = true;
    return this;
  }

  default(value) {
    this._default = value;
    return this;
  }

  label(name) {
    this._label = name;
    return this;
  }

  // Transformations
  transform(fn) {
    this._transform.push(fn);
    return this;
  }

  trim() {
    return this.transform(v => typeof v === 'string' ? v.trim() : v);
  }

  toLowerCase() {
    return this.transform(v => typeof v === 'string' ? v.toLowerCase() : v);
  }

  toUpperCase() {
    return this.transform(v => typeof v === 'string' ? v.toUpperCase() : v);
  }

  // Custom validation
  custom(fn, message = 'Validation failed') {
    this.rules.push({
      name: 'custom',
      message,
      validate: fn
    });
    return this;
  }

  // Validation execution
  async validate(value, path = '') {
    const errors = [];

    // Apply default
    if (value === undefined && this._default !== undefined) {
      value = typeof this._default === 'function' ? this._default() : this._default;
    }

    // Handle null
    if (value === null && this._nullable) {
      return { valid: true, value, errors: [] };
    }

    // Apply transformations
    for (const transform of this._transform) {
      value = transform(value);
    }

    // Run rules
    for (const rule of this.rules) {
      const result = await rule.validate(value);
      if (!result) {
        errors.push({
          path: path || this._label || 'value',
          rule: rule.name,
          message: rule.message
        });
      }
    }

    return {
      valid: errors.length === 0,
      value,
      errors
    };
  }

  // Shorthand for throwing validation
  async parse(value) {
    const result = await this.validate(value);
    if (!result.valid) {
      throw new ValidationError('Validation failed', result.errors);
    }
    return result.value;
  }
}

// ============================================
// STRING SCHEMA
// ============================================

class StringSchema extends Schema {
  constructor() {
    super();
    this.rules.push({
      name: 'type',
      message: 'Must be a string',
      validate: (value) => value === undefined || value === null || typeof value === 'string'
    });
  }

  min(length, message = `Must be at least ${length} characters`) {
    this.rules.push({
      name: 'min',
      message,
      validate: (v) => !v || v.length >= length
    });
    return this;
  }

  max(length, message = `Must be at most ${length} characters`) {
    this.rules.push({
      name: 'max',
      message,
      validate: (v) => !v || v.length <= length
    });
    return this;
  }

  length(len, message = `Must be exactly ${len} characters`) {
    this.rules.push({
      name: 'length',
      message,
      validate: (v) => !v || v.length === len
    });
    return this;
  }

  pattern(regex, message = 'Invalid format') {
    this.rules.push({
      name: 'pattern',
      message,
      validate: (v) => !v || regex.test(v)
    });
    return this;
  }

  email(message = 'Invalid email address') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(emailRegex, message);
  }

  url(message = 'Invalid URL') {
    this.rules.push({
      name: 'url',
      message,
      validate: (v) => {
        if (!v) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      }
    });
    return this;
  }

  uuid(message = 'Invalid UUID') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return this.pattern(uuidRegex, message);
  }

  alphanumeric(message = 'Must contain only letters and numbers') {
    return this.pattern(/^[a-zA-Z0-9]+$/, message);
  }

  enum(values, message = `Must be one of: ${values.join(', ')}`) {
    this.rules.push({
      name: 'enum',
      message,
      validate: (v) => !v || values.includes(v)
    });
    return this;
  }
}

// ============================================
// NUMBER SCHEMA
// ============================================

class NumberSchema extends Schema {
  constructor() {
    super();
    this.rules.push({
      name: 'type',
      message: 'Must be a number',
      validate: (value) => value === undefined || value === null || typeof value === 'number'
    });
  }

  integer(message = 'Must be an integer') {
    this.rules.push({
      name: 'integer',
      message,
      validate: (v) => v === undefined || Number.isInteger(v)
    });
    return this;
  }

  min(min, message = `Must be at least ${min}`) {
    this.rules.push({
      name: 'min',
      message,
      validate: (v) => v === undefined || v >= min
    });
    return this;
  }

  max(max, message = `Must be at most ${max}`) {
    this.rules.push({
      name: 'max',
      message,
      validate: (v) => v === undefined || v <= max
    });
    return this;
  }

  positive(message = 'Must be positive') {
    return this.min(0, message);
  }

  negative(message = 'Must be negative') {
    return this.max(0, message);
  }

  between(min, max, message = `Must be between ${min} and ${max}`) {
    this.rules.push({
      name: 'between',
      message,
      validate: (v) => v === undefined || (v >= min && v <= max)
    });
    return this;
  }

  port(message = 'Must be a valid port number') {
    return this.integer().between(1, 65535, message);
  }
}

// ============================================
// BOOLEAN SCHEMA
// ============================================

class BooleanSchema extends Schema {
  constructor() {
    super();
    this.rules.push({
      name: 'type',
      message: 'Must be a boolean',
      validate: (value) => value === undefined || value === null || typeof value === 'boolean'
    });
  }

  true(message = 'Must be true') {
    this.rules.push({
      name: 'true',
      message,
      validate: (v) => v === true
    });
    return this;
  }

  false(message = 'Must be false') {
    this.rules.push({
      name: 'false',
      message,
      validate: (v) => v === false
    });
    return this;
  }
}

// ============================================
// ARRAY SCHEMA
// ============================================

class ArraySchema extends Schema {
  constructor(itemSchema = null) {
    super();
    this.itemSchema = itemSchema;
    this.rules.push({
      name: 'type',
      message: 'Must be an array',
      validate: (value) => value === undefined || value === null || Array.isArray(value)
    });
  }

  of(schema) {
    this.itemSchema = schema;
    return this;
  }

  min(length, message = `Must have at least ${length} items`) {
    this.rules.push({
      name: 'min',
      message,
      validate: (v) => !v || v.length >= length
    });
    return this;
  }

  max(length, message = `Must have at most ${length} items`) {
    this.rules.push({
      name: 'max',
      message,
      validate: (v) => !v || v.length <= length
    });
    return this;
  }

  length(len, message = `Must have exactly ${len} items`) {
    this.rules.push({
      name: 'length',
      message,
      validate: (v) => !v || v.length === len
    });
    return this;
  }

  unique(message = 'Items must be unique') {
    this.rules.push({
      name: 'unique',
      message,
      validate: (v) => !v || new Set(v).size === v.length
    });
    return this;
  }

  async validate(value, path = '') {
    const baseResult = await super.validate(value, path);

    if (!baseResult.valid || !Array.isArray(value) || !this.itemSchema) {
      return baseResult;
    }

    const errors = [...baseResult.errors];
    const validatedItems = [];

    for (let i = 0; i < value.length; i++) {
      const itemResult = await this.itemSchema.validate(value[i], `${path}[${i}]`);
      validatedItems.push(itemResult.value);
      errors.push(...itemResult.errors);
    }

    return {
      valid: errors.length === 0,
      value: validatedItems,
      errors
    };
  }
}

// ============================================
// OBJECT SCHEMA
// ============================================

class ObjectSchema extends Schema {
  constructor(shape = {}) {
    super();
    this.shape = shape;
    this._strict = false;
    this._passthrough = false;

    this.rules.push({
      name: 'type',
      message: 'Must be an object',
      validate: (value) => value === undefined || value === null ||
        (typeof value === 'object' && !Array.isArray(value))
    });
  }

  strict() {
    this._strict = true;
    return this;
  }

  passthrough() {
    this._passthrough = true;
    return this;
  }

  extend(shape) {
    return new ObjectSchema({ ...this.shape, ...shape });
  }

  pick(keys) {
    const newShape = {};
    for (const key of keys) {
      if (this.shape[key]) {
        newShape[key] = this.shape[key];
      }
    }
    return new ObjectSchema(newShape);
  }

  omit(keys) {
    const newShape = { ...this.shape };
    for (const key of keys) {
      delete newShape[key];
    }
    return new ObjectSchema(newShape);
  }

  async validate(value, path = '') {
    const baseResult = await super.validate(value, path);

    if (!baseResult.valid || typeof value !== 'object' || value === null) {
      return baseResult;
    }

    const errors = [...baseResult.errors];
    const validatedObject = {};
    const shapeKeys = Object.keys(this.shape);
    const valueKeys = Object.keys(value);

    // Validate shape fields
    for (const key of shapeKeys) {
      const schema = this.shape[key];
      const fieldPath = path ? `${path}.${key}` : key;
      const fieldResult = await schema.validate(value[key], fieldPath);

      validatedObject[key] = fieldResult.value;
      errors.push(...fieldResult.errors);
    }

    // Handle extra fields
    const extraKeys = valueKeys.filter(k => !shapeKeys.includes(k));

    if (this._strict && extraKeys.length > 0) {
      for (const key of extraKeys) {
        errors.push({
          path: path ? `${path}.${key}` : key,
          rule: 'strict',
          message: 'Unknown field'
        });
      }
    } else if (this._passthrough) {
      for (const key of extraKeys) {
        validatedObject[key] = value[key];
      }
    }

    return {
      valid: errors.length === 0,
      value: validatedObject,
      errors
    };
  }
}

// ============================================
// DATE SCHEMA
// ============================================

class DateSchema extends Schema {
  constructor() {
    super();
    this.rules.push({
      name: 'type',
      message: 'Must be a valid date',
      validate: (value) => {
        if (value === undefined || value === null) return true;
        const date = value instanceof Date ? value : new Date(value);
        return !isNaN(date.getTime());
      }
    });
  }

  min(minDate, message = `Must be after ${minDate}`) {
    this.rules.push({
      name: 'min',
      message,
      validate: (v) => !v || new Date(v) >= new Date(minDate)
    });
    return this;
  }

  max(maxDate, message = `Must be before ${maxDate}`) {
    this.rules.push({
      name: 'max',
      message,
      validate: (v) => !v || new Date(v) <= new Date(maxDate)
    });
    return this;
  }

  past(message = 'Must be in the past') {
    this.rules.push({
      name: 'past',
      message,
      validate: (v) => !v || new Date(v) < new Date()
    });
    return this;
  }

  future(message = 'Must be in the future') {
    this.rules.push({
      name: 'future',
      message,
      validate: (v) => !v || new Date(v) > new Date()
    });
    return this;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  array: (schema) => new ArraySchema(schema),
  object: (shape) => new ObjectSchema(shape),
  date: () => new DateSchema(),

  // Aliases
  str: () => new StringSchema(),
  num: () => new NumberSchema(),
  bool: () => new BooleanSchema(),
  arr: (schema) => new ArraySchema(schema),
  obj: (shape) => new ObjectSchema(shape),

  // Utilities
  validate: async (schema, value) => schema.validate(value),
  parse: async (schema, value) => schema.parse(value),

  ValidationError
};

// ============================================
// EXPORTS
// ============================================

module.exports = v;
