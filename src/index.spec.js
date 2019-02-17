import { addLogger, mergeConfig, removeSignalHandlers, catchExitSignals, npacStart } from 'npac'
import sinon from 'sinon'
import { expect } from 'chai'
import defaults from './config'
import * as server from './index'
import * as pdms from 'npac-pdms-hemera-adapter'
import * as _ from 'lodash'
import axios from 'axios'

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
                endpointErr500: testAdapterEndpointErr500Fun(container)
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

    const config = _.merge({}, defaults, pdms.defaults, {
        webServer: {
            useCompression: true,
            restApiPath: __dirname + '/fixtures/endpoints/',
            staticContentBasePath: __dirname // + '/fixtures/content/'
        }
    })

    beforeEach(done => {
        removeSignalHandlers()
        sandbox = sinon.sandbox.create({ useFakeTimers: false })
        done()
    })

    afterEach(done => {
        removeSignalHandlers()
        sandbox.restore()
        done()
    })

    const adapters = [mergeConfig(config), addLogger, testAdapter.startup, pdms.startup, server.startup]
    /*
    const adaptersWithPdms = [
        mergeConfig(_.merge({}, config, {
            webServer: { usePdms: true },
            // pdms: { natsUri: 'nats://localhost:4222' }
        })),
        addLogger,
        pdms.startup,
        server.startup
    ]
    */

    const terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown]

    it('#startup, #shutdown', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            container.logger.info(`Run job to test server`)
            next(null, null)
        }

        npacStart(adapters, [testServer], terminators)
    })

    it('#call static content index', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}/docs/`,
                withCredentials: true,
                headers: {
                    Accept: '*/*'
                }
            }).then(response => {
                const { status /*, statusText, headers, data*/ } = response
                expect(status).to.equal(200)
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    })
    it('#call existing REST endpoint with no adaptor function', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpoint = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'get',
                url: `${host}${restEndpoint}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json'
                }
            }).then(function(response) {
                const { status /*, statusText, headers, data*/ } = response
                expect(status).to.equal(200)
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    })

    it('#call existing REST endpoint with adaptor function', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpoint = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'put',
                url: `${host}${restEndpoint}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json'
                }
            }).then(function(response) {
                const { status /*, statusText, headers, data*/ } = response
                expect(status).to.equal(200)
                next(null, null)
            })
        }

        npacStart(adapters, [testServer], terminators)
    })

    it('#call existing REST endpoint with 500, Internal Server Error', done => {
        catchExitSignals(sandbox, done)

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpoint = `/test/endpoint`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpoint}`,
                withCredentials: true,
                headers: {
                    Accept: 'application/json'
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
    })
})
