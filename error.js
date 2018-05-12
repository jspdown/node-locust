const { ExtendableError } = require('extendable-error');

class RequestError extends ExtendableError {
  constructor(message, parameters) {
    super(message);

    this.parameters = parameters;
  }
}

module.exports = { RequestError };
