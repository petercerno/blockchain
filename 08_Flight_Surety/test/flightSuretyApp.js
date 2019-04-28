const FlightSuretyApp = artifacts.require('FlightSuretyApp');
const FlightSuretyData = artifacts.require('FlightSuretyData');
const BigNumber = require('bignumber.js');

contract('FlightSuretyApp', (accounts) => {
  const ownerAccount = accounts[0];
  const adminAccount1 = accounts[1];
  const adminAccount2 = accounts[2];
  const adminAccount3 = accounts[3];
  const adminAccount4 = accounts[4];
  const airlineAccount1 = accounts[5];
  const airlineAccount2 = accounts[6];
  const airlineAccount3 = accounts[7];
  const airlineAccount4 = accounts[8];
  const airlineAccount5 = accounts[9];
  const insureeAccount1 = accounts[10];
  const insureeAccount2 = accounts[11];
  const otherAccount1 = accounts[13];
  const otherAccount2 = accounts[14];
  const oracleAccount1 = accounts[15];

  // List of additional oracle accounts.
  // The probability that an oracle will be able to answer a request is 30%.
  // Therefore, we expect 0.3 x NUM_ORACLES = 6 answering oracles per request.
  const NUM_ORACLES = 20;
  let oracleAccounts = [];

  // Enumeration of oracle status codes.
  const OracleStatusCode = {
    STATUS_CODE_UNKNOWN: 0,
    STATUS_CODE_ON_TIME: 10,
    STATUS_CODE_LATE_AIRLINE: 20,
    STATUS_CODE_LATE_WEATHER: 30,
    STATUS_CODE_LATE_TECHNICAL: 40,
    STATUS_CODE_LATE_OTHER: 50,
  };

  // FlightSuretyApp contract instance.
  let flightSuretyApp = null;

  // FlightSuretyData contract instance.
  let flightSuretyData = null;

  // List of requests for oracles to fetch flight information.
  let oracleRequests = [];

  // Converts the given BigNumber to a number.
  const toNumber = (bigNumber) => {
    return new BigNumber(bigNumber).toNumber();
  };

  // Converts the given BigNumber to a string.
  const toString = (bigNumber) => {
    return new BigNumber(bigNumber).toString();
  };

  // Asserts that the given promise fails.
  const expectThrow = async (promise) => {
    try {
      await promise;
    } catch (error) {
      assert.exists(error);
      return;
    }
    assert.fail('Expected an error but did not see any!');
  };

  const disableOperatingStatus = async () => {
    let success = await flightSuretyApp.setOperatingStatus.call(
      false, { from: adminAccount1 });
    await flightSuretyApp.setOperatingStatus(false, { from: adminAccount1 });
    assert.isFalse(success, 'Not enough votes to set the operating status');
    success = await flightSuretyApp.setOperatingStatus.call(
      false, { from: adminAccount2 });
    await flightSuretyApp.setOperatingStatus(false, { from: adminAccount2 });
    assert.isTrue(success, 'Enough votes to set the operating status');
  };

  const enableOperatingStatus = async () => {
    let success = await flightSuretyApp.setOperatingStatus.call(
      true, { from: adminAccount3 });
    await flightSuretyApp.setOperatingStatus(true, { from: adminAccount3 });
    assert.isFalse(success, 'Not enough votes to set the operating status');
    success = await flightSuretyApp.setOperatingStatus.call(
      true, { from: adminAccount4 });
    await flightSuretyApp.setOperatingStatus(true, { from: adminAccount4 });
    assert.isTrue(success, 'Enough votes to set the operating status');
  };

  before('setup data contract', async () => {
    flightSuretyApp = await FlightSuretyApp.new();
    flightSuretyData = await FlightSuretyData.new();
    await flightSuretyApp.registerAdmin(adminAccount1, { from: ownerAccount });
    await flightSuretyApp.registerAdmin(adminAccount2, { from: ownerAccount });
    await flightSuretyApp.registerAdmin(adminAccount3, { from: ownerAccount });
    await flightSuretyApp.registerAdmin(adminAccount4, { from: ownerAccount });
    await flightSuretyApp.setDataContract(
      flightSuretyData.address, { from: ownerAccount });
    await flightSuretyData.authorizeContract(
      flightSuretyApp.address, { from: ownerAccount });
  });

  describe('testing airlines', () => {
    it('owner can register the first airline', async () => {
      // Requires owner to register the first airline.
      await expectThrow(flightSuretyApp.registerAirline(
        airlineAccount1, 'Swiss', { from: adminAccount1 }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.registerAirline(
        airlineAccount1, 'Swiss', { from: ownerAccount }));
      await enableOperatingStatus();
      // Owner can register the first airline.
      let result = await flightSuretyApp.registerAirline.call(
        airlineAccount1, 'Swiss', { from: ownerAccount });
      assert.isTrue(result.success, 'registerAirline failed');
      assert.equal(toNumber(result.voteCount), 1, 'Only 1 vote required');
      await flightSuretyApp.registerAirline(
        airlineAccount1, 'Swiss', { from: ownerAccount });
      let isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      let isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
    });

    it('owner cannot register already registered airline', async () => {
      await expectThrow(flightSuretyApp.registerAirline(
        airlineAccount1, 'Swiss', { from: ownerAccount }));
    });

    it('owner cannot register the second airline', async () => {
      await expectThrow(flightSuretyApp.registerAirline(
        airlineAccount2, 'Austrian', { from: ownerAccount }));
    });

    it('non-funded airline cannot register the second airline', async () => {
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount2, 'Austrian', { from: airlineAccount1 }));
    });

    it('registered airline can pay airline fee to get funded', async () => {
      const correctAirlineFee = web3.utils.toWei('10', 'ether').toString();
      const wrongAirlineFee = web3.utils.toWei('5', 'ether').toString();
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.fundAirline(
        { from: airlineAccount1, value: correctAirlineFee, gasPrice: '0' }));
      await enableOperatingStatus();
      // Airline cannot pay wrong fee.
      await expectThrow(flightSuretyApp.fundAirline(
        { from: airlineAccount1, value: wrongAirlineFee, gasPrice: '0' }));
      // Airline can pay correct fee.
      const airlineBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(airlineAccount1));
      const contractBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      await flightSuretyApp.fundAirline(
        { from: airlineAccount1, value: correctAirlineFee, gasPrice: '0' });
      const airlineBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(airlineAccount1));
      const contractBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      assert.equal(
        airlineBalanceBeforeTransaction.minus(correctAirlineFee).toString(),
        airlineBalanceAfterTransaction.toString(), 'Invalid airline balance');
      assert.equal(
        contractBalanceBeforeTransaction.plus(correctAirlineFee).toString(),
        contractBalanceAfterTransaction.toString(), 'Invalid contract balance');
      let isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isTrue(isFunded, 'Airline is not funded');
    });

    it('non-registered airline cannot pay airline fee', async () => {
      const correctAirlineFee = web3.utils.toWei('10', 'ether').toString();
      await expectThrow(flightSuretyApp.fundAirline(
        { from: airlineAccount2, value: correctAirlineFee, gasPrice: '0' }));
    });

    it('funded airline cannot pay airline fee again', async () => {
      const correctAirlineFee = web3.utils.toWei('10', 'ether').toString();
      await expectThrow(flightSuretyApp.fundAirline(
        { from: airlineAccount1, value: correctAirlineFee, gasPrice: '0' }));
    });

    it('funded airline can register the second, third, and fourth airline', async () => {
      // Second airline.
      let result = await flightSuretyApp.registerAirline.call(
        airlineAccount2, 'Austrian', { from: airlineAccount1 });
      assert.isTrue(result.success, 'registerAirline failed');
      assert.equal(toNumber(result.voteCount), 1, 'Only 1 vote required');
      await flightSuretyApp.registerAirline(
        airlineAccount2, 'Austrian', { from: airlineAccount1 });
      let isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      let isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
      // Third airline.
      result = await flightSuretyApp.registerAirline.call(
        airlineAccount3, 'KLM', { from: airlineAccount1 });
      assert.isTrue(result.success, 'registerAirline failed');
      assert.equal(toNumber(result.voteCount), 1, 'Only 1 vote required');
      await flightSuretyApp.registerAirline(
        airlineAccount3, 'KLM', { from: airlineAccount1 });
      isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount3, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount3, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
      // Fourth airline.
      result = await flightSuretyApp.registerAirline.call(
        airlineAccount4, 'Emirates', { from: airlineAccount1 });
      assert.isTrue(result.success, 'registerAirline failed');
      assert.equal(toNumber(result.voteCount), 1, 'Only 1 vote required');
      await flightSuretyApp.registerAirline(
        airlineAccount4, 'Emirates', { from: airlineAccount1 });
      isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount4, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount4, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
    });

    it('single funded airline cannot register the fifth airline', async () => {
      let result = await flightSuretyApp.registerAirline.call(
        airlineAccount5, 'Lufthansa', { from: airlineAccount1 });
      assert.isFalse(result.success, 'registerAirline succeeded');
      assert.equal(toNumber(result.voteCount), 1, 'Only 1 vote given');
      await flightSuretyApp.registerAirline(
        airlineAccount5, 'Lufthansa', { from: airlineAccount1 });
      let isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount5, { from: otherAccount1 });
      assert.isFalse(isRegistered, 'Airline is registered');
      let isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount5, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
    });

    it('two funded airlines can register the fifth airline', async () => {
      const correctAirlineFee = web3.utils.toWei('10', 'ether').toString();
      const airlineBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(airlineAccount2));
      const contractBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      await flightSuretyApp.fundAirline(
        { from: airlineAccount2, value: correctAirlineFee, gasPrice: '0' });
      const airlineBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(airlineAccount2));
      const contractBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      assert.equal(
        airlineBalanceBeforeTransaction.minus(correctAirlineFee).toString(),
        airlineBalanceAfterTransaction.toString(), 'Invalid airline balance');
      assert.equal(
        contractBalanceBeforeTransaction.plus(correctAirlineFee).toString(),
        contractBalanceAfterTransaction.toString(), 'Invalid contract balance');
      let isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isTrue(isFunded, 'Airline is not funded');
      let result = await flightSuretyApp.registerAirline.call(
        airlineAccount5, 'Lufthansa', { from: airlineAccount2 });
      assert.isTrue(result.success, 'registerAirline succeeded');
      assert.equal(toNumber(result.voteCount), 2, '2 votes given');
      await flightSuretyApp.registerAirline(
        airlineAccount5, 'Lufthansa', { from: airlineAccount2 });
      let isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount5, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount5, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
    });
  });

  describe('testing flights', () => {
    it('airline can register a flight', async () => {
      let flightCount = await flightSuretyApp.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 0, 'No registered flights');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyApp.getFlight(0));
      // Requires airline account.
      await expectThrow(flightSuretyApp.registerFlight(
        'LX1484', 1554618600, 'ZRH', 'PRG', { from: adminAccount1 }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.registerFlight(
        'LX1484', 1554618600, 'ZRH', 'PRG', { from: airlineAccount1 }));
      await enableOperatingStatus();
      // Airline can register a flight.
      await flightSuretyApp.registerFlight(
        'LX1484', 1554618600, 'ZRH', 'PRG', { from: airlineAccount1 });
      flightCount = await flightSuretyApp.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 1, 'Registered one flight');
      let flight = await flightSuretyApp.getFlight.call(0);
      assert.equal(flight.airline, airlineAccount1, 'Invalid airline');
      assert.equal(flight.airlineName, 'Swiss', 'Invalid airlineName');
      assert.equal(flight.flight, 'LX1484', 'Invalid flight code');
      assert.equal(toNumber(flight.timestamp), 1554618600, 'Invalid timestamp');
      assert.equal(flight.departure, 'ZRH', 'Invalid departure');
      assert.equal(flight.destination, 'PRG', 'Invalid destination');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyApp.getFlight(-1));
      await expectThrow(flightSuretyApp.getFlight(1));
    });

    it('airline can register another flight', async () => {
      await flightSuretyApp.registerFlight(
        'LX1487', 1554900900, 'PRG', 'ZRH', { from: airlineAccount1 });
      let flightCount = await flightSuretyApp.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 2, 'Registered two flights');
      let flight = await flightSuretyApp.getFlight.call(1);
      assert.equal(flight.airline, airlineAccount1, 'Invalid airline');
      assert.equal(flight.airlineName, 'Swiss', 'Invalid airlineName');
      assert.equal(flight.flight, 'LX1487', 'Invalid flight code');
      assert.equal(toNumber(flight.timestamp), 1554900900, 'Invalid timestamp');
      assert.equal(flight.departure, 'PRG', 'Invalid departure');
      assert.equal(flight.destination, 'ZRH', 'Invalid destination');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyApp.getFlight(-1));
      await expectThrow(flightSuretyApp.getFlight(2));
    });
  });

  describe('testing insurances', () => {
    it('insuree can buy a flight insurance', async () => {
      const insurancePriceStr = web3.utils.toWei('500', 'finney').toString();
      const exceededPriceStr = web3.utils.toWei('2', 'ether').toString();
      const flightKey = await flightSuretyApp.getFlightKey.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 0, 'No registered insurances');
      // Cannot access out-of-bound flight insurance indices.
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, 0));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount1, value: insurancePriceStr, gasPrice: '0' }));
      await enableOperatingStatus();
      // Cannot buy zero value insurance.
      await expectThrow(flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount1, value: '0', gasPrice: '0' }));
      // Cannot exceed maximum allowed insurance value.
      await expectThrow(flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount1, value: exceededPriceStr, gasPrice: '0' }));
      // Insuree can buy insurance.
      const insureeBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      const contractBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      await flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount1, value: insurancePriceStr, gasPrice: '0' });
      const insureeBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      const contractBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      assert.equal(
        insureeBalanceBeforeTransaction.minus(insurancePriceStr).toString(),
        insureeBalanceAfterTransaction.toString(), 'Invalid insuree balance');
      assert.equal(
        contractBalanceBeforeTransaction.plus(insurancePriceStr).toString(),
        contractBalanceAfterTransaction.toString(), 'Invalid contract balance');
      insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 1, 'One registered insurance');
      // Cannot access out-of-bound flight insurance indices.
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, -1));
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, 1));
      let insurance =
        await flightSuretyData.getFlightInsurance.call(flightKey, 0);
      assert.equal(insurance.insuree, insureeAccount1,
        'Invalid insuree');
      assert.equal(insurance.insurance.toString(), insurancePriceStr,
        'Invalid insurance value');
    });

    it('insuree cannot buy the same flight insurance', async () => {
      const insurancePriceStr = web3.utils.toWei('250', 'finney').toString();
      await expectThrow(flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount1, value: insurancePriceStr, gasPrice: '0' }));
    });

    it('insuree can buy another flight insurance', async () => {
      const insurancePriceStr = web3.utils.toWei('250', 'finney').toString();
      const flightKey = await flightSuretyApp.getFlightKey.call(
        airlineAccount1, 'LX1487', 1554900900, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 0, 'No registered insurances');
      await flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1487', 1554900900,
        { from: insureeAccount1, value: insurancePriceStr, gasPrice: '0' });
      insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 1, 'One registered insurance');
      // Cannot access out-of-bound flight insurance indices.
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, -1));
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, 1));
      let insurance =
        await flightSuretyData.getFlightInsurance.call(flightKey, 0);
      assert.equal(insurance.insuree, insureeAccount1,
        'Invalid insuree');
      assert.equal(insurance.insurance.toString(), insurancePriceStr,
        'Invalid insurance value');
    });

    it('another insuree can buy the same flight insurance', async () => {
      const insurancePriceStr = web3.utils.toWei('750', 'finney').toString();
      const flightKey = await flightSuretyApp.getFlightKey.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 1, 'One registered insurance');
      await flightSuretyApp.buyInsurance(
        airlineAccount1, 'LX1484', 1554618600,
        { from: insureeAccount2, value: insurancePriceStr, gasPrice: '0' });
      insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 2, 'Two registered insurances');
      // Cannot access out-of-bound flight insurance indices.
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, -1));
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, 2));
      let insurance =
        await flightSuretyData.getFlightInsurance.call(flightKey, 1);
      assert.equal(insurance.insuree, insureeAccount2,
        'Invalid insuree');
      assert.equal(insurance.insurance.toString(), insurancePriceStr,
        'Invalid insurance value');
    });
  });

  describe('testing oracles', () => {
    it('anyone can generate a request to fetch flight information', async () => {
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.fetchFlightStatus(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 }));
      await enableOperatingStatus();
      // Only registered flights are allowed.
      await expectThrow(flightSuretyApp.fetchFlightStatus(
        airlineAccount5, 'XX007', 1554618600, { from: otherAccount1 }));
      // Anyone can generate a request to fetch flight information.
      await flightSuretyApp.fetchFlightStatus(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      const events = await flightSuretyApp.getPastEvents('OracleRequest');
      const eventOracleRequestEmitted = (events.length == 1);
      assert.isTrue(eventOracleRequestEmitted,
        'OracleRequest event not emitted');
      const eventIndex = toNumber(events[0].args.index);
      const eventAirline = events[0].args.airline;
      const eventFlight = events[0].args.flight;
      const eventTimestamp = toNumber(events[0].args.timestamp);
      assert.isAtLeast(eventIndex, 0, 'Invalid event index');
      assert.isAtMost(eventIndex, 9, 'Invalid event index');
      assert.equal(eventAirline, airlineAccount1, 'Invalid event airline');
      assert.equal(eventFlight, 'LX1484', 'Invalid event flight code');
      assert.equal(eventTimestamp, 1554618600,
        'Invalid event flight timestamp');
      const isOpen = await flightSuretyApp.isOracleRequestOpen(
        eventIndex, eventAirline, eventFlight, eventTimestamp,
        { from: otherAccount1 });
      assert.isTrue(isOpen, 'Oracle request is not open');
      oracleRequests.push({
        index: eventIndex,
        airline: eventAirline,
        flight: eventFlight,
        timestamp: eventTimestamp
      });
    });

    it('anyone can generate a request to fetch another flight information', async () => {
      await flightSuretyApp.fetchFlightStatus(
        airlineAccount1, 'LX1487', 1554900900, { from: otherAccount2 });
      const events = await flightSuretyApp.getPastEvents('OracleRequest');
      const eventOracleRequestEmitted = (events.length == 1);
      assert.isTrue(eventOracleRequestEmitted,
        'OracleRequest event not emitted');
      const eventIndex = toNumber(events[0].args.index);
      const eventAirline = events[0].args.airline;
      const eventFlight = events[0].args.flight;
      const eventTimestamp = toNumber(events[0].args.timestamp);
      assert.isAtLeast(eventIndex, 0, 'Invalid eventIndex');
      assert.isAtMost(eventIndex, 9, 'Invalid eventIndex');
      assert.equal(eventAirline, airlineAccount1, 'Invalid airline');
      assert.equal(eventFlight, 'LX1487', 'Invalid flight code');
      assert.equal(eventTimestamp, 1554900900, 'Invalid flight timestamp');
      const isOpen = await flightSuretyApp.isOracleRequestOpen(
        eventIndex, eventAirline, eventFlight, eventTimestamp,
        { from: otherAccount1 });
      assert.isTrue(isOpen, 'Oracle request is not open');
      oracleRequests.push({
        index: eventIndex,
        airline: eventAirline,
        flight: eventFlight,
        timestamp: eventTimestamp
      });
    });

    it('anyone can register as oracle', async () => {
      const insufficientFeeStr = web3.utils.toWei('750', 'finney').toString();
      const registrationFeeStr = web3.utils.toWei('1', 'ether').toString();
      let isRegistered = await flightSuretyApp.isRegisteredOracle.call(
        { from: oracleAccount1 });
      assert.isFalse(isRegistered, 'Oracle is registered');
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.registerOracle(
        { from: oracleAccount1, value: registrationFeeStr, gasPrice: '0' }));
      await enableOperatingStatus();
      // Requires sufficient registration fee.
      await expectThrow(flightSuretyApp.registerOracle(
        { from: oracleAccount1, value: insufficientFeeStr, gasPrice: '0' }));
      const oracleBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(oracleAccount1));
      const contractBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      await flightSuretyApp.registerOracle(
        { from: oracleAccount1, value: registrationFeeStr, gasPrice: '0' });
      isRegistered = await flightSuretyApp.isRegisteredOracle.call(
        { from: oracleAccount1 });
      assert.isTrue(isRegistered, 'Oracle not registered');
      const oracleBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(oracleAccount1));
      const contractBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      assert.equal(
        oracleBalanceBeforeTransaction.minus(registrationFeeStr).toString(),
        oracleBalanceAfterTransaction.toString(), 'Invalid oracle balance');
      assert.equal(
        contractBalanceBeforeTransaction.plus(registrationFeeStr).toString(),
        contractBalanceAfterTransaction.toString(), 'Invalid contract balance');
    });

    it('oracle cannot be registered twice', async () => {
      const registrationFeeStr = web3.utils.toWei('1', 'ether').toString();
      let isRegistered = await flightSuretyApp.isRegisteredOracle.call(
        { from: oracleAccount1 });
      assert.isTrue(isRegistered, 'Oracle not registered');
      await expectThrow(flightSuretyApp.registerOracle(
        { from: oracleAccount1, value: registrationFeeStr, gasPrice: '0' }));
    });

    it('oracle can retrieve its indexes', async () => {
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyApp.getOracleIndexes(
        { from: oracleAccount1 }));
      await enableOperatingStatus();
      // Requires registered oracle.
      await expectThrow(flightSuretyApp.getOracleIndexes(
        { from: otherAccount1 }));
      const oracleIndexes = await flightSuretyApp.getOracleIndexes.call(
        { from: oracleAccount1 });
      const oracleIndex0 = toNumber(oracleIndexes[0]);
      const oracleIndex1 = toNumber(oracleIndexes[1]);
      const oracleIndex2 = toNumber(oracleIndexes[2]);
      assert.isTrue((oracleIndex0 >= 0) && (oracleIndex0 <= 9),
        'Invalid oracle index[0]');
      assert.isTrue((oracleIndex1 >= 0) && (oracleIndex1 <= 9),
        'Invalid oracle index[0]');
      assert.isTrue((oracleIndex2 >= 0) && (oracleIndex2 <= 9),
        'Invalid oracle index[0]');
      assert.notEqual(oracleIndex0, oracleIndex1, 'Overlapping oracle indices');
      assert.notEqual(oracleIndex0, oracleIndex2, 'Overlapping oracle indices');
      assert.notEqual(oracleIndex1, oracleIndex2, 'Overlapping oracle indices');
    });

    it('many oracles can be registered', async () => {
      const registrationFeeStr = web3.utils.toWei('1', 'ether').toString();
      for (let i = 0; i < NUM_ORACLES; i++) {
        const oracleAccount = accounts[16 + i];
        oracleAccounts.push(oracleAccount);
        const oracleBalanceBeforeTransaction = new BigNumber(
          await web3.eth.getBalance(oracleAccount));
        const contractBalanceBeforeTransaction = new BigNumber(
          await web3.eth.getBalance(flightSuretyData.address));
        await flightSuretyApp.registerOracle(
          { from: oracleAccount, value: registrationFeeStr, gasPrice: '0' });
        const oracleBalanceAfterTransaction = new BigNumber(
          await web3.eth.getBalance(oracleAccount));
        const contractBalanceAfterTransaction = new BigNumber(
          await web3.eth.getBalance(flightSuretyData.address));
        assert.equal(
          oracleBalanceBeforeTransaction.minus(registrationFeeStr).toString(),
          oracleBalanceAfterTransaction.toString(), 'Invalid oracle balance');
        assert.equal(
          contractBalanceBeforeTransaction.plus(registrationFeeStr).toString(),
          contractBalanceAfterTransaction.toString(),
          'Invalid contract balance');
      }
    });

    // Returns true if one of the oracle indices matches the request index.
    const oracleMatchesRequestIndex = async (oracleAccount, requestIndex) => {
      const oracleIndexes = await flightSuretyApp.getOracleIndexes.call(
        { from: oracleAccount });
      const oracleIndex0 = toNumber(oracleIndexes[0]);
      const oracleIndex1 = toNumber(oracleIndexes[1]);
      const oracleIndex2 = toNumber(oracleIndexes[2]);
      return (
        (requestIndex == oracleIndex0) ||
        (requestIndex == oracleIndex1) ||
        (requestIndex == oracleIndex2));
    };

    // Iterates over oracles and tries to submit the provided status code.
    const submitOracleResponses = async (oracleRequest, statusCode) => {
      const requestIndex = oracleRequest.index;
      const requestAirline = oracleRequest.airline;
      const requestFlight = oracleRequest.flight;
      const requestTimestamp = oracleRequest.timestamp;
      // Number of submitted responses.
      let submittedResponses = 0;
      for (let i = 0; i < NUM_ORACLES; i++) {
        const oracleAccount = accounts[16 + i];
        if (await oracleMatchesRequestIndex(oracleAccount, requestIndex)) {
          // We have an oracle that can answer the oracle request.
          if (submittedResponses < 3) {
            if (submittedResponses == 0) {
              // Note: We test this branch only once.
              // Requires contract to be operational.
              await disableOperatingStatus();
              await expectThrow(flightSuretyApp.submitOracleResponse(
                requestIndex, requestAirline, requestFlight, requestTimestamp,
                statusCode, { from: oracleAccount }));
              await enableOperatingStatus();
              // Requires matching oracle.
              await expectThrow(flightSuretyApp.submitOracleResponse(
                requestIndex, requestAirline, requestFlight, requestTimestamp,
                statusCode, { from: otherAccount1 }));
            }
            await flightSuretyApp.submitOracleResponse(
              requestIndex, requestAirline, requestFlight, requestTimestamp,
              statusCode, { from: oracleAccount });
            let events = await flightSuretyApp.getPastEvents('OracleReport');
            let eventOracleReportEmitted = (events.length == 1);
            assert.isTrue(eventOracleReportEmitted,
              'OracleReport event not emitted');
            let eventAirline = events[0].args.airline;
            let eventFlight = events[0].args.flight;
            let eventTimestamp = toNumber(events[0].args.timestamp);
            let eventStatus = toNumber(events[0].args.status);
            assert.equal(eventAirline, requestAirline, 'Invalid event airline');
            assert.equal(eventFlight, requestFlight, 'Invalid event flight');
            assert.equal(eventTimestamp, requestTimestamp,
              'Invalid event timestamp');
            assert.equal(eventStatus, statusCode,
              'Invalid event status code');
            if (submittedResponses == 0) {
              // Note: We test this branch only once.
              // Cannot submit another response.
              await expectThrow(flightSuretyApp.submitOracleResponse(
                requestIndex, requestAirline, requestFlight, requestTimestamp,
                statusCode, { from: oracleAccount }));
            }
            submittedResponses += 1;
            if (submittedResponses == 3) {
              // We have collected enough responses.
              const isOpen = await flightSuretyApp.isOracleRequestOpen(
                requestIndex, requestAirline, requestFlight, requestTimestamp,
                { from: otherAccount1 });
              assert.isFalse(isOpen, 'Oracle request is open');
              events = await flightSuretyApp.getPastEvents('FlightStatusInfo');
              eventFlightStatusInfoEmitted = (events.length == 1);
              assert.isTrue(eventFlightStatusInfoEmitted,
                'FlightStatusInfo event not emitted');
              eventAirline = events[0].args.airline;
              eventFlight = events[0].args.flight;
              eventTimestamp = toNumber(events[0].args.timestamp);
              eventStatus = toNumber(events[0].args.status);
              assert.equal(eventAirline, requestAirline,
                'Invalid event airline');
              assert.equal(eventFlight, requestFlight,
                'Invalid event flight');
              assert.equal(eventTimestamp, requestTimestamp,
                'Invalid event timestamp');
              assert.equal(eventStatus, statusCode,
                'Invalid event status code');
            } else {
              const isOpen = await flightSuretyApp.isOracleRequestOpen(
                requestIndex, requestAirline, requestFlight, requestTimestamp,
                { from: otherAccount1 });
              assert.isTrue(isOpen, 'Oracle request is not open');
            }
          } else {
            // Oracle request should be closed now.
            await expectThrow(flightSuretyApp.submitOracleResponse(
              requestIndex, requestAirline, requestFlight, requestTimestamp,
              statusCode, { from: oracleAccount }));
          }
        } else {
          // Oracle indices do not match the oracle request.
          await expectThrow(flightSuretyApp.submitOracleResponse(
            requestIndex, requestAirline, requestFlight, requestTimestamp,
            statusCode, { from: oracleAccount }));
        }
      }
    }

    it('STATUS_CODE_ON_TIME does not credit insurees', async () => {
      await submitOracleResponses(
        oracleRequests[0], OracleStatusCode.STATUS_CODE_ON_TIME);
      // No insurance claims can be made.
      let insureeCredit = await flightSuretyApp.getInsureeCredit.call(
        { from: insureeAccount1 });
      assert.equal(toNumber(insureeCredit), 0, 'Invalid insuree credit');
      await expectThrow(flightSuretyApp.claimInsurancePayout(
        { from: insureeAccount1 }));
      insureeCredit = await flightSuretyApp.getInsureeCredit.call(
        { from: insureeAccount2 });
      assert.equal(toNumber(insureeCredit), 0, 'Invalid insuree credit');
      await expectThrow(flightSuretyApp.claimInsurancePayout(
        { from: insureeAccount2 }));
    });

    it('STATUS_CODE_LATE_AIRLINE credits insurees', async () => {
      await submitOracleResponses(
        oracleRequests[1], OracleStatusCode.STATUS_CODE_LATE_AIRLINE);
      // insureeAccount1 paid 250 finney for the second flight: LX1487.
      const insurancePayoutStr = new BigNumber(web3.utils.toWei(
        '250', 'finney')).multipliedBy(3).dividedBy(2).toString();
      let insureeCredit = await flightSuretyApp.getInsureeCredit.call(
        { from: insureeAccount1 });
      assert.equal(toString(insureeCredit), insurancePayoutStr,
        'Invalid insuree credit');
      const insureeBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      const contractBalanceBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      await flightSuretyApp.claimInsurancePayout(
        { from: insureeAccount1, gasPrice: '0' });
      const insureeBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      const contractBalanceAfterTransaction = new BigNumber(
        await web3.eth.getBalance(flightSuretyData.address));
      assert.equal(
        insureeBalanceBeforeTransaction.plus(insurancePayoutStr).toString(),
        insureeBalanceAfterTransaction.toString(), 'Invalid insuree balance');
      assert.equal(
        contractBalanceBeforeTransaction.minus(insurancePayoutStr).toString(),
        contractBalanceAfterTransaction.toString(), 'Invalid contract balance');
      const events = await flightSuretyApp.getPastEvents('InsurancePayout');
      eventInsurancePayoutEmitted = (events.length == 1);
      assert.isTrue(eventInsurancePayoutEmitted,
        'InsurancePayout event not emitted');
      const eventInsuree = events[0].args.insuree;
      const eventPayout = toString(events[0].args.payout);
      assert.equal(eventInsuree, insureeAccount1, 'Invalid event insuree');
      assert.equal(eventPayout, insurancePayoutStr, 'Invalid event payout');
      // The other insuree does not have a legit insurance claim.
      insureeCredit = await flightSuretyApp.getInsureeCredit.call(
        { from: insureeAccount2 });
      assert.equal(toNumber(insureeCredit), 0, 'Invalid insuree credit');
      await expectThrow(flightSuretyApp.claimInsurancePayout(
        { from: insureeAccount2 }));
    });
  });
});