import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import express from 'express';
import Tx from 'ethereumjs-tx';


const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

// Generated using:
// ganache-cli -a 50 -m 'famous hammer average again hurt warrior fiction pool steel patrol cigar nature'
//
// NOTE: These Oracle accounts start from index 16:
// (16) 0xbd91d6aa746eeb27f116ca7cadc8a70b35c2f525
// (17) 0xca333740fd905db8503b4b9a15e171e128eb74bf
// (18) 0xffca2439555b4bea7b9f60576855d995e463156c
// (19) 0x3dcc5885f84ede3d26a8f1b08a6022d50d429bf4
// (20) 0x0dafcdc7d61e5baab2e67661ca8b96572125a14d
// ...
// The first 16 accounts are reserved for other purposes
// (airlines, passengers, etc.).
const oracleAccounts = [
  ['0xbd91d6aa746eeb27f116ca7cadc8a70b35c2f525', '641fde7b7740bc5ad1ccb26ab952c27773f5700e0621925dea6f9d10c2679a39'],
  ['0xca333740fd905db8503b4b9a15e171e128eb74bf', '2c12b5fa88afdea743dd60cb64706e29a1ed07f9451983fc2c35cd11704326b7'],
  ['0xffca2439555b4bea7b9f60576855d995e463156c', '6bf75611282081c667c52a6fab9164ec4ea50a2b28e8a2a75e87fded0011d673'],
  ['0x3dcc5885f84ede3d26a8f1b08a6022d50d429bf4', 'd894b67905dd9bf142f7f652b38f6b52901c5bf3bab43b19cbb01140e2e700b1'],
  ['0x0dafcdc7d61e5baab2e67661ca8b96572125a14d', 'f4c96e9191fbe78feadb3a99fda61f356395699a7cb9a1f826a6a5b6cb7c32da'],
  ['0x04a349759949e0f4ee36e028b321d63f786690f5', '3803a4fcf932f08942eebfffcb29d782396f9ddf08abd08f7bd20a626d3a883d'],
  ['0x474a16016732aaa8b584bf943e0f057803d4fc6f', '84fed7acc27d891760230e42e3f40e73a1f6b296b43b5212f80fbb5315082c04'],
  ['0x18a7ed72aed498b76c3878c7ea2c0a6b75eaff23', 'ea79a97b87403c234f6acdc555d6f9ff9c56e983e66d109c8a3b90cce2242e16'],
  ['0x6780491647b5bcafa001a78352271869f37bc1bc', 'af8d94967ec27e616a51c9f8be1f709ef3bb01d873dd22a18206b05447e97aca'],
  ['0xbda15fdf6ec8c4e543e03e869086d0f46d81adb8', 'c479e1f295cb6fbcbe61b95990fbcbc45c78070154b34d4a1d9daff7b91b03a9'],
  ['0x96fa527fc79ec399b445ad1882eb7f2591c85eaa', 'e18f26a6bb01a037f0db69d5f4895899164dff8ab7b65266cc0600fe1ef9a68c'],
  ['0xd8081be713ed6eec4e5228caa1ee2e2c355c20ba', '6103af9a5c9a7e486d6f64244966f1d17e47fb39664ced878f128f8880626b44'],
  ['0x4e6138466944cc554c0245b50092bab6f809255c', '3441085133181497628bde108092a5f4d6ec5fab8cfd330b911aefcb812f7a8d'],
  ['0xfed4b6b75ba9d63b11b0fb612e70d22a0fe82e1f', '09d27d928665173897ad3e29629ebadf7a709a4f590e4740e851367a907cf8e3'],
  ['0xcab63248c39bc7a66ab80c77870c38cc940ff68f', 'ac14be73ec9454e403d8cb549d1eb6bdb6c598514bfea6cda4eb4f6f2a0fae0e'],
  ['0x5aeb5f2781ee89c6669ced15d67bf54a76b40724', 'c7bfcc401338de4253fd840da70aeba17736480a324dbdca6b7899099ebec1e0'],
  ['0xbb96ad9fa4699cc2f300f130cfd57b5aba178084', 'fe22269a8b4c19cce1468f89891de3193a7980ce23dbc93f1e1509b7182f2bf2'],
  ['0xeca3292648ac32cf2d86739f9958336c277fd8de', '4583b8f3ed9d8dd3d1dec93adeed1530f90a8fd81fff8e05c86d471bc9bb5d97'],
  ['0x80190ef95afd0b6c8020d2532f34df99a62acad8', '10af5d42996f8a6504b00545242eb9a9808fed8ae5e60815283e35e6b61f6154'],
  ['0xbe3ae7149fe674d5d01ccd420574bb3f0f135bfa', '7b0a46dc63b70e04f78d125fe72e1cdfb9b1a5a0f6aadb09c81e3097f97e7350'],
  ['0x1b9308cec00e740b6cf6e24f97f2928a886fa3e1', 'fa213f4748e29aa1c5d63cf8af1b608d8f6dbcf9cbb6b79623912056e26cdaee'],
  ['0x7997d58da2a56a23effc1856cb4922a75da73027', '2ed762769c6d10e3afd0fa2e9a792bca14ed41b04a4a5ef5c05cbee4538f447d'],
  ['0xede4742eb1c8216e28cf392708e1064ed1081a02', '8c51f6c5f55fdd03b8c158fd57da7d222fc44f4cd07c06319970865b8a21b78d'],
  ['0x58fb16f91ba70a9309e010f6c48ae05809f3e829', '1ce7234868f1d98e87eb155172dab4e370a2bea1ca58ac5b881ef35d98324f17'],
  ['0xd3f0e3f42520a2f470a927e72d39a5201366559f', 'bbd8c5a1bdcbba72e42c3bf6f11638b7ec4795c972e9ca59d810196486f3ff81'],
  ['0xd0db0242068769421063534e5ac5f40fa1d665db', '603f619746a2208f0095ea928ab0d9834beb6ab9cdfa50dae6811723af172cd1'],
  ['0x4946685fe71fcdb887865f658b36979a95794618', 'b39015ddff66920dc991e63effa4ff969065a6e5812bd535ed54a4411e55909f'],
  ['0x5ccc5a31fefa5a5108cf5ed057c081f36cdd6105', 'bd3ad2982ec3db8d6ae125e72260237b28d9442844a208857e103180f04548e8'],
  ['0x30221dc457712b5484e457eadad10c0927e6f02a', '3be8625412152b4127cba8c1ddc01ce491cda9ecbed18d46b04e6cee9c06c9cd'],
  ['0x50bb6abcdbe01976c241a56b4f8a5a5333d4212d', 'f98f45a63e367ac205179ddae116db47e0a08f7085277c33b350b882a0245ded'],
  ['0x3a82d5b5f61b74b4eace7e4ac3cf5a1f894e4d9a', 'ed969acb2655642a5f06da35a4fb311719571bb38eeffeac6d1519cc1f2bbc4c']
];
const NUM_ORACLES = 30;
let oracleIndexes = {};

const oracleMatchesRequestIndex = (oracleAccount, requestIndex) => {
  const indexes = oracleIndexes[oracleAccount];
  return (
    (requestIndex == indexes[0]) ||
    (requestIndex == indexes[1]) ||
    (requestIndex == indexes[2]));
}

const toNumber = (bigNumber) => {
  return new BigNumber(bigNumber).toNumber();
};

const callTransaction = async (methodName, address, ...args) => {
  return await new Promise((resolve, reject) => {
    flightSuretyApp.methods[methodName](...args).call(
      { from: address },
      (error, result) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(result);
        }
      });
  });
}

// Source: https://medium.com/coinmonks/ethereum-tutorial-sending-transaction-via-nodejs-backend-7b623b885707
const sendTransaction = async (
  address, privateKeyHex, methodName, value, ...args) => {
  return new Promise((resolve, reject) => {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    web3.eth.getTransactionCount(address).then((count) => {
      const rawTransaction = {
        from: address,
        gasPrice: Web3.utils.toHex(20e9),
        gasLimit: Web3.utils.toHex(2100000),
        to: config.appAddress,
        value: Web3.utils.toHex(value || 0),
        data: flightSuretyApp.methods[methodName](...args).encodeABI(),
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
  const registrationFeeStr = Web3.utils.toWei('1', 'ether').toString();
  for (let i = 0; i < NUM_ORACLES; i++) {
    try {
      const oracleAccount = oracleAccounts[i];
      const isRegistered = await callTransaction(
        'isRegisteredOracle', oracleAccount[0]);
      if (!isRegistered) {
        await sendTransaction(
          oracleAccount[0], oracleAccount[1],
          'registerOracle', registrationFeeStr);
      }
      const indexes = await callTransaction(
        'getOracleIndexes', oracleAccount[0]);
      const oracleIndex0 = toNumber(indexes[0]);
      const oracleIndex1 = toNumber(indexes[1]);
      const oracleIndex2 = toNumber(indexes[2]);
      oracleIndexes[oracleAccount[0]] = [
        oracleIndex0, oracleIndex1, oracleIndex2];
      // Logging
      if (!isRegistered) {
        console.log('Oracle:', oracleAccount[0], 'with indexes:',
          oracleIndexes[oracleAccount[0]], 'successfully registered');
      } else {
        console.log('Oracle:', oracleAccount[0], 'with indexes:',
          oracleIndexes[oracleAccount[0]], 'is already registered');
      }
    } catch (error) {
      console.log(error);
    }
  }
})();

flightSuretyApp.events.OracleRequest({}, async (error, event) => {
  if (error) {
    console.log(error);
    return;
  }
  const requestIndex = toNumber(event.returnValues.index);
  const requestAirline = event.returnValues.airline;
  const requestFlight = event.returnValues.flight;
  const requestTimestamp = toNumber(event.returnValues.timestamp);
  console.log(requestIndex, requestAirline, requestFlight, requestTimestamp);
  for (let i = 0; i < NUM_ORACLES; i++) {
    const oracleAccount = oracleAccounts[i];
    try {
      if (!oracleMatchesRequestIndex(oracleAccount[0], requestIndex)) {
        continue;
      }
      const isOpen = await callTransaction(
        'isOracleRequestOpen', oracleAccount[0],
        requestIndex, requestAirline, requestFlight, requestTimestamp);
      if (!isOpen) {
        console.log(
          'Oracle:', oracleAccount[0], 'skipped, request no longer open');
        continue;
      }
      const statusCode = 10 * Math.floor(Math.random() * Math.floor(6));
      await sendTransaction(
        oracleAccount[0], oracleAccount[1], 'submitOracleResponse', '0',
        requestIndex, requestAirline, requestFlight, requestTimestamp,
        statusCode);
      console.log(
        'Oracle:', oracleAccount[0], 'submitted statusCode:', statusCode);
    } catch (error) {
      console.log('Oracle:', oracleAccount[0], 'error:', error);
    }
  }
});

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;