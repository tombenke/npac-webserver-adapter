'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.determineMediaType = exports.getMockingResponse = exports.callMockingServiceFunction = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /**
                                                                                                                                                                                                                                                                   * The mocking module of the webserver adapter.
                                                                                                                                                                                                                                                                   *
                                                                                                                                                                                                                                                                   * This module implements the handler functions that serve mock data from the examples defined under the responses section of the endpoint descriptors
                                                                                                                                                                                                                                                                   *
                                                                                                                                                                                                                                                                   * Used only internally by the adapter.
                                                                                                                                                                                                                                                                   *
                                                                                                                                                                                                                                                                   * @module mocking
                                                                                                                                                                                                                                                                   */


var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Call the generic mocking service function that provides responses to the incoming requests using the examples defined for the endpoint.
 *
 * The function tries to respond the content and representation format that is accepted by the client.
 * If there is no example found with the right media-type, then a `415 Unsupported Media Type` error will be responded.
 *
 * NOTE: Currently a single mime-type value is accepted without weight.
 * TODO: Implement multiple values ordered by weight when find the right example response.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The endpoint descriptor
 * @arg {Object} req - The request object
 * @arg {Object} res - The response object
 * @arg {Function} next - An error-first call-back that the service function must call at the end, to pass the control to the next middleware function.
 *
 * @function
 */
var callMockingServiceFunction = exports.callMockingServiceFunction = function callMockingServiceFunction(container, endpoint, req, res, next) {
    var _getMockingResponse = getMockingResponse(container, endpoint, req),
        status = _getMockingResponse.status,
        headers = _getMockingResponse.headers,
        body = _getMockingResponse.body;

    if (_lodash2.default.isUndefined(body)) {
        res.status(status).send();
    } else {
        res.set(headers).status(status).send(body);
    }

    next();
};

/**
 * Get the mocking response from the endpoint descriptor and from the request parameters.
 *
 * If there is no example found with the right media-type, then a `415 Unsupported Media Type` error will be returned.
 *
 * NOTE: Currently a single mime-type value is accepted without weight.
 * TODO: Implement multiple values ordered by weight when find the right example response.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The endpoint descriptor
 * @arg {Object} req - The request object
 *
 * @function
 */
var getMockingResponse = exports.getMockingResponse = function getMockingResponse(container, endpoint, req) {
    // Determine which media-type the client accepts
    var accept = _lodash2.default.get(req.headers, 'accept', '*/*');

    // Determine the response media-type
    var mediaType = determineMediaType(container, endpoint, accept);

    if (mediaType === null) {
        // Unsupported media-type
        return {
            status: 415
        };
    } else {
        // Get the example of the given media-type
        var examples = _lodash2.default.get(endpoint.responses['200'].examples, mediaType, {});
        var exampleNames = _lodash2.default.keys(examples);
        var emptyExample = { value: undefined };
        var example = exampleNames.length > 0 ? _lodash2.default.get(examples, exampleNames[0], emptyExample) : emptyExample;
        var headers = _extends({}, endpoint.responses['200'].headers, { 'content-type': mediaType

            // Send response
        });if (_lodash2.default.isUndefined(example.value)) {
            // There is no example found
            return {
                status: 404,
                headers: headers
            };
        } else {
            return {
                status: 200,
                headers: headers,
                body: example.value
            };
        }
    }
};

/**
 * Determine the resultant media-type for the response
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The endpoint decriptor object
 * @arg {String} accept - The actual value of the "Accept" header of the request, or `* / *` if not defined.
 *
 * @returns {String | null} The resultant media-type that will be the value of the `Content-Type` header. If the `Accept` header is specific, but it is not supported by the endpoint, then returns with `null`.
 *
 * @function
 */
var determineMediaType = exports.determineMediaType = function determineMediaType(container, endpoint, accept) {
    if (accept !== '*/*') {
        // Check if the expected media-type is supported
        if (_lodash2.default.includes(endpoint.produces, accept)) {
            // Media-type is specific, supported, and there is example for it
            return accept;
        } else {
            // Media-type is specific but not supported
            container.logger.error('The "' + accept + '" media-type is not supported by the ' + endpoint.method + ' ' + endpoint.uri + ' operation');
            return null;
        }
    } else {
        // Accepts anything, so determine the default media-type
        var headers = endpoint.responses['200'].headers;
        var mediaType = endpoint.produces.length > 0 ? endpoint.produces[0] : _lodash2.default.get(headers, 'content-type', 'text/html');
        return mediaType;
    }
};