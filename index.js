const path = require('path');

const logger = require('./logger');
const parseArgs = require('minimist');
const { Locust } = require('./locust');
const { Client } = require('./client');

function printUsage() {
  logger.info(`usage: locust-node [options] --locustfile ./locustfile.js
    options:
      --master-host     Host or IP address of locust master for distributed load
                        testing.
                        Defaults to 127.0.0.1.

      --master-port     The port to connect to that is used by the locust master
                        for distributed load testing. Defaults to 5557

      --locustfile      Locust file to execute (required)
  `);
}


function exitError(message) {
  logger.error(message);

  process.exit(1);
}

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    f: 'locustfile',
    L: 'loglevel'
  },
  default: {
    locustfile: null,
    'master-host': '127.0.0.1',
    'master-port': 5557
  }
});

const masterHost = argv['master-host'];
const masterPort = argv['master-port'];
const locustfileName = argv.locustfile;

if (typeof masterPort !== 'number'
  || typeof locustfileName === 'undefined') {
  printUsage();

  exitError('Invalid parameters');
}

let locustFile;
let exportedLocusts;

try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  locustFile = require(path.join(__dirname, locustfileName));

  exportedLocusts = Object.keys(locustFile)
    .filter(key => Object.prototype.isPrototypeOf.call(Locust, locustFile[key]))
    .map(key => locustFile[key]);

  if (!exportedLocusts.length) {
    exitError('A Locust class must be exported');
  } else if (exportedLocusts.length > 1) {
    exitError('More than one Locust class has been exported');
  }
} catch (error) {
  logger.log('Cannot import locustfile', error);

  process.exit(1);
}

const client = new Client(masterHost, masterPort, exportedLocusts[0]);

client.start();

process.on('SIGINT', () => {
  logger.info('Caught interrupt signal');
  client.exit();
});
