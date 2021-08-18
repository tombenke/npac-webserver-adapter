"use strict";

var _chai = require("chai");

var _logUtils = require("./logUtils");

describe('logUtils', function () {
  var blackListStr = '/health,/customers,/customers/.*,/currencies/[a-zA-Z]{3}$';
  var blackList = ['/health', '/customers', '/customers/.*', '/currencies/[a-zA-Z]{3}$'];
  var container = {
    config: {
      webServer: {
        logBlackList: blackList
      }
    }
  };
  it('getLogBlackList', function (done) {
    (0, _chai.expect)((0, _logUtils.getLogBlackList)(null)).to.eql([]);
    (0, _chai.expect)((0, _logUtils.getLogBlackList)('')).to.eql([]);
    (0, _chai.expect)((0, _logUtils.getLogBlackList)('/health')).to.eql(['/health']);
    (0, _chai.expect)((0, _logUtils.getLogBlackList)(blackListStr)).to.eql(blackList);
    done();
  });
  it('ignoreRouteLogging', function (done) {
    (0, _chai.expect)((0, _logUtils.ignoreRouteLogging)(container)({
      path: '/health'
    }, null)).to.be["true"];
    (0, _chai.expect)((0, _logUtils.ignoreRouteLogging)(container)({
      path: '/currencies/USD'
    }, null)).to.be["true"];
    (0, _chai.expect)((0, _logUtils.ignoreRouteLogging)(container)({
      path: '/currencies/USA_DOLLAR'
    }, null)).to.be["false"];
    done();
  });
  it('isPathBlackListed', function (done) {
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/health')).to.be["true"];
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/users')).to.be["false"];
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/customers/123fsfs-434a42g-13g1j1-32kk3l4')).to.be["true"];
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/currencies/EUR')).to.be["true"];
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/currencies/EU')).to.be["false"];
    (0, _chai.expect)((0, _logUtils.isPathBlackListed)(container, '/currencies/EURO')).to.be["false"];
    done();
  });
});