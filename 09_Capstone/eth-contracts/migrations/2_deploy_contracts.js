const SquareVerifier = artifacts.require("./SquareVerifier.sol");
const SolnSquareVerifier = artifacts.require("./SolnSquareVerifier.sol");
const fs = require('fs');

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(SquareVerifier);
  await deployer.deploy(SolnSquareVerifier);
  const squareVerifier = await SquareVerifier.deployed();
  const solnSquareVerifier = await SolnSquareVerifier.deployed();
  await solnSquareVerifier.setVerifier(squareVerifier.address);

  const config = {
    network: network,
    SquareVerifierAddress: SquareVerifier.address,
    SolnSquareVerifierAddress: SolnSquareVerifier.address
  };
  fs.writeFileSync(__dirname + '/../config.json',
    JSON.stringify(config, null, '\t'), 'utf-8');
};
