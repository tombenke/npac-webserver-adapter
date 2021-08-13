import { addLogger, mergeConfig, removeSignalHandlers, catchExitSignals, npacStart } from 'npac'
import sinon from 'sinon'
import { expect } from 'chai'
import defaults from './config'
import * as server from './index'
import * as pdms from 'npac-pdms-hemera-adapter'
import * as _ from 'lodash'
import axios from 'axios'
import qs from 'qs'

// An endpoint operation callback that accepts a parsable object
const testAdapterEndpointFun = (container) => (req, endp) => {
    return new Promise((resolve, reject) => {
        resolve({
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: req.body
        })
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
                endpoint: {
                    json: testAdapterEndpointFun(container),
                    xml: testAdapterEndpointFun(container),
                    urlencoded: testAdapterEndpointFun(container),
                    raw: testAdapterEndpointFun(container),
                }
            }
        })
    },
    shutdown: (container, next) => {
        container.logger.info('Shut down testAdapter adapter')
        next(null, null)
    }
}

describe('webServer adapter with parsing enabled', () => {
    let sandbox

    const config = _.merge({}, defaults, pdms.defaults, {
        logger: {
            level: 'debug'
        },
        webServer: {
            logBlackList: ['/test/endpoint-json'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            staticContentBasePath: __dirname, // + '/fixtures/content/'
            bodyParser: {
                json: true,
                xml: true,
                urlencoded: true
            }
        }
    })

    beforeEach((done) => {
        removeSignalHandlers()
        sandbox = sinon.createSandbox({
            properties: ['spy']
        })
        done()
    })

    afterEach((done) => {
        removeSignalHandlers()
        sandbox.restore()
        done()
    })

    const adaptersWithPdms = [
        mergeConfig(
            _.merge({}, config, {
                webServer: { usePdms: true },
                pdms: { timeout: 2500 }
            })
        ),
        addLogger,
        pdms.startup,
        testAdapter.startup,
        server.startup
    ]

    const terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown]
    
    it('#call POST endpoint with JSON body parser. Accept: "application/json"', (done) => {
        catchExitSignals(sandbox, done)
        
        let testBody = '{ "identity": "Universe", "meaning": 42 }'

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-json`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                data: testBody
            }).then((response) => {
                const { status, statusText, data } = response

                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({ identity: 'Universe', meaning: 42 })

                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)
    
    it('#call POST endpoint with XML body parser. Accept: "text/xml"', (done) => {
        catchExitSignals(sandbox, done)

        let testBody = `<?xml version="1.0" encoding="UTF-8"?>
            <starwars>
                <character name="Luke Skywalker" />
                <character name="Darth Vader" />
            </starwars>`
        
        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-xml`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    'Content-Type': 'text/xml',
                    Accept: 'application/json'
                },
                data: testBody
            }).then((response) => {
                const { status, statusText, data } = response

                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({
                    starwars: {
                        character: [
                            { '$': { name: 'Luke Skywalker' } },
                            { '$': { name: 'Darth Vader' } }
                        ]
                    }
                })

                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)
    
    it('#call POST endpoint with URL encoded body parser. Accept: "application/x-www-form-urlencoded"', (done) => {
        catchExitSignals(sandbox, done)

        let testBody = qs.stringify({ identity: 'Universe', meaning: 42 })
        
        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-urlencoded`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                },
                data: testBody
            }).then((response) => {
                const { status, statusText, data } = response

                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({ identity: 'Universe', meaning: '42' })

                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)
})

describe('webServer adapter with only raw parsing', () => {
    let sandbox

    const config = _.merge({}, defaults, pdms.defaults, {
        logger: {
            level: 'debug'
        },
        webServer: {
            logBlackList: ['/test/endpoint-json'],
            useCompression: true,
            useResponseTime: true,
            restApiPath: __dirname + '/fixtures/endpoints/api.yml',
            staticContentBasePath: __dirname, // + '/fixtures/content/'
        }
    })

    beforeEach((done) => {
        removeSignalHandlers()
        sandbox = sinon.createSandbox({
            properties: ['spy']
        })
        done()
    })

    afterEach((done) => {
        removeSignalHandlers()
        sandbox.restore()
        done()
    })

    const adaptersWithPdms = [
        mergeConfig(
            _.merge({}, config, {
                webServer: { usePdms: true },
                pdms: { timeout: 2500 }
            })
        ),
        addLogger,
        pdms.startup,
        testAdapter.startup,
        server.startup
    ]

    const terminators = [server.shutdown, pdms.shutdown, testAdapter.shutdown]

    it('#call POST endpoint without parser', (done) => {
        catchExitSignals(sandbox, done)

        let testBody = '{ "identity": "Universe", "meaning": 42 }'

        const testServer = (container, next) => {
            const { port } = container.config.webServer
            const host = `http://localhost:${port}`
            const restEndpointPath = `/test/endpoint-raw`

            container.logger.info(`Run job to test server`)
            axios({
                method: 'post',
                url: `${host}${restEndpointPath}`,
                withCredentials: true,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                data: testBody
            }).then((response) => {
                const { status, statusText, data } = response

                expect(status).to.equal(200)
                expect(statusText).to.equal('OK')
                expect(data).to.eql({ identity: 'Universe', meaning: 42 })
                next(null, null)
            })
        }

        npacStart(adaptersWithPdms, [testServer], terminators)
    }).timeout(30000)
})
