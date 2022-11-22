"use strict";

var _npac = require("npac");
var _sinon = _interopRequireDefault(require("sinon"));
var _chai = require("chai");
var _config = _interopRequireDefault(require("./config"));
var server = _interopRequireWildcard(require("./index"));
var nats = _interopRequireWildcard(require("npac-nats-adapter"));
var _ = _interopRequireWildcard(require("lodash"));
var _axios = _interopRequireDefault(require("axios"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// An endpoint operation callback that always successfully responds with an empty JSON object
const testAdapterEndpointFun = container => (req, endp) => {
  return new Promise((resolve, reject) => {
    resolve({
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: {}
    });
  });
};

// An endpoint operation callback that always returns with 500 status and a JSON null response body
const testAdapterEndpointErr500Fun = container => (req, endp) => {
  return new Promise((resolve, reject) => {
    reject({
      status: 500,
      statusText: 'Very serious error happened to the server',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: null
    });
  });
};

// An endpoint operation callback that always returns with an unknown error, with no status, header and body info
const testAdapterEndpointErrUnknownFun = container => (req, endp) => {
  return new Promise((resolve, reject) => {
    reject(new Error('Internal error occured...'));
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
        endpoint: testAdapterEndpointFun(container),
        endpointErr500: testAdapterEndpointErr500Fun(container),
        endpointErrUnknown: testAdapterEndpointErrUnknownFun(container)
      }
    });
  },
  shutdown: (container, next) => {
    container.logger.info('Shut down testAdapter adapter');
    next(null, null);
  }
};
describe('webServer adapter', () => {
  let sandbox;
  let acceptCheckMwCall;
  let tracerMwCall;
  const traceIdHeader = 'X-B3-Traceid';
  const traceIdValue = '42';
  const accepts = ['*/*', 'application/json', 'text/plain', 'text/html', 'text/xml', 'unsupported/media-type'];
  const acceptCheckMiddleware = container => (req, res, next) => {
    container.logger.debug(`acceptCheckMiddleware is called ${req.accepts()}`);
    (0, _chai.expect)(_.includes(accepts, req.accepts()[0])).to.be.true;
    acceptCheckMwCall();
    next();
  };
  const tracerMiddleware = container => (req, res, next) => {
    //        const { hostname, originalUrl, route, method } = req
    const traceId = req.get(traceIdHeader);
    //        const { statusCode } = res
    //        const contentLength = res.get('content-length')
    //        const responseTime = res.get('x-response-time') || 'unknown'
    //        container.logger.debug(
    //            `MiddlewareFn is called: ${method} "${hostname}" "${originalUrl}" "${traceId}" => ${statusCode} ${contentLength} ${responseTime} ============================`
    //        )
    (0, _chai.expect)(traceId).to.be.equal(traceIdValue);
    (0, _chai.expect)(_.includes(accepts, req.accepts()[0])).to.be.true;
    tracerMwCall();
    next();
  };
  const config = _.merge({}, _config.default, nats.defaults, {
    logger: {
      level: 'debug'
    },
    nats: {
      servers: ['nats://localhost:4222'],
      debug: true
    },
    webServer: {
      logBlackList: ['/test/endpoint'],
      useCompression: true,
      useResponseTime: true,
      restApiPath: __dirname + '/fixtures/endpoints/api.yml',
      middlewares: {
        preRouting: [acceptCheckMiddleware],
        postRouting: [tracerMiddleware]
      },
      staticContentBasePath: __dirname // + '/fixtures/content/'
    }
  });

  beforeEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox = _sinon.default.createSandbox({
      properties: ['spy']
    });
    acceptCheckMwCall = sandbox.spy();
    tracerMwCall = sandbox.spy();
    done();
  });
  afterEach(done => {
    (0, _npac.removeSignalHandlers)();
    sandbox.restore();
    done();
  });
  const adapters = [(0, _npac.mergeConfig)(config), _npac.addLogger, testAdapter.startup, nats.startup, server.startup];
  const adaptersWithBasePath = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      basePath: '/base/path'
    }
  })), _npac.addLogger, testAdapter.startup, nats.startup, server.startup];
  const adaptersWithMessaging = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: true
    },
    nats: {
      servers: ['nats://localhost:4222'],
      debug: true
    }
  })), _npac.addLogger, nats.startup, server.startup];
  const adaptersForIgnoreOperationIds = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: false,
      ignoreApiOperationIds: true,
      enableMocking: false
    }
  })), _npac.addLogger, nats.startup, server.startup];
  const adaptersForMocking = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: false,
      ignoreApiOperationIds: true,
      enableMocking: true
    }
  })), _npac.addLogger, nats.startup, server.startup];
  const adaptersForMockingAndMessaging = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      useMessaging: true,
      ignoreApiOperationIds: true,
      enableMocking: true
    }
  })), _npac.addLogger, nats.startup, server.startup];
  const terminators = [server.shutdown, nats.shutdown, testAdapter.shutdown];
  it('#startup, #shutdown', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      container.logger.info(`Run job to test server`);
      next(null, null);
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call static content index', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}/docs/subcontent/`,
        withCredentials: true,
        headers: {
          Accept: '*/*'
        }
      }).then(response => {
        const {
          status
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with no adapter function, NO MESSAGING used', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).catch(err => {
        const {
          status,
          data
        } = err.response;
        (0, _chai.expect)(status).to.equal(501);
        (0, _chai.expect)(data).to.eql({
          error: 'The endpoint is either not implemented or `operationId` is ignored'
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'put',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function using basePath', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/base/path/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'put',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithBasePath, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function but ignore operationId', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'put',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).catch(err => {
        const {
          status,
          data
        } = err.response;
        (0, _chai.expect)(status).to.equal(501);
        (0, _chai.expect)(data).to.eql({
          error: 'The endpoint is either not implemented or `operationId` is ignored'
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForIgnoreOperationIds, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with 500, Internal Server Error returned by the operation', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-error`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'post',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).catch(error => {
        const {
          status,
          statusText,
          headers,
          data
        } = error.response;
        container.logger.error(`status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(data)}`);
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with 500, Internal Server Error no information', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-error`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'delete',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).catch(error => {
        const {
          status,
          statusText,
          headers,
          data
        } = error.response;
        container.logger.error(`status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(data)}`);
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with MESSAGING forwarder function - Messaging Client Timeout', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).then(resp => {
        container.logger.info(`resp: ${JSON.stringify(resp)}`);
        next(null, null);
      }).catch(error => {
        const {
          status,
          statusText,
          headers,
          data
        } = error.response;
        container.logger.error(`status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(data)}`);
        (0, _chai.expect)(status).to.equal(503);
        (0, _chai.expect)(statusText).to.equal('Service Unavailable');
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking but no examples', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'put',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(data).to.equal('');
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      }).catch(err => next(null, null));
    };
    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "application/json"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-with-examples`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
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
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "text/plain"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-with-examples`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'text/plain',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status,
          statusText,
          data
        } = response;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.equal('The meaning of Universe is 42');
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "unsupported-media-type"', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointPath = `/test/endpoint-with-examples`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: 'get',
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'unsupported/media-type',
          [traceIdHeader]: traceIdValue
        }
      }).catch(error => {
        const {
          status,
          statusText,
          headers,
          data
        } = error.response;
        container.logger.error(`status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(data)}`);
        (0, _chai.expect)(status).to.equal(415);
        (0, _chai.expect)(statusText).to.equal('Unsupported Media Type');
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call with MESSAGING and mocking enabled, no endpoint implementation, mock example exists', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointMethod = 'get';
      const restEndpointPath = `/test/endpoint-with-examples`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: restEndpointMethod,
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
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
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForMockingAndMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call with MESSAGING and mocking enabled, no endpoint implementation, mock example does not exists', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointMethod = 'get';
      const restEndpointPath = `/test/endpoint`;
      container.logger.info(`Run job to test server`);
      (0, _axios.default)({
        method: restEndpointMethod,
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).catch(error => {
        const {
          status,
          statusText,
          headers
        } = error.response;
        container.logger.error(`status: ${status}, ${statusText}, headers: ${JSON.stringify(headers)}`);
        (0, _chai.expect)(status).to.equal(404);
        (0, _chai.expect)(statusText).to.equal('Not Found');
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersForMockingAndMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with MESSAGING forwarder function with JSON response', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port,
        topicPrefix
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointMethod = 'get';
      const restEndpointPath = `/test/endpoint`;
      const jsonBodyObj = {
        status: 'OK'
      };
      const responseMsg = {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(jsonBodyObj)
        // Could work from buffer as well:
        // body: Buffer.from(JSON.stringify(jsonBodyObj), 'utf-8').toString()
      };

      // Add built-in service
      const topic = `${topicPrefix}.${restEndpointMethod}_${restEndpointPath}`;
      container.nats.response(topic, (err, payload, headers) => {
        return {
          payload: JSON.stringify(responseMsg),
          headers: {
            'content-type': 'application/json',
            'message-type': 'rpc/response'
          }
        };
      });
      container.logger.info(`Run job to test server`);
      container.logger.debug(`axios request: ${restEndpointMethod} '${host}${restEndpointPath}'`);
      (0, _axios.default)({
        method: restEndpointMethod,
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'application/json',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status,
          headers,
          data
        } = response;
        const body = data;
        container.logger.debug(`axios.response: ${status}, headers: ${JSON.stringify(headers)}, data: ${JSON.stringify(body)}}`);
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(jsonBodyObj).to.eql(body);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with MESSAGING forwarder function with XML response', done => {
    (0, _npac.catchExitSignals)(sandbox, done);
    const testServer = (container, next) => {
      const {
        port,
        topicPrefix
      } = container.config.webServer;
      const host = `http://localhost:${port}`;
      const restEndpointMethod = 'get';
      const restEndpointPath = `/test/endpoint`;
      const xmlBodyStr = '<?xml version="1.0" encoding="UTF-8"?><status>OK</status>';
      const responseMsg = {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: xmlBodyStr
      };

      // Add built-in service
      const topic = `${topicPrefix}.${restEndpointMethod}_${restEndpointPath}`;
      container.nats.response(topic, (err, payload, headers) => {
        return {
          payload: JSON.stringify(responseMsg),
          headers: {
            'content-type': 'text/xml',
            'message-type': 'rpc/response'
          }
        };
      });
      container.logger.info(`Run job to test server`);
      container.logger.debug(`axios request: ${restEndpointMethod} '${host}${restEndpointPath}'`);
      (0, _axios.default)({
        method: restEndpointMethod,
        url: `${host}${restEndpointPath}`,
        withCredentials: true,
        headers: {
          Accept: 'text/xml',
          [traceIdHeader]: traceIdValue
        }
      }).then(response => {
        const {
          status,
          headers,
          data
        } = response;
        const body = data;
        container.logger.debug(`axios.response: ${status}, headers: ${JSON.stringify(headers)}, data: ${body}}`);
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(xmlBodyStr).to.eql(body);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
        next(null, null);
      });
    };
    (0, _npac.npacStart)(adaptersWithMessaging, [testServer], terminators);
  }).timeout(30000);
});