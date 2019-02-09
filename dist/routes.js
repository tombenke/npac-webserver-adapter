'use strict';

var _restapi = require('./restapi');

exports.set = function (server, container) {
    // Define further routes
    //const config = container.config.webServer
    (0, _restapi.set)(server, container);
}; //import express from 'express'
//import { ensureLoggedIn } from 'connect-ensure-login'