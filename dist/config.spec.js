'use strict';

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chai = require('chai');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

before(function (done) {
    done();
});
after(function (done) {
    done();
});

describe('server/config', function () {
    it('defaults', function (done) {
        var expected = {
            webServer: {
                logBlackList: [],
                port: 3007,
                useCompression: false,
                useResponseTime: false,
                usePdms: false,
                pdmsTopic: 'easer',
                middlewares: { preRouting: [], postRouting: [] },
                restApiPath: _path2.default.resolve(),
                staticContentBasePath: _path2.default.resolve(),
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

        var defaults = _config2.default;
        (0, _chai.expect)(defaults).to.eql(expected);
        done();
    });
});