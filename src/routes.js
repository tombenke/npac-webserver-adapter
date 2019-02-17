//import { ensureLoggedIn } from 'connect-ensure-login'
import path from 'path'
import express from 'express'
import _ from 'lodash'
import { services } from 'rest-tool-common'
import { set } from './restapi'

exports.set = function(server, container) {
    // Define further routes
    const config = container.config.webServer

    //set(server, authGuard, container)
    set(server, container)

    //const authGuard = ensureLoggedIn('/login.html')
    _.map(services.getAllStaticEndpoints(), staticEndpoint => {
        const contentPath = path.resolve(config.staticContentBasePath, staticEndpoint.contentPath)
        container.logger.info(`Bind ${contentPath} to ${staticEndpoint.uriTemplate} as static content service`)
        server.use(staticEndpoint.uriTemplate, /*authGuard,*/ express.static(contentPath))
    })
}
