import expect from 'expect'
import { getLogBlackList, ignoreRouteLogging, isPathBlackListed } from './logUtils'

describe('logUtils', () => {
    const blackListStr = '/health,/customers,/customers/.*,/currencies/[a-zA-Z]{3}$'
    const blackList = ['/health', '/customers', '/customers/.*', '/currencies/[a-zA-Z]{3}$']
    const container = {
        config: {
            webServer: {
                logBlackList: blackList
            }
        }
    }

    it('getLogBlackList', (done) => {
        expect(getLogBlackList(null)).toEqual([])
        expect(getLogBlackList('')).toEqual([])
        expect(getLogBlackList('/health')).toEqual(['/health'])
        expect(getLogBlackList(blackListStr)).toEqual(blackList)
        done()
    })

    it('ignoreRouteLogging', (done) => {
        expect(ignoreRouteLogging(container)({ path: '/health' }, null)).toBeTruthy()
        expect(ignoreRouteLogging(container)({ path: '/currencies/USD' }, null)).toBeTruthy()
        expect(ignoreRouteLogging(container)({ path: '/currencies/USA_DOLLAR' }, null)).toBeFalsy()
        done()
    })

    it('isPathBlackListed', (done) => {
        expect(isPathBlackListed(container, '/health')).toBeTruthy()
        expect(isPathBlackListed(container, '/users')).toBeFalsy()
        expect(isPathBlackListed(container, '/customers/123fsfs-434a42g-13g1j1-32kk3l4')).toBeTruthy()
        expect(isPathBlackListed(container, '/currencies/EUR')).toBeTruthy()
        expect(isPathBlackListed(container, '/currencies/EU')).toBeFalsy()
        expect(isPathBlackListed(container, '/currencies/EURO')).toBeFalsy()

        done()
    })
})
