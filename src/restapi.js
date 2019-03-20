import _ from 'lodash'
import { services } from 'rest-tool-common'
import CircularJSON from 'circular-json-es6'

const makeJsonicFriendly = function(uri) {
    //return uri.replace(/\{|\}/g, ':')
    return uri.replace(/\{/g, ':').replace(/\}/g, '')
}

const getNonStaticEndpointMap = container => {
    // Load services config and service descriptors
    container.logger.info(`Load services from ${container.config.webServer.restApiPath}`)
    const endpoints = _.filter(
        services.load(container.config.webServer.restApiPath, ''),
        endp => !_.has(endp, 'methods.GET.static')
    )
    return _.flatMap(endpoints, endpoint => {
        const uri = endpoint.uriTemplate
        const methods = endpoint.methodList
        return _.map(methods, method => ({
            method: method.methodName.toLowerCase(),
            uri: uri,
            jsfUri: makeJsonicFriendly(uri),
            endpointDesc: endpoint
        }))
    })
}

const mkHandlerFun = (endpoint, container) => (req, res, next) => {
    container.logger.debug(`REQ method:"${endpoint.method}" uri:"${endpoint.uri}"`)

    const serviceImplName = services.getImplementation(endpoint.endpointDesc, endpoint.method)
    if (serviceImplName !== null) {
        const serviceFun = _.get(container, serviceImplName)
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
        const responseHeaders = services.getResponseHeaders(endpoint.method, endpoint.endpointDesc)
        const responseBody = services.getMockResponseBody(endpoint.method, endpoint.endpointDesc) || endpoint
        res.set(responseHeaders)
            .status(200)
            .json(responseBody)
        next()
    }
}

export const setEndpoints = (container, server) => {
    const endpointMap = getNonStaticEndpointMap(container)
    container.logger.debug(
        `restapi.setEndpoints/endpointMap ${JSON.stringify(_.map(endpointMap, ep => [ep.method, ep.uri]), null, '')}`
    )
    _.map(endpointMap, endpoint => {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(endpoint, container))
    })
}
