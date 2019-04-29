'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setEndpoints = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _circularJsonEs = require('circular-json-es6');

var _circularJsonEs2 = _interopRequireDefault(_circularJsonEs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * The restapi module of the webserver adapter.
 *
 * This module implements the handler functions that serve the incoming endpoint calls
 *
 * Used only internally by the adapter.
 *
 * @module restapi
 */
var defaultResponseHeaders = {
    'Content-Type': 'application/json'

    /**
     * Make handler function that serves the incoming API calls
     *
     * This is a currying function, that returns with a function which will handle the given API call.
     *
     * @arg {Object} container - The container context
     * @arg {Object} endpoint - The non-static endpoint descriptor object
     * @arg {Object} req - The request object of the API call.
     * @arg {Object} res - The response object of the API call.
     * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
     *
     * @function
     */
};var mkHandlerFun = function mkHandlerFun(container, endpoint) {
    return function (req, res, next) {
        var uri = endpoint.uri,
            method = endpoint.method,
            operationId = endpoint.operationId;

        container.logger.debug('REQ method:"' + method + '" uri:"' + uri + '"');

        if (operationId !== null) {
            var serviceFun = _lodash2.default.get(container, operationId, null);
            if (_lodash2.default.isFunction(serviceFun)) {
                serviceFun(req, endpoint).then(function (result) {
                    res.set(result.headers).status(200).json(result.body);
                    next();
                }).catch(function (errResult) {
                    container.logger.error(_circularJsonEs2.default.stringify(errResult));
                    res.set(errResult.headers).status(errResult.status).json(errResult.body);
                    next();
                });
            } else {
                res.set(defaultResponseHeaders).status(501).json({
                    error: 'The operationId refers to a non-existing service function'
                });
                next();
            }
        } else {
            // The operationId is null
            res.set(defaultResponseHeaders).status(501).json({
                error: 'The endpoint is not implemented'
            });
            next();
        }
    };
};

/**
 * Setup the non-static endpoints of the web server
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The server object, that the endpoints will be added to
 * @arg {Array} endpoints - The array of endpoint descriptor objects
 *
 * @function
 */
var setEndpoints = exports.setEndpoints = function setEndpoints(container, server, endpoints) {
    container.logger.debug('restapi.setEndpoints/endpointMap ' + JSON.stringify(_lodash2.default.map(endpoints, function (ep) {
        return [ep.method, ep.uri];
    }), null, ''));
    _lodash2.default.map(endpoints, function (endpoint) {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(container, endpoint));
    });
};