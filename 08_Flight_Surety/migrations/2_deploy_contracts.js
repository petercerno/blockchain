const SafeMath = artifacts.require("SafeMath");
const FlightSuretyUtility = artifacts.require("FlightSuretyUtility");
const FlightSuretyStopLoss = artifacts.require("FlightSuretyStopLoss");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');


module.exports = async (deployer, _, accounts) => {
  await deployer.deploy(SafeMath);
  await deployer.deploy(FlightSuretyUtility);
  await deployer.link(SafeMath,
    [FlightSuretyStopLoss, FlightSuretyApp, FlightSuretyData]);
  await deployer.deploy(FlightSuretyData);
  await deployer.deploy(FlightSuretyApp);
  const flightSuretyData = await FlightSuretyData.deployed();
  const flightSuretyApp = await FlightSuretyApp.deployed();
  await flightSuretyApp.setDataContract(FlightSuretyData.address);
  await flightSuretyData.authorizeContract(FlightSuretyApp.address);
  // For convenience, register one airline and two flights.
  const ownerAccount = accounts[0];
  const airlineAccount1 = accounts[1];
  await flightSuretyApp.registerAirline(
    airlineAccount1, 'Swiss', { from: ownerAccount });
  const correctAirlineFee = web3.utils.toWei('10', 'ether').toString();
  await flightSuretyApp.fundAirline(
    { from: airlineAccount1, value: correctAirlineFee, gasPrice: '0' });
  await flightSuretyApp.registerFlight(
    'LX1484', 1554618600, 'ZRH', 'PRG', { from: airlineAccount1 });
  await flightSuretyApp.registerFlight(
    'LX1487', 1554900900, 'PRG', 'ZRH', { from: airlineAccount1 });
  const config = {
    localhost: {
      url: 'http://localhost:8545',
      dataAddress: FlightSuretyData.address,
      appAddress: FlightSuretyApp.address
    }
  };
  fs.writeFileSync(__dirname + '/../src/dapp/config.json',
    JSON.stringify(config, null, '\t'), 'utf-8');
  fs.writeFileSync(__dirname + '/../src/server/config.json',
    JSON.stringify(config, null, '\t'), 'utf-8');
}