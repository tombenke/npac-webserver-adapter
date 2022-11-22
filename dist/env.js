"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getIntEnv = exports.getBoolEnv = void 0;
var _lodash = _interopRequireDefault(require("lodash"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const getBoolEnv = (envParName, defaultValue) => _lodash.default.get(process.env, envParName, `${defaultValue}`) === 'true';
exports.getBoolEnv = getBoolEnv;
const getIntEnv = (envParName, defaultValue) => {
  const strValue = _lodash.default.get(process.env, envParName, `${defaultValue}`);
  const parsedValue = parseInt(strValue, 10);
  if (isNaN(parsedValue)) {
    return 0;
  }
  return parsedValue;
};
exports.getIntEnv = getIntEnv;