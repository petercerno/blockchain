# RESTful Web API with Node.js

Used Node.js framework: [Express](https://expressjs.com/)

## Deployment

Installation:

```
npm install
```

Running the server:

```
node app.js
```

## Endpoints

### GET Block Endpoint

URL: http://localhost:8000/block/0

The response for the endpoint provides a block object in JSON format for the given height.

**Example**:

`curl -i http://localhost:8000/block/0`

```
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 179
ETag: W/"b3-fPVMYTfQp5v0y7EXKTbkrZsW3n4"
Date: Sat, 22 Sep 2018 19:48:18 GMT
Connection: keep-alive

{"hash":"361362afa6dbb442bbeb67c8eb807d4226fa3b74a81d8a192f42582ddf2297f1","height":0,"body":"First block in the chain - Genesis block","time":"1537609448","previousBlockHash":""}
```

Returns status `404 Not Found` for invalid block height.

### POST Block Endpoint

URL: http://localhost:8000/block

Allows posting a new block with the data payload option (to add data to the block body). The response for the endpoint is the added block object in JSON format.

**Example**:

URL-encoded body:

`curl -i -d "body=Hello" -X POST http://localhost:8000/block`

JSON-encoded body:

`curl -i -d '{"body":"World"}' -H "Content-Type: application/json" -X POST http://localhost:8000/block`

Returns status `403 Forbidden` for the empty body.