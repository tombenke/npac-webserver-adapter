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
import { isPathBlackListed } from './logUtils'
import { callMockingServiceFunction } from './mocking'

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
    const basePath = container.config.webServer.basePath === '/' ? '' : container.config.webServer.basePath
    container.logger.debug(
        `restapi.setEndpoints/endpointMap ${JSON.stringify(
            _.map(endpoints, ep => [ep.method, basePath + ep.jsfUri]),
            null,
            ''
        )}`
    )
    _.map(endpoints, endpoint => {
        server[endpoint.method](basePath + endpoint.jsfUri, mkHandlerFun(container, endpoint))
    })
}
const defaultResponseHeaders = {
    'Content-Type': 'application/json'
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
    const { ignoreApiOperationIds } = container.config.webServer

    if (!isPathBlackListed(container, uri)) {
        container.logger.debug(`REQ method:"${method}" uri:"${uri}"`)
    }

    if (!ignoreApiOperationIds && operationId !== null) {
        // operationId is defined in the endpoint descriptor
        const serviceFun = _.get(container, operationId, null)
        if (_.isFunction(serviceFun)) {
            callServiceFuntion(container, endpoint, req, res, serviceFun, next)
        } else {
            res.set(defaultResponseHeaders)
                .status(501)
                .json({
                    error: 'The operationId refers to a non-existing service function'
                })
            next()
        }
    } else {
        // The operationId is null or ignored
        if (container.config.webServer.enableMocking) {
            callMockingServiceFunction(container, endpoint, req, res, next)
        } else if (container.config.webServer.usePdms) {
            // Do PDMS forwarding
            callPdmsForwarder(container, endpoint, req, res, next)
        } else {
            // No operationId, no PDMS forwarding enabled
            res.set(defaultResponseHeaders)
                .status(501)
                .json({
                    error: 'The endpoint is either not implemented or `operationId` is ignored'
                })
            next()
        }
    }
}

/**
 * Call the service function
 *
 * Executes the call of the service function with the request and response parameters according to the endpoint description.
 * The service function gets the request object and the endpoint descriptor. It must return a Promise, that will be resolved to a normal response.
 * If the result of the service function is rejected it will response with error.
 * Finally calls the `next()` middleware step.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} serviceFun - The service function, that must return a Promise.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
export const callServiceFuntion = (container, endpoint, req, res, serviceFun, next) => {
    serviceFun(req, endpoint)
        .then(result => {
            res.set(result.headers)
                .status(200)
                .send(result.body)
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

/**
 * Call the PDMS forwarder service function
 *
 * Executes a synchronous PDMS act, that puts the request to the topic named by the `config.webServer.pdmsTopic` parameter.
 * The message also containts the `method` and `uri` properties as well as
 * the normalized version of the request object and the endpoint descriptor.
 *
 * The function will respond the result of the PDMS act call, finally calls the `next()` middleware step.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
export const callPdmsForwarder = (container, endpoint, req, res, next) => {
    const topic = container.config.webServer.pdmsTopic
    container.logger.info(`PDMS.ACT topic: "${topic}" method:"${endpoint.method}" uri:"${endpoint.uri}"`)
    container.pdms.act(
        {
            topic: topic,
            method: endpoint.method,
            uri: endpoint.uri,
            endpointDesc: endpoint,
            request: {
                user: req.user,
                cookies: req.cookies,
                headers: req.headers,
                parameters: {
                    query: req.query,
                    uri: req.params
                },
                body: req.body
            }
        },
        (err, resp) => {
            if (err) {
                container.logger.info(`ERR ${JSON.stringify(err)}`)
                res.set(_.get(err, 'details.headers', {}))
                    .status(_.get(err, 'details.status', 500))
                    .send(_.get(err, 'details.body', err))
            } else {
                if (!isPathBlackListed(container, endpoint.uri)) {
                    container.logger.debug(`RES ${JSON.stringify(resp)}`)
                }
                res.set(resp.headers || {})
                    .status(_.get(resp, 'status', 200))
                    .send(resp.body)
            }
            next()
        }
    )
}
