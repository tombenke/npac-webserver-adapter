'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setRoutes = undefined;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _serveIndex = require('serve-index');

var _serveIndex2 = _interopRequireDefault(_serveIndex);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _restapi = require('./restapi');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Setup the static and non-static endpoints of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 * @arg {Object} api - The API descriptor object
 *
 * @function
 */
var setRoutes = exports.setRoutes = function setRoutes(container, server, api) {
    var _container$config$web = container.config.webServer,
        staticContentBasePath = _container$config$web.staticContentBasePath,
        enableMocking = _container$config$web.enableMocking,
        ignoreApiOperationIds = _container$config$web.ignoreApiOperationIds;

    // Setup static endpoints

    _lodash2.default.map(api.getStaticEndpoints(), function (staticEndpoint) {
        var contentPath = _path2.default.resolve(staticContentBasePath, staticEndpoint.static.contentPath);

        container.logger.debug('Bind ' + contentPath + ' to ' + staticEndpoint.uri + ' as static content service');
        server.use(staticEndpoint.uri, /*TODO: authGuard,*/_express2.default.static(contentPath), (0, _serveIndex2.default)(contentPath));
    });

    // Setup non-static endpoints
    if (enableMocking) {
        if (!ignoreApiOperationIds) {
            container.logger.warn('Mocking is enabled, but `ignoreApiOperationIds` is `false`.');
        }
        (0, _restapi.setEndpoints)(container, server, api.getNonStaticEndpoints({ includeExamples: true }));
    } else {
        (0, _restapi.setEndpoints)(container, server, api.getNonStaticEndpoints());
    }
}; /**
    * The routes module of the webserver adapter.
    *
    * Used only internally by the adapter.
    *
    * @module routes
    */

//TODO: import { ensureLoggedIn } from 'connect-ensure-login'