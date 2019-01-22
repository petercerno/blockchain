# Decentralized Star Notary

## Installation

From the main project directory run:

```
npm install
```

Then:

```
cd smart_contracts
npm install
```

## Deploying to Local Development Network

Start the local development network (and use your `--mnemonic`):

```
ganache-cli
```

Run unit tests:

```
truffle test
```

Deploy the contract to the local development network:

```
truffle deploy
```

## Deploying to Rinkeby

Deploy the contract to Rinkeby network (already done):

```
truffle deploy --network rinkeby
```

Contract: `0xb4c8974eb3e25ec69003a4466877eddba660b2b3`

Rinkeby Etherscan [link](https://rinkeby.etherscan.io/address/0xb4c8974eb3e25ec69003a4466877eddba660b2b3)

## Executing `createStar`

Executing:

```
createStar(
    'Star power 103!', 'I love my wonderful star',
    'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', 1);
```

TxHash: `0x772766f01e4c54a3f09716f1bd8110ec8f303a6f19b27e6b4ac477dbb6537fc3`

Rinkeby Etherscan [link](https://rinkeby.etherscan.io/tx/0x772766f01e4c54a3f09716f1bd8110ec8f303a6f19b27e6b4ac477dbb6537fc3)

## Executing `putStarUpForSale`

```
putStarUpForSale(1, 100000000000000000)
```

TxHash: `0x530618f1c129a7b25bf025dd6be46cb4d8f6c1690192339ef64754a1b57ca2c0`

Rinkeby Etherscan [link](https://rinkeby.etherscan.io/tx/0x530618f1c129a7b25bf025dd6be46cb4d8f6c1690192339ef64754a1b57ca2c0)

## Frontend

Run:

```
node app.js
```

Frontend is then available at: [`http://localhost:8000/`](http://localhost:8000/)

## GET Endpoint

Executing:

```
curl http://localhost:8000/star/1
```

Output:

```
["Star power 206!","I love my wonderful star","ra_032.155","dec_121.874","mag_245.978","orion"]
```
