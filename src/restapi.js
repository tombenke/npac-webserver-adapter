import _ from 'lodash'
import CircularJSON from 'circular-json-es6'

const defaultResponseHeaders = {
    'Content-Type': 'application/json'
}

const defaultResponseBody = {
    error: 'The endpoint is not implemented'
}

const mkHandlerFun = (endpoint, container) => (req, res, next) => {
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

export const setEndpoints = (container, server, endpointMap) => {
    container.logger.debug(
        `restapi.setEndpoints/endpointMap ${JSON.stringify(_.map(endpointMap, ep => [ep.method, ep.uri]), null, '')}`
    )
    _.map(endpointMap, endpoint => {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(endpoint, container))
    })
}
