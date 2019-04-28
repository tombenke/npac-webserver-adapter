import path from 'path'
import _ from 'lodash'
import defaults from './config'
import { loadOas } from 'rest-tool-common'
import { startupServer, shutdownServer } from './server'

const startup = (container, next) => {
    // Merges the defaults with the config coming from the outer world
    const config = _.merge({}, defaults, { webServer: container.config.webServer || {} })

    // Load the Swagger/OpenAPI format API definition
    const oasFile = path.resolve(config.webServer.restApiPath)
    container.logger.info(`Load endpoints from ${oasFile}`)
    return loadOas(oasFile, config.webServer.oasConfig)
        .catch(err => {
            container.logger.error(`API loading error ${err}`)
        })
        .then(api => {
            startupServer(container, api).then(httpInstance => {
                // Call next setup function with the context extension
                next(null, {
                    webServer: {
                        server: httpInstance
                    }
                })
            })
        })
}

const shutdown = (container, next) => {
    shutdownServer(container)
    next(null, null)
}

module.exports = {
    defaults: defaults,
    startup: startup,
    shutdown: shutdown
}
