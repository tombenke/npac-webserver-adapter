'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The default configuration for the webServer
 *
 *  {
 *      app: {
 *          name: {String},             // The name of the generator tool
 *          version: {String}           // The version of the generator tool
 *      },
 *      configFileName: {String},       // The name of the config file '.rest-tool.yml',
 *      logLevel: {String},             // The log level: (info | warn | error | debug)
 */
module.exports = {
    webServer: {
        port: process.env.WEBSERVER_PORT || 3007,
        useCompression: process.env.WEBSERVER_USE_COMPRESSION || false,
        usePdms: process.env.WEBSERVER_USE_PDMS || false,
        restApiPath: process.env.WEBSERVER_RESTAPIPATH || _path2.default.resolve(),
        staticContentBasePath: process.env.WEBSERVER_STATIC_CONTENT_BASEPATH || _path2.default.resolve()
    }
};