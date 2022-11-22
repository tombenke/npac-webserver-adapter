"use strict";

var _path = _interopRequireDefault(require("path"));
var _chai = require("chai");
var _config = _interopRequireDefault(require("./config"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
before(done => {
  done();
});
after(done => {
  done();
});
describe('server/config', () => {
  it('defaults', done => {
    const expected = {
      webServer: {
        logBlackList: [],
        port: 3007,
        useCompression: false,
        useResponseTime: false,
        useMessaging: false,
        messagingRequestTimeout: 2000,
        topicPrefix: 'easer',
        middlewares: {
          preRouting: [],
          postRouting: []
        },
        restApiPath: _path.default.resolve(),
        staticContentBasePath: _path.default.resolve(),
        ignoreApiOperationIds: false,
        enableMocking: false,
        basePath: '/',
        oasConfig: {
          parse: {
            yaml: {
              allowEmpty: false
            },
            resolve: {
              file: true
            }
          }
        },
        bodyParser: {
          raw: true,
          json: false,
          xml: false,
          urlencoded: false
        }
      }
    };
    const defaults = _config.default;
    (0, _chai.expect)(defaults).to.eql(expected);
    done();
  });
});