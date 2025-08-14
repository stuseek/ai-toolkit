/**
 * Action Executor for AI Toolkit
 * Registers and executes actions based on AI decisions
 */

class ActionExecutor {
  constructor() {
    this.registry = new Map();
  }

  /**
   * Register an action
   */
  register(name, handler, metadata = {}) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for action "${name}" must be a function`);
    }
    
    if (this.registry.has(name)) {
      throw new Error(`Action ${name} already registered`);
    }

    this.registry.set(name, {
      name,
      handler,
      description: metadata.description || `Execute ${name}`,
      parameters: metadata.parameters || {},
      examples: metadata.examples || [],
      requiresConfirmation: metadata.requiresConfirmation || false,
      validate: metadata.validate || (() => true)
    });

    return this;
  }

  /**
   * Get all available actions for AI
   */
  getAvailableActions() {
    const actions = [];

    for (const [name, config] of this.registry) {
      actions.push({
        action: name,
        description: config.description,
        parameters: config.parameters,
        examples: config.examples
      });
    }

    return actions;
  }

  /**
   * Execute an action
   */
  async execute(decision) {
    if (!decision || !decision.action) {
      throw new Error('Invalid decision: missing action');
    }

    const action = this.registry.get(decision.action);

    if (!action) {
      throw new Error(`Unknown action: ${decision.action}`);
    }

    // Validate parameters
    if (!action.validate(decision.parameters || {})) {
      throw new Error(`Invalid parameters for action: ${decision.action}`);
    }

    // Confirmation check
    if (action.requiresConfirmation) {
      console.warn(`Action "${decision.action}" requires confirmation`);
      // In production, implement proper confirmation flow
    }

    try {
      // Execute the action
      const result = await action.handler(decision.parameters || {});

      return {
        success: true,
        action: decision.action,
        result
      };

    } catch (error) {
      return {
        success: false,
        action: decision.action,
        error: error.message
      };
    }
  }

  /**
   * Check if action exists
   */
  has(name) {
    return this.registry.has(name);
  }

  /**
   * Remove an action
   */
  unregister(name) {
    return this.registry.delete(name);
  }

  /**
   * Clear all actions
   */
  clear() {
    this.registry.clear();
  }

  /**
   * Get action count
   */
  size() {
    return this.registry.size;
  }

  /**
   * List all registered actions
   */
  list() {
    const actions = [];
    for (const [name, config] of this.registry) {
      actions.push({
        name,
        description: config.description
      });
    }
    return actions;
  }
}

module.exports = { ActionExecutor };