'use strict';

var _chai = require('chai');

var _env = require('./env');

before(function (done) {
    done();
});
after(function (done) {
    done();
});

describe('server/config', function () {
    it('getBoolEnv', function (done) {
        delete process.env.TEST;
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(false);
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', true)).to.equal(true);

        process.env.TEST = '';
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(false);
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', true)).to.equal(false);

        process.env.TEST = 'x42';
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(false);
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', true)).to.equal(false);

        process.env.TEST = 'false';
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(false);
        process.env.TEST = 'true';
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(true);

        process.env.TEST = 'false';
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', false)).to.equal(false);
        (0, _chai.expect)((0, _env.getBoolEnv)('TEST', true)).to.equal(false);
        done();
    });

    it('getIntEnv', function (done) {
        delete process.env.TEST;
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', 42)).to.equal(42);
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', '42')).to.equal(42);

        process.env.TEST = '';
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', 42)).to.equal(0);
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', '42')).to.equal(0);

        process.env.TEST = '24';
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', 42)).to.equal(24);
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', '42')).to.equal(24);

        process.env.TEST = 'xy24';
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', 42)).to.equal(0);
        (0, _chai.expect)((0, _env.getIntEnv)('TEST', '42')).to.equal(0);

        done();
    });
});