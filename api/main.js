const express = require('express')
const http = require('http')
const mongo = require('mongodb')
const MongoClient = mongo.MongoClient
const uuid = require('uuid').v4

////////////////////////////////////////////////////////////////////////////////
// Global Constants
////////////////////////////////////////////////////////////////////////////////

const MONGO_URL = 'mongodb://localhost:27017'
const URLS_DB = 'urlsDB'
const URLS = 'urls'
const URLS_COUNT = 'urls.count'
const STATUS_CODE_OK = 200
const STATUS_CODE_BAD_REQUEST = 400
const STATUS_CODE_NOT_FOUND = 404
const STATUS_CODE_INTERNAL_SERVER_ERROR = 500
const STATUS_BAD_REQUEST = 'BAD_REQUEST'
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
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

const convert = count => {
    if (!count) {
        return '2'
    }
    // intentionally excluding '0', '1', 'i', 'l', and 'o'
    const character = '23456789abcdefghjkmnpqrstuvwxyz'
    var id = ''
    while (count) {
        id = `${character[count % 31]}${id}`
        count = Math.trunc(count / 31)
    }
    return id
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
// App Configuration
////////////////////////////////////////////////////////////////////////////////

const app = express()

app.use(express.json())
app.set('json spaces', 2)

////////////////////////////////////////////////////////////////////////////////
// REST Methods
////////////////////////////////////////////////////////////////////////////////

// Method: urls.get
app.get('/urls/:resourceId', (req, res) => {
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
            res.status(STATUS_CODE_OK).json(body)
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

// Method: urls.insert
app.post('/urls', (req, res) => {
    const id = uuid()
    logRequest(id, req)
    if (!req.body['url'] || !/^https?:\/\/([A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,6}(\/([-a-zA-Z0-9()@:%_\+.~#?&\/=]*))?$/.test(req.body['url'])) {
        const body = {
            'error': {
                'code': STATUS_CODE_BAD_REQUEST,
                'message': `Provided URL is not valid: ${req.body['url']}`,
                'status': STATUS_BAD_REQUEST,
            }
        }
        res.status(STATUS_CODE_BAD_REQUEST).json(body)
        logResponse(id, res, body)
    } else {
        urlsDB.collection(URLS_COUNT).findOneAndUpdate({
            '_id': 'count',
        }, {
            '$inc': {
                'count': 1
            }
        }).then(result => {
            if (result.value) {
                return urlsDB.collection(URLS).insertOne({
                    'id': `${convert(result.value['count'])}`,
                    'url': req.body['url'],
                })
            } else { throw new Error('Unable to get urls count') }
        }).then(result => {
            if (result.insertedCount == 1) {
                const body = {
                    'id': `${result.ops[0]['id']}`,
                    'url': `${result.ops[0]['url']}`,
                }
                res.status(STATUS_CODE_OK).json(body)
                logResponse(id, res, body)
            } else { throw new Error(`Unexpected number of inserted resources: ${result.insertedCount}`) }
        }).catch(error => {
            const body = {
                'error': {
                    'code': STATUS_CODE_INTERNAL_SERVER_ERROR,
                    'message': `Unexpected error occurred when inserting resource: ${error.message}`,
                    'status': STATUS_INTERNAL_SERVER_ERROR,
                }
            }
            res.status(STATUS_CODE_INTERNAL_SERVER_ERROR).json(body)
            logResponse(id, res, body)
        })
    }
})

////////////////////////////////////////////////////////////////////////////////
// Connect
////////////////////////////////////////////////////////////////////////////////

MongoClient.connect(MONGO_URL, { useUnifiedTopology: true }).then(client => {
    urlsDB = client.db(URLS_DB)
    http.createServer(app).listen(8005)
}).catch(error => {
    console.error(error)
    process.exit(1)
})
