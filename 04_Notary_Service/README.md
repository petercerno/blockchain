# Private Blockchain Notary Service

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

## POST Endpoints

### Request Validation

URL: http://localhost:8000/requestValidation

Required Parameters:

* `address`: Valid Bitcoin address (representing user's blockchain identity).

Allows users to submit validation requests using their wallet address.

**Example**:

```
curl -X "POST" "http://localhost:8000/requestValidation" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG"
}'
```

After submitting a request, the user will receive a response in JSON format
with a message to sign (in order to verify their blockchain identity).

**Example JSON Response**:

```
{
  "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
  "requestTimeStamp": "1538906173",
  "message": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG:1538906173:starRegistry",
  "validationWindow": 300
}
```

### Message Signature

URL: http://localhost:8000/message-signature/validate

Required Parameters:

* `address`: Valid Bitcoin address (representing user's blockchain identity).
* `signature`: Message signature from the previous validation response.

After receiving the response for the validation request, users can verify their
blockchain identity by signing a message with their wallet. Once they sign
the message, the application will validate their request and grant access
to register a star.

Note that users must verify their blockchain identity within the given
validation window. When re-submitting the validation request within the
validation window, the validation window will reduce until it expires.

**Example**:

```
curl -X "POST" "http://localhost:8000/message-signature/validate" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
  "signature": "H1oOdFYwz9qIZxxvByI0GSM+hNXgz1YuyeqWzP7raVmLKvN1Lrxcg5PwqbjYeco/hYf2Ed/UqYJB18IFJW3gxBI="
}'
```

**Example JSON Response**:

```
{
  "registerStar": true,
  "status": {
    "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
    "requestTimeStamp": "1538906173",
    "message": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG:1538906173:starRegistry",
    "validationWindow": 300,
    "messageSignature": "valid"
  }
}
```

### Star Registration

URL: http://localhost:8000/block

* `address`: Valid Bitcoin address (representing user's blockchain identity).
* `star`: JSON object representing a star.

Once users have verified their blockchain identity (by submitting a valid
message signature), they can register a star.

Note that users can register only one star per verified request.

**Example**:

```
curl -X "POST" "http://localhost:8000/block" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
  "star": {
    "dec": "-26° 29'\'' 24.9",
    "ra": "16h 29m 1.0s",
    "story": "Found star using https://www.google.com/sky/"
  }
}'
```

**Example JSON Response**:

```
{
  "hash": "2291a204c30f1012aa6898ddf6366b90a7fb5f5a596661e1aa399ca77a9f2d0e",
  "height": 2,
  "body": {
    "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
    "star": {
      "ra": "16h 29m 1.0s",
      "dec": "-26° 29' 24.9",
      "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
    }
  },
  "time": "1538907260",
  "previousBlockHash": "d475eb851be25aa17a183b30aac7814ea9c66d7df3a32142cf0b649552cf3975"
}
```

## GET Endpoints

### Star Lookup by Address

URL: http://localhost:8000/stars/address:[address]

Searches stars by blockchain wallet address.

**Example**:

```
curl "http://localhost:8000/stars/address:1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG"
```

**Example JSON Response**:

```
[
  {
    "hash": "2291a204c30f1012aa6898ddf6366b90a7fb5f5a596661e1aa399ca77a9f2d0e",
    "height": 2,
    "body": {
      "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
      "star": {
        "ra": "16h 29m 1.0s",
        "dec": "-26° 29' 24.9",
        "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f",
        "storyDecoded": "Found star using https://www.google.com/sky/"
      }
      },
    "time": "1538907260",
    "previousBlockHash": "d475eb851be25aa17a183b30aac7814ea9c66d7df3a32142cf0b649552cf3975"
  }
]
```

### Star Lookup by Block Hash

URL: http://localhost:8000/stars/hash:[hash]

Searches stars by block hash.

Returns status `404 Not Found` for unknown block hash.

**Example**:

```
curl "http://localhost:8000/stars/hash:2291a204c30f1012aa6898ddf6366b90a7fb5f5a596661e1aa399ca77a9f2d0e"
```

### Star Lookup by Block Height

URL: http://localhost:8000/block/[height]

Searches stars by block height.

Returns status `404 Not Found` for invalid block height.

**Example**:

```
curl "http://localhost:8000/block/2"
```

In both cases we get the following JSON response:

**Example JSON Response**:

```
{
  "hash": "2291a204c30f1012aa6898ddf6366b90a7fb5f5a596661e1aa399ca77a9f2d0e",
  "height": 2,
  "body": {
    "address": "1MGATqem3W69iPhrbJa4HFgRkr2vi8cdJG",
    "star": {
      "ra": "16h 29m 1.0s",
      "dec": "-26° 29' 24.9",
      "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f",
      "storyDecoded": "Found star using https://www.google.com/sky/"
    }
  },
  "time": "1538907260",
  "previousBlockHash": "d475eb851be25aa17a183b30aac7814ea9c66d7df3a32142cf0b649552cf3975"
}
```
