'use strict';

var _npac = require('npac');

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _chai = require('chai');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _index = require('./index');

var server = _interopRequireWildcard(_index);

var _npacNatsAdapter = require('npac-nats-adapter');

var nats = _interopRequireWildcard(_npacNatsAdapter);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// An endpoint operation callback that accepts a parsable object
var testAdapterEndpointFun = function testAdapterEndpointFun(container) {
    return function (req, endp) {
        return new Promise(function (resolve, reject) {
            resolve({
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: req.body
            });
        });
    };
};

// Test adapter that holds two endpoint implementations (operations), a success and an error one.
var testAdapter = {
    startup: function startup(container, next) {
        // Merges the defaults with the config coming from the outer world
        var testAdapterConfig = _.merge({}, /*defaults,*/{ testAdapter: container.config.testAdapter || {} });
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
    shutdown: function shutdown(container, next) {
        container.logger.info('Shut down testAdapter adapter');
        next(null, null);
    }
};

describe('webServer adapter with parsing enabled', function () {
    var sandbox = void 0;

    var config = _.merge({}, _config2.default, nats.defaults, {
        logger: {
            level: 'debug'
        },
        nats: { servers: ['nats://localhost:4222'], debug: true },
        webServer: {
            logBlackList: ['/test/endpoint-json'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            staticContentBasePath: __dirname, // + '/fixtures/content/'
            bodyParser: {
                json: true,
                xml: true,
                urlencoded: true
            }
        }
    });

    beforeEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox = _sinon2.default.createSandbox({
            properties: ['spy']
        });
        done();
    });

    afterEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox.restore();
        done();
    });

    var adaptersWithPdms = [(0, _npac.mergeConfig)(_.merge({}, config, {
        webServer: { usePdms: true },
        nats: { servers: ['nats://localhost:4222'], debug: true, timeout: 2500 }
    })), _npac.addLogger, nats.startup, testAdapter.startup, server.startup];

    var terminators = [server.shutdown, nats.shutdown, testAdapter.shutdown];

    it('#call POST endpoint with JSON body parser. Accept: "application/json"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testBody = '{ "identity": "Universe", "meaning": 42 }';

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpointPath = '/test/endpoint-json';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpointPath,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                data: testBody
            }).then(function (response) {
                var status = response.status,
                    statusText = response.statusText,
                    data = response.data;


                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(statusText).to.equal('OK');
                (0, _chai.expect)(data).to.eql({ identity: 'Universe', meaning: 42 });

                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
    }).timeout(30000);

    it('#call POST endpoint with XML body parser. Accept: "text/xml"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testBody = '<?xml version="1.0" encoding="UTF-8"?>\n            <starwars>\n                <character name="Luke Skywalker" />\n                <character name="Darth Vader" />\n            </starwars>';

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpointPath = '/test/endpoint-xml';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpointPath,
                withCredentials: true,
                headers: {
                    'Content-Type': 'text/xml',
                    Accept: 'application/json'
                },
                data: testBody
            }).then(function (response) {
                var status = response.status,
                    statusText = response.statusText,
                    data = response.data;


                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(statusText).to.equal('OK');
                (0, _chai.expect)(data).to.eql({
                    starwars: {
                        character: [{ $: { name: 'Luke Skywalker' } }, { $: { name: 'Darth Vader' } }]
                    }
                });

                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
    }).timeout(30000);

    it('#call POST endpoint with URL encoded body parser. Accept: "application/x-www-form-urlencoded"', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testBody = _qs2.default.stringify({ identity: 'Universe', meaning: 42 });

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpointPath = '/test/endpoint-urlencoded';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpointPath,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                },
                data: testBody
            }).then(function (response) {
                var status = response.status,
                    statusText = response.statusText,
                    data = response.data;


                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(statusText).to.equal('OK');
                (0, _chai.expect)(data).to.eql({ identity: 'Universe', meaning: '42' });

                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
    }).timeout(30000);
});

describe('webServer adapter with only raw parsing', function () {
    var sandbox = void 0;

    var config = _.merge({}, _config2.default, nats.defaults, {
        logger: {
            level: 'debug'
        },
        nats: { servers: ['nats://localhost:4222'], debug: true },
        webServer: {
            logBlackList: ['/test/endpoint-json'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            staticContentBasePath: __dirname // + '/fixtures/content/'
        }
    });

    beforeEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox = _sinon2.default.createSandbox({
            properties: ['spy']
        });
        done();
    });

    afterEach(function (done) {
        (0, _npac.removeSignalHandlers)();
        sandbox.restore();
        done();
    });

    var adaptersWithPdms = [(0, _npac.mergeConfig)(_.merge({}, config, {
        webServer: { usePdms: true },
        nats: { timeout: 2500 }
    })), _npac.addLogger, nats.startup, testAdapter.startup, server.startup];

    var terminators = [server.shutdown, nats.shutdown, testAdapter.shutdown];

    it('#call POST endpoint without parser', function (done) {
        (0, _npac.catchExitSignals)(sandbox, done);

        var testBody = '{ "identity": "Universe", "meaning": 42 }';

        var testServer = function testServer(container, next) {
            var port = container.config.webServer.port;

            var host = 'http://localhost:' + port;
            var restEndpointPath = '/test/endpoint-raw';

            container.logger.info('Run job to test server');
            (0, _axios2.default)({
                method: 'post',
                url: '' + host + restEndpointPath,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                data: testBody
            }).then(function (response) {
                var status = response.status,
                    statusText = response.statusText,
                    data = response.data;


                (0, _chai.expect)(status).to.equal(200);
                (0, _chai.expect)(statusText).to.equal('OK');
                (0, _chai.expect)(data).to.eql({ identity: 'Universe', meaning: 42 });
                next(null, null);
            });
        };

        (0, _npac.npacStart)(adaptersWithPdms, [testServer], terminators);
    }).timeout(30000);
});