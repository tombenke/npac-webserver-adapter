'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getLogBlackList = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Make an array of strings out of a string that holds a comma-selarated list of URIs.
 *
 * @arg {String} pathsToSkipLogging - The string that contains the comma-separated list of URIs that should not be logged.
 *
 * @return {Array} - The array of URI strings
 *
 * @function
 */
/**
 * The configuration parameters module of the webserver adapter.
 *
 * The property values of this object will be resolved during the startup process.
 * This object will appear as the default setup within the `container.config.webServer` property during the startup process, when the `startup` function of this adapter is called.
 *
 * In order to change the values of the configuration parameters, use either the corresponding environment variables, or merge your config object, with this default config setup.
 *
 * @module config
 */
var getLogBlackList = exports.getLogBlackList = function getLogBlackList(pathsToSkipLogging) {
    return !_lodash2.default.isUndefined(pathsToSkipLogging) && _lodash2.default.isString(pathsToSkipLogging) ? _lodash2.default.split(pathsToSkipLogging, ',') : [];
};

/**
 * The default configuration for the webServer:
 */
module.exports = {
    /**
     * The webserver related configuration object, that will be merged into the `container.config` object.
     *
     * @property {Array} logBlackList - The array of URIs that should not be logged. Default: `[]`. Env.: `WEBSERVER_LOG_BLACKLIST`, the comma-separated list of URI strings.
     * @property {Number} port - The port where the webserver will listen. Env.: `WEBSERVER_PORT`. Default: `3007`.
     * @property {Boolean} useCompression - If `true` then the server will use the compression middleware. Env: `WEBSERVER_USE_COMPRESSION`. Default: `false`.
     * @property {Boolean} usePdms: If `true` the adapter will use the API call forwarding towards NATS topics. Env.: `WEBSERVER_USE_PDMS`. Default: `false`.
     * @property {Object} middlewares: The dictionary of middleware functions needs to be added. Defaults: `{ preRouting: [], postRouting: [] }`.
     * @property {String} restApiPath: The path to the root file of the swagger/OpenApi descriptor file(s) Env.: `WEBSERVER_RESTAPIPATH`.
     * @property {String} staticContentBasePath: The base path to the static endpoints of the REST API. Env.: `WEBSERVER_STATIC_CONTENT_BASEPATH`.
     * @property {Object} oasConfig - The swagger-parser configuration object. Defaults: `{ parse: { yaml: { allowEmpty: false }, resolve: { file: true } } }`
     *
     */
    webServer: {
        logBlackList: getLogBlackList(process.env.WEBSERVER_LOG_BLACKLIST),
        port: process.env.WEBSERVER_PORT || 3007,
        useCompression: process.env.WEBSERVER_USE_COMPRESSION || false,
        useResponseTime: process.env.WEBSERVER_USE_RESPONSE_TIME || false,
        usePdms: process.env.WEBSERVER_USE_PDMS || false,
        middlewares: { preRouting: [], postRouting: [] },
        restApiPath: process.env.WEBSERVER_RESTAPIPATH || _path2.default.resolve(),
        staticContentBasePath: process.env.WEBSERVER_STATIC_CONTENT_BASEPATH || _path2.default.resolve(),
        oasConfig: {
            parse: {
                yaml: {
                    allowEmpty: false // Don't allow empty YAML files
                },
                resolve: {
                    file: true // Resolve local file references
                }
            }
        }
    }
};