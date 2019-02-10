import _ from 'lodash'
import { services } from 'rest-tool-common'

const makeJsonicFriendly = function(uri) {
    //return uri.replace(/\{|\}/g, ':')
    return uri.replace(/\{/g, ':').replace(/\}/g, '')
}

const getNonStaticEndpointMap = container => {
    // Load services config and service descriptors
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

const mkHandlerFun = (endpoint, container) => (req, res) => {
    container.logger.info(`REQ method:"${endpoint.method}" uri:"${endpoint.uri}"`)

    const serviceImplName = services.getImplementation(endpoint.endpointDesc, endpoint.method)
    if (serviceImplName !== null) {
        const serviceFun = _.get(container, serviceImplName)
        if (_.isFunction(serviceFun)) {
            serviceFun(req, endpoint)
                .then(result => {
                    res.set(result.headers)
                        .status(200)
                        .json(result.body)
                })
                .catch(errResult => {
                    container.logger.error(JSON.stringify(errResult))
                    res.set(errResult.headers)
                        .status(errResult.status)
                        .json(errResult.body)
                })
        }
    } else {
        const responseHeaders = services.getResponseHeaders(endpoint.method, endpoint.endpointDesc)
        const responseBody = services.getMockResponseBody(endpoint.method, endpoint.endpointDesc) || endpoint
        res.set(responseHeaders)
            .status(200)
            .json(responseBody)
    }
}

export const set = (server, container) => {
    const endpointMap = getNonStaticEndpointMap(container)
    container.logger.info(
        `restapi.set/endpointMap ${JSON.stringify(_.map(endpointMap, ep => [ep.method, ep.uri]), null, '')}`
    )
    _.map(endpointMap, endpoint => {
        server[endpoint.method](endpoint.jsfUri, mkHandlerFun(endpoint, container))
    })
}
