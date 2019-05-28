import path from 'path'
import _ from 'lodash'
import { expect } from 'chai'
import { determineMediaType } from './mocking'
import { loadOas } from 'rest-tool-common'

describe('mocking', () => {
    let testApi = {}
    let endpoints = []

    const getEndpoint = (method, path) =>
        _.find(endpoints, endpoint => endpoint.method === method && endpoint.uri === path)

    before(done => {
        loadOas(path.resolve('src/fixtures/endpoints/api.yml'))
            .catch(err => {
                console.log(`API loading error ${err}`)
            })
            .then(api => {
                testApi = api
                endpoints = testApi.getEndpoints({ includeExamples: true })
                done()
            })
    })

    const dummyContainer = {
        logger: console
    }

    it('#determineMediaType', done => {
        _.map(
            [
                ['*/*', 'application/json'],
                ['application/json', 'application/json'],
                ['text/plain', 'text/plain'],
                ['invalid_mediatype', null]
            ],
            mapping =>
                expect(
                    determineMediaType(dummyContainer, getEndpoint('get', '/test/endpoint-with-examples'), mapping[0])
                ).to.equal(mapping[1])
        )

        done()
    })
})
