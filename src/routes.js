/**
 * The routes module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module routes
 */

//TODO: import { ensureLoggedIn } from 'connect-ensure-login'
import path from 'path'
import express from 'express'
import serveIndex from 'serve-index'
import _ from 'lodash'
import { setEndpoints } from './restapi'

/**
 * Setup the static and non-static endpoints of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 * @arg {Object} api - The API descriptor object
 *
 * @function
 */
export const setRoutes = (container, server, api) => {
    const { staticContentBasePath, enableMocking, ignoreApiOperationIds } = container.config.webServer

    // Setup static endpoints
    _.map(api.getStaticEndpoints(), staticEndpoint => {
        const contentPath = path.resolve(staticContentBasePath, staticEndpoint.static.contentPath)

        container.logger.debug(`Bind ${contentPath} to ${staticEndpoint.uri} as static content service`)
        server.use(staticEndpoint.uri, /*TODO: authGuard,*/ express.static(contentPath), serveIndex(contentPath))
    })

    // Setup non-static endpoints
    if (enableMocking) {
        if (!ignoreApiOperationIds) {
            container.logger.warning('Mocking is enabled, but `ignoreApiOperationIds` is `false`.')
        }
        setEndpoints(container, server, api.getNonStaticEndpoints({ includeExamples: true }))
    } else {
        setEndpoints(container, server, api.getNonStaticEndpoints())
    }
}
