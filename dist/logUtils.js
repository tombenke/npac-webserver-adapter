'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPathBlackListed = exports.ignoreRouteLogging = exports.getLogBlackList = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Make an array of strings out of a string that holds a comma-selarated list of URIs.
 *
 * @arg {String} pathsToSkipLogging - The string that contains the comma-separated list of URIs that should not be logged.
 *
 * @return {Array} - The array of URI strings
 *
 * @function
 */
var getLogBlackList = exports.getLogBlackList = function getLogBlackList(pathsToSkipLogging) {
  return !_lodash2.default.isUndefined(pathsToSkipLogging) && _lodash2.default.isString(pathsToSkipLogging) ? pathsToSkipLogging === '' ? [] : _lodash2.default.split(pathsToSkipLogging, ',') : [];
};

/**
 * Tells if the path of the given request is on the blacklist, so it should be ignored for logging
 *
 * It is a curried function, that first gets the container object, that holds the blacklist in the configuration.
 * It returns a function that the winston logger can use via its `ignoreRoute` feature.
 *
 * @arg {Object} container - The container context
 * @arg {Object} req - The request object. The function uses only its `path` property.
 * @arg {Object} res - The response object. Not used by this function.
 *
 * @returns {Boolean} Returns `true` if the path matches any of the blaclisted patterns, `false` otherwise.
 *
 * @function
 */
/**
 * Helper functions required for logging
 *
 * @module logUtils
 */
var ignoreRouteLogging = exports.ignoreRouteLogging = function ignoreRouteLogging(container) {
  return function (req, res) {
    return isPathBlackListed(container, req.path);
  };
};

/**
 * Tells if the path is blacklisted
 *
 * @arg {Object} container - The container context
 * @arg {String} path - The path to check if that matches any of the patterns listen on the blacklist
 *
 * @returns {Boolean} Returns `true` if the path matches any of the blaclisted patterns, `false` otherwise.
 *
 * @function
 */
var isPathBlackListed = exports.isPathBlackListed = function isPathBlackListed(container, path) {
  return !_lodash2.default.isUndefined(_lodash2.default.find(container.config.webServer.logBlackList, function (it) {
    return path.match(new RegExp(it));
  }));
};