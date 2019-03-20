import path from 'path'
/**
 * The default configuration for the webServer
 *
 *  {
 *      app: {
 *          name: {String},             // The name of the generator tool
 *          version: {String}           // The version of the generator tool
 *      },
 *      configFileName: {String},       // The name of the config file '.rest-tool.yml',
 *      logLevel: {String},             // The log level: (info | warn | error | debug)
 */
module.exports = {
    webServer: {
        port: process.env.WEBSERVER_PORT || 3007,
        useCompression: process.env.WEBSERVER_USE_COMPRESSION || false,
        useResponseTime: process.env.WEBSERVER_USE_RESPONSE_TIME || false,
        usePdms: process.env.WEBSERVER_USE_PDMS || false,
        middlewares: { preRouting: [], postRouting: [] },
        restApiPath: process.env.WEBSERVER_RESTAPIPATH || path.resolve(),
        staticContentBasePath: process.env.WEBSERVER_STATIC_CONTENT_BASEPATH || path.resolve()
    }
}
