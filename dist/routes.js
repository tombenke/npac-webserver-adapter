"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setRoutes = void 0;
var _path = _interopRequireDefault(require("path"));
var _express = _interopRequireDefault(require("express"));
var _serveIndex = _interopRequireDefault(require("serve-index"));
var _lodash = _interopRequireDefault(require("lodash"));
var _restapi = require("./restapi");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * The routes module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module routes
 */

//TODO: import { ensureLoggedIn } from 'connect-ensure-login'

/**
 * Setup the static and non-static endpoints of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 * @arg {Object} api - The API descriptor object
 *
 * @function
 */
const setRoutes = (container, server, api) => {
  const {
    staticContentBasePath,
    enableMocking,
    ignoreApiOperationIds
  } = container.config.webServer;

  // Setup static endpoints
  _lodash.default.map(api.getStaticEndpoints(), staticEndpoint => {
    const contentPath = _path.default.resolve(staticContentBasePath, staticEndpoint.static.contentPath);
    container.logger.debug(`Bind ${contentPath} to ${staticEndpoint.uri} as static content service`);
    server.use(staticEndpoint.uri, /*TODO: authGuard,*/_express.default.static(contentPath), (0, _serveIndex.default)(contentPath));
  });

  // Setup non-static endpoints
  if (enableMocking) {
    if (!ignoreApiOperationIds) {
      container.logger.warn('Mocking is enabled, but `ignoreApiOperationIds` is `false`.');
    }
    (0, _restapi.setEndpoints)(container, server, api.getNonStaticEndpoints({
      includeExamples: true
    }));
  } else {
    (0, _restapi.setEndpoints)(container, server, api.getNonStaticEndpoints());
  }
};
exports.setRoutes = setRoutes;