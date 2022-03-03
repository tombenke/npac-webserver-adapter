"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startupServer = exports.shutdownServer = void 0;

var _express = _interopRequireDefault(require("express"));

var _expressWinston = _interopRequireDefault(require("express-winston"));

var _cookieParser = _interopRequireDefault(require("cookie-parser"));

var _expressSession = _interopRequireDefault(require("express-session"));

var _compression = _interopRequireDefault(require("compression"));

var _parser = require("./parser");

var _middlewares = require("./middlewares");

var _routes = require("./routes");

var _connectFlash = _interopRequireDefault(require("connect-flash"));

var _responseTime = _interopRequireDefault(require("response-time"));

var _logUtils = require("./logUtils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * The server module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module server
 */

/*
TODO: Make HTTPS available too
const fs from 'fs'
const https from 'https'
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

var startupServer = function startupServer(container, api) {
  var config = container.config;
  container.logger.debug("webServer config:".concat(JSON.stringify(config)));
  container.logger.info("Start up webServer"); // Create a new Express application.

  var server = (0, _express["default"])(); // Configure the middlewares

  server.use(_expressWinston["default"].logger({
    transports: [container.logger],
    ignoreRoute: (0, _logUtils.ignoreRouteLogging)(container)
  }));
  server.use((0, _cookieParser["default"])()); // read cookies (needed for auth)
  // Use parsers if enabled

  (0, _parser.setParsers)(container, server); // Use compression if enabled

  if (config.webServer.useCompression) {
    container.logger.info('Use compression');
    server.use((0, _compression["default"])());
  } // Measure response time if enabled, and put x-response-time header into the response


  if (config.webServer.useResponseTime) {
    server.use((0, _responseTime["default"])());
  } // required for passport


  server.use((0, _expressSession["default"])({
    secret: 'larger is dropped once',
    resave: false,
    saveUninitialized: false
  })); // session secret

  /* TODO: Implement authorization
      auth.loadUsers(container),
      server.use(auth.initialize())
      server.use(auth.session()) // persistent login sessions
  */

  server.use((0, _connectFlash["default"])()); // use connect-flash for flash messages stored in session

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
      container.logger.info("Express server listening on port ".concat(config.webServer.port));
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


exports.startupServer = startupServer;

var shutdownServer = function shutdownServer(container) {
  httpInstance.close();
  container.logger.info('Shut down webServer');
};

exports.shutdownServer = shutdownServer;