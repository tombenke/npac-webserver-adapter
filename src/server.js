/**
 * The server module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module server
 */
import express from 'express'
import expressWinston from 'express-winston'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import session from 'express-session'
import compression from 'compression'
import { setMiddlewares } from './middlewares'
import { setRoutes } from './routes'
import flash from 'connect-flash'
import responseTime from 'response-time'
import { ignoreRouteLogging } from './logUtils'

/*
TODO: Make HTTPS available too
const fs from 'fs'
const https from 'https'
*/
let httpInstance = null

/**
 * Setup and start the server instance
 *
 * @arg {Object} container - The container context
 * @arg {Object} api - The array of REST API endpoints
 *
 * @return {Promise} A promise, that resolves to the server instance
 *
 * @function
 * @async
 */
export const startupServer = (container, api) => {
    const config = container.config
    container.logger.debug(`webServer config:${JSON.stringify(config)}`)
    container.logger.info(`Start up webServer`)

    // Create a new Express application.
    const server = express()

    // Configure the middlewares
    server.use(expressWinston.logger({ transports: [container.logger], ignoreRoute: ignoreRouteLogging(container) }))
    server.use(cookieParser()) // read cookies (needed for auth)
    server.use(bodyParser.json()) // for parsing application/json
    server.use(bodyParser.urlencoded({ extended: true })) // get information from html forms

    // Use compression if enabled
    if (config.webServer.useCompression) {
        container.logger.info('Use compression')
        server.use(compression())
    }

    // Measure response time if enabled, and put x-response-time header into the response
    if (config.webServer.useResponseTime) {
        server.use(responseTime())
    }

    // required for passport
    server.use(session({ secret: 'larger is dropped once', resave: false, saveUninitialized: false })) // session secret
    /* TODO: Implement authorization
        auth.loadUsers(container),
        server.use(auth.initialize())
        server.use(auth.session()) // persistent login sessions
    */
    server.use(flash()) // use connect-flash for flash messages stored in session

    setMiddlewares(container, server, 'preRouting')
    setRoutes(container, server, api)
    setMiddlewares(container, server, 'postRouting')

    /* TODO: Set configuration parameters for HTTPS and enable it
    // Start the server to listen, either a HTTPS or an HTTP one:

    https.createServer({
          key: fs.readFileSync('key.pem'),
          cert: fs.readFileSync('cert.pem'),
          passphrase: 'SomePassPhrase12345'
        }, server).listen(4443)
    */

    return new Promise((resolve, reject) => {
        httpInstance = server.listen(config.webServer.port, () => {
            container.logger.info(`Express server listening on port ${config.webServer.port}`)
            resolve(httpInstance)
        })
    })
}

/**
 * Shut down the server instance
 *
 * @arg {Object} container - The container context
 *
 * @function
 */
export const shutdownServer = (container) => {
    httpInstance.close()
    container.logger.info('Shut down webServer')
}
