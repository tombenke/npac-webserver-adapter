"use strict";

var _path = _interopRequireDefault(require("path"));
var _lodash = _interopRequireDefault(require("lodash"));
var _config = _interopRequireDefault(require("./config"));
var _restToolCommon = require("rest-tool-common");
var _server = require("./server");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * The main module of the webserver adapter.
 *
 * @module npac-webserver-adapter
 */

/**
 * Resolve the swagger descriptor to be loaded.
 *
 * @arg {Object} container - The container context
 * @arg {String|Object} oasFile - The path string to the swagger file, or the swagger object itself
 *
 * @return {String|Object} The full path resolved, if it is a path, or the swagger object.
 *
 * @function
 */
const resolveOasFile = (container, oasFile) => {
  if (_lodash.default.isString(oasFile)) {
    // It is a path string
    const oasFilePath = _path.default.resolve(oasFile);
    container.logger.info(`Load endpoints from ${oasFilePath}`);
    return oasFilePath;
  }
  // oasFile must be a swagger object
  return oasFile;
};

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
const startup = (container, next) => {
  // Merges the defaults with the config coming from the outer world
  const config = _lodash.default.merge({}, _config.default, {
    webServer: container.config.webServer || {}
  });

  // Load the Swagger/OpenAPI format API definition
  const oasFile = resolveOasFile(container, config.webServer.restApiPath);
  return (0, _restToolCommon.loadOas)(oasFile, config.webServer.oasConfig).then(api => {
    (0, _server.startupServer)(container, api).then(httpInstance => {
      // Call next setup function with the context extension
      next(null, {
        webServer: {
          server: httpInstance
        }
      });
    });
  }).catch(err => {
    container.logger.error(`API loading error ${err}`);
    next(err, err);
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
const shutdown = (container, next) => {
  (0, _server.shutdownServer)(container);
  next(null, null);
};
module.exports = {
  defaults: _config.default,
  startup: startup,
  shutdown: shutdown
};