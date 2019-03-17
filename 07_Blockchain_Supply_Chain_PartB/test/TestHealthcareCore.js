var HealthcareCore = artifacts.require('HealthcareCore');
var BigNumber = require('bignumber.js');

contract('HealthcareCore', function (accounts) {
  const ownerAccount = accounts[0];
  const patientAccount1 = accounts[1];
  const patientAccount2 = accounts[2];
  const doctorAccount1 = accounts[3];
  const doctorAccount2 = accounts[4];
  const labAccount1 = accounts[5];
  const labAccount2 = accounts[6];
  const otherAccount1 = accounts[7];
  const otherAccount2 = accounts[8];

  // Enumeration of Patient states.
  const PatientState = {
    Idle: 0,
    AtDoctor: 1,
    BloodTaken: 2,
    PrescriptionReceived: 3,
    BillPaid: 4,
  };

  // Enumeration of Doctor states.
  const DoctorState = {
    Idle: 0,
    PatientReceived: 1,
    BloodReceived: 2,
    BloodSentToLab: 3,
    BloodResultsReceived: 4,
    PrescriptionWritten: 5,
    MoneyReceived: 6,
  };

  // Converts the given BigNumber to a number.
  const toNumber = (bigNumber) => {
    return new BigNumber(bigNumber).toNumber();
  };

  // Returns patient's state.
  const getPatientState = async (patientAccount) => {
    const healthcareCore = await HealthcareCore.deployed();
    return toNumber(await healthcareCore.patientState.call(patientAccount));
  };

  // Returns doctor's state.
  const getDoctorState = async (doctorAccount) => {
    const healthcareCore = await HealthcareCore.deployed();
    return toNumber(await healthcareCore.doctorState.call(doctorAccount));
  };

  // Asserts that the given promise fails.
  const expectThrow = async function (promise) {
    try {
      await promise;
    } catch (error) {
      assert.exists(error);
      return;
    }
    assert.fail('Expected an error but did not see any!');
  };

  // Adds some accounts to the patient, doctor, and lab roles.
  before(async function () {
    const healthcareCore = await HealthcareCore.deployed();
    await healthcareCore.addPatient(patientAccount1, { from: ownerAccount });
    await healthcareCore.addPatient(patientAccount2, { from: ownerAccount });
    await healthcareCore.addDoctor(doctorAccount1, { from: ownerAccount });
    await healthcareCore.addDoctor(doctorAccount2, { from: ownerAccount });
    await healthcareCore.addLab(labAccount1, { from: ownerAccount });
    await healthcareCore.addLab(labAccount2, { from: ownerAccount });
  });

  describe('utility functions', () => {
    it('patientStateToString() converts patient state to string', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      assert.equal(await healthcareCore.patientStateToString(PatientState.Idle), 'Idle', 'Invalid patient state string');
      assert.equal(await healthcareCore.patientStateToString(PatientState.AtDoctor), 'AtDoctor', 'Invalid patient state string');
      assert.equal(await healthcareCore.patientStateToString(PatientState.BloodTaken), 'BloodTaken', 'Invalid patient state string');
      assert.equal(await healthcareCore.patientStateToString(PatientState.PrescriptionReceived), 'PrescriptionReceived', 'Invalid patient state string');
      assert.equal(await healthcareCore.patientStateToString(PatientState.BillPaid), 'BillPaid', 'Invalid patient state string');
    });

    it('doctorStateToString() converts doctor state to string', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.Idle), 'Idle', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.PatientReceived), 'PatientReceived', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.BloodReceived), 'BloodReceived', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.BloodSentToLab), 'BloodSentToLab', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.BloodResultsReceived), 'BloodResultsReceived', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.PrescriptionWritten), 'PrescriptionWritten', 'Invalid doctor state string');
      assert.equal(await healthcareCore.doctorStateToString(DoctorState.MoneyReceived), 'MoneyReceived', 'Invalid doctor state string');
    });
  });

  describe('can visit doctor', () => {
    it('visitDoctor() allows a patient to visit a doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      const sessionId = toNumber(await healthcareCore.visitDoctor.call(
        doctorAccount1, { from: patientAccount1 }));
      assert.equal(sessionId, 0, 'Invalid session id');
      await expectThrow(healthcareCore.getSessionInfo(sessionId));
      await healthcareCore.visitDoctor(doctorAccount1, { from: patientAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.PatientReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'AtDoctor', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'PatientReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, '0x0000000000000000000000000000000000000000', 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('DoctorVisited');
      const eventDoctorVisitedEmitted = (events.length == 1);
      assert.equal(eventDoctorVisitedEmitted, true, 'DoctorVisited event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, '0x0000000000000000000000000000000000000000', 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('visitDoctor() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PatientReceived, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(doctorAccount1, { from: patientAccount1 }));
    });

    it('visitDoctor() does not allow a non-patient to visit a doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(doctorAccount2, { from: otherAccount1 }));
    });

    it('visitDoctor() does not allow a patient to visit a non-doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(otherAccount1, { from: patientAccount2 }));
    });

    it('visitDoctor() does not allow a non-patient to visit a non-doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(otherAccount2, { from: otherAccount1 }));
    });

    it('visitDoctor() does not allow a patient to visit multiple doctors in parallel', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(doctorAccount2, { from: patientAccount1 }));
    });

    it('visitDoctor() does not allow multiple patients to visit one doctor in parallel', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      await expectThrow(healthcareCore.visitDoctor(doctorAccount1, { from: patientAccount2 }));
    });

    it('visitDoctor() allows another patient to visit another doctor (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      const sessionId = toNumber(await healthcareCore.visitDoctor.call(
        doctorAccount2, { from: patientAccount2 }));
      assert.equal(sessionId, 1, 'Invalid session id');
      await expectThrow(healthcareCore.getSessionInfo(sessionId));
      await healthcareCore.visitDoctor(doctorAccount2, { from: patientAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.PatientReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'AtDoctor', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'PatientReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, '0x0000000000000000000000000000000000000000', 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('DoctorVisited');
      const eventDoctorVisitedEmitted = (events.length == 1);
      assert.equal(eventDoctorVisitedEmitted, true, 'DoctorVisited event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, '0x0000000000000000000000000000000000000000', 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can take blood', () => {
    it('takeBlood() allows a doctor to take patient\'s blood', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PatientReceived, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: patientAccount1 }));
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: otherAccount1 }));
      await expectThrow(healthcareCore.takeBlood(invalidSessionId, { from: doctorAccount1 }));
      await healthcareCore.takeBlood(sessionId, { from: doctorAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, '0x0000000000000000000000000000000000000000', 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodTaken');
      const eventBloodTakenEmitted = (events.length == 1);
      assert.equal(eventBloodTakenEmitted, true, 'BloodTaken event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, '0x0000000000000000000000000000000000000000', 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('takeBlood() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodReceived, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: doctorAccount1 }));
    });

    it('takeBlood() allows another doctor to take another patient\'s blood (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PatientReceived, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: patientAccount2 }));
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.takeBlood(sessionId, { from: otherAccount2 }));
      await expectThrow(healthcareCore.takeBlood(invalidSessionId, { from: doctorAccount2 }));
      await healthcareCore.takeBlood(sessionId, { from: doctorAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, '0x0000000000000000000000000000000000000000', 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodTaken');
      const eventBloodTakenEmitted = (events.length == 1);
      assert.equal(eventBloodTakenEmitted, true, 'BloodTaken event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, '0x0000000000000000000000000000000000000000', 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can send blood to lab', () => {
    it('sendBloodToLab() allows a doctor to send patient\'s blood to a lab', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodReceived, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount1, { from: patientAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount1, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount1, { from: otherAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, patientAccount2, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, doctorAccount2, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, otherAccount2, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(invalidSessionId, labAccount1, { from: doctorAccount1 }));
      await healthcareCore.sendBloodToLab(sessionId, labAccount1, { from: doctorAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodSentToLab', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount1, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodSentToLab');
      const eventBloodSentToLabEmitted = (events.length == 1);
      assert.equal(eventBloodSentToLabEmitted, true, 'BloodSentToLab event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, labAccount1, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('sendBloodToLab() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount1, { from: doctorAccount1 }));
    });

    it('sendBloodToLab() cannot send the blood to more than one lab', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount2, { from: doctorAccount1 }));
    });

    it('sendBloodToLab() allows another doctor to send patient\'s blood to another lab (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodReceived, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount2, { from: patientAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount2, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, labAccount2, { from: otherAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, patientAccount1, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, doctorAccount1, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(sessionId, otherAccount1, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.sendBloodToLab(invalidSessionId, labAccount2, { from: doctorAccount2 }));
      await healthcareCore.sendBloodToLab(sessionId, labAccount2, { from: doctorAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodSentToLab', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount2, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodSentToLab');
      const eventBloodSentToLabEmitted = (events.length == 1);
      assert.equal(eventBloodSentToLabEmitted, true, 'BloodSentToLab event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, labAccount2, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can send blood results to doctor', () => {
    it('sendBloodResults() allows a lab to send patient\'s blood results to a doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: patientAccount1 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: otherAccount1 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: labAccount2 }));
      await expectThrow(healthcareCore.sendBloodResults(invalidSessionId, { from: labAccount1 }));
      await healthcareCore.sendBloodResults(sessionId, { from: labAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodResultsReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodResultsReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount1, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodResultsReceived');
      const eventBloodResultsReceivedEmitted = (events.length == 1);
      assert.equal(eventBloodResultsReceivedEmitted, true, 'BloodResultsReceived event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, labAccount1, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('sendBloodResults() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodResultsReceived, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: labAccount1 }));
    });

    it('sendBloodResults() allows another lab to send patient\'s blood results to another doctor (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodSentToLab, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: patientAccount2 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: otherAccount2 }));
      await expectThrow(healthcareCore.sendBloodResults(sessionId, { from: labAccount1 }));
      await expectThrow(healthcareCore.sendBloodResults(invalidSessionId, { from: labAccount2 }));
      await healthcareCore.sendBloodResults(sessionId, { from: labAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.BloodResultsReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BloodTaken', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'BloodResultsReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount2, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BloodResultsReceived');
      const eventBloodResultsReceivedEmitted = (events.length == 1);
      assert.equal(eventBloodResultsReceivedEmitted, true, 'BloodResultsReceived event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, labAccount2, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can write prescription', () => {
    it('writePrescription() allows a doctor to write a prescription for a patient', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodResultsReceived, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: patientAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: otherAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: labAccount1 }));
      await expectThrow(healthcareCore.writePrescription(invalidSessionId, { from: doctorAccount1 }));
      await healthcareCore.writePrescription(sessionId, { from: doctorAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.PrescriptionReceived, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.PrescriptionWritten, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'PrescriptionReceived', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'PrescriptionWritten', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount1, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('PrescriptionReceived');
      const eventPrescriptionReceivedEmitted = (events.length == 1);
      assert.equal(eventPrescriptionReceivedEmitted, true, 'PrescriptionReceived event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, labAccount1, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('writePrescription() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.PrescriptionReceived, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PrescriptionWritten, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: doctorAccount1 }));
    });

    it('writePrescription() allows another doctor to write a prescription for another patient (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.BloodTaken, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.BloodResultsReceived, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: patientAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: otherAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: labAccount2 }));
      await expectThrow(healthcareCore.writePrescription(invalidSessionId, { from: doctorAccount2 }));
      await healthcareCore.writePrescription(sessionId, { from: doctorAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.PrescriptionReceived, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.PrescriptionWritten, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'PrescriptionReceived', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'PrescriptionWritten', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount2, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('PrescriptionReceived');
      const eventPrescriptionReceivedEmitted = (events.length == 1);
      assert.equal(eventPrescriptionReceivedEmitted, true, 'PrescriptionReceived event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, labAccount2, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can pay bill', () => {
    it('payBill() allows a patient to pay a bill to a doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.PrescriptionReceived, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PrescriptionWritten, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      const sessionPriceStr = web3.utils.toWei('1', 'finney').toString();
      const sessionPriceUndervaluedStr = web3.utils.toWei('0.5', 'finney').toString();
      const gasPriceStr = '0';
      await expectThrow(healthcareCore.payBill(sessionId, { from: doctorAccount1, value: sessionPriceStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: patientAccount2, value: sessionPriceStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: otherAccount1, value: sessionPriceStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: labAccount1, value: sessionPriceStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: patientAccount1, value: sessionPriceUndervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(invalidSessionId, { from: patientAccount1, value: sessionPriceStr, gasPrice: gasPriceStr }));
      const balancePatientBeforeTransaction = new BigNumber(await web3.eth.getBalance(patientAccount1));
      const balanceDoctorBeforeTransaction = new BigNumber(await web3.eth.getBalance(doctorAccount1));
      await healthcareCore.payBill(sessionId, { from: patientAccount1, value: sessionPriceStr, gasPrice: gasPriceStr });
      const balancePatientAfterTransaction = new BigNumber(await web3.eth.getBalance(patientAccount1));
      const balanceDoctorAfterTransaction = new BigNumber(await web3.eth.getBalance(doctorAccount1));
      assert.equal(
        balancePatientBeforeTransaction.minus(sessionPriceStr).toString(),
        balancePatientAfterTransaction.toString(), 'Invalid patient balance');
      assert.equal(
        balanceDoctorBeforeTransaction.plus(sessionPriceStr).toString(),
        balanceDoctorAfterTransaction.toString(), 'Invalid doctor balance');
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.BillPaid, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.MoneyReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BillPaid', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'MoneyReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount1, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BillPaid');
      const eventBillPaidEmitted = (events.length == 1);
      assert.equal(eventBillPaidEmitted, true, 'BillPaid event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, labAccount1, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });

    it('payBill() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BillPaid, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.MoneyReceived, 'Invalid doctor state');
      const sessionId = 0;
      const sessionPriceStr = web3.utils.toWei('1', 'finney').toString();
      const gasPriceStr = '0';
      await expectThrow(healthcareCore.payBill(sessionId, { from: patientAccount1, value: sessionPriceStr, gasPrice: gasPriceStr }));
    });

    it('payBill() allows another patient to [over]pay a bill to another doctor (in parallel)', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.PrescriptionReceived, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.PrescriptionWritten, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      const sessionPriceStr = web3.utils.toWei('1', 'finney').toString();
      const sessionPriceOvervaluedStr = web3.utils.toWei('2', 'finney').toString();
      const sessionPriceUndervaluedStr = web3.utils.toWei('0.5', 'finney').toString();
      const gasPriceStr = '0';
      await expectThrow(healthcareCore.payBill(sessionId, { from: doctorAccount2, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: patientAccount1, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: otherAccount2, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: labAccount2, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(sessionId, { from: patientAccount2, value: sessionPriceUndervaluedStr, gasPrice: gasPriceStr }));
      await expectThrow(healthcareCore.payBill(invalidSessionId, { from: patientAccount2, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr }));
      const balancePatientBeforeTransaction = new BigNumber(await web3.eth.getBalance(patientAccount2));
      const balanceDoctorBeforeTransaction = new BigNumber(await web3.eth.getBalance(doctorAccount2));
      await healthcareCore.payBill(sessionId, { from: patientAccount2, value: sessionPriceOvervaluedStr, gasPrice: gasPriceStr });
      const balancePatientAfterTransaction = new BigNumber(await web3.eth.getBalance(patientAccount2));
      const balanceDoctorAfterTransaction = new BigNumber(await web3.eth.getBalance(doctorAccount2));
      assert.equal(
        balancePatientBeforeTransaction.minus(sessionPriceStr).toString(),
        balancePatientAfterTransaction.toString(), 'Invalid patient balance');
      assert.equal(
        balanceDoctorBeforeTransaction.plus(sessionPriceStr).toString(),
        balanceDoctorAfterTransaction.toString(), 'Invalid doctor balance');
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.BillPaid, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.MoneyReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'BillPaid', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'MoneyReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount2, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('BillPaid');
      const eventBillPaidEmitted = (events.length == 1);
      assert.equal(eventBillPaidEmitted, true, 'BillPaid event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, labAccount2, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });

  describe('can leave doctor', () => {
    it('leaveDoctor() allows a patient to leave a doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.BillPaid, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.MoneyReceived, 'Invalid doctor state');
      const sessionId = 0;
      const invalidSessionId = 1;
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: patientAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: doctorAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: otherAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: labAccount1 }));
      await expectThrow(healthcareCore.writePrescription(invalidSessionId, { from: patientAccount1 }));
      await healthcareCore.leaveDoctor(sessionId, { from: patientAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.Idle, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'Idle', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'Idle', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount1, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, true, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('DoctorLeft');
      const eventDoctorLeftEmitted = (events.length == 1);
      assert.equal(eventDoctorLeftEmitted, true, 'DoctorLeft event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, labAccount1, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, true, 'Invalid session terminated status');
    });

    it('leaveDoctor() can be called only once', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      const sessionId = 0;
      await expectThrow(healthcareCore.leaveDoctor(sessionId, { from: patientAccount1 }));
    });

    it('leaveDoctor() allows another patient to leave another doctor', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount2);
      const doctorStateBefore = await getDoctorState(doctorAccount2);
      assert.equal(patientStateBefore, PatientState.BillPaid, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.MoneyReceived, 'Invalid doctor state');
      const sessionId = 1;
      const invalidSessionId = 0;
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: patientAccount1 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: doctorAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: otherAccount2 }));
      await expectThrow(healthcareCore.writePrescription(sessionId, { from: labAccount2 }));
      await expectThrow(healthcareCore.writePrescription(invalidSessionId, { from: patientAccount2 }));
      await healthcareCore.leaveDoctor(sessionId, { from: patientAccount2 });
      const patientStateAfter = await getPatientState(patientAccount2);
      const doctorStateAfter = await getDoctorState(doctorAccount2);
      assert.equal(patientStateAfter, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.Idle, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount2, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'Idle', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount2, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'Idle', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, labAccount2, 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, true, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('DoctorLeft');
      const eventDoctorLeftEmitted = (events.length == 1);
      assert.equal(eventDoctorLeftEmitted, true, 'DoctorLeft event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount2, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount2, 'Invalid session doctor');
      assert.equal(session.lab, labAccount2, 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, true, 'Invalid session terminated status');
    });
  });

  describe('can visit doctor again', () => {
    it('visitDoctor() allows a patient to visit a doctor again', async () => {
      const healthcareCore = await HealthcareCore.deployed();
      const patientStateBefore = await getPatientState(patientAccount1);
      const doctorStateBefore = await getDoctorState(doctorAccount1);
      assert.equal(patientStateBefore, PatientState.Idle, 'Invalid patient state');
      assert.equal(doctorStateBefore, DoctorState.Idle, 'Invalid doctor state');
      const sessionId = toNumber(await healthcareCore.visitDoctor.call(
        doctorAccount1, { from: patientAccount1 }));
      assert.equal(sessionId, 2, 'Invalid session id');
      await expectThrow(healthcareCore.getSessionInfo(sessionId));
      await healthcareCore.visitDoctor(doctorAccount1, { from: patientAccount1 });
      const patientStateAfter = await getPatientState(patientAccount1);
      const doctorStateAfter = await getDoctorState(doctorAccount1);
      assert.equal(patientStateAfter, PatientState.AtDoctor, 'Invalid patient state');
      assert.equal(doctorStateAfter, DoctorState.PatientReceived, 'Invalid doctor state');
      const sessionInfo = await healthcareCore.getSessionInfo(sessionId);
      assert.equal(sessionInfo._patient, patientAccount1, 'Invalid session info patient account');
      assert.equal(sessionInfo._patientState, 'AtDoctor', 'Invalid session info patient state');
      assert.equal(sessionInfo._doctor, doctorAccount1, 'Invalid session info doctor account');
      assert.equal(sessionInfo._doctorState, 'PatientReceived', 'Invalid session info doctor state');
      assert.equal(sessionInfo._lab, '0x0000000000000000000000000000000000000000', 'Invalid session info lab account');
      assert.equal(web3.utils.fromWei(sessionInfo._price, 'finney'), '1', 'Invalid session info price');
      assert.equal(sessionInfo._terminated, false, 'Invalid session info terminated status');
      const events = await healthcareCore.getPastEvents('DoctorVisited');
      const eventDoctorVisitedEmitted = (events.length == 1);
      assert.equal(eventDoctorVisitedEmitted, true, 'DoctorVisited event not emitted');
      const eventSessionId = toNumber(events[0].args.sessionId);
      assert.equal(eventSessionId, sessionId, 'Invalid event sessionId');
      const session = await healthcareCore.sessions.call(sessionId);
      assert.equal(toNumber(session.sessionId), sessionId, 'Invalid session id');
      assert.equal(session.patient, patientAccount1, 'Invalid session patient');
      assert.equal(session.doctor, doctorAccount1, 'Invalid session doctor');
      assert.equal(session.lab, '0x0000000000000000000000000000000000000000', 'Invalid session lab');
      assert.equal(web3.utils.fromWei(session.price, 'finney'), '1', 'Invalid session price');
      assert.equal(session.terminated, false, 'Invalid session terminated status');
    });
  });
});