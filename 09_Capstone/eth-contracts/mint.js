const SolnSquareVerifier = require('./build/contracts/SolnSquareVerifier.json');
const Config = require('./config.json');
const Proofs = require('./proofs.json');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');


let provider = null;
if (Config.network == 'development') {
  provider = new Web3.providers.WebsocketProvider(
    'ws://127.0.0.1:8545');
} else if (Config.network == 'rinkeby') {
  provider = new Web3.providers.HttpProvider(
    'https://rinkeby.infura.io/v3/1ee94f399b964bd5bff8c194b2e4fb4f')
} else {
  throw new Error('Unknown network: ' + Config.network);
}

const web3 = new Web3(provider);
const solnSquareVerifier = new web3.eth.Contract(
  SolnSquareVerifier.abi, Config.SolnSquareVerifierAddress);

// Generated using:
// ganache-cli -a 50 -m 'famous hammer average again hurt warrior fiction pool steel patrol cigar nature'
const accounts = [
  ['0x38fe57b50464e61387c416fc4b058fde1db29570', 'ae048c9840b71f75d39d7a7a8cfa980e80baf47035a707c7a9f442f5884d395c'],
  ['0xf67a3cc3add066b283a2995d82ac132ddb8dc1e2', 'a9c97c4738775b674b8afbe373a03fae98f58493eadb3d73471dca47ed9135dd'],
  ['0x27de43a88d853bf8a093961f69557032b8be2e5a', '29d0c19952d00fce9a9dd0c3b2c85c9c38555da72e5f082c0fe51f7b7b888bc0'],
  ['0x979101a0351e7a388f87eaa66fa75373331a6257', 'e14c25884d98ae9e5b730d484a4d634b486e04f12c5eacc71023d1f4a96290de'],
  ['0x84f22a7d2054bcc9592b578aa2c3f0739c8d4f05', '9b153285376e097511cec191444d16ba94529448c8feff9c6aef9ede72847053'],
  ['0x8a984017bbed06c288729da13c8306b77a65cfe2', 'c0b325afbb7192de90d054257673f8de18facc62ba7314800dc6de138e1cdd0c'],
  ['0x051e2eca973f4f49fdc90f334063e01ed4910cd4', 'ef3631e23afc16f1d49d923ac6de7f609f2f03b190ddfd5c94f89c8199f9e097'],
  ['0x7137d1d367a005ec7d853f7a81afd4b87fd64b6a', '3b174f7ed128fb30394bfa77caeebc51fb6f1b86a6b2a27774d18c0bcf327a6b'],
  ['0xfd45684acf8d69d36a545fc09b2578dd1c74972d', 'f558487ada0e0da3a5f67bebf82ffa059c2210fbdabac529b5ad452c6ebb46a1'],
  ['0x107526407e1f90bf376090d2f9caa14d1a28d275', '1eacc36b0257fe54c3b49499bb17cd6353f2a44ab4e797526b6e373400f67be1'],
  ['0x0f22dc5baec9d09dfd77456f6d45760a32759b81', 'a9c0ee6ad111f8d0ab391ef4856f408299fe16e629bb46dd0efef1e85fa1d9d6'],
  ['0x14b5ece28bdfed6a42115c402e934c81215e8509', '983b7146c396230be84b919c848510b2a0f3c5511adc8da652daa4b1a4bfd82c'],
  ['0x359b2bf73e35e547e7e9476082a0756d34375459', '1a2750105946b778f333aa8605309b2a3f3c6c7851cf8bed937a43757d6e6293'],
  ['0xf87c1faa2497f1160634499e1ae4a7cea2dc0bb4', '7f0c28f3f163c01f51342d944157523803f29e27d7cf3d7d2e6e7a9499d810be'],
  ['0xefbf3e693c1f1be5fda20006d4e6be4b344012fc', 'd31e4feecab241c98afb905cd29179681edb9a045dc51fb00332675539b8a73f'],
  ['0x1f3bbb933e03b1925739b1e8c71a00a8a48b6a29', '6f849e0eba06d9f264e87c1290322aeed7f35859ab236c5564d9704b65c965cd'],
  ['0xbd91d6aa746eeb27f116ca7cadc8a70b35c2f525', '641fde7b7740bc5ad1ccb26ab952c27773f5700e0621925dea6f9d10c2679a39'],
  ['0xca333740fd905db8503b4b9a15e171e128eb74bf', '2c12b5fa88afdea743dd60cb64706e29a1ed07f9451983fc2c35cd11704326b7'],
  ['0xffca2439555b4bea7b9f60576855d995e463156c', '6bf75611282081c667c52a6fab9164ec4ea50a2b28e8a2a75e87fded0011d673'],
  ['0x3dcc5885f84ede3d26a8f1b08a6022d50d429bf4', 'd894b67905dd9bf142f7f652b38f6b52901c5bf3bab43b19cbb01140e2e700b1']
]

// Source: https://medium.com/coinmonks/ethereum-tutorial-sending-transaction-via-nodejs-backend-7b623b885707
const sendTransaction = async (
  address, privateKeyHex, methodName, value, ...args) => {
  return new Promise((resolve, reject) => {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    web3.eth.getTransactionCount(address).then((count) => {
      const rawTransaction = {
        from: address,
        gasPrice: Web3.utils.toHex(20e9),
        gasLimit: Web3.utils.toHex(4200000),
        to: Config.SolnSquareVerifierAddress,
        value: Web3.utils.toHex(value || 0),
        data: solnSquareVerifier.methods[methodName](...args).encodeABI(),
        nonce: Web3.utils.toHex(count)
      };
      // Creating transaction via ethereumjs-tx
      const transaction = new Tx(rawTransaction);
      transaction.sign(privateKey);
      // Sending transaction via web3 module
      web3.eth.sendSignedTransaction(
        '0x' + transaction.serialize().toString('hex'))
        .on('receipt', resolve)
        .catch(reject);
    }).catch(reject);
  });
}

(async () => {

  // Mint tokens
  const ownerAccount = accounts[0];
  for (let i = 0; i < Proofs.length; i++) {

    const proof = Proofs[i];
    const A = proof['proof']['A'];
    const A_p = proof['proof']['A_p'];
    const B = proof['proof']['B'];
    const B_p = proof['proof']['B_p'];
    const C = proof['proof']['C'];
    const C_p = proof['proof']['C_p'];
    const H = proof['proof']['H'];
    const K = proof['proof']['K'];
    const input = proof['input'];

    const userAccount = accounts[i];
    const tokenId = i + 1;

    try {
      await sendTransaction(
        userAccount[0], userAccount[1], 'submitSolution', '0',
        A, A_p, B, B_p, C, C_p, H, K, input);
      await sendTransaction(
        ownerAccount[0], ownerAccount[1], 'mint', '0',
        userAccount[0], tokenId);
      console.log('Minting tokenId:', tokenId, 'done!');
    } catch (error) {
      console.log('Minting tokenId:', tokenId, 'failed! Error:', error);
    }
  }

  process.exit();
})();
