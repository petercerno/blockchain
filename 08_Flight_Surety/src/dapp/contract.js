import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import BigNumber from 'bignumber.js';
import Promise from 'promise'
import Web3 from 'web3';
// Note: TruffleContract does not work with MetaMask probably because of:
// https://github.com/MetaMask/metamask-extension/issues/1999
// import TruffleContract from 'truffle-contract'


export default class Contract {
  constructor() { }

  async initialize(network) {
    const config = Config[network];
    if (window.ethereum) {
      this.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error('User denied account access');
      }
    }
    else if (window.web3) {
      this.web3Provider = window.web3.currentProvider;
    } else {
      this.web3Provider = new Web3.providers.HttpProvider(config.url);
    }
    this.web3 = new Web3(this.web3Provider);
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi, config.appAddress);
  }

  static toNumber(bigNumber) {
    return new BigNumber(bigNumber).toNumber();
  };

  getFlightSuretyApp() {
    return this.flightSuretyApp;
  }

  async callTransaction(methodName, value, ...args) {
    const metamaskAccount = await this.getMetamaskAccountId();
    return await new Promise((resolve, reject) => {
      this.flightSuretyApp.methods[methodName](...args).call(
        { from: metamaskAccount, value: value },
        (error, result) => {
          if (error != null) {
            reject(error);
          } else {
            resolve(result);
          }
        });
    });
  }

  async sendTransaction(methodName, value, ...args) {
    const metamaskAccount = await this.getMetamaskAccountId();
    return new Promise((resolve, reject) => {
      this.flightSuretyApp.methods[methodName](...args).send(
        { from: metamaskAccount, value: value },
        (error, result) => {
          if (error != null) {
            reject(error);
          } else {
            resolve(result);
          }
        });
    });
  }

  async callAndSendTransaction(methodName, value, ...args) {
    let result = null;
    try {
      result = await this.callTransaction(methodName, value, ...args);
    } catch (error) { }
    await this.sendTransaction(methodName, value, ...args);
    return result;
  }

  async getBalance() {
    const metamaskAccount = await this.getMetamaskAccountId();
    return await this.web3.eth.getBalance(metamaskAccount);
  }

  async getAccounts() {
    return await new Promise((resolve, reject) => {
      this.web3.eth.getAccounts((error, accounts) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(accounts);
        }
      });
    });
  }

  async getMetamaskAccountId() {
    try {
      const accounts = await this.getAccounts();
      return accounts[0];
    } catch (err) {
      console.log('getMetamaskAccountId Error:', err);
    }
  }

  async isOperational() {
    return await this.callTransaction('isOperational', null);
  }

  async getFlight(flightIndex) {
    const flight = await this.callTransaction('getFlight', null, flightIndex);
    return {
      airline: flight.airline,
      airlineName: flight.airlineName,
      flightCode: flight.flight,
      flightTimestamp: Contract.toNumber(flight.timestamp),
      flightDeparture: flight.departure,
      flightDestination: flight.destination
    }
  }

  async getFlightLabels() {
    const flightCount = await this.callTransaction('getFlightCount', null);
    let flightLabels = [];
    for (let flightIndex = 0; flightIndex < flightCount; flightIndex++) {
      let flight = await this.getFlight(flightIndex);
      flightLabels.push(
        flight.flightCode + ' ' +
        flight.flightDeparture + ' -> ' +
        flight.flightDestination);
    }
    return flightLabels;
  }

  async registerAirline(airlineAddress, airlineName) {
    const result = await this.callAndSendTransaction(
      'registerAirline', null, airlineAddress, airlineName);
    return {
      success: result.success,
      voteCount: Contract.toNumber(result.voteCount)
    };
  }

  async fundAirline(airlineFundsEther) {
    const funds = Web3.utils.toWei(airlineFundsEther, 'ether').toString();
    await this.sendTransaction('fundAirline', funds);
  }

  async registerFlight(
    flightCode, flightTimestamp, flightDeparture, flightDestination) {
    await this.sendTransaction(
      'registerFlight', null,
      flightCode, flightTimestamp, flightDeparture, flightDestination);
  }

  async buyInsurance(flightIndex, insuranceEther) {
    const insurance = Web3.utils.toWei(insuranceEther, 'ether').toString();
    const flight = await this.callTransaction('getFlight', null, flightIndex);
    await this.sendTransaction('buyInsurance', insurance,
      flight.airline, flight.flight, Contract.toNumber(flight.timestamp));
  }

  async fetchFlightStatus(flightIndex) {
    const flight = await this.callTransaction('getFlight', null, flightIndex);
    await this.sendTransaction('fetchFlightStatus', null,
      flight.airline, flight.flight, Contract.toNumber(flight.timestamp));
  }

  async getInsureeCreditAndBalance() {
    const creditStr = Web3.utils.fromWei(
      await this.callTransaction('getInsureeCredit', null), 'ether');
    const balanceStr = Web3.utils.fromWei(
      await this.getBalance(), 'ether');
    return {
      credit: creditStr,
      balance: balanceStr
    };
  }

  async claimInsurancePayout() {
    await this.sendTransaction('claimInsurancePayout', null);
  }
}