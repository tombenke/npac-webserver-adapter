npac-webserver-adapter
======================

[![Actions Status](https://github.com/tombenke/npac-webserver-adapter/workflows/Quality%20Check/badge.svg)](https://github.com/tombenke/npac-webserver-adapter)
[![Coveralls][BadgeCoveralls]][Coveralls]
[![stable](http://badges.github.io/stability-badges/dist/stable.svg)](http://github.com/badges/stability-badges)
[![npm version][npm-badge]][npm-url]

## About

npac adapter with webServer api, using Express.js

It is a complete web server, that loads the API specification from swagger/OpenApi descriptors.

Use the public `startup` and `shutdown` functions defined in [`src/index.js`](src/index.js) within an [`npac`](http://tombenke.github.io/npac) container.
To learn more about the functions visit the [homepage](http://tombenke.github.io/npac-webserver-adapter/api/).
See also the test cases in [`src/index.spec.js`](src/index.spec.js) as examples of how to configure and use the module.


## Installation

Run the install command:

    npm install --save npac-webserver-adapter


## Configuration

This module uses the `config.webServer` property to gain its configuration parameters.

The default parameters can be found in [`src/config.js`](src/config.js):

```JavaScript
{
    webServer: {
        logBlackList: getLogBlackList(process.env.WEBSERVER_LOG_BLACKLIST),
        port: process.env.WEBSERVER_PORT || 3007,
        useCompression: process.env.WEBSERVER_USE_COMPRESSION || false,
        useResponseTime: process.env.WEBSERVER_USE_RESPONSE_TIME || false,
        usePdms: process.env.WEBSERVER_USE_PDMS || false,
        pdmsTopic: process.env.WEBSERVER_PDMS_TOPIC || 'easer',
        middlewares: { preRouting: [], postRouting: [] },
        restApiPath: process.env.WEBSERVER_RESTAPIPATH || __dirname,
        staticContentBasePath: process.env.WEBSERVER_STATIC_CONTENT_BASEPATH || path.resolve(),
        ignoreApiOperationIds: process.env.WEBSERVER_IGNORE_API_OPERATION_IDS || false,
        enableMocking: process.env.WEBSERVER_ENABLE_MOCKING || false,
        basePath: process.env.WEBSERVER_BASEPATH || '/',
        oasConfig: {
            parse: {
                yaml: {
                    allowEmpty: false // Don't allow empty YAML files
                },
                resolve: {
                    file: true // Resolve local file references
                }
            }
        },
        bodyParser: {
            json: process.env.PARSE_JSON_BODY || false,
            xml: process.env.PARSE_XML_BODY || false,
            urlencoded: process.env.PARSE_URL_ENCODED_BODY || false
        }
    }
}
```

---

[npm-badge]: https://badge.fury.io/js/npac-webserver-adapter.svg
[npm-url]: https://badge.fury.io/js/npac-webserver-adapter
[Coveralls]: https://coveralls.io/github/tombenke/npac-webserver-adapter?branch=master
[BadgeCoveralls]: https://coveralls.io/repos/github/tombenke/npac-webserver-adapter/badge.svg?branch=master
