"use strict";

var _path = _interopRequireDefault(require("path"));
var _lodash = _interopRequireDefault(require("lodash"));
var _chai = require("chai");
var _mocking = require("./mocking");
var _restToolCommon = require("rest-tool-common");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
describe('mocking', () => {
  let testApi = {};
  let endpoints = [];
  const getEndpoint = (method, path) => _lodash.default.find(endpoints, endpoint => endpoint.method === method && endpoint.uri === path);
  before(done => {
    (0, _restToolCommon.loadOas)(_path.default.resolve('src/fixtures/endpoints/api.yml')).catch(err => {
      console.log(`API loading error ${err}`);
    }).then(api => {
      testApi = api;
      endpoints = testApi.getEndpoints({
        includeExamples: true
      });
      done();
    });
  });
  const dummyContainer = {
    logger: console
  };
  it('#determineMediaType', done => {
    _lodash.default.map([['*/*', 'application/json'], ['application/json', 'application/json'], ['text/plain', 'text/plain'], ['invalid_mediatype', null]], mapping => (0, _chai.expect)((0, _mocking.determineMediaType)(dummyContainer, getEndpoint('get', '/test/endpoint-with-examples'), mapping[0])).to.equal(mapping[1]));
    done();
  });
});