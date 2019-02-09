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
        var testAdapterConfig = _.merge({}, _config2.default, { testAdapter: container.config.testAdapter || {} });
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

describe('adapters/server', function () {
    var sandbox = void 0;

    var config = _.merge({}, _config2.default, pdms.defaults, {
        webServer: {
            useCompression: true,
            restApiPath: __dirname + '/fixtures/services/'
        }
    });

    beforeEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox = _sinon2.default.sandbox.create({ useFakeTimers: false });
        done();
    });

    afterEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox.restore();
        done();
    });

    var adapters = [(0, _npac.mergeConfig)(config), _npac.addLogger, testAdapter.startup, pdms.startup, server.startup];
    /*
    const adaptersWithPdms = [
        mergeConfig(_.merge({}, config, {
            webServer: { usePdms: true },
            // pdms: { natsUri: 'nats://localhost:4222' }
        })),
        addLogger,
        pdms.startup,
        server.startup
    ]
    */

    var terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown];

    it('#startup, #shutdown', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            container.logger.info('Run job to test server');
            next(null, null);
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    });

    it('#call existing REST endpoint with no adaptor function', function (done) {
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
                headers: {
                    Accept: 'application/json'
                }
            }).then(function (response) {
                var status = response.status;

                (0, _chai.expect)(status).to.equal(200);
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    });

    it('#call existing REST endpoint with adaptor function', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            console.log(container.config);
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'put',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: {
                    Accept: 'application/json'
                }
            }).then(function (response) {
                var status = response.status;

                (0, _chai.expect)(status).to.equal(200);
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    });

    it('#call existing REST endpoint with 500, Internal Server Error', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testServer = function testServer(container, next) {
            console.log(container.config);
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpoint = '/test/endpoint';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpoint,
                withCredentials: true,
                headers: {
                    Accept: 'application/json'
                }
            }).catch(function (error) {
                var _error$response = error.response,
                    status = _error$response.status,
                    statusText = _error$response.statusText,
                    headers = _error$response.headers,
                    data = _error$response.data;
                //console.log('ERROR: ', error.response)

                container.logger.error('status: ' + status + ', statusText: ' + statusText + ', headers: ' + JSON.stringify(headers) + ', data: ' + JSON.stringify(data));
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adapters, [testServer], terminators);
    });
});