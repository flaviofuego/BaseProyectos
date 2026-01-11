/**
 * Circuit Breaker Pattern Implementation
 * Proporciona protección contra fallas en cascada en llamadas a servicios externos
 * 
 * Estados:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 */

const EventEmitter = require('events');

/**
 * Error lanzado cuando el circuito está abierto
 */
class CircuitOpenError extends Error {
  constructor(serviceName) {
    super(`Circuit breaker is OPEN for service: ${serviceName}`);
    this.name = 'CircuitOpenError';
    this.serviceName = serviceName;
    this.isCircuitOpen = true;
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.name - Name for identification
   * @param {number} options.failureThreshold - Failures before opening (default: 5)
   * @param {number} options.resetTimeout - Time in ms before trying again (default: 30000)
   * @param {number} options.halfOpenRequests - Requests to allow in half-open (default: 1)
   * @param {number} options.successThreshold - Successes needed to close (default: 2)
   * @param {number} options.timeout - Request timeout in ms (default: 10000)
   */
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'unnamed';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.halfOpenRequests = options.halfOpenRequests || 1;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 10000;

    // State
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastStateChange: null,
      stateHistory: []
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of the function
   */
  async execute(fn) {
    this.metrics.totalRequests++;

    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      // Check if we should transition to HALF_OPEN
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        this.metrics.rejectedRequests++;
        this.emit('rejected', { name: this.name, state: this.state });
        throw new CircuitOpenError(this.name);
      }
    }

    // In HALF_OPEN, limit concurrent requests
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.halfOpenRequests) {
        this.metrics.rejectedRequests++;
        throw new CircuitOpenError(this.name);
      }
      this.halfOpenAttempts++;
    }

    // Execute the function with timeout
    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.metrics.successfulRequests++;
    this.emit('success', { name: this.name, state: this.state });

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else {
      // In CLOSED state, reset failure count
      this.failures = 0;
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.metrics.failedRequests++;
    this.lastFailureTime = Date.now();
    this.emit('failure', { name: this.name, state: this.state, error: error.message });

    if (this.state === 'HALF_OPEN') {
      // In HALF_OPEN, any failure opens the circuit again
      this.transitionTo('OPEN');
    } else {
      // In CLOSED state, track failures
      this.failures++;
      if (this.failures >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * Transition to a new state
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.metrics.lastStateChange = Date.now();
    this.metrics.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 state changes
    if (this.metrics.stateHistory.length > 10) {
      this.metrics.stateHistory.shift();
    }

    // Reset counters based on new state
    if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
      this.halfOpenAttempts = 0;
    } else if (newState === 'HALF_OPEN') {
      this.successes = 0;
      this.halfOpenAttempts = 0;
    }

    console.log(`🔌 Circuit Breaker [${this.name}]: ${oldState} → ${newState}`);
    this.emit('stateChange', { name: this.name, from: oldState, to: newState });
  }

  /**
   * Check if we should attempt to reset (transition from OPEN to HALF_OPEN)
   */
  shouldAttemptReset() {
    return this.lastFailureTime && 
           (Date.now() - this.lastFailureTime) >= this.resetTimeout;
  }

  /**
   * Get current state and metrics
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime 
        ? new Date(this.lastFailureTime).toISOString() 
        : null,
      metrics: this.metrics,
      config: {
        failureThreshold: this.failureThreshold,
        resetTimeout: this.resetTimeout,
        successThreshold: this.successThreshold,
        timeout: this.timeout
      }
    };
  }

  /**
   * Force the circuit to open (for testing or manual intervention)
   */
  forceOpen() {
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
  }

  /**
   * Force the circuit to close (for testing or manual intervention)
   */
  forceClose() {
    this.transitionTo('CLOSED');
  }

  /**
   * Reset all state and metrics
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastStateChange: null,
      stateHistory: []
    };
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.defaultOptions = {
      failureThreshold: 5,
      resetTimeout: 30000,
      successThreshold: 2,
      timeout: 10000
    };
  }

  /**
   * Get or create a circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Override default options
   * @returns {CircuitBreaker}
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker({
        name: serviceName,
        ...this.defaultOptions,
        ...options
      });
      this.breakers.set(serviceName, breaker);
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Execute a function with circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>}
   */
  async execute(serviceName, fn) {
    const breaker = this.getBreaker(serviceName);
    return breaker.execute(fn);
  }

  /**
   * Get status of all circuit breakers
   */
  getStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Get summary of all circuit breakers
   */
  getSummary() {
    const summary = {
      total: this.breakers.size,
      closed: 0,
      open: 0,
      halfOpen: 0
    };

    for (const breaker of this.breakers.values()) {
      switch (breaker.state) {
        case 'CLOSED': summary.closed++; break;
        case 'OPEN': summary.open++; break;
        case 'HALF_OPEN': summary.halfOpen++; break;
      }
    }

    return summary;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Singleton instance for global use
const globalManager = new CircuitBreakerManager();

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  CircuitOpenError,
  globalManager
};
