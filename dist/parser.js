"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setParsers = void 0;
var _express = _interopRequireDefault(require("express"));
var _expressXmlBodyparser = _interopRequireDefault(require("express-xml-bodyparser"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * The body parser module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module bodyParser
 */

/**
 * Setup body parsers of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 *
 * @function
 */
const setParsers = (container, server) => {
  const {
    raw,
    json,
    urlencoded,
    xml
  } = container.config.webServer.bodyParser;
  if (json) {
    server.use(_express.default.json()); // for parsing application/json
  }

  if (urlencoded) {
    server.use(_express.default.urlencoded({
      extended: true
    })); // get information from html forms
  }

  if (xml) {
    server.use((0, _expressXmlBodyparser.default)()); // for parsing text/xml
  }

  if (raw) {
    server.use(_express.default.raw({
      type: '*/*'
    })); // for parsing text/xml
  }
};
exports.setParsers = setParsers;