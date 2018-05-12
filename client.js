const uuid = require('uuid/v4');
const msgpack = require('msgpack-lite');
const zmq = require('zeromq');

const logger = require('./logger');
const { StatsAggregator } = require('./stats');

const SECOND = 1000;
const STATS_SUBMIT_FREQUENCY = 5 * SECOND;
const MESSAGES = {
  CLIENT_READY: 'client_ready',
  CLIENT_STOPPED: 'client_stopped',
  HATCH: 'hatch',
  HATCHING: 'hatching',
  HATCH_COMPLETE: 'hatch_complete',
  STATS: 'stats',
  STOP: 'stop',
  QUIT: 'quit'
};

// Support for Javascript Map
const codec = msgpack.createCodec({ usemap: true });

class Client {
  constructor(masterHost, masterPort, Locust) {
    this.clientId = uuid();
    this.masterHost = masterHost;
    this.masterPort = masterPort;
    this.Locust = Locust;
    this.locusts = [];

    this.statsAggregator = new StatsAggregator(this.clientId);
    this.statsNotifier = null;

    this.messageHandlers = {
      [MESSAGES.HATCH]: data => this.hatch(data),
      [MESSAGES.STOP]: () => this.stop(),
      [MESSAGES.QUIT]: () => this.quit()
    };

    this.pushSocket = zmq.socket('push');
    this.pullSocket = zmq.socket('pull');
  }

  start() {
    this.pushSocket.connect(`tcp://${this.masterHost}:${this.masterPort}`);
    this.pullSocket.connect(`tcp://${this.masterHost}:${this.masterPort + 1}`);

    this.pullSocket.on('message', this.messageHandler.bind(this));

    this.sendMessage(MESSAGES.CLIENT_READY);

    this.statsNotifier = setInterval(() =>
      this.sendStats()
    , STATS_SUBMIT_FREQUENCY);
  }

  sendMessage(type, data = null) {
    const encodedData = msgpack.encode([
      type, data, this.clientId
    ], { codec });

    this.pushSocket.send(encodedData);
  }


  messageHandler(message) {
    const [type, data, clientId] = msgpack.decode(message);

    if (!this.messageHandlers[type]) {
      logger.error('Unknown message type', { type, data, clientId });

      return;
    }

    logger.info('Received message', { type, data, clientId });

    this.messageHandlers[type](data, clientId);
  }

  sendStats() {
    const stats = Object
      .values(this.statsAggregator.stats)
      .map(requestStats => ({
        name: requestStats.name,
        method: requestStats.method,
        num_reqs_per_sec: requestStats.requestsPerSecond,
        response_times: requestStats.responseTimes,
        start_time: requestStats.startTime,
        last_request_timestamp: requestStats.lastRequestTime,
        min_response_time: requestStats.minResponseTime,
        max_response_time: requestStats.maxResponseTime,
        num_failures: requestStats.failedRequests,
        num_requests: requestStats.totalRequests,
        total_content_length: requestStats.totalContentLength,
        total_response_time: requestStats.totalResponseTime
      }));

    const errors = this.statsAggregator.errors;

    this.sendMessage(MESSAGES.STATS, {
      errors,
      stats,
      user_count: this.locusts.length
    });

    this.statsAggregator.reset();
  }

  hatch(data) {
    this.sendMessage(MESSAGES.HATCHING);

    if (!data) {
      logger.error('Invalid hatch parameters', { data });

      return;
    }

    const hatchRate = data.hatch_rate;
    const numClients = data.num_clients;

    if (hatchRate <= 0 || numClients <= 0) {
      logger.error('Invalid hatch paramters', { data });

      return;
    }

    let spawnedLocusts = 0;
    const hatchFrequency = SECOND / hatchRate;
    const locustSpawner = setInterval(() => {
      const locust = new this.Locust();

      locust.start(this.statsAggregator);

      this.locusts.push(locust);
      spawnedLocusts += 1;

      if (spawnedLocusts === numClients) {
        clearInterval(locustSpawner);

        this.locustSpawner = null;

        this.sendMessage(MESSAGES.HATCH_COMPLETE, { count: spawnedLocusts });
      }
    }, hatchFrequency);
  }

  stop() {
    this.locusts.map(locust => locust.stop());

    if (this.locustSpawner) clearInterval(this.locustSpawner);

    this.locustSpawner = null;

    this.sendMessage(MESSAGES.CLIENT_STOPPED);
    this.sendMessage(MESSAGES.CLIENT_READY);
  }


  quit() {
    this.locusts.map(locust => locust.stop());

    this.pushSocket.close();
    this.pullSocket.close();

    if (this.statsNotifier) clearInterval(this.statsNotifier);
    if (this.locustSpawner) clearInterval(this.locustSpawner);

    this.statsNotifier = null;
    this.locustSpawner = null;
  }

  exit() {
    this.sendMessage(MESSAGES.CLIENT_STOPPED);
    this.quit();
  }
}

module.exports = { Client };
