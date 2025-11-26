/**
 * GORUNFREEX1TRILLION - STATE MACHINE
 * Finite state machine with guards, actions, and async support
 */

const { EventEmitter } = require('events');

// ============================================
// STATE MACHINE
// ============================================

class StateMachine extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || 'machine';
    this.initial = config.initial;
    this.context = config.context || {};
    this.states = config.states;
    this.currentState = this.initial;
    this.history = [];
    this.historyLimit = config.historyLimit || 100;
  }

  get state() {
    return this.currentState;
  }

  getStateConfig() {
    return this.states[this.currentState];
  }

  can(event) {
    const stateConfig = this.getStateConfig();
    return stateConfig && stateConfig.on && event in stateConfig.on;
  }

  async send(event, payload = {}) {
    const stateConfig = this.getStateConfig();

    if (!stateConfig || !stateConfig.on || !(event in stateConfig.on)) {
      this.emit('error', {
        type: 'INVALID_EVENT',
        event,
        state: this.currentState
      });
      return { changed: false, state: this.currentState };
    }

    const transition = stateConfig.on[event];
    const transitionConfig = typeof transition === 'string'
      ? { target: transition }
      : transition;

    // Check guards
    if (transitionConfig.guard) {
      const guardResult = await this.executeGuard(transitionConfig.guard, payload);
      if (!guardResult) {
        this.emit('guardBlocked', { event, state: this.currentState, guard: transitionConfig.guard });
        return { changed: false, state: this.currentState, blocked: true };
      }
    }

    const previousState = this.currentState;
    const targetState = transitionConfig.target || this.currentState;

    // Execute exit actions
    if (stateConfig.exit) {
      await this.executeAction(stateConfig.exit, payload);
    }

    // Execute transition actions
    if (transitionConfig.actions) {
      const actions = Array.isArray(transitionConfig.actions)
        ? transitionConfig.actions
        : [transitionConfig.actions];

      for (const action of actions) {
        await this.executeAction(action, payload);
      }
    }

    // Update state
    this.currentState = targetState;

    // Execute entry actions
    const newStateConfig = this.getStateConfig();
    if (newStateConfig && newStateConfig.entry) {
      await this.executeAction(newStateConfig.entry, payload);
    }

    // Record history
    this.recordHistory(previousState, event, targetState, payload);

    // Emit transition event
    this.emit('transition', {
      from: previousState,
      to: targetState,
      event,
      payload
    });

    // Check if final state
    if (newStateConfig && newStateConfig.type === 'final') {
      this.emit('done', { state: targetState, context: this.context });
    }

    return { changed: previousState !== targetState, state: this.currentState };
  }

  async executeGuard(guard, payload) {
    if (typeof guard === 'function') {
      return guard(this.context, payload);
    }
    return true;
  }

  async executeAction(action, payload) {
    if (typeof action === 'function') {
      const result = await action(this.context, payload);
      if (result && typeof result === 'object') {
        this.context = { ...this.context, ...result };
      }
    } else if (typeof action === 'string') {
      this.emit('action', { action, context: this.context, payload });
    }
  }

  recordHistory(from, event, to, payload) {
    this.history.push({
      from,
      event,
      to,
      payload,
      timestamp: Date.now()
    });

    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  matches(state) {
    return this.currentState === state;
  }

  reset() {
    this.currentState = this.initial;
    this.history = [];
    this.emit('reset');
  }

  getSnapshot() {
    return {
      id: this.id,
      state: this.currentState,
      context: { ...this.context },
      history: [...this.history]
    };
  }

  restore(snapshot) {
    this.currentState = snapshot.state;
    this.context = { ...snapshot.context };
    this.history = [...(snapshot.history || [])];
  }
}

// ============================================
// HIERARCHICAL STATE MACHINE
// ============================================

class HierarchicalStateMachine extends StateMachine {
  constructor(config) {
    super(config);
    this.parent = config.parent || null;
    this.children = new Map();
  }

  addChild(id, machine) {
    machine.parent = this;
    this.children.set(id, machine);
    return this;
  }

  getChild(id) {
    return this.children.get(id);
  }

  async send(event, payload = {}) {
    // Try current machine first
    const result = await super.send(event, payload);

    if (result.changed) {
      return result;
    }

    // Try children
    for (const [, child] of this.children) {
      const childResult = await child.send(event, payload);
      if (childResult.changed) {
        return childResult;
      }
    }

    // Try parent
    if (this.parent) {
      return this.parent.send(event, payload);
    }

    return result;
  }

  getFullState() {
    const state = { [this.id]: this.currentState };

    for (const [id, child] of this.children) {
      state[id] = child.getFullState();
    }

    return state;
  }
}

// ============================================
// PARALLEL STATE MACHINE
// ============================================

class ParallelStateMachine extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id || 'parallel';
    this.regions = new Map();

    for (const [regionId, regionConfig] of Object.entries(config.regions || {})) {
      this.regions.set(regionId, new StateMachine({
        id: regionId,
        ...regionConfig
      }));
    }
  }

  async send(event, payload = {}) {
    const results = {};

    for (const [id, machine] of this.regions) {
      results[id] = await machine.send(event, payload);
    }

    this.emit('transition', { event, results });
    return results;
  }

  getState() {
    const state = {};
    for (const [id, machine] of this.regions) {
      state[id] = machine.state;
    }
    return state;
  }

  matches(states) {
    for (const [id, expectedState] of Object.entries(states)) {
      const machine = this.regions.get(id);
      if (!machine || machine.state !== expectedState) {
        return false;
      }
    }
    return true;
  }
}

// ============================================
// STATE MACHINE BUILDER
// ============================================

class StateMachineBuilder {
  constructor(id) {
    this.config = {
      id,
      initial: null,
      context: {},
      states: {}
    };
    this.currentState = null;
  }

  initial(state) {
    this.config.initial = state;
    return this;
  }

  context(ctx) {
    this.config.context = ctx;
    return this;
  }

  state(name, config = {}) {
    this.config.states[name] = {
      on: {},
      ...config
    };
    this.currentState = name;
    return this;
  }

  on(event, target, options = {}) {
    if (!this.currentState) {
      throw new Error('Must define a state before adding transitions');
    }

    this.config.states[this.currentState].on[event] = {
      target,
      ...options
    };
    return this;
  }

  entry(action) {
    if (!this.currentState) {
      throw new Error('Must define a state before adding entry action');
    }
    this.config.states[this.currentState].entry = action;
    return this;
  }

  exit(action) {
    if (!this.currentState) {
      throw new Error('Must define a state before adding exit action');
    }
    this.config.states[this.currentState].exit = action;
    return this;
  }

  final() {
    if (!this.currentState) {
      throw new Error('Must define a state before marking as final');
    }
    this.config.states[this.currentState].type = 'final';
    return this;
  }

  build() {
    if (!this.config.initial) {
      throw new Error('Must define an initial state');
    }
    return new StateMachine(this.config);
  }
}

// ============================================
// INTERPRETER
// ============================================

class Interpreter extends EventEmitter {
  constructor(machine) {
    super();
    this.machine = machine;
    this.running = false;
    this.queue = [];
    this.processing = false;
  }

  start() {
    this.running = true;
    this.emit('start', { state: this.machine.state });

    // Execute initial entry action
    const stateConfig = this.machine.getStateConfig();
    if (stateConfig && stateConfig.entry) {
      this.machine.executeAction(stateConfig.entry, {});
    }

    return this;
  }

  stop() {
    this.running = false;
    this.emit('stop', { state: this.machine.state });
    return this;
  }

  send(event, payload) {
    if (!this.running) {
      return Promise.reject(new Error('Interpreter not running'));
    }

    return new Promise((resolve) => {
      this.queue.push({ event, payload, resolve });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { event, payload, resolve } = this.queue.shift();
      const result = await this.machine.send(event, payload);
      resolve(result);
    }

    this.processing = false;
  }

  get state() {
    return this.machine.state;
  }

  get context() {
    return this.machine.context;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  StateMachine,
  HierarchicalStateMachine,
  ParallelStateMachine,
  StateMachineBuilder,
  Interpreter,

  // Quick creation
  create: (config) => new StateMachine(config),
  builder: (id) => new StateMachineBuilder(id),
  interpret: (machine) => new Interpreter(machine)
};
