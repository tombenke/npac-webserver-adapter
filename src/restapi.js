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
import { callMockingServiceFunction, getMockingResponse } from './mocking'

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
            _.map(endpoints, (ep) => [ep.method, basePath + ep.jsfUri]),
            null,
            ''
        )}`
    )

    // Setup endpoints
    _.map(endpoints, (endpoint) => {
        server[endpoint.method](basePath + endpoint.jsfUri, mkHandlerFun(container, endpoint))
        container.logger.debug(`Add handler function to server[${endpoint.method}](${basePath + endpoint.jsfUri})`)
    })
}
const defaultResponseHeaders = {
    'Content-Type': 'application/json'
}

/**
 * Make a valid topic name out of the endpoint
 *
 * @arg {Object} endpoint - The endpoint descriptor object
 *
 * @return {String} - A valid messaging topic name
 *
 * @function
 */
const getTopicName = (endpoint, topicPrefix) => {
    return `${topicPrefix}.${endpoint.method}_${endpoint.uri}`
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
    const { ignoreApiOperationIds, enableMocking, useMessaging } = container.config.webServer

    if (!isPathBlackListed(container, uri)) {
        container.logger.debug(`REQ method:"${method}" uri:"${uri}"`)
    }

    if (!ignoreApiOperationIds && operationId !== null) {
        // operationId is defined in the endpoint descriptor
        const serviceFun = _.get(container, operationId, null)
        if (_.isFunction(serviceFun)) {
            callServiceFuntion(container, endpoint, req, res, serviceFun, next)
        } else {
            res.set(defaultResponseHeaders).status(501).json({
                error: 'The operationId refers to a non-existing service function'
            })
            next()
        }
    } else {
        // The operationId is null or ignored
        if (enableMocking && !useMessaging) {
            // Do mocking without MESSAGING
            container.logger.debug('Do mocking without MESSAGING')
            callMockingServiceFunction(container, endpoint, req, res, next)
        } else if (useMessaging) {
            // Do MESSAGING forwarding with or without mocking
            container.logger.debug('Do MESSAGING forwarding with or without mocking')
            callMessagingForwarder(container, endpoint, req, res, next)
        } else {
            // No operationId, no MESSAGING forwarding enabled
            res.set(defaultResponseHeaders).status(501).json({
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
        .then((result) => {
            res.set(result.headers).status(200).send(result.body)
            next()
        })
        .catch((errResult) => {
            const { status, headers, body } = errResult
            if (_.isUndefined(status)) {
                res.status(500)
            } else {
                container.logger.error(CircularJSON.stringify(errResult))
                res.set(headers || defaultResponseHeaders)
                    .status(status)
                    .json(body)
            }
            next()
        })
}

/**
 * Call the MESSAGING forwarder service function
 *
 * Executes a JSON-RPC request via messaging, that puts the request to the topic named generated by the `<topicPrefix>.<endpoint.method>_<endpoint.uri>` pattern.
 * The message also containts the `method` and `uri` properties as well as
 * the normalized version of the request object and the endpoint descriptor.
 *
 * The function will respond the result of the JSON-RPC call, and finally calls the `next()` middleware step.
 *
 * @arg {Object} container - The container context
 * @arg {Object} endpoint - The non-static endpoint descriptor object
 * @arg {Object} req - The request object of the API call.
 * @arg {Object} res - The response object of the API call.
 * @arg {Function} next - The error-first callback, to call the next middleware in the chain.
 *
 * @function
 */
export const callMessagingForwarder = (container, endpoint, req, res, next) => {
    const topic = getTopicName(endpoint, container.config.webServer.topicPrefix)
    container.logger.debug(`webserver.callMessagingForwarder: endpoint: "${JSON.stringify(endpoint)}" topic: ${topic}`)
    container.logger.info(
        `webserver.callMessagingForwarder: nats.request: topic: "${topic}" method:"${endpoint.method}" uri:"${endpoint.uri}"`
    )
    container.logger.debug(`webserver.callMessagingForwarder: req.body is buffer: "${Buffer.isBuffer(req.body)}`)
    container.nats.request(
        topic,
        JSON.stringify({
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
                body: Buffer.isBuffer(req.body) ? Buffer.from(req.body).toString() : req.body
            }
        }),
        container.config.webServer.messagingRequestTimeout,
        { 'content-type': 'application/json', 'message-type': 'rpc/request' },
        (err, respPayload, respHeaders) => {
            if (err) {
                container.logger.error(`webserver.callMessagingForwarder: ERR ${JSON.stringify(err)}`)

                // In case both MESSAGING and mocking is enabled,
                // then get prepared for catch unhandled MESSAGING endpoints
                // and substitute them with example mock data if available
                const { ignoreApiOperationIds, enableMocking, useMessaging } = container.config.webServer
                const defaultHeaders = {
                    'Content-Type': 'application/json; charset=utf-8'
                }

                if (useMessaging && enableMocking && ignoreApiOperationIds) {
                    const { status, headers, body } = getMockingResponse(container, endpoint, req)
                    if (_.isUndefined(body)) {
                        res.set(headers || defaultHeaders)
                            .status(status)
                            .send()
                    } else {
                        res.set(headers || defaultHeaders)
                            .status(status)
                            .send(body)
                    }
                } else {
                    container.logger.debug(
                        `webserver.callMessagingForwarder: Send response with status: 500, content: ${JSON.stringify(
                            err
                        )}`
                    )
                    if (err.code === '503') {
                        res.set(defaultHeaders).status(503).send(err)
                    } else {
                        res.set(defaultHeaders).status(500).send(err)
                    }
                }
            } else {
                if (!isPathBlackListed(container, endpoint.uri)) {
                    container.logger.debug(`RES ${respPayload}`)
                }
                const resp = JSON.parse(respPayload)
                const respStatus = _.get(resp, 'status', 200)
                const respHeaders = resp.headers || {}
                const respBody = resp.body
                container.logger.debug(
                    `webserver.callMessagingForwarder: response with status: ${respStatus} headers: ${JSON.stringify(
                        respHeaders
                    )}, body: ${respBody}`
                )
                res.set(respHeaders).status(respStatus).send(respBody)
            }
            next()
        }
    )
}
