/**
 * The body parser module of the webserver adapter.
 *
 * Used only internally by the adapter.
 *
 * @module bodyParser
 */

import express from 'express'
import xmlParser from 'express-xml-bodyparser'

/**
 * Setup body parsers of the webserver
 *
 * @arg {Object} container - The container context
 * @arg {Object} server - The webserver object the endpoints will be added to
 *
 * @function
 */
export const setParsers = (container, server) => {
    const { json, urlencoded, xml } = container.config.webServer.bodyParser
    
    if (json) {
        server.use(express.json()) // for parsing application/json
    }
    
    if (urlencoded) {
        server.use(express.urlencoded({ extended: true })) // get information from html forms
    }

    if (xml) {
        server.use(xmlParser()) // for parsing text/xml
    }
}
