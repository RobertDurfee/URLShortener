const express = require('express')
const http = require('http')
const MongoClient = require('mongodb').MongoClient
const uuid = require('uuid').v4

////////////////////////////////////////////////////////////////////////////////
// Global Constants
////////////////////////////////////////////////////////////////////////////////

const MONGO_URL = 'mongodb://localhost:27017'
const URLS_DB = 'urlsDB'
const URLS = 'urls'
const STATUS_CODE_NOT_FOUND = 404
const STATUS_CODE_INTERNAL_SERVER_ERROR = 500
const STATUS_NOT_FOUND = 'NOT_FOUND'
const STATUS_INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
const LOG_OPTIONS = {
    'color': true,
    'depth': null,
}

////////////////////////////////////////////////////////////////////////////////
// Global Variables
////////////////////////////////////////////////////////////////////////////////

var urlsDB

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
    urlsDB.collection(URLS).findOne({
        'id': req.params['resourceId'].toLowerCase()
    }).then(result => {
        if (result) {
            const body = {
                'id': `${result['id']}`,
                'url': `${result['url']}`
            }
            res.redirect(`${result['url']}`)
            logResponse(id, res, body)
        } else {
            const body = {
                'error': {
                    'code': STATUS_CODE_NOT_FOUND,
                    'message': `Resource ${req.params['resourceId']} was not found.`,
                    'status': STATUS_NOT_FOUND,
                }
            }
            res.status(STATUS_CODE_NOT_FOUND).json(body)
            logResponse(id, res, body)
        }
    }).catch(error => {
        const body = {
            'error': {
                'code': STATUS_CODE_INTERNAL_SERVER_ERROR,
                'message': `Unexpected error occurred when getting resource ${req.params['resourceId']}: ${error.message}`,
                'status': STATUS_INTERNAL_SERVER_ERROR
            }
        }
        res.status(STATUS_CODE_INTERNAL_SERVER_ERROR).json(body)
        logResponse(id, res, body)
    })
})

////////////////////////////////////////////////////////////////////////////////
// Connect
////////////////////////////////////////////////////////////////////////////////

MongoClient.connect(MONGO_URL, { useUnifiedTopology: true }).then(client => {
    urlsDB = client.db(URLS_DB)
    http.createServer(app).listen(8004)
}).catch(error => {
    console.error(error)
    process.exit(1)
})
