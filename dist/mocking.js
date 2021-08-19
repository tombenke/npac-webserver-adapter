"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.determineMediaType = exports.getMockingResponse = exports.callMockingServiceFunction = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
var callMockingServiceFunction = function callMockingServiceFunction(container, endpoint, req, res, next) {
  var _getMockingResponse = getMockingResponse(container, endpoint, req),
      status = _getMockingResponse.status,
      headers = _getMockingResponse.headers,
      body = _getMockingResponse.body;

  if (_lodash["default"].isUndefined(body)) {
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


exports.callMockingServiceFunction = callMockingServiceFunction;

var getMockingResponse = function getMockingResponse(container, endpoint, req) {
  // Determine which media-type the client accepts
  var accept = _lodash["default"].get(req.headers, 'accept', '*/*'); // Determine the response media-type


  var mediaType = determineMediaType(container, endpoint, accept);

  if (mediaType === null) {
    // Unsupported media-type
    return {
      status: 415
    };
  } else {
    // Get the example of the given media-type
    var examples = _lodash["default"].get(endpoint.responses['200'].examples, mediaType, {});

    var exampleNames = _lodash["default"].keys(examples);

    var emptyExample = {
      value: undefined
    };
    var example = exampleNames.length > 0 ? _lodash["default"].get(examples, exampleNames[0], emptyExample) : emptyExample;

    var headers = _objectSpread(_objectSpread({}, endpoint.responses['200'].headers), {}, {
      'content-type': mediaType
    }); // Send response


    if (_lodash["default"].isUndefined(example.value)) {
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


exports.getMockingResponse = getMockingResponse;

var determineMediaType = function determineMediaType(container, endpoint, accept) {
  if (accept !== '*/*') {
    // Check if the expected media-type is supported
    if (_lodash["default"].includes(endpoint.produces, accept)) {
      // Media-type is specific, supported, and there is example for it
      return accept;
    } else {
      // Media-type is specific but not supported
      container.logger.error("The \"".concat(accept, "\" media-type is not supported by the ").concat(endpoint.method, " ").concat(endpoint.uri, " operation"));
      return null;
    }
  } else {
    // Accepts anything, so determine the default media-type
    var headers = endpoint.responses['200'].headers;
    var mediaType = endpoint.produces.length > 0 ? endpoint.produces[0] : _lodash["default"].get(headers, 'content-type', 'text/html');
    return mediaType;
  }
};

exports.determineMediaType = determineMediaType;