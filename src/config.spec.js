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
                port: 3007,
                useCompression: false,
                usePdms: false,
                restApiPath: __dirname
            }
        }

        const defaults = config
        expect(defaults).to.eql(expected)
        done()
    })
})
