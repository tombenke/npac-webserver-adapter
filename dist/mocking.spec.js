"use strict";

var _path = _interopRequireDefault(require("path"));

var _lodash = _interopRequireDefault(require("lodash"));

var _chai = require("chai");

var _mocking = require("./mocking");

var _restToolCommon = require("rest-tool-common");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

describe('mocking', function () {
  var testApi = {};
  var endpoints = [];

  var getEndpoint = function getEndpoint(method, path) {
    return _lodash["default"].find(endpoints, function (endpoint) {
      return endpoint.method === method && endpoint.uri === path;
    });
  };

  before(function (done) {
    (0, _restToolCommon.loadOas)(_path["default"].resolve('src/fixtures/endpoints/api.yml'))["catch"](function (err) {
      console.log("API loading error ".concat(err));
    }).then(function (api) {
      testApi = api;
      endpoints = testApi.getEndpoints({
        includeExamples: true
      });
      done();
    });
  });
  var dummyContainer = {
    logger: console
  };
  it('#determineMediaType', function (done) {
    _lodash["default"].map([['*/*', 'application/json'], ['application/json', 'application/json'], ['text/plain', 'text/plain'], ['invalid_mediatype', null]], function (mapping) {
      return (0, _chai.expect)((0, _mocking.determineMediaType)(dummyContainer, getEndpoint('get', '/test/endpoint-with-examples'), mapping[0])).to.equal(mapping[1]);
    });

    done();
  });
});