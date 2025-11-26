/**
 * GORUNFREEX1TRILLION - CLI FRAMEWORK
 * Build powerful command-line applications
 */

const { EventEmitter } = require('events');
const readline = require('readline');

// ============================================
// COLORS & STYLING
// ============================================

const styles = {
  // Colors
  black: (s) => `\x1b[30m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  white: (s) => `\x1b[37m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,

  // Styles
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  italic: (s) => `\x1b[3m${s}\x1b[0m`,
  underline: (s) => `\x1b[4m${s}\x1b[0m`,
  inverse: (s) => `\x1b[7m${s}\x1b[0m`,
  strikethrough: (s) => `\x1b[9m${s}\x1b[0m`,

  // Backgrounds
  bgBlack: (s) => `\x1b[40m${s}\x1b[0m`,
  bgRed: (s) => `\x1b[41m${s}\x1b[0m`,
  bgGreen: (s) => `\x1b[42m${s}\x1b[0m`,
  bgYellow: (s) => `\x1b[43m${s}\x1b[0m`,
  bgBlue: (s) => `\x1b[44m${s}\x1b[0m`,
  bgMagenta: (s) => `\x1b[45m${s}\x1b[0m`,
  bgCyan: (s) => `\x1b[46m${s}\x1b[0m`,
  bgWhite: (s) => `\x1b[47m${s}\x1b[0m`,

  // Semantic
  success: (s) => `\x1b[32m${s}\x1b[0m`,
  error: (s) => `\x1b[31m${s}\x1b[0m`,
  warning: (s) => `\x1b[33m${s}\x1b[0m`,
  info: (s) => `\x1b[36m${s}\x1b[0m`,
  highlight: (s) => `\x1b[1m\x1b[33m${s}\x1b[0m`
};

// ============================================
// ARGUMENT PARSER
// ============================================

class ArgumentParser {
  constructor() {
    this.options = new Map();
    this.positionals = [];
    this.commands = new Map();
  }

  option(name, config = {}) {
    this.options.set(name, {
      alias: config.alias,
      type: config.type || 'string',
      default: config.default,
      required: config.required || false,
      description: config.description || '',
      choices: config.choices
    });
    return this;
  }

  positional(name, config = {}) {
    this.positionals.push({
      name,
      type: config.type || 'string',
      required: config.required !== false,
      description: config.description || '',
      variadic: config.variadic || false
    });
    return this;
  }

  command(name, config = {}) {
    const subParser = new ArgumentParser();
    this.commands.set(name, {
      parser: subParser,
      description: config.description || '',
      handler: config.handler
    });
    return subParser;
  }

  parse(args = process.argv.slice(2)) {
    const result = {
      options: {},
      positionals: [],
      command: null,
      commandArgs: null
    };

    // Set defaults
    for (const [name, config] of this.options) {
      if (config.default !== undefined) {
        result.options[name] = config.default;
      }
    }

    let i = 0;
    let positionalIndex = 0;

    while (i < args.length) {
      const arg = args[i];

      // Check for command
      if (this.commands.has(arg)) {
        result.command = arg;
        const commandConfig = this.commands.get(arg);
        result.commandArgs = commandConfig.parser.parse(args.slice(i + 1));
        break;
      }

      // Long option
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        const optConfig = this.options.get(key);

        if (optConfig) {
          if (optConfig.type === 'boolean') {
            result.options[key] = value !== 'false';
          } else if (value !== undefined) {
            result.options[key] = this.castValue(value, optConfig.type);
          } else if (args[i + 1] && !args[i + 1].startsWith('-')) {
            result.options[key] = this.castValue(args[++i], optConfig.type);
          } else {
            result.options[key] = true;
          }
        }
      }
      // Short option
      else if (arg.startsWith('-') && arg.length > 1) {
        const flags = arg.slice(1);

        for (let j = 0; j < flags.length; j++) {
          const flag = flags[j];

          // Find option by alias
          let optName = null;
          let optConfig = null;

          for (const [name, config] of this.options) {
            if (config.alias === flag) {
              optName = name;
              optConfig = config;
              break;
            }
          }

          if (optConfig) {
            if (optConfig.type === 'boolean') {
              result.options[optName] = true;
            } else if (j === flags.length - 1 && args[i + 1] && !args[i + 1].startsWith('-')) {
              result.options[optName] = this.castValue(args[++i], optConfig.type);
            }
          }
        }
      }
      // Positional
      else {
        const posConfig = this.positionals[positionalIndex];

        if (posConfig) {
          if (posConfig.variadic) {
            result.positionals.push(...args.slice(i).map(v => this.castValue(v, posConfig.type)));
            break;
          } else {
            result.positionals.push(this.castValue(arg, posConfig.type));
            positionalIndex++;
          }
        } else {
          result.positionals.push(arg);
        }
      }

      i++;
    }

    // Validate required options
    for (const [name, config] of this.options) {
      if (config.required && result.options[name] === undefined) {
        throw new Error(`Required option --${name} is missing`);
      }

      if (config.choices && result.options[name] !== undefined) {
        if (!config.choices.includes(result.options[name])) {
          throw new Error(`Invalid value for --${name}. Must be one of: ${config.choices.join(', ')}`);
        }
      }
    }

    return result;
  }

  castValue(value, type) {
    switch (type) {
      case 'number': return Number(value);
      case 'boolean': return value === 'true' || value === true;
      case 'array': return value.split(',');
      default: return value;
    }
  }

  generateHelp(name = 'command') {
    let help = `\nUsage: ${name}`;

    if (this.commands.size > 0) {
      help += ' <command>';
    }

    if (this.positionals.length > 0) {
      help += ' ' + this.positionals.map(p =>
        p.variadic ? `[${p.name}...]` : (p.required ? `<${p.name}>` : `[${p.name}]`)
      ).join(' ');
    }

    help += ' [options]\n';

    if (this.commands.size > 0) {
      help += '\nCommands:\n';
      for (const [cmdName, config] of this.commands) {
        help += `  ${cmdName.padEnd(20)} ${config.description}\n`;
      }
    }

    if (this.positionals.length > 0) {
      help += '\nArguments:\n';
      for (const pos of this.positionals) {
        help += `  ${pos.name.padEnd(20)} ${pos.description}\n`;
      }
    }

    if (this.options.size > 0) {
      help += '\nOptions:\n';
      for (const [name, config] of this.options) {
        const alias = config.alias ? `-${config.alias}, ` : '    ';
        const flag = `${alias}--${name}`;
        help += `  ${flag.padEnd(20)} ${config.description}`;
        if (config.default !== undefined) {
          help += ` (default: ${config.default})`;
        }
        help += '\n';
      }
    }

    return help;
  }
}

// ============================================
// CLI APPLICATION
// ============================================

class CLI extends EventEmitter {
  constructor(config = {}) {
    super();
    this.name = config.name || 'cli';
    this.version = config.version || '1.0.0';
    this.description = config.description || '';
    this.parser = new ArgumentParser();
    this.commands = new Map();

    // Add built-in options
    this.parser.option('help', { alias: 'h', type: 'boolean', description: 'Show help' });
    this.parser.option('version', { alias: 'v', type: 'boolean', description: 'Show version' });
  }

  option(name, config) {
    this.parser.option(name, config);
    return this;
  }

  command(name, config = {}) {
    const subParser = this.parser.command(name, config);
    this.commands.set(name, {
      parser: subParser,
      ...config
    });
    return this;
  }

  action(handler) {
    this.handler = handler;
    return this;
  }

  async run(args = process.argv.slice(2)) {
    try {
      const parsed = this.parser.parse(args);

      // Handle built-in options
      if (parsed.options.help) {
        console.log(this.parser.generateHelp(this.name));
        return;
      }

      if (parsed.options.version) {
        console.log(`${this.name} v${this.version}`);
        return;
      }

      // Handle command
      if (parsed.command) {
        const cmdConfig = this.commands.get(parsed.command);
        if (cmdConfig && cmdConfig.handler) {
          await cmdConfig.handler(parsed.commandArgs);
          return;
        }
      }

      // Handle main action
      if (this.handler) {
        await this.handler(parsed);
      }

    } catch (error) {
      console.error(styles.error(`Error: ${error.message}`));
      process.exit(1);
    }
  }
}

// ============================================
// PROMPTS
// ============================================

class Prompt {
  constructor() {
    this.rl = null;
  }

  createInterface() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  async input(message, defaultValue = '') {
    const rl = this.createInterface();
    const prompt = defaultValue ? `${message} (${defaultValue}): ` : `${message}: `;

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer || defaultValue);
      });
    });
  }

  async confirm(message, defaultValue = false) {
    const hint = defaultValue ? '[Y/n]' : '[y/N]';
    const answer = await this.input(`${message} ${hint}`);

    if (!answer) return defaultValue;
    return answer.toLowerCase().startsWith('y');
  }

  async select(message, choices) {
    console.log(`\n${message}\n`);

    choices.forEach((choice, i) => {
      const label = typeof choice === 'object' ? choice.name : choice;
      console.log(`  ${styles.cyan((i + 1).toString())}. ${label}`);
    });

    const answer = await this.input('\nSelect an option');
    const index = parseInt(answer) - 1;

    if (index >= 0 && index < choices.length) {
      const choice = choices[index];
      return typeof choice === 'object' ? choice.value : choice;
    }

    throw new Error('Invalid selection');
  }

  async multiselect(message, choices) {
    console.log(`\n${message} (comma-separated numbers)\n`);

    choices.forEach((choice, i) => {
      const label = typeof choice === 'object' ? choice.name : choice;
      console.log(`  ${styles.cyan((i + 1).toString())}. ${label}`);
    });

    const answer = await this.input('\nSelect options');
    const indices = answer.split(',').map(s => parseInt(s.trim()) - 1);

    return indices
      .filter(i => i >= 0 && i < choices.length)
      .map(i => {
        const choice = choices[i];
        return typeof choice === 'object' ? choice.value : choice;
      });
  }

  async password(message) {
    const rl = this.createInterface();

    return new Promise((resolve) => {
      rl.question(`${message}: `, (answer) => {
        resolve(answer);
      });

      // Hide input (works in some terminals)
      rl._writeToOutput = () => {};
    });
  }
}

// ============================================
// PROGRESS & SPINNERS
// ============================================

class ProgressBar {
  constructor(options = {}) {
    this.total = options.total || 100;
    this.width = options.width || 40;
    this.complete = options.complete || '█';
    this.incomplete = options.incomplete || '░';
    this.current = 0;
  }

  update(current) {
    this.current = current;
    this.render();
  }

  increment(amount = 1) {
    this.current = Math.min(this.total, this.current + amount);
    this.render();
  }

  render() {
    const percent = this.current / this.total;
    const filled = Math.round(this.width * percent);
    const empty = this.width - filled;

    const bar = this.complete.repeat(filled) + this.incomplete.repeat(empty);
    const percentStr = (percent * 100).toFixed(0).padStart(3) + '%';

    process.stdout.write(`\r${bar} ${percentStr} ${this.current}/${this.total}`);

    if (this.current >= this.total) {
      console.log();
    }
  }
}

class Spinner {
  constructor(options = {}) {
    this.frames = options.frames || ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.interval = options.interval || 80;
    this.message = options.message || '';
    this.frameIndex = 0;
    this.timer = null;
  }

  start(message = this.message) {
    this.message = message;
    this.timer = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${styles.cyan(frame)} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, this.interval);
    return this;
  }

  stop(finalMessage = '') {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
    if (finalMessage) {
      console.log(finalMessage);
    }
    return this;
  }

  success(message) {
    this.stop(`${styles.green('✓')} ${message}`);
  }

  fail(message) {
    this.stop(`${styles.red('✗')} ${message}`);
  }

  update(message) {
    this.message = message;
  }
}

// ============================================
// TABLE OUTPUT
// ============================================

class Table {
  constructor(options = {}) {
    this.headers = options.headers || [];
    this.rows = [];
    this.columnWidths = [];
  }

  addRow(row) {
    this.rows.push(row);
    return this;
  }

  addRows(rows) {
    this.rows.push(...rows);
    return this;
  }

  calculateWidths() {
    const allRows = [this.headers, ...this.rows];
    const numCols = Math.max(...allRows.map(r => r.length));

    this.columnWidths = Array(numCols).fill(0);

    for (const row of allRows) {
      for (let i = 0; i < row.length; i++) {
        const cellStr = String(row[i] ?? '');
        this.columnWidths[i] = Math.max(this.columnWidths[i], cellStr.length);
      }
    }
  }

  toString() {
    this.calculateWidths();

    const lines = [];
    const separator = '─'.repeat(
      this.columnWidths.reduce((a, b) => a + b, 0) + (this.columnWidths.length * 3) + 1
    );

    // Header
    if (this.headers.length > 0) {
      lines.push(separator);
      lines.push(this.formatRow(this.headers, true));
      lines.push(separator);
    }

    // Rows
    for (const row of this.rows) {
      lines.push(this.formatRow(row));
    }

    lines.push(separator);

    return lines.join('\n');
  }

  formatRow(row, isHeader = false) {
    const cells = row.map((cell, i) => {
      const str = String(cell ?? '');
      const padded = str.padEnd(this.columnWidths[i]);
      return isHeader ? styles.bold(padded) : padded;
    });

    return '│ ' + cells.join(' │ ') + ' │';
  }

  print() {
    console.log(this.toString());
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  CLI,
  ArgumentParser,
  Prompt,
  ProgressBar,
  Spinner,
  Table,
  styles,

  // Quick creation
  create: (config) => new CLI(config),
  prompt: new Prompt(),
  spinner: (options) => new Spinner(options),
  progress: (options) => new ProgressBar(options),
  table: (options) => new Table(options)
};
