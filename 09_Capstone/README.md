# Udacity Blockchain Capstone

The capstone project builds a decentralized housing product token called
*Real Estate Token* (RET). It is an ERC-721 Non-Fungible Token with optional
metadata (inheriting from the [`ERC721Metadata`](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC721/ERC721Metadata.sol) contract).
This token is compatible with the [OpenSea Marketplace](https://opensea.io/).

## Installation

From the main project directory run:

```
npm install
```

### ZoKrates Setup

We use [`ZoKrates`](https://github.com/Zokrates/ZoKrates) version `0.3.3`,
which can be installed as follows:

```
docker pull zokrates/zokrates:0.3.3
```

We have generated the `SquareVerifier` contract as follows
(from the main project directory):

```
docker run -v $(pwd):/home/zokrates/code -ti zokrates/zokrates:0.3.3 /bin/bash
cd code/zokrates/code/square

~/zokrates compile -i square.code
~/zokrates setup
~/zokrates compute-witness -a 69 4761
~/zokrates generate-proof
~/zokrates export-verifier
```

To generate more proofs, just run:

```
~/zokrates generate-proof
```

## Unit Testing on Local Development Network

Start the local development network:

```
ganache-cli -a 50
```

Run the unit tests from the directory `eth-contracts` as follows:

```
truffle test
```

## Deploying to Local Development Network

Start the local development network:

```
ganache-cli -a 50 -m 'famous hammer average again hurt warrior fiction pool steel patrol cigar nature'
```

**NOTE**: You need to use the above mnemonic in order for minting to work properly.

From the directory `eth-contracts`, run the migration scripts as follows:

```
truffle migrate
```

The first account:

```
(0) 0x38fe57b50464e61387c416fc4b058fde1db29570
```

Is the contract owner account of both the `SolnSquareVerifier` and
`SquareVerifier` contracts.

The migration script automatically connects these two contracts.
It also outputs the file `config.json` to the main directory, which
holds the addresses of these two deployed contracts.

## Deploying to Rinkeby Network

From the directory `eth-contracts` run the migration scripts as follows:

```
truffle migrate --network rinkeby
```

Note that we have already run this script. You can find the deployed contracts
here:

* [`SquareVerifier @ 0xCc58b798820Da93CBE36393b2C3701F100dE0027`](https://rinkeby.etherscan.io/address/0xCc58b798820Da93CBE36393b2C3701F100dE0027)
* [`SolnSquareVerifier @ 0x1F1f77F9C7bcE0FCE75Fa96483309277c64e978D`](https://rinkeby.etherscan.io/address/0x1F1f77F9C7bcE0FCE75Fa96483309277c64e978D)

## Minting New Tokens

From the main directory run:

```
node mint.js
```

It uses the proofs from the file `proofs.json`.

We have already run this script on Rinkeby network and minted 10 tokens:

* `tokenId`:
[`[1]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/1),
[`[2]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/2),
[`[3]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/3),
[`[4]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/4),
[`[5]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/5),
[`[6]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/6),
[`[7]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/7),
[`[8]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/8),
[`[9]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/9),
[`[10]`](https://rinkeby.opensea.io/assets/0x1f1f77f9c7bce0fce75fa96483309277c64e978d/10).

You can find all these tokens on the OpenSea
[Real Estate Token Marketplace](https://rinkeby.opensea.io/assets/realestatetoken).

We have listed the first 5 tokens on the marketplace. All these 5 tokens were
purchased and are now owned by the account:
[`0x8a984017bBeD06C288729da13c8306B77A65CFe2`](https://rinkeby.opensea.io/accounts/0x8a984017bbed06c288729da13c8306b77a65cfe2).
