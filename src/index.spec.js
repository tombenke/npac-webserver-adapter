import { addLogger, mergeConfig, removeSignalHandlers, catchExitSignals, npacStart } from 'npac'
import sinon from 'sinon'
import { expect } from 'chai'
import defaults from './config'
import * as server from './index'
import * as pdms from 'npac-pdms-hemera-adapter'
import * as _ from 'lodash'
import axios from 'axios'

// An endpoint operation callback that always successfully responds with an empty JSON object
const testAdapterEndpointFun = container => (req, endp) => {
    return new Promise((resolve, reject) => {
        resolve({
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: {}
        })
    })
}

// An endpoint operation callback that always returns with 500 status and a JSON null response body
const testAdapterEndpointErr500Fun = container => (req, endp) => {
    return new Promise((resolve, reject) => {
        reject({
            status: 500,
            statusText: 'Very serious error happened to the server',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: null
        })
    })
}

// An endpoint operation callback that always returns with an unknown error, with no status, header and body info
const testAdapterEndpointErrUnknownFun = container => (req, endp) => {
    return new Promise((resolve, reject) => {
        reject(new Error("Internal error occured..."))
    })
}

// Test adapter that holds two endpoint implementations (operations), a success and an error one.
const testAdapter = {
    startup: (container, next) => {
        // Merges the defaults with the config coming from the outer world
        const testAdapterConfig = _.merge({}, /*defaults,*/ { testAdapter: container.config.testAdapter || {} })
        container.logger.info('Start up testAdapter adapter')

        // Call next setup function with the context extension
        next(null, {
            config: testAdapterConfig,
            testAdapter: {
                endpoint: testAdapterEndpointFun(container),
                endpointErr500: testAdapterEndpointErr500Fun(container),
                endpointErrUnknown: testAdapterEndpointErrUnknownFun(container)
            }
        })
    },
    shutdown: (container, next) => {
        container.logger.info('Shut down testAdapter adapter')
        next(null, null)
    }
}

describe('webServer adapter', () => {
    let sandbox
    let acceptCheckMwCall
    let tracerMwCall
    const traceIdHeader = 'X-B3-Traceid'
    const traceIdValue = '42'
    const accepts = ['*/*', 'application/json', 'text/plain', 'text/html', 'text/xml', 'unsupported/media-type']

    const acceptCheckMiddleware = container => (req, res, next) => {
        container.logger.debug(`acceptCheckMiddleware is called ${req.accepts()}`)
        expect(_.includes(accepts, req.accepts()[0])).to.be.true
        acceptCheckMwCall()
        next()
    }

    const tracerMiddleware = container => (req, res, next) => {
        //        const { hostname, originalUrl, route, method } = req
        const traceId = req.get(traceIdHeader)
        //        const { statusCode } = res
        //        const contentLength = res.get('content-length')
        //        const responseTime = res.get('x-response-time') || 'unknown'
        //        container.logger.debug(
        //            `MiddlewareFn is called: ${method} "${hostname}" "${originalUrl}" "${traceId}" => ${statusCode} ${contentLength} ${responseTime} ============================`
        //        )
        expect(traceId).to.be.equal(traceIdValue)
        expect(_.includes(accepts, req.accepts()[0])).to.be.true
        tracerMwCall()
        next()
    }

    const config = _.merge({}, defaults, pdms.defaults, {
        logger: {
            level: 'debug'
        },
        webServer: {
            logBlackList: ['/test/endpoint'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            middlewares: { preRouting: [acceptCheckMiddleware], postRouting: [tracerMiddleware] },
            staticContentBasePath: __dirname // + '/fixtures/content/'
        }
    })

    beforeEach(done => {
        removeSignalHandlers()
        sandbox = sinon.createSandbox({
            properties: ['spy']
        })
        acceptCheckMwCall = sandbox.spy()
        tracerMwCall = sandbox.spy()
        done()
    })

    afterEach(done => {
        removeSignalHandlers()
        sandbox.restore()
        done()
    })

    const adapters = [mergeConfig(config), addLogger, testAdapter.startup, pdms.startup, server.startup]

    const adaptersWithBasePath = [
        mergeConfig(
            _.merge({}, config, {
                webServer: { basePath: '/base/path' }
            })
        ),
        addLogger,
        testAdapter.startup,
        pdms.startup,
        server.startup
    ]

    const adaptersWithPdms = [
        mergeConfig(
            _.merge({}, config, {
                webServer: { usePdms: true },
                pdms: { timeout: 2500/*, natsUri: 'nats://localhost:4222'*/ }
            })
        ),
        addLogger,
        pdms.startup,
        server.startup
    ]

    const adaptersForIgnoreOperationIds = [
        mergeConfig(
            _.merge({}, config, {
                webServer: {
                    usePdms: false,
                    ignoreApiOperationIds: true,
                    enableMocking: false
                }
            })
        ),
        addLogger,
        pdms.startup,
        server.startup
    ]

    const adaptersForMocking = [
        mergeConfig(
            _.merge({}, config, {
                webServer: {
                    usePdms: false,
                    ignoreApiOperationIds: true,
                    enableMocking: true
                }
            })
        ),
        addLogger,
        pdms.startup,
        server.startup
    ]

    const adaptersForMockingAndPdms = [
        mergeConfig(
            _.merge({}, config, {
                webServer: {
                    usePdms: true,
                    ignoreApiOperationIds: true,
                    enableMocking: true
                }
            })
        ),
        addLogger,
        pdms.startup,
        server.startup
    ]

    const terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown]

    it('#startup, #shutdown', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            container.logger.info(`Run job to test server`)
            next(null, null)
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call static content index', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}/docs/subcontent/`,
                withCredentials: true,
                headers: {
                    Accept: '*/*'
                }
            }).then(response => {
                const { status } = response
                expect(status).to.equal(200)
                expect(acceptCheckMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with no adapter function, NO PDMS used', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(err => {
                const { status, data } = err.response
                expect(status).to.equal(501)
                expect(data).to.eql({ error: 'The endpoint is either not implemented or `operationId` is ignored' })
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with adapter function', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'put',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status } = response
                expect(status).to.equal(200)
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with adapter function using basePath', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/base/path/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'put',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status } = response
                expect(status).to.equal(200)
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersWithBasePath, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with adapter function but ignore operationId', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'put',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(err => {
                const { status, data } = err.response
                expect(status).to.equal(501)
                expect(data).to.eql({ error: 'The endpoint is either not implemented or `operationId` is ignored' })
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersForIgnoreOperationIds, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with 500, Internal Server Error returned by the operation', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(error => {
                const { status, statusText, headers, data } = error.response
                container.logger.error(
                    `status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(
                        headers
                    )}, data: ${JSON.stringify(data)}`
                )
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with 500, Internal Server Error no information', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'delete',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(error => {
                const { status, statusText, headers, data } = error.response
                container.logger.error(
                    `status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(
                        headers
                    )}, data: ${JSON.stringify(data)}`
                )
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with PDMS forwarder function - PDMS Client Timeout', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(error => {
                const { status, statusText, headers, data } = error.response
                container.logger.error(
                    `status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(
                        headers
                    )}, data: ${JSON.stringify(data)}`
                )
                expect(status).to.equal(500)
                expect(data.message).to.equal('Client timeout')
                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with PDMS forwarder function', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointMethod = 'get'
            const restEndpointPath = `/test/endpoint`
            const expectedBody = { status: 'OK' }

            // Add built-in service
            container.pdms.add({ topic: 'easer', method: restEndpointMethod, uri: restEndpointPath }, (data, cb) => {
                cb(null, {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: expectedBody
                })
            })

            container.logger.info(`Run job to test server`)
            axios({
                method: restEndpointMethod,
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status, data } = response
                expect(status).to.equal(200)
                expect(data).to.eql(expectedBody)
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with mocking but no examples', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'put',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            })
                .then(response => {
                    const { status, data } = response
                    expect(status).to.equal(200)
                    expect(data).to.equal('')
                    expect(acceptCheckMwCall.calledOnce).to.be.true
                    expect(tracerMwCall.calledOnce).to.be.true
                    next(null, null)
                })
                .catch(err => next(null, null))
        }

        npacStart(adaptersForMocking, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with mocking and examples. Accept: "application/json"', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-with-examples`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status, statusText, data } = response
                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({ identity: 'Universe', meaning: 42 })
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersForMocking, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with mocking and examples. Accept: "text/plain"', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-with-examples`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'text/plain',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status, statusText, data } = response
                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.equal('The meaning of Universe is 42')
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersForMocking, [testServer], terminators)
    }).timeout(30000)

    it('#call existing REST endpoint with mocking and examples. Accept: "unsupported-media-type"', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-with-examples`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'unsupported/media-type',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(error => {
                const { status, statusText, headers, data } = error.response
                container.logger.error(
                    `status: ${status}, statusText: ${statusText}, headers: ${JSON.stringify(
                        headers
                    )}, data: ${JSON.stringify(data)}`
                )
                expect(status).to.equal(415)
                expect(statusText).to.equal('Unsupported Media Type')
                next(null, null)
            })
        }

        npacStart(adaptersForMocking, [testServer], terminators)
    }).timeout(30000)

    it('#call with PDMS and mocking enabled, no endpoint implementation, mock example exists', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointMethod = 'get'
            const restEndpointPath = `/test/endpoint-with-examples`

            container.logger.info(`Run job to test server`)
            axios({
                method: restEndpointMethod,
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).then(response => {
                const { status, statusText, data } = response
                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({ identity: 'Universe', meaning: 42 })
                expect(acceptCheckMwCall.calledOnce).to.be.true
                expect(tracerMwCall.calledOnce).to.be.true
                next(null, null)
            })
        }

        npacStart(adaptersForMockingAndPdms, [testServer], terminators)
    }).timeout(30000)

    it('#call with PDMS and mocking enabled, no endpoint implementation, mock example does not exists', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointMethod = 'get'
            const restEndpointPath = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: restEndpointMethod,
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json',
                    [traceIdHeader]: traceIdValue
                }
            }).catch(error => {
                const { status, statusText, headers } = error.response
                container.logger.error(`status: ${status}, ${statusText}, headers: ${JSON.stringify(headers)}`)
                expect(status).to.equal(404)
                expect(statusText).to.equal('Not Found')
                next(null, null)
            })
        }

        npacStart(adaptersForMockingAndPdms, [testServer], terminators)
    }).timeout(30000)

})
