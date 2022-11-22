"use strict";

var _npac = require("npac");
var _sinon = _interopRequireDefault(require("sinon"));
var _chai = require("chai");
var _config = _interopRequireDefault(require("./config"));
var server = _interopRequireWildcard(require("./index"));
var nats = _interopRequireWildcard(require("npac-nats-adapter"));
var _ = _interopRequireWildcard(require("lodash"));
var _axios = _interopRequireDefault(require("axios"));
var _qs = _interopRequireDefault(require("qs"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// An endpoint operation callback that accepts a parsable object
const testAdapterEndpointFun = container => (req, endp) => {
  return new Promise((resolve, reject) => {
    resolve({
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: req.body
    });
  });
};

// Test adapter that holds two endpoint implementations (operations), a success and an error one.
const testAdapter = {
  startup: (container, next) => {
    // Merges the defaults with the config coming from the outer world
    const testAdapterConfig = _.merge({}, /*defaults,*/{
      testAdapter: container.config.testAdapter || {}
    });
    container.logger.info('Start up testAdapter adapter');

    // Call next setup function with the context extension
    next(null, {
      config: testAdapterConfig,
      testAdapter: {
        endpoint: {
          json: testAdapterEndpointFun(container),
          xml: testAdapterEndpointFun(container),
          urlencoded: testAdapterEndpointFun(container),
          raw: testAdapterEndpointFun(container)
        }
      }
    });
  },
  shutdown: (container, next) => {
    container.logger.info('Shut down testAdapter adapter');
    next(null, null);
  }
};
describe('webServer adapter with parsing enabled', () => {
  let sandbox;
  const config = _.merge({}, _config.default, nats.defaults, {
    logger: {
      level: 'debug'
    },
    nats: {
      servers: ['nats://localhost:4222'],
      debug: true
    },
    webServer: {
      logBlackList: ['/test/endpoint-json'],
      useCompression: true,
      useResponseTime: true,
      restApiPath: __dirname + '/fixtures/endpoints/api.yml',
      staticContentBasePath: __dirname,
      // + '/fixtures/content/'
      bodyParser: {
        json: true,
        xml: true,
        urlencoded: true
      }
    }
  });
  beforeEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox = _sinon.default.createSandbox({
      properties: ['spy']
    });
    done();
  });
  afterEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox.restore();
    done();
  });
  const adaptersWithMessaging = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: true
    },
    nats: {
      servers: ['nats://localhost:4222'],
      debug: true,
      timeout: 2500
    }
  })), _npac.addLogger, nats.startup, testAdapter.startup, server.startup];
  const terminators = [server.shutdown, nats.shutdown, testAdapter.shutdown];
  it('#call POST endpoint with JSON body parser. Accept: "application/json"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    let testBody = '{ "identity": "Universe", "meaning": 42 }';
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-json`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'post',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        data: testBody
      }).then(response => {
        const {
          status,
          statusText,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          identity: 'Universe',
          meaning: 42
        });
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call POST endpoint with XML body parser. Accept: "text/xml"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    let testBody = `<?xml version="1.0" encoding="UTF-8"?>
            <starwars>
                <character name="Luke Skywalker" />
                <character name="Darth Vader" />
            </starwars>`;
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-xml`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'post',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          'Content-Type': 'text/xml',
          Accept: 'application/json'
        },
        data: testBody
      }).then(response => {
        const {
          status,
          statusText,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          starwars: {
            character: [{
              $: {
                name: 'Luke Skywalker'
              }
            }, {
              $: {
                name: 'Darth Vader'
              }
            }]
          }
        });
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call POST endpoint with URL encoded body parser. Accept: "application/x-www-form-urlencoded"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    let testBody = _qs.default.stringify({
      identity: 'Universe',
      meaning: 42
    });
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-urlencoded`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'post',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        data: testBody
      }).then(response => {
        const {
          status,
          statusText,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          identity: 'Universe',
          meaning: '42'
        });
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
});
describe('webServer adapter with only raw parsing', () => {
  let sandbox;
  const config = _.merge({}, _config.default, nats.defaults, {
    logger: {
      level: 'debug'
    },
    nats: {
      servers: ['nats://localhost:4222'],
      debug: true
    },
    webServer: {
      logBlackList: ['/test/endpoint-json'],
      useCompression: true,
      useResponseTime: true,
      restApiPath: __dirname + '/fixtures/endpoints/api.yml',
      staticContentBasePath: __dirname // + '/fixtures/content/'
    }
  });

  beforeEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox = _sinon.default.createSandbox({
      properties: ['spy']
    });
    done();
  });
  afterEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox.restore();
    done();
  });
  const adaptersWithMessaging = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: true
    },
    nats: {
      timeout: 2500
    }
  })), _npac.addLogger, nats.startup, testAdapter.startup, server.startup];
  const terminators = [server.shutdown, nats.shutdown, testAdapter.shutdown];
  it('#call POST endpoint without parser', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    let testBody = '{ "identity": "Universe", "meaning": 42 }';
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-raw`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'post',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        data: testBody
      }).then(response => {
        const {
          status,
          statusText,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          identity: 'Universe',
          meaning: 42
        });
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
});