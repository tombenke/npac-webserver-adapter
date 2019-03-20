'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setMiddlewares = exports.addMiddlewares = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var addMiddlewares = exports.addMiddlewares = function addMiddlewares(container, server, middlewares) {

    // Add middlewares, if there is any defined
    if (_lodash2.default.isArray(middlewares)) {
        _lodash2.default.chain(middlewares).filter(function (adderFn) {
            if (_lodash2.default.isFunction(adderFn)) {
                //container.logger.debug(`${adderFn} will be registered as middleware`)
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
};

var setMiddlewares = exports.setMiddlewares = function setMiddlewares(container, server, phase) {
    var middlewares = _lodash2.default.merge({
        preRouting: [],
        postRouting: []
    }, _lodash2.default.cloneDeep(container.config.webServer.middlewares));

    return addMiddlewares(container, server, middlewares[phase]);
};