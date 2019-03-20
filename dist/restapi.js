'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setEndpoints = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _restToolCommon = require('rest-tool-common');

var _circularJsonEs = require('circular-json-es6');

var _circularJsonEs2 = _interopRequireDefault(_circularJsonEs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var makeJsonicFriendly = function makeJsonicFriendly(uri) {
    //return uri.replace(/\{|\}/g, ':')
    return uri.replace(/\{/g, ':').replace(/\}/g, '');
};

var getNonStaticEndpointMap = function getNonStaticEndpointMap(container) {
    // Load services config and service descriptors
    container.logger.info('Load services from ' + container.config.webServer.restApiPath);
    var endpoints = _lodash2.default.filter(_restToolCommon.services.load(container.config.webServer.restApiPath, ''), function (endp) {
        return !_lodash2.default.has(endp, 'methods.GET.static');
    });
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
    return function (req, res, next) {
        container.logger.debug('REQ method:"' + endpoint.method + '" uri:"' + endpoint.uri + '"');

        var serviceImplName = _restToolCommon.services.getImplementation(endpoint.endpointDesc, endpoint.method);
        if (serviceImplName !== null) {
            var serviceFun = _lodash2.default.get(container, serviceImplName);
            if (_lodash2.default.isFunction(serviceFun)) {
                serviceFun(req, endpoint).then(function (result) {
                    res.set(result.headers).status(200).json(result.body);
                    next();
                }).catch(function (errResult) {
                    container.logger.error(_circularJsonEs2.default.stringify(errResult));
                    res.set(errResult.headers).status(errResult.status).json(errResult.body);
                    next();
                });
            }
        } else {
            var responseHeaders = _restToolCommon.services.getResponseHeaders(endpoint.method, endpoint.endpointDesc);
            var responseBody = _restToolCommon.services.getMockResponseBody(endpoint.method, endpoint.endpointDesc) || endpoint;
            res.set(responseHeaders).status(200).json(responseBody);
            next();
        }
    };
};

var setEndpoints = exports.setEndpoints = function setEndpoints(container, server) {
    var endpointMap = getNonStaticEndpointMap(container);
    container.logger.debug('restapi.setEndpoints/endpointMap ' + JSON.stringify(_lodash2.default.map(endpointMap, function (ep) {
        return [ep.method, ep.uri];
    }), null, ''));
    _lodash2.default.map(endpointMap, function (endpoint) {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(endpoint, container));
    });
};