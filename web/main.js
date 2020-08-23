const os = require('os')
const express = require('express')
const fs = require('fs')
const http = require('http')
const https = require('https')
const MongoClient = require('mongodb').MongoClient
const uuid = require('uuid').v4

////////////////////////////////////////////////////////////////////////////////
// Global Constants
////////////////////////////////////////////////////////////////////////////////

const URLS_API_HOSTNAME = 'api.urls.durfee.io'
const URLS_API_PORT = 443
const URLS_RESOURCE_BASE_URI = '/urls'
const URLS_CA = fs.readFileSync(`${os.homedir()}/URLShortener/ca.cert.pem`)
const STATUS_CODE_OK = 200
const STATUS_CODE_FOUND = 302
const STATUS_CODE_NOT_FOUND = 404
const STATUS_CODE_INTERNAL_SERVER_ERROR = 500
const STATUS_CODE_PARSE_ERROR = 601
const STATUS_CODE_GET_ERROR = 602
const STATUS_NOT_FOUND = 'NOT_FOUND'
const STATUS_INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
const STATUS_PARSE_ERROR = 'PARSE_ERROR'
const STATUS_GET_ERROR = 'GET_ERROR'
const LOG_OPTIONS = {
    'color': true,
    'depth': null,
}

////////////////////////////////////////////////////////////////////////////////
// Logging Functions
////////////////////////////////////////////////////////////////////////////////

const logRequest = (id, req) => {
    console.dir({
        'id': id,
        'request': {
            'method': req['method'],
            'url': req['url'],
            'params': req['params'],
            'query': req['query'],
            'body': req['body']
        }
    }, LOG_OPTIONS)
}

const logResponse = (id, res, body) => {
    console.dir({
        'id': id,
        'response': {
            'statusCode': res['statusCode'],
            'statusMessage': res['statusMessage'],
            'body': body
        }
    }, LOG_OPTIONS)
}

////////////////////////////////////////////////////////////////////////////////
// HTTPS Request Wrappers
////////////////////////////////////////////////////////////////////////////////

const httpsGet = (hostname, port, uri) => {
    const options = {
        'hostname': hostname,
        'port': port,
        'path': uri,
        'method': 'GET',
        'ca': URLS_CA,
    }
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            var body = ''
            res.on('data', data => {
                body = body + data
            })
            res.on('end', () => {
                resolve = (res.statusCode == STATUS_CODE_OK) ? resolve : reject
                if (body == '') {
                    resolve({})
                } else {
                    try {
                        body = JSON.parse(body)
                        resolve(body)
                    } catch (error) {
                        reject({
                            'error': {
                                'code': STATUS_CODE_PARSE_ERROR,
                                'message': `Unable to parse: ${error.message}: ${body}`,
                                'status': STATUS_PARSE_ERROR,
                            }
                        })
                    }
                }
            })
        })
        req.on('error', error => {
            reject({
                'error': {
                    'code': STATUS_CODE_GET_ERROR,
                    'message': `Unable to perform HTTPS GET request: ${error.message}`,
                    'status': STATUS_GET_ERROR,
                }
            })
        })
        req.end()
    })
}

////////////////////////////////////////////////////////////////////////////////
// API Wrappers
////////////////////////////////////////////////////////////////////////////////

const urlsGet = resourceId => {
    return httpsGet(URLS_API_HOSTNAME, URLS_API_PORT, `${URLS_RESOURCE_BASE_URI}/${resourceId}`)
}

////////////////////////////////////////////////////////////////////////////////
// App Configuration
////////////////////////////////////////////////////////////////////////////////

const app = express()

app.use(express.json())
app.set('json spaces', 2)

////////////////////////////////////////////////////////////////////////////////
// REST Methods
////////////////////////////////////////////////////////////////////////////////

// Method: get
app.get('/:resourceId', (req, res) => {
    const id = uuid()
    logRequest(id, req)
    urlsGet(req.params['resourceId']).then(result => {
        const body = {
            'id': `${result['id']}`,
            'url': `${result['url']}`
        }
        res.status(STATUS_CODE_FOUND).set('Location', `${result['url']}`).json(body)
        logResponse(id, res, body)
    }).catch(error => {
        res.status(STATUS_CODE_INTERNAL_SERVER_ERROR).json(error)
        logResponse(id, res, error)
    })
})

////////////////////////////////////////////////////////////////////////////////
// Connect
////////////////////////////////////////////////////////////////////////////////

http.createServer(app).listen(8004)
