//import express from 'express'
//import { ensureLoggedIn } from 'connect-ensure-login'
import { set } from './restapi'

exports.set = function(server, container) {
    // Define further routes
    // TODO: Add static route to swagger.json
    const config = container.config.webServer
    set(server, container)
}
