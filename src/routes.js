//import { ensureLoggedIn } from 'connect-ensure-login'
import path from 'path'
import express from 'express'
import _ from 'lodash'
import { loadOas } from 'rest-tool-common'
import { setEndpoints } from './restapi'

// TODO: Place this config under the webserver config section
const oasConfig = {
    parse: {
        yaml: {
            allowEmpty: false // Don't allow empty YAML files
        },
        resolve: {
            file: true // Resolve local file references
        }
    }
}

export const setRoutes = (container, server) => {
    const config = container.config.webServer
    // Load the Swagger/OpenAPI format API definition
    const oasFile = path.resolve(config.restApiPath)
    container.logger.info(`Load endpoints from ${oasFile}`)
    return loadOas(oasFile, oasConfig)
        .then(api => {
            // Setup static endpoints
            _.map(api.getStaticEndpoints(), staticEndpoint => {
                const contentPath = path.resolve(config.staticContentBasePath, staticEndpoint.static.contentPath)
                container.logger.debug(`Bind ${contentPath} to ${staticEndpoint.uri} as static content service`)
                server.use(staticEndpoint.uri, /*authGuard,*/ express.static(contentPath))
            })
            // Setup non-static endpoints
            setEndpoints(container, server, api.getNonStaticEndpoints())
        })
        .catch(err => {
            container.logger.error(`API loading error ${err}`)
        })
}
