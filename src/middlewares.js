import _ from 'lodash'

export const addMiddlewares = (container, server, middlewares) => {
    // Add middlewares, if there is any defined
    if (_.isArray(middlewares)) {
        _.chain(middlewares)
            .filter(adderFn => {
                if (_.isFunction(adderFn)) {
                    //container.logger.debug(`${adderFn} will be registered as middleware`)
                    return true
                } else {
                    // The adder must be a function that receives the container and returns with a middleware function
                    container.logger.error(`${adderFn} is not a function`)
                    return false
                }
            })
            .map(adderFn => server.use(adderFn(container)))
            .value()
    }
}

export const setMiddlewares = (container, server, phase) => {
    const middlewares = _.merge(
        {
            preRouting: [],
            postRouting: []
        },
        _.cloneDeep(container.config.webServer.middlewares)
    )

    return addMiddlewares(container, server, middlewares[phase])
}
