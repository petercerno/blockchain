const FlightSuretyData = artifacts.require('FlightSuretyData');
const BigNumber = require('bignumber.js');

contract('FlightSuretyData', (accounts) => {
  const ownerAccount = accounts[0];
  const adminAccount1 = accounts[1];
  const adminAccount2 = accounts[2];
  const adminAccount3 = accounts[3];
  const authorizedAccount = accounts[4];
  const airlineAccount1 = accounts[5];
  const airlineAccount2 = accounts[6];
  const airlineAccount3 = accounts[7];
  const airlineAccount4 = accounts[8];
  const airlineAccount5 = accounts[9];
  const insureeAccount1 = accounts[10];
  const insureeAccount2 = accounts[11];
  const insureeAccount3 = accounts[12];
  const otherAccount1 = accounts[13];
  const otherAccount2 = accounts[14];

  // FlightSuretyData contract instance.
  let flightSuretyData = null;

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
    let success = await flightSuretyData.setOperatingStatus.call(
      false, { from: adminAccount1 });
    await flightSuretyData.setOperatingStatus(false, { from: adminAccount1 });
    assert.isFalse(success, 'Not enough votes to set the operating status');
    success = await flightSuretyData.setOperatingStatus.call(
      false, { from: adminAccount2 });
    await flightSuretyData.setOperatingStatus(false, { from: adminAccount2 });
    assert.isTrue(success, 'Enough votes to set the operating status');
  };

  const enableOperatingStatus = async () => {
    let success = await flightSuretyData.setOperatingStatus.call(
      true, { from: adminAccount1 });
    await flightSuretyData.setOperatingStatus(true, { from: adminAccount1 });
    assert.isFalse(success, 'Not enough votes to set the operating status');
    success = await flightSuretyData.setOperatingStatus.call(
      true, { from: adminAccount3 });
    await flightSuretyData.setOperatingStatus(true, { from: adminAccount3 });
    assert.isTrue(success, 'Enough votes to set the operating status');
  };

  before('setup data contract', async () => {
    const initialFundsStr = web3.utils.toWei('10', 'ether').toString();
    flightSuretyData = await FlightSuretyData.new();
    await flightSuretyData.registerAdmin(adminAccount1, { from: ownerAccount });
    await flightSuretyData.registerAdmin(adminAccount2, { from: ownerAccount });
    await flightSuretyData.registerAdmin(adminAccount3, { from: ownerAccount });
    await flightSuretyData.fund(
      { from: ownerAccount, value: initialFundsStr, gasPrice: '0' });
  });

  describe('testing authorization', () => {
    it('owner can authorize a contract', async () => {
      // Requires owner to authorize contract.
      await expectThrow(flightSuretyData.authorizeContract(
        authorizedAccount, { from: adminAccount1 }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.authorizeContract(
        authorizedAccount, { from: ownerAccount }));
      await enableOperatingStatus();
      // Owner can authorize a contract.
      await flightSuretyData.authorizeContract(
        authorizedAccount, { from: ownerAccount });
      let isAuthorized = await flightSuretyData.isAuthorizedContract.call(
        authorizedAccount, { from: otherAccount1 });
      assert.isTrue(isAuthorized, 'Contract not authorized');
    });

    it('owner can de-authorize a contract', async () => {
      await flightSuretyData.authorizeContract(
        otherAccount1, { from: ownerAccount });
      let isAuthorized = await flightSuretyData.isAuthorizedContract.call(
        otherAccount1, { from: otherAccount2 });
      assert.isTrue(isAuthorized, 'Contract not authorized');
      flightSuretyData.deauthorizeContract(
        otherAccount1, { from: ownerAccount });
      isAuthorized = await flightSuretyData.isAuthorizedContract.call(
        otherAccount1, { from: otherAccount2 });
      assert.isFalse(isAuthorized, 'Contract still authorized');
    });
  });

  describe('testing airlines', () => {
    it('authorized contract can register an airline', async () => {
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount1, 'Swiss', { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount1, 'Swiss', { from: authorizedAccount }));
      await enableOperatingStatus();
      await flightSuretyData.registerAirline(
        airlineAccount1, 'Swiss', { from: authorizedAccount });
      const isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      const isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
      const airlineCount = await flightSuretyData.getAirlineCount.call(
        airlineAccount1, { from: otherAccount1 });
      assert.equal(airlineCount, 1, 'Invalid number of airlines');
    });

    it('authorized contract cannot register already registered airline', async () => {
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount1, 'Swiss', { from: authorizedAccount }));
    });

    it('authorized contract can fund the first airline', async () => {
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.fundAirline(
        airlineAccount1, { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.fundAirline(
        airlineAccount1, { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can fund the registered airline.
      await flightSuretyData.fundAirline(
        airlineAccount1, { from: authorizedAccount });
      const isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount1, { from: otherAccount1 });
      assert.isTrue(isFunded, 'Airline is not funded');
    });

    it('authorized contract cannot fund non-registered airline', async () => {
      await expectThrow(flightSuretyData.fundAirline(
        airlineAccount2, { from: authorizedAccount }));
    });

    it('authorized contract cannot fund already funded airline', async () => {
      await expectThrow(flightSuretyData.fundAirline(
        airlineAccount1, { from: authorizedAccount }));
    });

    it('authorized contract can register the second airline', async () => {
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount2, 'Austrian', { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.registerAirline(
        airlineAccount2, 'Austrian', { from: authorizedAccount }));
      await enableOperatingStatus();
      await flightSuretyData.registerAirline(
        airlineAccount2, 'Austrian', { from: authorizedAccount });
      const isRegistered = await flightSuretyData.isRegisteredAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isTrue(isRegistered, 'Airline is not registered');
      const isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isFalse(isFunded, 'Airline is funded');
      const airlineCount = await flightSuretyData.getAirlineCount.call(
        airlineAccount1, { from: otherAccount1 });
      assert.equal(airlineCount, 2, 'Invalid number of airlines');
    });

    it('authorized contract can fund the second airline', async () => {
      await flightSuretyData.fundAirline(
        airlineAccount2, { from: authorizedAccount });
      const isFunded = await flightSuretyData.isFundedAirline.call(
        airlineAccount2, { from: otherAccount1 });
      assert.isTrue(isFunded, 'Airline is not funded');
    });

    it('airline can vote for airline', async () => {
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.voteForAirline(
        airlineAccount1, airlineAccount3, { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.voteForAirline(
        airlineAccount1, airlineAccount3, { from: authorizedAccount }));
      await enableOperatingStatus();
      const voteCount = await flightSuretyData.voteForAirline.call(
        airlineAccount1, airlineAccount3, { from: authorizedAccount });
      await flightSuretyData.voteForAirline(
        airlineAccount1, airlineAccount3, { from: authorizedAccount });
      assert.equal(voteCount, 1, 'Invalid number of votes');
    });

    it('airline cannot vote for twice for the same airline', async () => {
      await expectThrow(flightSuretyData.voteForAirline(
        airlineAccount1, airlineAccount3, { from: authorizedAccount }));
    });

    it('airline can vote for another airline', async () => {
      const voteCount = await flightSuretyData.voteForAirline.call(
        airlineAccount1, airlineAccount4, { from: authorizedAccount });
      await flightSuretyData.voteForAirline(
        airlineAccount1, airlineAccount4, { from: authorizedAccount });
      assert.equal(voteCount, 1, 'Invalid number of votes');
    });

    it('multiple airlines can vote for the same airline', async () => {
      const voteCount = await flightSuretyData.voteForAirline.call(
        airlineAccount2, airlineAccount3, { from: authorizedAccount });
      await flightSuretyData.voteForAirline(
        airlineAccount2, airlineAccount3, { from: authorizedAccount });
      assert.equal(voteCount, 2, 'Invalid number of votes');
    });
  });

  describe('testing flights', () => {
    it('authorized contract can register a flight', async () => {
      let flightCount = await flightSuretyData.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 0, 'No registered flights');
      let isFlightRegistered = await flightSuretyData.isFlightRegistered.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      assert.isFalse(isFlightRegistered, 'No registered flights');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyData.getFlight(0));
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.registerFlight(
        airlineAccount1, 'LX1484', 1554618600, 'ZRH', 'PRG',
        { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.registerFlight(
        airlineAccount1, 'LX1484', 1554618600, 'ZRH', 'PRG',
        { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can register a flight.
      await flightSuretyData.registerFlight(
        airlineAccount1, 'LX1484', 1554618600, 'ZRH', 'PRG',
        { from: authorizedAccount });
      flightCount = await flightSuretyData.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 1, 'Registered one flight');
      isFlightRegistered = await flightSuretyData.isFlightRegistered.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      assert.isTrue(isFlightRegistered, 'Flight is registered');
      let flight = await flightSuretyData.getFlight.call(0);
      assert.equal(flight.airline, airlineAccount1, 'Invalid airline');
      assert.equal(flight.airlineName, 'Swiss', 'Invalid airlineName');
      assert.equal(flight.flight, 'LX1484', 'Invalid flight code');
      assert.equal(toNumber(flight.timestamp), 1554618600, 'Invalid timestamp');
      assert.equal(flight.departure, 'ZRH', 'Invalid departure');
      assert.equal(flight.destination, 'PRG', 'Invalid destination');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyData.getFlight(-1));
      await expectThrow(flightSuretyData.getFlight(1));
    });

    it('authorized contract can register another flight', async () => {
      await flightSuretyData.registerFlight(
        airlineAccount1, 'LX1487', 1554900900, 'PRG', 'ZRH',
        { from: authorizedAccount });
      const flightCount = await flightSuretyData.getFlightCount.call(
        { from: otherAccount1 });
      assert.equal(toNumber(flightCount), 2, 'Registered two flights');
      const isFlightRegistered = await flightSuretyData.isFlightRegistered.call(
        airlineAccount1, 'LX1487', 1554900900, { from: otherAccount1 });
      assert.isTrue(isFlightRegistered, 'Flight is registered');
      const flight = await flightSuretyData.getFlight.call(1);
      assert.equal(flight.airline, airlineAccount1, 'Invalid airline');
      assert.equal(flight.airlineName, 'Swiss', 'Invalid airlineName');
      assert.equal(flight.flight, 'LX1487', 'Invalid flight code');
      assert.equal(toNumber(flight.timestamp), 1554900900, 'Invalid timestamp');
      assert.equal(flight.departure, 'PRG', 'Invalid departure');
      assert.equal(flight.destination, 'ZRH', 'Invalid destination');
      // Cannot access out-of-bound flight indices.
      await expectThrow(flightSuretyData.getFlight(-1));
      await expectThrow(flightSuretyData.getFlight(2));
    });

    it('authorized contract cannot re-register a flight', async () => {
      await expectThrow(flightSuretyData.registerFlight(
        airlineAccount1, 'LX1484', 1554618600, 'ZRH', 'PRG',
        { from: authorizedAccount }));
      await expectThrow(flightSuretyData.registerFlight(
        airlineAccount1, 'LX1487', 1554900900, 'PRG', 'ZRH',
        { from: authorizedAccount }));
    });

    it('authorized contract cannot register a flight with non-registered airline', async () => {
      await expectThrow(flightSuretyData.registerFlight(
        otherAccount1, 'XX007', 1554618600, 'ZRH', 'PRG',
        { from: authorizedAccount }));
    });

    it('authorized contract cannot register a flight with non-funded airline', async () => {
      await expectThrow(flightSuretyData.registerFlight(
        airlineAccount5, 'XX007', 1554618600, 'ZRH', 'PRG',
        { from: authorizedAccount }));
    });
  });

  describe('testing insurances', () => {
    it('authorized contract can buy a flight insurance for an insuree', async () => {
      const insurancePrice = web3.utils.toWei('500', 'finney');
      const flightKey = await flightSuretyData.getFlightKey.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 0, 'No registered insurances');
      // Cannot access out-of-bound flight insurance indices.
      await expectThrow(flightSuretyData.getFlightInsurance(flightKey, 0));
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX1484', 1554618600,
        { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX1484', 1554618600,
        { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can buy insurance for an insuree.
      await flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX1484', 1554618600,
        { from: authorizedAccount });
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
      assert.equal(insurance.insurance.toString(), insurancePrice.toString(),
        'Invalid insurance value');
    });

    it('authorized contract cannot buy the same flight insurance for the same insuree', async () => {
      const insurancePrice = web3.utils.toWei('250', 'finney');
      await expectThrow(flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX1484', 1554618600,
        { from: authorizedAccount }));
    });

    it('authorized contract can buy another flight insurance for the same insuree', async () => {
      const insurancePrice = web3.utils.toWei('250', 'finney');
      const flightKey = await flightSuretyData.getFlightKey.call(
        airlineAccount1, 'LX1487', 1554900900, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 0, 'No registered insurances');
      await flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX1487', 1554900900,
        { from: authorizedAccount });
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
      assert.equal(insurance.insurance.toString(), insurancePrice.toString(),
        'Invalid insurance value');
    });

    it('authorized contract can buy the same flight insurance for another insuree', async () => {
      const insurancePrice = web3.utils.toWei('750', 'finney');
      const flightKey = await flightSuretyData.getFlightKey.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 1, 'One registered insurance');
      await flightSuretyData.buyInsurance(
        insureeAccount2, insurancePrice, airlineAccount1, 'LX1484', 1554618600,
        { from: authorizedAccount });
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
      assert.equal(insurance.insurance.toString(), insurancePrice.toString(),
        'Invalid insurance value');
    });

    it('authorized contract cannot buy a flight insurance for non-registered flight', async () => {
      const insurancePrice = web3.utils.toWei('500', 'finney');
      await expectThrow(flightSuretyData.buyInsurance(
        insureeAccount1, insurancePrice, airlineAccount1, 'LX160', 1554618600,
        { from: authorizedAccount }));
    });

    it('authorized contract can delete all flight insurances for a given flight', async () => {
      const flightKey = await flightSuretyData.getFlightKey.call(
        airlineAccount1, 'LX1484', 1554618600, { from: otherAccount1 });
      let insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 2, 'Two registered insurances');
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.clearFlightInsurances(flightKey,
        { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.clearFlightInsurances(flightKey,
        { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can delete all flight insurances.
      await flightSuretyData.clearFlightInsurances(flightKey,
        { from: authorizedAccount });
      insuranceCount = await flightSuretyData.getFlightInsuranceCount.call(
        flightKey, { from: otherAccount1 });
      assert.equal(toNumber(insuranceCount), 0, 'No registered insurances');
    });
  });

  describe('testing insurance credits', () => {
    it('authorized contract can credit an insuree', async () => {
      const payoutStr = web3.utils.toWei('750', 'finney').toString();
      let insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), '0', 'Insuree not yet credited');
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.creditInsuree(
        insureeAccount1, payoutStr, { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.creditInsuree(
        insureeAccount1, payoutStr, { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can credit an insuree.
      await flightSuretyData.creditInsuree(
        insureeAccount1, payoutStr, { from: authorizedAccount });
      insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), payoutStr, 'Insuree was credited');
    });

    it('authorized contract can credit an insuree multiple times', async () => {
      const previousCreditStr = web3.utils.toWei('750', 'finney').toString();
      const payoutStr = web3.utils.toWei('250', 'finney').toString();
      const newCreditStr = web3.utils.toWei('1000', 'finney').toString();
      let insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), previousCreditStr,
        'Insuree already credited');
      await flightSuretyData.creditInsuree(
        insureeAccount1, payoutStr, { from: authorizedAccount });
      insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), newCreditStr,
        'Insuree was credited again');
    });

    it('authorized contract can credit another insuree', async () => {
      const payoutStr = web3.utils.toWei('500', 'finney').toString();
      let insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount2, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), '0', 'Insuree not yet credited');
      await flightSuretyData.creditInsuree(
        insureeAccount2, payoutStr, { from: authorizedAccount });
      insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount2, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), payoutStr, 'Insuree was credited');
    });

    it('authorized contract can pay credit to an insuree', async () => {
      const payoutStr = web3.utils.toWei('1000', 'finney').toString();
      let insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), payoutStr, 'Insuree has credit');
      // Requires authorized contract account.
      await expectThrow(flightSuretyData.pay(
        insureeAccount1, { from: ownerAccount }));
      // Requires contract to be operational.
      await disableOperatingStatus();
      await expectThrow(flightSuretyData.pay(
        insureeAccount1, { from: authorizedAccount }));
      await enableOperatingStatus();
      // Authorized contract can pay credit to an insuree.
      const balanceInsureeBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      await flightSuretyData.pay(
        insureeAccount1, { from: authorizedAccount });
      const balanceInsureeAfterTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount1));
      assert.equal(
        balanceInsureeBeforeTransaction.plus(payoutStr).toString(),
        balanceInsureeAfterTransaction.toString(), 'Invalid insuree balance');
      insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount1, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), '0', 'Insuree has no credit');
    });

    it('authorized contract can pay credit to another insuree', async () => {
      const payoutStr = web3.utils.toWei('500', 'finney').toString();
      let insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount2, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), payoutStr, 'Insuree has credit');
      const balanceInsureeBeforeTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount2));
      await flightSuretyData.pay(
        insureeAccount2, { from: authorizedAccount });
      const balanceInsureeAfterTransaction = new BigNumber(
        await web3.eth.getBalance(insureeAccount2));
      assert.equal(
        balanceInsureeBeforeTransaction.plus(payoutStr).toString(),
        balanceInsureeAfterTransaction.toString(), 'Invalid insuree balance');
      insureeCredit = await flightSuretyData.getInsureeCredit.call(
        insureeAccount2, { from: otherAccount1 });
      assert.equal(toString(insureeCredit), '0', 'Insuree has no credit');
    });

    it('authorized contract cannot pay credit to an insuree twice', async () => {
      await expectThrow(flightSuretyData.pay(
        insureeAccount1, { from: authorizedAccount }));
    });

    it('authorized contract cannot pay credit to someone without credit', async () => {
      await expectThrow(flightSuretyData.pay(
        insureeAccount3, { from: authorizedAccount }));
    });
  });
});