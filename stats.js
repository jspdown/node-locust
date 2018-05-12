const logger = require('./logger');

class StatsAggregator {
  constructor(clientId) {
    this.clientId = clientId;
    this.stats = {};
    this.errors = {};
  }

  reset() {
    this.stats = {};
    this.errors = {};
  }

  recordSuccess(method, name, responseTime, contentLength) {
    logger.info('Record success', method, name, responseTime, contentLength);

    this.updateStats(method, name, responseTime);

    this.stats[`${method}-${name}`].totalContentLength += contentLength;
  }


  recordFailure(method, name, responseTime, error) {
    logger.info('Record failure', method, name, responseTime, error.message);

    this.updateStats(method, name, responseTime);

    const statsHash = `${method}-${name}`;
    const errorHash = `${statsHash}-${error.message}`;

    this.stats[statsHash].failedRequests += 1;

    if (!this.errors[errorHash]) {
      this.errors[errorHash] = {
        name,
        method,
        occurences: 0,
        error: error.message
      };
    }
    this.errors[errorHash].occurences += 1;
  }


  updateStats(method, name, responseTime) {
    const hash = `${method}-${name}`;
    const now = Math.trunc(Date.now() / 1000);

    if (!this.stats[hash]) {
      this.stats[hash] = {
        name,
        method,
        // Key must be a integer, not a string
        requestsPerSecond: new Map(),
        responseTimes: new Map(),
        startTime: now,
        lastRequestTime: null,
        minResponseTime: responseTime,
        maxResponseTime: responseTime,
        failedRequests: 0,
        totalRequests: 0,
        totalContentLength: 0,
        totalResponseTime: 0
      };
    }

    const stats = this.stats[hash];
    const secBucket = now;
    const roundedResTime = Math.trunc(responseTime / 10) * 10;

    stats.requestsPerSecond.set(secBucket,
      (stats.requestsPerSecond.get(secBucket) || 0) + 1
    );

    stats.responseTimes.set(roundedResTime,
      (stats.responseTimes.get(roundedResTime) || 0) + 1
    );

    stats.lastRequestTime = now;

    if (responseTime < stats.minResponseTime) {
      stats.minResponseTime = responseTime;
    }

    if (responseTime > stats.maxResponseTime) {
      stats.maxResponseTime = responseTime;
    }

    stats.totalRequests += 1;
    stats.totalResponseTime += responseTime;
  }
}

module.exports = { StatsAggregator };
