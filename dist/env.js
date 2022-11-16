'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getIntEnv = exports.getBoolEnv = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getBoolEnv = exports.getBoolEnv = function getBoolEnv(envParName, defaultValue) {
    return _lodash2.default.get(process.env, envParName, '' + defaultValue) === 'true';
};

var getIntEnv = exports.getIntEnv = function getIntEnv(envParName, defaultValue) {
    var strValue = _lodash2.default.get(process.env, envParName, '' + defaultValue);
    var parsedValue = parseInt(strValue, 10);
    if (isNaN(parsedValue)) {
        return 0;
    }
    return parsedValue;
};