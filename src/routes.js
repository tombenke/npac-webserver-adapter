//import { ensureLoggedIn } from 'connect-ensure-login'
import path from 'path'
import express from 'express'
import _ from 'lodash'
import { services } from 'rest-tool-common'
import { setEndpoints } from './restapi'

export const setRoutes = (container, server) => {
    // Define further routes
    const config = container.config.webServer

    //set(server, authGuard, container)
    setEndpoints(container, server)

    //const authGuard = ensureLoggedIn('/login.html')
    _.map(services.getAllStaticEndpoints(), staticEndpoint => {
        const contentPath = path.resolve(config.staticContentBasePath, staticEndpoint.contentPath)
        container.logger.debug(`Bind ${contentPath} to ${staticEndpoint.uriTemplate} as static content service`)
        server.use(staticEndpoint.uriTemplate, /*authGuard,*/ express.static(contentPath))
    })
}
