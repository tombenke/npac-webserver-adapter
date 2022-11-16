'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setMiddlewares = exports.addMiddlewares = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Add middlewares to the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The server object
 * @arg {Object} middlewares - It is an object, that has two `Array` type properties: `{ preRouting: [], postRouting: [] }`.
 * Both arrays can contain so called middleware adder functions. These adder function get one parameter, that is the `container` object, and must return with express middleware function.
 * This adder function makes possible to inject the container context to the middlewares, so those will be able to access to all the functions (e.g.: logger) and config parameters that are available to the adapter during the startup phase.
 *
 * @function
 */
var addMiddlewares = exports.addMiddlewares = function addMiddlewares(container, server, middlewares) {
    // Add middlewares, if there is any defined
    if (_lodash2.default.isArray(middlewares)) {
        _lodash2.default.chain(middlewares).filter(function (adderFn) {
            if (_lodash2.default.isFunction(adderFn)) {
                // The `adderFn` will be registered as middleware
                return true;
            } else {
                // The adder must be a function that receives the container and returns with a middleware function
                container.logger.error(adderFn + ' is not a function');
                return false;
            }
        }).map(function (adderFn) {
            return server.use(adderFn(container));
        }).value();
    }
}; /**
    * The middlewares module of the webserver adapter.
    *
    * This module makes possible to register pre-routing and post-routing middlewares to the web server via the configuration.
    *
    * Used only internally by the adapter.
    *
    * @module middlewares
    */
var setMiddlewares = exports.setMiddlewares = function setMiddlewares(container, server, phase) {
    var middlewares = _lodash2.default.merge({
        preRouting: [],
        postRouting: []
    }, _lodash2.default.cloneDeep(container.config.webServer.middlewares));

    return addMiddlewares(container, server, middlewares[phase]);
};