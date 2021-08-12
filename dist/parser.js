'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.setParsers = undefined;

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressXmlBodyparser = require('express-xml-bodyparser');

var _expressXmlBodyparser2 = _interopRequireDefault(_expressXmlBodyparser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Setup body parsers of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 *
 * @function
 */
/**
 * The body parser module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module bodyParser
 */

var setParsers = exports.setParsers = function setParsers(container, server) {
    var _container$config$web = container.config.webServer.bodyParser,
        raw = _container$config$web.raw,
        json = _container$config$web.json,
        urlencoded = _container$config$web.urlencoded,
        xml = _container$config$web.xml;


    if (json) {
        server.use(_express2.default.json()); // for parsing application/json
    }

    if (urlencoded) {
        server.use(_express2.default.urlencoded({ extended: true })); // get information from html forms
    }

    if (xml) {
        server.use((0, _expressXmlBodyparser2.default)()); // for parsing text/xml
    }

    if (raw) {
        server.use(_express2.default.raw({ type: '*/*' })); // for parsing text/xml
    }
};