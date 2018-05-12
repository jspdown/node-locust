const uuid = require('uuid/v4');

const logger = require('./logger');
const { TaskSet } = require('./task-set');
const { RequestError } = require('./error');

const STATES = {
  IDLE: 'idle',
  STOPPED: 'stopped',
  RUNNING: 'running'
};

class Locust {
  constructor() {
    this.taskSet = null;

    this.state = STATES.IDLE;
    this.locustId = uuid();
  }

  async start(statsAggregator) {
    this.log('Starting locust');

    if (!(this.taskSet instanceof TaskSet)) {
      this.log('Locust.taskSet is not define');
      return;
    }
    // Generate an array of tasks to ensure ensure correct tasks weight
    const weights = this.taskSet.tasks.map(task => task.weight || 1);
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const amountTasks = Math.max(...weights) * weightSum;
    let tasks = [];

    for (const { task, weight } of this.taskSet.tasks) {
      const rate = (weight || 1) / weightSum;
      const repeatTask = Math.trunc(amountTasks * rate);

      tasks = tasks.concat(Array.from({ length: repeatTask }, () => task));
    }

    this.taskSet.statsAggregator = statsAggregator;

    await this.taskSet.before();

    if (!tasks.length) return;

    while (true) {
      for (const task of tasks) {
        if (this.state === STATES.STOPPED) {
          await this.taskSet.after();

          return;
        }

        await this.taskSet.beforeEach();

        try {
          await task();
        } catch (error) {
          if (!(error instanceof RequestError)) {
            logger.error('Unexpected error occurred', error);
          }
        }

        await this.taskSet.afterEach();
      }
    }
  }

  stop() {
    this.log('Stopping locust...');

    this.state = STATES.STOPPED;
  }

  log(message) {
    logger.info(`${this.locustId} | ${message}`);
  }
}

module.exports = { Locust, TaskSet };
