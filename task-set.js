
class TaskSet {
  constructor() {
    this.tasks = [];
    this.statsAggregator = null;
  }

  async before() {}
  async after() {}
  async beforeEach() {}
  async afterEach() {}

  recordSuccess(method, name, requestTime, contentLength) {
    this.statsAggregator.recordSuccess(method, name, requestTime, contentLength);
  }

  recordFailure(method, name, requestTime, error) {
    this.statsAggregator.recordFailure(method, name, requestTime, error);
  }
}

module.exports = { TaskSet };
