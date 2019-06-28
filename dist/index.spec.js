'use strict';

var _npac = require('npac');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _chai = require('chai');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _index = require('./index');

var server = _interopRequireWildcard(_index);

var _npacPdmsHemeraAdapter = require('npac-pdms-hemera-adapter');

var pdms = _interopRequireWildcard(_npacPdmsHemeraAdapter);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
};

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
};

var testAdapter = {
    startup: function startup(container, next) {
        // Merges the defaults with the config coming from the outer world
        var testAdapterConfig = _.merge({}, /*defaults,*/{ testAdapter: container.config.testAdapter || {} });
        container.logger.info('Start up testAdapter adapter');

        // Call next setup function with the context extension
        next(null, {
            config: testAdapterConfig,
            testAdapter: {
                endpoint: testAdapterEndpointFun(container),
                endpointErr500: testAdapterEndpointErr500Fun(container)
            }
        });
    },
    shutdown: function shutdown(container, next) {
        container.logger.info('Shut down testAdapter adapter');
        next(null, null);
    }
};

describe('webServer adapter', function () {
    var sandbox = void 0;
    var acceptCheckMwCall = void 0;
    var tracerMwCall = void 0;
    var traceIdHeader = 'X-B3-Traceid';
    var traceIdValue = '42';
    var accepts = ['*/*', 'application/json', 'text/plain', 'text/html', 'text/xml', 'unsupported/media-type'];

    var acceptCheckMiddleware = function acceptCheckMiddleware(container) {
        return function (req, res, next) {
            container.logger.debug('acceptCheckMiddleware is called ' + req.accepts());
            (0, _chai.expect)(_.includes(accepts, req.accepts()[0])).to.be.true;
            acceptCheckMwCall();
            next();
        };
    };

    var tracerMiddleware = function tracerMiddleware(container) {
        return function (req, res, next) {
            //        const { hostname, originalUrl, route, method } = req
            var traceId = req.get(traceIdHeader);
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
    };

    var config = _.merge({}, _config2.default, pdms.defaults, {
        logger: {
            level: 'debug'
        },
        webServer: {
            logBlackList: ['/test/endpoint'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            middlewares: { preRouting: [acceptCheckMiddleware], postRouting: [tracerMiddleware] },
            staticContentBasePath: __dirname // + '/fixtures/content/'
        }
    });

    beforeEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox = _sinon2.default.createSandbox({
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
        webServer: { basePath: '/base/path' }
    })), _npac.addLogger, testAdapter.startup, pdms.startup, server.startup];

    var adaptersWithPdms = [(0, _npac.mergeConfig)(_.merge({}, config, {
        webServer: { usePdms: true
            // pdms: { natsUri: 'nats://localhost:4222' }
        } })), _npac.addLogger, pdms.startup, server.startup];

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

    var terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown];

    it('#startup, #shutdown', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            container.logger.info('Run job to test server');
            next(null, null);
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    }).timeout(30000);

    it('#call static content index', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: host + '/docs/subcontent/',
                withCredentials: true,
                headers: {
                    Accept: '*/*'
                }
            }).then(function (response) {
                var status = response.status;

                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with no adapter function, NO PDMS used', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).catch(function (err) {
                var _err$response = err.response,
                    status = _err$response.status,
                    data = _err$response.data;

                (0, _chai.expect)(status).to.equal(501);
                (0, _chai.expect)(data).to.eql({ error: 'The endpoint is either not implemented or `operationId` is ignored' });
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with adapter function', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'put',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).then(function (response) {
                var status = response.status;

                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with adapter function using basePath', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/base/path/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'put',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).then(function (response) {
                var status = response.status;

                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithBasePath, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with adapter function but ignore operationId', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'put',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).catch(function (err) {
                var _err$response2 = err.response,
                    status = _err$response2.status,
                    data = _err$response2.data;

                (0, _chai.expect)(status).to.equal(501);
                (0, _chai.expect)(data).to.eql({ error: 'The endpoint is either not implemented or `operationId` is ignored' });
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersForIgnoreOperationIds, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with 500, Internal Server Error', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).catch(function (error) {
                var _error$response = error.response,
                    status = _error$response.status,
                    statusText = _error$response.statusText,
                    headers = _error$response.headers,
                    data = _error$response.data;

                container.logger.error('status: ' + status + ', statusText: ' + statusText + ', headers: ' + JSON.stringify(headers) + ', data: ' + JSON.stringify(data));
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with PDMS forwarder function - PDMS Client Timeout', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).catch(function (error) {
                var _error$response2 = error.response,
                    status = _error$response2.status,
                    statusText = _error$response2.statusText,
                    headers = _error$response2.headers,
                    data = _error$response2.data;

                container.logger.error('status: ' + status + ', statusText: ' + statusText + ', headers: ' + JSON.stringify(headers) + ', data: ' + JSON.stringify(data));
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

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';
            var expectedBody = { status: 'OK'

                // Add built-in service
            };container.pdms.add({ topic: restEndpoint, method: 'get', uri: restEndpoint }, function (data, cb) {
                cb(null, {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: expectedBody
                });
            });

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).then(function (response) {
                var status = response.status,
                    data = response.data;

                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(data).to.eql(expectedBody);
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with mocking but no examples', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'put',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'application/json'
                }, traceIdHeader, traceIdValue)
            }).then(function (response) {
                var status = response.status,
                    data = response.data;

                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(data).to.equal('');
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            }).catch(function (err) {
                return next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with mocking and examples. Accept: "application/json"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint-with-examples';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
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
                (0, _chai.expect)(data).to.eql({ identity: 'Universe', meaning: 42 });
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with mocking and examples. Accept: "text/plain"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint-with-examples';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
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
                (0, _chai.expect)(acceptCheckMwCall.calledOnce).to.be.true;
                (0, _chai.expect)(tracerMwCall.calledOnce).to.be.true;
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
    }).timeout(30000);

    it('#call existing REST endpoint with mocking and examples. Accept: "unsupported-media-type"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint-with-examples';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'get',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: _defineProperty({
                    Accept: 'unsupported/media-type'
                }, traceIdHeader, traceIdValue)
            }).catch(function (error) {
                var _error$response3 = error.response,
                    status = _error$response3.status,
                    statusText = _error$response3.statusText,
                    headers = _error$response3.headers,
                    data = _error$response3.data;

                container.logger.error('status: ' + status + ', statusText: ' + statusText + ', headers: ' + JSON.stringify(headers) + ', data: ' + JSON.stringify(data));
                (0, _chai.expect)(status).to.equal(415);
                (0, _chai.expect)(statusText).to.equal('Unsupported Media Type');
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersForMocking, [testServer], terminators);
    }).timeout(30000);
});