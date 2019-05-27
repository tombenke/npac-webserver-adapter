import path from 'path'
import { expect } from 'chai'
import config from './config'

before(done => {
    done()
})
after(done => {
    done()
})

describe('server/config', () => {
    it('defaults', done => {
        const expected = {
            webServer: {
                logBlackList: [],
                port: 3007,
                useCompression: false,
                useResponseTime: false,
                usePdms: false,
                middlewares: { preRouting: [], postRouting: [] },
                restApiPath: path.resolve(),
                staticContentBasePath: path.resolve(),
                ignoreApiOperationIds: false,
                oasConfig: {
                    parse: {
                        yaml: {
                            allowEmpty: false
                        },
                        resolve: {
                            file: true
                        }
                    }
                }
            }
        }

        const defaults = config
        expect(defaults).to.eql(expected)
        done()
    })
})
