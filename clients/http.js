const axios = require('axios');
const { RequestError } = require('../error');
const logger = require('../logger');


class HTTPError extends RequestError {
  constructor(status, parameters, body) {
    super(`HTTP Error: ${status}`, parameters);

    this.body = body;
  }
}

class TimeoutError extends RequestError {
  constructor(parameters) {
    super('Timeout Error', parameters);
  }
}

class HTTPClient {
  constructor(defaultConfig, recordSuccess, recordFailure) {
    this.defaultConfig = defaultConfig;
    this.recordSuccess = recordSuccess;
    this.recordFailure = recordFailure;

    if (!this.recordSuccess) {
      logger.error('HTTPClient: Missing recordSuccess callback');
    } else if (!this.recordFailure) {
      logger.error('HTTPClient: Missing recordFailure callback');
    }
  }

  async request(params) {
    const requestParameters = { ...params, ...this.defaultConfig };
    const name = params.url || 'unknown';
    const method = requestParameters.method || 'GET';
    const startTime = Date.now();

    logger.info(`Sending request ${method} ${name}`);

    try {
      const res = await axios(requestParameters);
      const elapsedTime = Date.now() - startTime;
      const size = parseInt(res.headers['content-length'] || 0);

      this.recordSuccess(method, name, elapsedTime, size);

      return res;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;

      this.recordFailure(method, name, elapsedTime, error);

      if (error.code === 'ECONNABORTED') {
        throw new TimeoutError(requestParameters);
      }
      throw new HTTPError(error.statusCode, requestParameters, error.data);
    }
  }
}

module.exports = { HTTPClient };
