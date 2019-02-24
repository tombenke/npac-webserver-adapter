'use strict';

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _routes = require('./routes');

var _routes2 = _interopRequireDefault(_routes);

var _connectFlash = require('connect-flash');

var _connectFlash2 = _interopRequireDefault(_connectFlash);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//const fs from 'fs'
//const https from 'https'
var httpInstance = null;

var startup = function startup(container, next) {
    // Merges the defaults with the config coming from the outer world
    var config = _lodash2.default.merge({}, _config2.default, { webServer: container.config.webServer || {} });
    //    const config = container.config
    container.logger.debug('webServer config:' + JSON.stringify(config));
    container.logger.info('Start up webServer');

    // Create a new Express application.
    var server = (0, _express2.default)();

    // Configure the middlewares
    server.use((0, _morgan2.default)('dev')); // log every request to the console
    server.use((0, _cookieParser2.default)()); // read cookies (needed for auth)
    server.use(_bodyParser2.default.json()); // for parsing application/json
    server.use(_bodyParser2.default.urlencoded({ extended: true })); // get information from html forms
    if (config.webServer.useCompression) {
        container.logger.info('Use compression');
        server.use((0, _compression2.default)());
    }

    // required for passport
    server.use((0, _expressSession2.default)({ secret: 'larger is dropped once', resave: false, saveUninitialized: false })); // session secret
    // TODO: Implement authorization
    //    auth.loadUsers(container),
    //    server.use(auth.initialize())
    //    server.use(auth.session()) // persistent login sessions
    server.use((0, _connectFlash2.default)()); // use connect-flash for flash messages stored in session

    _routes2.default.set(server, container);

    // TODO: Set configuration parameters for HTTPS and enable it
    // Start the server to listen, either a HTTPS or an HTTP one:
    /*
    https.createServer({
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('cert.pem'),
          passphrase: 'SomePassPhrase12345'
        }, server).listen(4443)
    */

    httpInstance = server.listen(config.webServer.port, function () {
        container.logger.info('Express server listening on port ' + config.webServer.port);
        // Call next setup function with the context extension
        next(null, {
            webServer: {
                server: httpInstance
            }
        });
    });
};

var shutdown = function shutdown(container, next) {
    httpInstance.close();
    container.logger.info('Shut down webServer');
    next(null, null);
};

module.exports = {
    defaults: _config2.default,
    startup: startup,
    shutdown: shutdown
};