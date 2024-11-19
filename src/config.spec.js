import path from 'path'
import expect from 'expect'
import config from './config'

before((done) => {
    done()
})
after((done) => {
    done()
})

describe('server/config', () => {
    it('defaults', (done) => {
        const expected = {
            webServer: {
                logBlackList: [],
                port: 3007,
                useCompression: false,
                useResponseTime: false,
                useMessaging: false,
                messagingRequestTimeout: 2000,
                topicPrefix: 'easer',
                middlewares: { preRouting: [], postRouting: [] },
                restApiPath: path.resolve(),
                staticContentBasePath: path.resolve(),
                ignoreApiOperationIds: false,
                enableMocking: false,
                basePath: '/',
                oasConfig: {
                    parse: {
                        yaml: {
                            allowEmpty: false
                        },
                        resolve: {
                            file: true
                        }
                    }
                },
                bodyParser: {
                    raw: true,
                    json: false,
                    xml: false,
                    urlencoded: false
                }
            }
        }

        const defaults = config
        expect(defaults).toEqual(expected)
        done()
    })
})
