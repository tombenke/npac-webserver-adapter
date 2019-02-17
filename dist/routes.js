'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _restToolCommon = require('rest-tool-common');

var _restapi = require('./restapi');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.set = function (server, container) {
    // Define further routes
    var config = container.config.webServer;

    //set(server, authGuard, container)
    (0, _restapi.set)(server, container);

    //const authGuard = ensureLoggedIn('/login.html')
    _lodash2.default.map(_restToolCommon.services.getAllStaticEndpoints(), function (staticEndpoint) {
        var contentPath = _path2.default.resolve(config.staticContentBasePath, staticEndpoint.contentPath);
        container.logger.info('Bind ' + contentPath + ' to ' + staticEndpoint.uriTemplate + ' as static content service');
        server.use(staticEndpoint.uriTemplate, /*authGuard,*/_express2.default.static(contentPath));
    });
}; //import { ensureLoggedIn } from 'connect-ensure-login'