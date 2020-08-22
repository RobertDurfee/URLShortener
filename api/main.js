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
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

const convert = count => {
    const character = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    var id = ''
    while (count) {
        id = `${character[count % 62]}${id}`
        count = Math.trunc(count / 62)
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

const logResponse = (id, req, body) => {
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
        'id': req.params['resourceId']
    }).then(result => {
        if (result.value) {
            const body = {
                'id': `${result.value['id']}`,
                'url': `${result.value['url']}`
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
        res.status(INTERNAL_SERVER_ERROR).json(body)
        logResponse(id, res, body)
    })
})

// Method: urls.insert
app.post('/urls', (req, res) => {
    const id = uuid()
    logRequest(id, req)
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
