import expect from 'expect'
import { getBoolEnv, getIntEnv } from './env'

before((done) => {
    done()
})
after((done) => {
    done()
})

describe('server/config', () => {
    it('getBoolEnv', (done) => {
        delete process.env.TEST
        expect(getBoolEnv('TEST', false)).toEqual(false)
        expect(getBoolEnv('TEST', true)).toEqual(true)

        process.env.TEST = ''
        expect(getBoolEnv('TEST', false)).toEqual(false)
        expect(getBoolEnv('TEST', true)).toEqual(false)

        process.env.TEST = 'x42'
        expect(getBoolEnv('TEST', false)).toEqual(false)
        expect(getBoolEnv('TEST', true)).toEqual(false)

        process.env.TEST = 'false'
        expect(getBoolEnv('TEST', false)).toEqual(false)
        process.env.TEST = 'true'
        expect(getBoolEnv('TEST', false)).toEqual(true)

        process.env.TEST = 'false'
        expect(getBoolEnv('TEST', false)).toEqual(false)
        expect(getBoolEnv('TEST', true)).toEqual(false)
        done()
    })

    it('getIntEnv', (done) => {
        delete process.env.TEST
        expect(getIntEnv('TEST', 42)).toEqual(42)
        expect(getIntEnv('TEST', '42')).toEqual(42)

        process.env.TEST = ''
        expect(getIntEnv('TEST', 42)).toEqual(0)
        expect(getIntEnv('TEST', '42')).toEqual(0)

        process.env.TEST = '24'
        expect(getIntEnv('TEST', 42)).toEqual(24)
        expect(getIntEnv('TEST', '42')).toEqual(24)

        process.env.TEST = 'xy24'
        expect(getIntEnv('TEST', 42)).toEqual(0)
        expect(getIntEnv('TEST', '42')).toEqual(0)

        done()
    })
})
