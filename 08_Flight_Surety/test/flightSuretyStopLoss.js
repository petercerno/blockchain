const FlightSuretyStopLoss = artifacts.require('FlightSuretyStopLoss');

contract('FlightSuretyStopLoss', (accounts) => {
  const ownerAccount = accounts[0];
  const adminAccount1 = accounts[1];
  const adminAccount2 = accounts[2];
  const adminAccount3 = accounts[3];
  const adminAccount4 = accounts[4];
  const otherAccount1 = accounts[5];
  const otherAccount2 = accounts[6];

  // FlightSuretyStopLoss contract instance.
  let flightSuretyStopLoss = null;

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

  before('setup contract', async () => {
    flightSuretyStopLoss = await FlightSuretyStopLoss.new();
  });

  describe('testing operating status', () => {
    it('(multiparty) has correct initial operating status', async () => {
      let status = await flightSuretyStopLoss.isOperational.call();
      assert.isTrue(status, 'Incorrect initial operating status value');
    });

    it('(multiparty) contract owner can register a new admin', async () => {
      await flightSuretyStopLoss.registerAdmin(
        adminAccount1, { from: ownerAccount });
      await flightSuretyStopLoss.registerAdmin(
        adminAccount2, { from: ownerAccount });
      await flightSuretyStopLoss.registerAdmin(
        adminAccount3, { from: ownerAccount });
    });

    it('(multiparty) contract owner cannot register an existing admin', async () => {
      await expectThrow(flightSuretyStopLoss.registerAdmin(
        adminAccount1, { from: ownerAccount }));
    });

    it('(multiparty) other accounts cannot register a new admin', async () => {
      await expectThrow(flightSuretyStopLoss.registerAdmin(
        otherAccount1, { from: adminAccount1 }));
      await expectThrow(flightSuretyStopLoss.registerAdmin(
        otherAccount1, { from: otherAccount2 }));
    });

    it('(multiparty) admins can vote on setting the operating status to false', async () => {
      let success = await flightSuretyStopLoss.setOperatingStatus.call(
        false, { from: adminAccount1 });
      await flightSuretyStopLoss.setOperatingStatus(
        false, { from: adminAccount1 });
      assert.isFalse(success, 'Not enough votes to set the operating status');
      // Cannot vote twice.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        false, { from: adminAccount1 }));
      // Only admins can vote.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        false, { from: otherAccount1 }));
      // Cannot vote for the existing status.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        true, { from: adminAccount2 }));
      // Two votes are enough.
      success = await flightSuretyStopLoss.setOperatingStatus.call(
        false, { from: adminAccount2 });
      await flightSuretyStopLoss.setOperatingStatus(
        false, { from: adminAccount2 });
      assert.isTrue(success, 'Enough votes to set the operating status');
      // Contract is not operational. Cannot register a new admin.
      await expectThrow(
        flightSuretyStopLoss.registerAdmin(
          adminAccount4, { from: ownerAccount }));
    });

    it('(multiparty) admins can vote on setting the operating status to true', async () => {
      let success = await flightSuretyStopLoss.setOperatingStatus.call(
        true, { from: adminAccount1 });
      await flightSuretyStopLoss.setOperatingStatus(
        true, { from: adminAccount1 });
      assert.isFalse(success, 'Not enough votes to set the operating status');
      // Cannot vote twice.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        true, { from: adminAccount1 }));
      // Only admins can vote.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        true, { from: otherAccount1 }));
      // Cannot vote for the existing status.
      await expectThrow(flightSuretyStopLoss.setOperatingStatus(
        false, { from: adminAccount3 }));
      // Two votes are enough.
      success = await flightSuretyStopLoss.setOperatingStatus.call(
        true, { from: adminAccount3 });
      await flightSuretyStopLoss.setOperatingStatus(
        true, { from: adminAccount3 });
      assert.isTrue(success, 'Enough votes to set the operating status');
      // Contract is operational. Can register a new admin.
      await flightSuretyStopLoss.registerAdmin(
        adminAccount4, { from: ownerAccount });
    });
  });
});
