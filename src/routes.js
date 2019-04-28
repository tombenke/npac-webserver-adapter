//import { ensureLoggedIn } from 'connect-ensure-login'
import path from 'path'
import express from 'express'
import _ from 'lodash'
import { setEndpoints } from './restapi'

export const setRoutes = (container, server, api) => {
    // Setup static endpoints
    _.map(api.getStaticEndpoints(), staticEndpoint => {
        const contentPath = path.resolve(
            container.config.webServer.staticContentBasePath,
            staticEndpoint.static.contentPath
        )
        container.logger.debug(`Bind ${contentPath} to ${staticEndpoint.uri} as static content service`)
        server.use(staticEndpoint.uri, /*authGuard,*/ express.static(contentPath))
    })
    // Setup non-static endpoints
    setEndpoints(container, server, api.getNonStaticEndpoints())
}
