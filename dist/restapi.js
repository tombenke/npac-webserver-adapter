'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.set = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _restToolCommon = require('rest-tool-common');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getEndpointMap = function getEndpointMap(container) {
    var makeJsonicFriendly = function makeJsonicFriendly(uri) {
        //return uri.replace(/\{|\}/g, ':')
        return uri.replace(/\{/g, ':').replace(/\}/g, '');
    };

    // Load services config and service descriptors
    var endpoints = _restToolCommon.services.load(container.config.webServer.restApiPath, '');
    return _lodash2.default.flatMap(endpoints, function (endpoint) {
        var uri = endpoint.uriTemplate;
        var methods = endpoint.methodList;
        return _lodash2.default.map(methods, function (method) {
            return {
                method: method.methodName.toLowerCase(),
                uri: uri,
                jsfUri: makeJsonicFriendly(uri),
                endpointDesc: endpoint
            };
        });
    });
};

var mkHandlerFun = function mkHandlerFun(endpoint, container) {
    return function (req, res) {
        container.logger.info('REQ method:"' + endpoint.method + '" uri:"' + endpoint.uri + '"');

        var serviceImplName = _restToolCommon.services.getImplementation(endpoint.endpointDesc, endpoint.method);
        if (serviceImplName !== null) {
            var serviceFun = _lodash2.default.get(container, serviceImplName);
            if (_lodash2.default.isFunction(serviceFun)) {
                serviceFun(req, endpoint).then(function (result) {
                    res.set(result.headers).status(200).json(result.body);
                }).catch(function (errResult) {
                    container.logger.error(JSON.stringify(errResult));
                    res.set(errResult.headers).status(errResult.status).json(errResult.body);
                });
            }
        } else {
            var responseHeaders = _restToolCommon.services.getResponseHeaders(endpoint.method, endpoint.endpointDesc);
            var responseBody = _restToolCommon.services.getMockResponseBody(endpoint.method, endpoint.endpointDesc) || endpoint;
            res.set(responseHeaders).status(200).json(responseBody);
        }
    };
};

var set = exports.set = function set(server, container) {
    var endpointMap = getEndpointMap(container);
    container.logger.info('restapi.set/endpointMap ' + JSON.stringify(_lodash2.default.map(endpointMap, function (ep) {
        return [ep.method, ep.uri];
    }), null, ''));
    _lodash2.default.map(endpointMap, function (endpoint) {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(endpoint, container));
    });
};