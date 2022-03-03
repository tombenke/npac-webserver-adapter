"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

var _npac = require("npac");

var _sinon = _interopRequireDefault(require("sinon"));

var _chai = require("chai");

var _config = _interopRequireDefault(require("./config"));

var server = _interopRequireWildcard(require("./index"));

var pdms = _interopRequireWildcard(require("npac-pdms-hemera-adapter"));

var _ = _interopRequireWildcard(require("lodash"));

var _axios = _interopRequireDefault(require("axios"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// An endpoint operation callback that always successfully responds with an empty JSON object
var testAdapterEndpointFun = function testAdapterEndpointFun(container) {
  return function (req, endp) {
    return new Promise(function (resolve, reject) {
      resolve({
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: {}
      });
    });
  };
}; // An endpoint operation callback that always returns with 500 status and a JSON null response body


var testAdapterEndpointErr500Fun = function testAdapterEndpointErr500Fun(container) {
  return function (req, endp) {
    return new Promise(function (resolve, reject) {
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
}; // An endpoint operation callback that always returns with an unknown error, with no status, header and body info


var testAdapterEndpointErrUnknownFun = function testAdapterEndpointErrUnknownFun(container) {
  return function (req, endp) {
    return new Promise(function (resolve, reject) {
      reject(new Error('Internal error occured...'));
    });
  };
}; // Test adapter that holds two endpoint implementations (operations), a success and an error one.


var testAdapter = {
  startup: function startup(container, next) {
    // Merges the defaults with the config coming from the outer world
    var testAdapterConfig = _.merge({},
    /*defaults,*/
    {
      testAdapter: container.config.testAdapter || {}
    });

    container.logger.info('Start up testAdapter adapter'); // Call next setup function with the context extension

    next(null, {
      config: testAdapterConfig,
      testAdapter: {
        endpoint: testAdapterEndpointFun(container),
        endpointErr500: testAdapterEndpointErr500Fun(container),
        endpointErrUnknown: testAdapterEndpointErrUnknownFun(container)
      }
    });
  },
  shutdown: function shutdown(container, next) {
    container.logger.info('Shut down testAdapter adapter');
    next(null, null);
  }
};
describe('webServer adapter', function () {
  var sandbox;
  var acceptCheckMwCall;
  var tracerMwCall;
  var traceIdHeader = 'X-B3-Traceid';
  var traceIdValue = '42';
  var accepts = ['*/*', 'application/json', 'text/plain', 'text/html', 'text/xml', 'unsupported/media-type'];

  var acceptCheckMiddleware = function acceptCheckMiddleware(container) {
    return function (req, res, next) {
      container.logger.debug("acceptCheckMiddleware is called ".concat(req.accepts()));
      (0, _chai.expect)(_.includes(accepts, req.accepts()[0])).to.be["true"];
      acceptCheckMwCall();
      next();
    };
  };

  var tracerMiddleware = function tracerMiddleware(container) {
    return function (req, res, next) {
      //        const { hostname, originalUrl, route, method } = req
      var traceId = req.get(traceIdHeader); //        const { statusCode } = res
      //        const contentLength = res.get('content-length')
      //        const responseTime = res.get('x-response-time') || 'unknown'
      //        container.logger.debug(
      //            `MiddlewareFn is called: ${method} "${hostname}" "${originalUrl}" "${traceId}" => ${statusCode} ${contentLength} ${responseTime} ============================`
      //        )

      (0, _chai.expect)(traceId).to.be.equal(traceIdValue);
      (0, _chai.expect)(_.includes(accepts, req.accepts()[0])).to.be["true"];
      tracerMwCall();
      next();
    };
  };

  var config = _.merge({}, _config["default"], pdms.defaults, {
    logger: {
      level: 'debug'
    },
    pdms: {
      natsUri: 'nats://localhost:4222'
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

  beforeEach(function (done) {
    (0, _npac.removeSignalHandlers)();
    sandbox = _sinon["default"].createSandbox({
      properties: ['spy']
    });
    acceptCheckMwCall = sandbox.spy();
    tracerMwCall = sandbox.spy();
    done();
  });
  afterEach(function (done) {
    (0, _npac.removeSignalHandlers)();
    sandbox.restore();
    done();
  });
  var adapters = [(0, _npac.mergeConfig)(config), _npac.addLogger, testAdapter.startup, pdms.startup, server.startup];
  var adaptersWithBasePath = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      basePath: '/base/path'
    }
  })), _npac.addLogger, testAdapter.startup, pdms.startup, server.startup];
  var adaptersWithPdms = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      usePdms: true
    },
    pdms: {
      timeout: 2500
      /*, natsUri: 'nats://localhost:4222'*/

    }
  })), _npac.addLogger, pdms.startup, server.startup];
  var adaptersForIgnoreOperationIds = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      usePdms: false,
      ignoreApiOperationIds: true,
      enableMocking: false
    }
  })), _npac.addLogger, pdms.startup, server.startup];
  var adaptersForMocking = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      usePdms: false,
      ignoreApiOperationIds: true,
      enableMocking: true
    }
  })), _npac.addLogger, pdms.startup, server.startup];
  var adaptersForMockingAndPdms = [(0, _npac.mergeConfig)(_.merge({}, config, {
    webServer: {
      usePdms: true,
      ignoreApiOperationIds: true,
      enableMocking: true
    }
  })), _npac.addLogger, pdms.startup, server.startup];
  var terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown];
  it('#startup, #shutdown', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      container.logger.info("Run job to test server");
      next(null, null);
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call static content index', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host, "/docs/subcontent/"),
        withCredentials: true,
        headers: {
          Accept: '*/*'
        }
      }).then(function (response) {
        var status = response.status;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with no adapter function, NO PDMS used', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (err) {
        var _err$response = err.response,
            status = _err$response.status,
            data = _err$response.data;
        (0, _chai.expect)(status).to.equal(501);
        (0, _chai.expect)(data).to.eql({
          error: 'The endpoint is either not implemented or `operationId` is ignored'
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'put',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function using basePath', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/base/path/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'put',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersWithBasePath, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with adapter function but ignore operationId', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'put',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (err) {
        var _err$response2 = err.response,
            status = _err$response2.status,
            data = _err$response2.data;
        (0, _chai.expect)(status).to.equal(501);
        (0, _chai.expect)(data).to.eql({
          error: 'The endpoint is either not implemented or `operationId` is ignored'
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForIgnoreOperationIds, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with 500, Internal Server Error returned by the operation', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint-error";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'post',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (error) {
        var _error$response = error.response,
            status = _error$response.status,
            statusText = _error$response.statusText,
            headers = _error$response.headers,
            data = _error$response.data;
        container.logger.error("status: ".concat(status, ", statusText: ").concat(statusText, ", headers: ").concat(JSON.stringify(headers), ", data: ").concat(JSON.stringify(data)));
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with 500, Internal Server Error no information', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint-error";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'delete',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (error) {
        var _error$response2 = error.response,
            status = _error$response2.status,
            statusText = _error$response2.statusText,
            headers = _error$response2.headers,
            data = _error$response2.data;
        container.logger.error("status: ".concat(status, ", statusText: ").concat(statusText, ", headers: ").concat(JSON.stringify(headers), ", data: ").concat(JSON.stringify(data)));
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adapters, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with PDMS forwarder function - PDMS Client Timeout', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (error) {
        var _error$response3 = error.response,
            status = _error$response3.status,
            statusText = _error$response3.statusText,
            headers = _error$response3.headers,
            data = _error$response3.data;
        container.logger.error("status: ".concat(status, ", statusText: ").concat(statusText, ", headers: ").concat(JSON.stringify(headers), ", data: ").concat(JSON.stringify(data)));
        (0, _chai.expect)(status).to.equal(500);
        (0, _chai.expect)(data.message).to.equal('Client timeout');
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with PDMS forwarder function', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointMethod = 'get';
      var restEndpointPath = "/test/endpoint";
      var expectedBody = {
        status: 'OK'
      }; // Add built-in service

      container.pdms.add({
        topic: 'easer',
        method: restEndpointMethod,
        uri: restEndpointPath
      }, function (data, cb) {
        cb(null, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: expectedBody
        });
      });
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: restEndpointMethod,
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status,
            data = response.data;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(data).to.eql(expectedBody);
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking but no examples', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'put',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status,
            data = response.data;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(data).to.equal('');
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      })["catch"](function (err) {
        return next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "application/json"', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint-with-examples";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status,
            statusText = response.statusText,
            data = response.data;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          identity: 'Universe',
          meaning: 42
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "text/plain"', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint-with-examples";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'text/plain'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status,
            statusText = response.statusText,
            data = response.data;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.equal('The meaning of Universe is 42');
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call existing REST endpoint with mocking and examples. Accept: "unsupported-media-type"', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointPath = "/test/endpoint-with-examples";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: 'get',
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'unsupported/media-type'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (error) {
        var _error$response4 = error.response,
            status = _error$response4.status,
            statusText = _error$response4.statusText,
            headers = _error$response4.headers,
            data = _error$response4.data;
        container.logger.error("status: ".concat(status, ", statusText: ").concat(statusText, ", headers: ").concat(JSON.stringify(headers), ", data: ").concat(JSON.stringify(data)));
        (0, _chai.expect)(status).to.equal(415);
        (0, _chai.expect)(statusText).to.equal('Unsupported Media Type');
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
  }).timeout(30000);
  it('#call with PDMS and mocking enabled, no endpoint implementation, mock example exists', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointMethod = 'get';
      var restEndpointPath = "/test/endpoint-with-examples";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: restEndpointMethod,
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      }).then(function (response) {
        var status = response.status,
            statusText = response.statusText,
            data = response.data;
        (0, _chai.expect)(status).to.equal(200);
        (0, _chai.expect)(statusText).to.equal('OK');
        (0, _chai.expect)(data).to.eql({
          identity: 'Universe',
          meaning: 42
        });
        (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be["true"];
        (0, _chai.expect)(tracerMwCall.calledOnce).to.be["true"];
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMockingAndPdms, [testServer], terminators);
  }).timeout(30000);
  it('#call with PDMS and mocking enabled, no endpoint implementation, mock example does not exists', function (done) {
    (0, _npac.catchExitSignals)(sandbox, done);

    var testServer = function testServer(container, next) {
      var port = container.config.webServer.port;
      var host = "http://localhost:".concat(port);
      var restEndpointMethod = 'get';
      var restEndpointPath = "/test/endpoint";
      container.logger.info("Run job to test server");
      (0, _axios["default"])({
        method: restEndpointMethod,
        url: "".concat(host).concat(restEndpointPath),
        withCredentials: true,
        headers: _defineProperty({
          Accept: 'application/json'
        }, traceIdHeader, traceIdValue)
      })["catch"](function (error) {
        var _error$response5 = error.response,
            status = _error$response5.status,
            statusText = _error$response5.statusText,
            headers = _error$response5.headers;
        container.logger.error("status: ".concat(status, ", ").concat(statusText, ", headers: ").concat(JSON.stringify(headers)));
        (0, _chai.expect)(status).to.equal(404);
        (0, _chai.expect)(statusText).to.equal('Not Found');
        next(null, null);
      });
    };

    (0, _npac.npacStart)(adaptersForMockingAndPdms, [testServer], terminators);
  }).timeout(30000);
});