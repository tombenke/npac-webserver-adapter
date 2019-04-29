'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shutdownServer = exports.startupServer = undefined;

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressWinston = require('express-winston');

var _expressWinston2 = _interopRequireDefault(_expressWinston);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _middlewares = require('./middlewares');

var _routes = require('./routes');

var _connectFlash = require('connect-flash');

var _connectFlash2 = _interopRequireDefault(_connectFlash);

var _responseTime = require('response-time');

var _responseTime2 = _interopRequireDefault(_responseTime);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
TODO: Make HTTPS available too
const fs from 'fs'
const https from 'https'
*/
/**
 * The server module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module server
 */
var httpInstance = null;

/**
 * Setup and start the server instance
 *
 * @arg {Object} container - The container context
 * @arg {Object} api - The array of REST API endpoints
 *
 * @return {Promise} A promise, that resolves to the server instance
 *
 * @function
 * @async
 */
var startupServer = exports.startupServer = function startupServer(container, api) {
    var config = container.config;
    container.logger.debug('webServer config:' + JSON.stringify(config));
    container.logger.info('Start up webServer');

    // Create a new Express application.
    var server = (0, _express2.default)();

    // Configure the middlewares
    server.use(_expressWinston2.default.logger({ transports: [container.logger] }));
    server.use((0, _cookieParser2.default)()); // read cookies (needed for auth)
    server.use(_bodyParser2.default.json()); // for parsing application/json
    server.use(_bodyParser2.default.urlencoded({ extended: true })); // get information from html forms

    // Use compression if enabled
    if (config.webServer.useCompression) {
        container.logger.info('Use compression');
        server.use((0, _compression2.default)());
    }

    // Measure response time if enabled, and put x-response-time header into the response
    if (config.webServer.useResponseTime) {
        server.use((0, _responseTime2.default)());
    }

    // required for passport
    server.use((0, _expressSession2.default)({ secret: 'larger is dropped once', resave: false, saveUninitialized: false })); // session secret
    /* TODO: Implement authorization
        auth.loadUsers(container),
        server.use(auth.initialize())
        server.use(auth.session()) // persistent login sessions
    */
    server.use((0, _connectFlash2.default)()); // use connect-flash for flash messages stored in session

    (0, _middlewares.setMiddlewares)(container, server, 'preRouting');
    (0, _routes.setRoutes)(container, server, api);
    (0, _middlewares.setMiddlewares)(container, server, 'postRouting');

    /* TODO: Set configuration parameters for HTTPS and enable it
    // Start the server to listen, either a HTTPS or an HTTP one:
     https.createServer({
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('cert.pem'),
          passphrase: 'SomePassPhrase12345'
        }, server).listen(4443)
    */

    return new Promise(function (resolve, reject) {
        httpInstance = server.listen(config.webServer.port, function () {
            container.logger.info('Express server listening on port ' + config.webServer.port);
            resolve(httpInstance);
        });
    });
};

/**
 * Shut down the server instance
 *
 * @arg {Object} container - The container context
 *
 * @function
 */
var shutdownServer = exports.shutdownServer = function shutdownServer(container) {
    httpInstance.close();
    container.logger.info('Shut down webServer');
};