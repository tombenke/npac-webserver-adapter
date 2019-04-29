'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _restToolCommon = require('rest-tool-common');

var _server = require('./server');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The startup function of the adapter.
 *
 * This function has to be added to the `adapters` array of the container application to be executed during the startup process.
 *
 * The function will read its configuration from the `context.config.webServer` propery.
 * See the `config.js` file for details on the config parameters.
 *
 * The function reads the REST API from the swagger/OpenApi descriptor file(s), then starts a webserver according to the config parameter.
 * See the `inde.spec.js` for for examples of how to use this function and the adapter itself.
 *
 * @arg {Object} container - The actual state of the container context during the startup process.
 * @arg {Function} - The next function that must be called when the startup function has finished.
 * This is an error-first callback function. Its firs parameter is `null` if the execution was successful, or the error code, in case of problems.
 * Its second parameter -in case of successful execution- is the object, that has to be merged with the actual state to the context.
 *
 * @function
 */
var startup = function startup(container, next) {
    // Merges the defaults with the config coming from the outer world
    var config = _lodash2.default.merge({}, _config2.default, { webServer: container.config.webServer || {} });

    // Load the Swagger/OpenAPI format API definition
    var oasFile = _path2.default.resolve(config.webServer.restApiPath);
    container.logger.info('Load endpoints from ' + oasFile);
    return (0, _restToolCommon.loadOas)(oasFile, config.webServer.oasConfig).catch(function (err) {
        container.logger.error('API loading error ' + err);
    }).then(function (api) {
        (0, _server.startupServer)(container, api).then(function (httpInstance) {
            // Call next setup function with the context extension
            next(null, {
                webServer: {
                    server: httpInstance
                }
            });
        });
    });
};

/**
 * The startup function of the adapter.
 *
 * This function has to be added to the `terminators` array of the container application to be executed during the startup process.
 *
 * @arg {Object} container - The actual state of the container context during the startup process.
 * @arg {Function} - The next function that must be called when the startup function has finished.
 * This is an error-first callback function. Its firs parameter is `null` if the execution was successful, or the error code, in case of problems.
 * Its second parameter -in case of successful execution- is the object, that has to be merged with the actual state to the context.
 *
 * @function
 */
/**
 * The main module of the webserver adapter.
 *
 * @module npac-webserver-adapter
 */

var shutdown = function shutdown(container, next) {
    (0, _server.shutdownServer)(container);
    next(null, null);
};

module.exports = {
    defaults: _config2.default,
    startup: startup,
    shutdown: shutdown
};