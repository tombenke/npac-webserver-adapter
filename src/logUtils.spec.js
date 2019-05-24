import { expect } from 'chai'
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

    it('getLogBlackList', done => {
        expect(getLogBlackList(null)).to.eql([])
        expect(getLogBlackList('')).to.eql([])
        expect(getLogBlackList('/health')).to.eql(['/health'])
        expect(getLogBlackList(blackListStr)).to.eql(blackList)
        done()
    })

    it('ignoreRouteLogging', done => {
        expect(ignoreRouteLogging(container)({ path: '/health' }, null)).to.be.true
        expect(ignoreRouteLogging(container)({ path: '/currencies/USD' }, null)).to.be.true
        expect(ignoreRouteLogging(container)({ path: '/currencies/USA_DOLLAR' }, null)).to.be.false
        done()
    })

    it('isPathBlackListed', done => {
        expect(isPathBlackListed(container, '/health')).to.be.true
        expect(isPathBlackListed(container, '/users')).to.be.false
        expect(isPathBlackListed(container, '/customers/123fsfs-434a42g-13g1j1-32kk3l4')).to.be.true
        expect(isPathBlackListed(container, '/currencies/EUR')).to.be.true
        expect(isPathBlackListed(container, '/currencies/EU')).to.be.false
        expect(isPathBlackListed(container, '/currencies/EURO')).to.be.false

        done()
    })
})
