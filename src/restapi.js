/**
 * The restapi module of the webserver adapter.
 *
 * This module implements the handler functions that serve the incoming endpoint calls
 *
 * Used only internally by the adapter.
 *
 * @module restapi
 */
import _ from 'lodash'
import CircularJSON from 'circular-json-es6'

const defaultResponseHeaders = {
    'Content-Type': 'application/json'
}

const defaultResponseBody = {
    error: 'The endpoint is not implemented'
}

/**
 * Make handler function that serves the incoming API calls
 *
 * This is a currying function, that returns with a function which will handle the given API call.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
const mkHandlerFun = (container, endpoint) => (req, res, next) => {
    const { uri, method, operationId } = endpoint
    container.logger.debug(`REQ method:"${method}" uri:"${uri}"`)

    if (operationId !== null) {
        const serviceFun = _.get(container, operationId)
        if (_.isFunction(serviceFun)) {
            serviceFun(req, endpoint)
                .then(result => {
                    res.set(result.headers)
                        .status(200)
                        .json(result.body)
                    next()
                })
                .catch(errResult => {
                    container.logger.error(CircularJSON.stringify(errResult))
                    res.set(errResult.headers)
                        .status(errResult.status)
                        .json(errResult.body)
                    next()
                })
        }
    } else {
        // TODO: place the default response here if there is any
        const responseHeaders = defaultResponseHeaders
        const responseBody = defaultResponseBody
        res.set(responseHeaders)
            .status(501)
            .json(responseBody)
        next()
    }
}

/**
 * Setup the non-static endpoints of the web server
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The server object, that the endpoints will be added to
 * @arg {Array} endpoints - The array of endpoint descriptor objects
 *
 * @function
 */
export const setEndpoints = (container, server, endpoints) => {
    container.logger.debug(
        `restapi.setEndpoints/endpointMap ${JSON.stringify(_.map(endpoints, ep => [ep.method, ep.uri]), null, '')}`
    )
    _.map(endpoints, endpoint => {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(container, endpoint))
    })
}
