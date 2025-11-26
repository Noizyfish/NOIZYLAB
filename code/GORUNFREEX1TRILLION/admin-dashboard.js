/**
 * GORUNFREEX1TRILLION - ADMIN DASHBOARD GENERATOR
 * Dynamic admin interface generator with CRUD, charts, and real-time updates
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// ============================================
// DASHBOARD CONFIGURATION
// ============================================

class DashboardConfig {
  constructor(options = {}) {
    this.name = options.name || 'NOIZYLAB Admin';
    this.logo = options.logo || null;
    this.theme = options.theme || 'dark';
    this.primaryColor = options.primaryColor || '#00ff88';
    this.sidebar = options.sidebar || { collapsed: false };
    this.resources = new Map();
    this.widgets = [];
    this.pages = new Map();
    this.navigation = [];
  }

  addResource(name, config) {
    this.resources.set(name, new ResourceConfig(name, config));
    this.navigation.push({
      name,
      label: config.label || this.humanize(name),
      icon: config.icon || 'database',
      path: `/${name}`
    });
    return this;
  }

  addWidget(widget) {
    this.widgets.push(widget);
    return this;
  }

  addPage(path, config) {
    this.pages.set(path, config);
    return this;
  }

  humanize(str) {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }

  toJSON() {
    return {
      name: this.name,
      logo: this.logo,
      theme: this.theme,
      primaryColor: this.primaryColor,
      sidebar: this.sidebar,
      resources: Object.fromEntries(
        Array.from(this.resources.entries()).map(([k, v]) => [k, v.toJSON()])
      ),
      widgets: this.widgets,
      pages: Object.fromEntries(this.pages),
      navigation: this.navigation
    };
  }
}

// ============================================
// RESOURCE CONFIGURATION
// ============================================

class ResourceConfig {
  constructor(name, config = {}) {
    this.name = name;
    this.label = config.label || name;
    this.labelPlural = config.labelPlural || `${this.label}s`;
    this.icon = config.icon || 'database';
    this.fields = config.fields || [];
    this.listFields = config.listFields || this.fields.map(f => f.name);
    this.searchFields = config.searchFields || [];
    this.filterFields = config.filterFields || [];
    this.sortFields = config.sortFields || [];
    this.defaultSort = config.defaultSort || { field: 'id', order: 'desc' };
    this.perPage = config.perPage || 25;
    this.actions = config.actions || ['create', 'edit', 'delete', 'show'];
    this.bulkActions = config.bulkActions || ['delete'];
    this.exportFormats = config.exportFormats || ['csv', 'json'];
  }

  addField(field) {
    this.fields.push(new FieldConfig(field));
    return this;
  }

  toJSON() {
    return {
      name: this.name,
      label: this.label,
      labelPlural: this.labelPlural,
      icon: this.icon,
      fields: this.fields.map(f => f instanceof FieldConfig ? f.toJSON() : f),
      listFields: this.listFields,
      searchFields: this.searchFields,
      filterFields: this.filterFields,
      sortFields: this.sortFields,
      defaultSort: this.defaultSort,
      perPage: this.perPage,
      actions: this.actions,
      bulkActions: this.bulkActions,
      exportFormats: this.exportFormats
    };
  }
}

// ============================================
// FIELD CONFIGURATION
// ============================================

class FieldConfig {
  constructor(config) {
    this.name = config.name;
    this.label = config.label || this.humanize(config.name);
    this.type = config.type || 'text';
    this.required = config.required || false;
    this.readonly = config.readonly || false;
    this.hidden = config.hidden || false;
    this.default = config.default;
    this.placeholder = config.placeholder;
    this.help = config.help;
    this.validation = config.validation || {};
    this.options = config.options; // For select/radio
    this.reference = config.reference; // For relationships
    this.format = config.format; // Display format
    this.sortable = config.sortable !== false;
    this.filterable = config.filterable || false;
    this.searchable = config.searchable || false;
  }

  humanize(str) {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }

  toJSON() {
    return { ...this };
  }
}

// ============================================
// WIDGET TYPES
// ============================================

const WidgetTypes = {
  STAT: 'stat',
  CHART: 'chart',
  TABLE: 'table',
  LIST: 'list',
  TIMELINE: 'timeline',
  MAP: 'map',
  CUSTOM: 'custom'
};

class Widget {
  constructor(type, config) {
    this.id = config.id || crypto.randomBytes(8).toString('hex');
    this.type = type;
    this.title = config.title;
    this.size = config.size || 'medium'; // small, medium, large, full
    this.position = config.position || { row: 0, col: 0 };
    this.refreshInterval = config.refreshInterval || 0;
    this.config = config;
  }
}

class StatWidget extends Widget {
  constructor(config) {
    super(WidgetTypes.STAT, config);
    this.value = config.value;
    this.previousValue = config.previousValue;
    this.icon = config.icon;
    this.color = config.color;
    this.trend = config.trend; // up, down, neutral
    this.format = config.format; // number, currency, percent
  }
}

class ChartWidget extends Widget {
  constructor(config) {
    super(WidgetTypes.CHART, config);
    this.chartType = config.chartType || 'line'; // line, bar, pie, doughnut, area
    this.data = config.data || [];
    this.labels = config.labels || [];
    this.options = config.options || {};
  }
}

class TableWidget extends Widget {
  constructor(config) {
    super(WidgetTypes.TABLE, config);
    this.columns = config.columns || [];
    this.data = config.data || [];
    this.pagination = config.pagination !== false;
    this.pageSize = config.pageSize || 10;
  }
}

// ============================================
// DASHBOARD GENERATOR
// ============================================

class DashboardGenerator extends EventEmitter {
  constructor(config) {
    super();
    this.config = config instanceof DashboardConfig ? config : new DashboardConfig(config);
    this.dataProviders = new Map();
  }

  registerDataProvider(name, provider) {
    this.dataProviders.set(name, provider);
    return this;
  }

  // Generate dashboard HTML
  generateHTML() {
    const config = this.config.toJSON();

    return `<!DOCTYPE html>
<html lang="en" data-theme="${config.theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.name}</title>
  <style>
    ${this.generateCSS()}
  </style>
</head>
<body>
  <div class="dashboard">
    ${this.generateSidebar()}
    <main class="main-content">
      ${this.generateHeader()}
      <div class="content">
        ${this.generateWidgets()}
      </div>
    </main>
  </div>
  <script>
    ${this.generateJS()}
  </script>
</body>
</html>`;
  }

  generateCSS() {
    const primary = this.config.primaryColor;

    return `
:root {
  --primary: ${primary};
  --primary-rgb: ${this.hexToRgb(primary)};
  --bg-dark: #0a0a0a;
  --bg-card: #141414;
  --bg-hover: #1a1a1a;
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --border: #222222;
  --success: #00cc66;
  --warning: #ffaa00;
  --danger: #ff4444;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-dark);
  color: var(--text-primary);
  min-height: 100vh;
}

.dashboard {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-logo {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover, .nav-item.active {
  background: var(--bg-hover);
  color: var(--primary);
  border-left: 3px solid var(--primary);
}

.nav-icon {
  width: 20px;
  margin-right: 12px;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 20px 30px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

/* Widgets Grid */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.widget {
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.widget-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.widget-content {
  padding: 20px;
}

/* Stat Widget */
.stat-widget {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(var(--primary-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.stat-trend {
  font-size: 12px;
  margin-top: 4px;
}

.stat-trend.up { color: var(--success); }
.stat-trend.down { color: var(--danger); }

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
}

.data-table tr:hover {
  background: var(--bg-hover);
}

/* Buttons */
.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: #000;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
`;
  }

  generateSidebar() {
    const config = this.config.toJSON();

    const navItems = config.navigation.map(item => `
      <a href="${item.path}" class="nav-item">
        <span class="nav-icon">${this.getIcon(item.icon)}</span>
        <span>${item.label}</span>
      </a>
    `).join('');

    return `
<aside class="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo">${config.name}</div>
  </div>
  <nav class="sidebar-nav">
    <a href="/dashboard" class="nav-item active">
      <span class="nav-icon">${this.getIcon('home')}</span>
      <span>Dashboard</span>
    </a>
    ${navItems}
    <a href="/settings" class="nav-item">
      <span class="nav-icon">${this.getIcon('settings')}</span>
      <span>Settings</span>
    </a>
  </nav>
</aside>`;
  }

  generateHeader() {
    return `
<header class="header">
  <h1 class="header-title">Dashboard</h1>
  <div class="header-actions">
    <button class="btn btn-secondary">Export</button>
    <button class="btn btn-primary">+ New</button>
  </div>
</header>`;
  }

  generateWidgets() {
    const widgets = this.config.widgets.map(w => this.generateWidget(w)).join('');

    return `
<div class="widgets-grid">
  ${widgets || this.generateDefaultWidgets()}
</div>`;
  }

  generateWidget(widget) {
    switch (widget.type) {
      case WidgetTypes.STAT:
        return this.generateStatWidget(widget);
      case WidgetTypes.CHART:
        return this.generateChartWidget(widget);
      case WidgetTypes.TABLE:
        return this.generateTableWidget(widget);
      default:
        return '';
    }
  }

  generateStatWidget(widget) {
    const trend = widget.trend === 'up' ? '+12%' : widget.trend === 'down' ? '-5%' : '';
    const trendClass = widget.trend || '';

    return `
<div class="widget widget-stat">
  <div class="widget-content">
    <div class="stat-widget">
      <div class="stat-icon">${this.getIcon(widget.icon || 'chart')}</div>
      <div>
        <div class="stat-value">${this.formatValue(widget.value, widget.format)}</div>
        <div class="stat-label">${widget.title}</div>
        ${trend ? `<div class="stat-trend ${trendClass}">${trend} vs last period</div>` : ''}
      </div>
    </div>
  </div>
</div>`;
  }

  generateChartWidget(widget) {
    return `
<div class="widget widget-chart" style="grid-column: span 2;">
  <div class="widget-header">${widget.title}</div>
  <div class="widget-content">
    <canvas id="chart-${widget.id}" height="200"></canvas>
  </div>
</div>`;
  }

  generateTableWidget(widget) {
    const headers = widget.columns.map(col => `<th>${col.label || col.name}</th>`).join('');

    return `
<div class="widget widget-table" style="grid-column: span 2;">
  <div class="widget-header">${widget.title}</div>
  <div class="widget-content">
    <table class="data-table">
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody id="table-${widget.id}"></tbody>
    </table>
  </div>
</div>`;
  }

  generateDefaultWidgets() {
    return `
<div class="widget">
  <div class="widget-content">
    <div class="stat-widget">
      <div class="stat-icon">${this.getIcon('users')}</div>
      <div>
        <div class="stat-value">12,847</div>
        <div class="stat-label">Total Users</div>
        <div class="stat-trend up">+12% vs last month</div>
      </div>
    </div>
  </div>
</div>

<div class="widget">
  <div class="widget-content">
    <div class="stat-widget">
      <div class="stat-icon">${this.getIcon('activity')}</div>
      <div>
        <div class="stat-value">$48,294</div>
        <div class="stat-label">Revenue</div>
        <div class="stat-trend up">+8% vs last month</div>
      </div>
    </div>
  </div>
</div>

<div class="widget">
  <div class="widget-content">
    <div class="stat-widget">
      <div class="stat-icon">${this.getIcon('box')}</div>
      <div>
        <div class="stat-value">1,429</div>
        <div class="stat-label">Orders</div>
        <div class="stat-trend down">-3% vs last month</div>
      </div>
    </div>
  </div>
</div>

<div class="widget">
  <div class="widget-content">
    <div class="stat-widget">
      <div class="stat-icon">${this.getIcon('percent')}</div>
      <div>
        <div class="stat-value">3.2%</div>
        <div class="stat-label">Conversion Rate</div>
        <div class="stat-trend up">+0.5% vs last month</div>
      </div>
    </div>
  </div>
</div>`;
  }

  generateJS() {
    return `
const Dashboard = {
  config: ${JSON.stringify(this.config.toJSON())},

  init() {
    this.setupNavigation();
    this.setupModals();
    this.loadData();
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  },

  setupModals() {
    // Modal logic
  },

  async loadData() {
    // Load widget data
  },

  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  },

  formatCurrency(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
`;
  }

  getIcon(name) {
    const icons = {
      home: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
      users: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      activity: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      box: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
      chart: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
      settings: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      database: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      percent: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>'
    };

    return icons[name] || icons.database;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 255, 136';
  }

  formatValue(value, format) {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percent':
        return `${value}%`;
      case 'number':
      default:
        return new Intl.NumberFormat().format(value);
    }
  }

  // Generate resource CRUD pages
  generateResourcePage(resourceName) {
    const resource = this.config.resources.get(resourceName);
    if (!resource) return null;

    return `<!DOCTYPE html>
<html lang="en" data-theme="${this.config.theme}">
<head>
  <meta charset="UTF-8">
  <title>${resource.labelPlural} - ${this.config.name}</title>
  <style>${this.generateCSS()}</style>
</head>
<body>
  <div class="dashboard">
    ${this.generateSidebar()}
    <main class="main-content">
      <header class="header">
        <h1 class="header-title">${resource.labelPlural}</h1>
        <div class="header-actions">
          <button class="btn btn-secondary" onclick="exportData()">Export</button>
          <button class="btn btn-primary" onclick="showCreateModal()">+ New ${resource.label}</button>
        </div>
      </header>
      <div class="content">
        ${this.generateResourceTable(resource)}
      </div>
    </main>
  </div>
  <script>${this.generateResourceJS(resource)}</script>
</body>
</html>`;
  }

  generateResourceTable(resource) {
    const headers = resource.listFields.map(fieldName => {
      const field = resource.fields.find(f => f.name === fieldName) || { name: fieldName };
      return `<th>${field.label || fieldName}</th>`;
    }).join('');

    return `
<div class="widget" style="width: 100%;">
  <div class="widget-content">
    <div style="margin-bottom: 20px; display: flex; gap: 12px;">
      <input type="text" class="form-input" placeholder="Search..." style="max-width: 300px;" id="searchInput">
      <select class="form-input" style="max-width: 200px;" id="filterSelect">
        <option value="">All Status</option>
      </select>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th><input type="checkbox" id="selectAll"></th>
          ${headers}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="dataTableBody"></tbody>
    </table>
    <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
      <span id="pagination-info"></span>
      <div id="pagination-controls"></div>
    </div>
  </div>
</div>`;
  }

  generateResourceJS(resource) {
    return `
const Resource = {
  name: '${resource.name}',
  config: ${JSON.stringify(resource.toJSON())},
  data: [],
  page: 1,
  perPage: ${resource.perPage},
  totalPages: 1,

  async init() {
    await this.loadData();
    this.render();
    this.setupEvents();
  },

  async loadData() {
    // Fetch from API
    this.data = [];
  },

  render() {
    const tbody = document.getElementById('dataTableBody');
    const start = (this.page - 1) * this.perPage;
    const pageData = this.data.slice(start, start + this.perPage);

    tbody.innerHTML = pageData.map(item => this.renderRow(item)).join('');
  },

  renderRow(item) {
    const cells = this.config.listFields.map(field =>
      '<td>' + (item[field] || '-') + '</td>'
    ).join('');

    return '<tr><td><input type="checkbox" data-id="' + item.id + '"></td>' + cells +
           '<td><button class="btn btn-secondary" onclick="Resource.edit(' + item.id + ')">Edit</button></td></tr>';
  },

  setupEvents() {
    document.getElementById('searchInput').addEventListener('input', (e) => this.search(e.target.value));
    document.getElementById('selectAll').addEventListener('change', (e) => this.selectAll(e.target.checked));
  },

  search(query) {
    // Filter data
    this.render();
  },

  selectAll(checked) {
    document.querySelectorAll('tbody input[type="checkbox"]').forEach(cb => cb.checked = checked);
  },

  edit(id) {
    console.log('Edit:', id);
  },

  delete(id) {
    if (confirm('Are you sure?')) {
      console.log('Delete:', id);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Resource.init());

function showCreateModal() {
  console.log('Show create modal');
}

function exportData() {
  console.log('Export data');
}
`;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  DashboardConfig,
  DashboardGenerator,
  ResourceConfig,
  FieldConfig,
  Widget,
  StatWidget,
  ChartWidget,
  TableWidget,
  WidgetTypes,

  // Quick setup
  createDashboard: (options) => {
    const config = new DashboardConfig(options);
    return new DashboardGenerator(config);
  },

  // Preset field types
  fields: {
    id: (options = {}) => new FieldConfig({ name: 'id', type: 'number', readonly: true, ...options }),
    text: (name, options = {}) => new FieldConfig({ name, type: 'text', ...options }),
    email: (name = 'email', options = {}) => new FieldConfig({ name, type: 'email', ...options }),
    password: (name = 'password', options = {}) => new FieldConfig({ name, type: 'password', hidden: true, ...options }),
    number: (name, options = {}) => new FieldConfig({ name, type: 'number', ...options }),
    boolean: (name, options = {}) => new FieldConfig({ name, type: 'boolean', ...options }),
    date: (name, options = {}) => new FieldConfig({ name, type: 'date', ...options }),
    datetime: (name, options = {}) => new FieldConfig({ name, type: 'datetime', ...options }),
    select: (name, opts, options = {}) => new FieldConfig({ name, type: 'select', options: opts, ...options }),
    textarea: (name, options = {}) => new FieldConfig({ name, type: 'textarea', ...options }),
    image: (name, options = {}) => new FieldConfig({ name, type: 'image', ...options }),
    file: (name, options = {}) => new FieldConfig({ name, type: 'file', ...options }),
    json: (name, options = {}) => new FieldConfig({ name, type: 'json', ...options }),
    reference: (name, resource, options = {}) => new FieldConfig({ name, type: 'reference', reference: resource, ...options })
  }
};
