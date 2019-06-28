'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.callPdmsForwarder = exports.callServiceFuntion = exports.setEndpoints = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _circularJsonEs = require('circular-json-es6');

var _circularJsonEs2 = _interopRequireDefault(_circularJsonEs);

var _logUtils = require('./logUtils');

var _mocking = require('./mocking');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Setup the non-static endpoints of the web server
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The server object, that the endpoints will be added to
 * @arg {Array} endpoints - The array of endpoint descriptor objects
 *
 * @function
 */
/**
 * The restapi module of the webserver adapter.
 *
 * This module implements the handler functions that serve the incoming endpoint calls
 *
 * Used only internally by the adapter.
 *
 * @module restapi
 */
var setEndpoints = exports.setEndpoints = function setEndpoints(container, server, endpoints) {
    var basePath = container.config.webServer.basePath === "/" ? "" : container.config.webServer.basePath;
    container.logger.debug('restapi.setEndpoints/endpointMap ' + JSON.stringify(_lodash2.default.map(endpoints, function (ep) {
        return [ep.method, basePath + ep.jsfUri];
    }), null, ''));
    _lodash2.default.map(endpoints, function (endpoint) {
        server[endpoint.method](basePath + endpoint.jsfUri, mkHandlerFun(container, endpoint));
    });
};
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
        var ignoreApiOperationIds = container.config.webServer.ignoreApiOperationIds;


        if (!(0, _logUtils.isPathBlackListed)(container, uri)) {
            container.logger.debug('REQ method:"' + method + '" uri:"' + uri + '"');
        }

        if (!ignoreApiOperationIds && operationId !== null) {
            // operationId is defined in the endpoint descriptor
            var serviceFun = _lodash2.default.get(container, operationId, null);
            if (_lodash2.default.isFunction(serviceFun)) {
                callServiceFuntion(container, endpoint, req, res, serviceFun, next);
            } else {
                res.set(defaultResponseHeaders).status(501).json({
                    error: 'The operationId refers to a non-existing service function'
                });
                next();
            }
        } else {
            // The operationId is null or ignored
            if (container.config.webServer.enableMocking) {
                (0, _mocking.callMockingServiceFunction)(container, endpoint, req, res, next);
            } else if (container.config.webServer.usePdms) {
                // Do PDMS forwarding
                callPdmsForwarder(container, endpoint, req, res, next);
            } else {
                // No operationId, no PDMS forwarding enabled
                res.set(defaultResponseHeaders).status(501).json({
                    error: 'The endpoint is either not implemented or `operationId` is ignored'
                });
                next();
            }
        }
    };
};

/**
 * Call the service function
 *
 * Executes the call of the service function with the request and response parameters according to the endpoint description.
 * The service function gets the request object and the endpoint descriptor. It must return a Promise, that will be resolved to a normal response.
 * If the result of the service function is rejected it will response with error.
 * Finally calls the `next()` middleware step.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} serviceFun - The service function, that must return a Promise.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
var callServiceFuntion = exports.callServiceFuntion = function callServiceFuntion(container, endpoint, req, res, serviceFun, next) {
    serviceFun(req, endpoint).then(function (result) {
        res.set(result.headers).status(200).send(result.body);
        next();
    }).catch(function (errResult) {
        container.logger.error(_circularJsonEs2.default.stringify(errResult));
        res.set(errResult.headers).status(errResult.status).json(errResult.body);
        next();
    });
};

/**
 * Call the PDMS forwarder service function
 *
 * Executes a synchronous PDMS act, that puts the request to the topic named by the endpoint.uri.
 * The message also containts the `method` and `uri` properties as well as
 * the normalized version of the request object and the endpoint descriptor.
 *
 * The function will respond the result of the PDMS act call, finally calls the `next()` middleware step.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
var callPdmsForwarder = exports.callPdmsForwarder = function callPdmsForwarder(container, endpoint, req, res, next) {
    container.logger.info('PDMS.ACT topic: "' + endpoint.uri + '" method:"' + endpoint.method + '" uri:"' + endpoint.uri + '"');
    container.pdms.act({
        topic: endpoint.uri,
        method: endpoint.method,
        uri: endpoint.uri,
        endpointDesc: endpoint,
        request: {
            user: req.user,
            cookies: req.cookies,
            headers: req.headers,
            parameters: {
                query: req.query,
                uri: req.params
            },
            body: req.body
        }
    }, function (err, resp) {
        if (err) {
            container.logger.info('ERR ' + JSON.stringify(err));
            res.set(_lodash2.default.get(err, 'details.headers', {})).status(_lodash2.default.get(err, 'details.status', 500)).send(_lodash2.default.get(err, 'details.body', err));
        } else {
            if (!(0, _logUtils.isPathBlackListed)(container, endpoint.uri)) {
                container.logger.debug('RES ' + JSON.stringify(resp));
            }
            res.set(resp.headers || {}).status(_lodash2.default.get(resp, 'status', 200)).send(resp.body);
        }
        next();
    });
};