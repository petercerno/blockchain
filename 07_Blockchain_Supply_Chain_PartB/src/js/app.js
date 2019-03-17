const App = {
  web3Provider: null,
  contracts: {},
  emptyAccount: '0x0000000000000000000000000000000000000000',
  metamaskAccountId: '0x0000000000000000000000000000000000000000',
  roleAccount: '0x0000000000000000000000000000000000000000',
  sessionId: -1,
  sessionStatus: 'Invalid',
  patientAccount: '0x0000000000000000000000000000000000000000',
  patientState: null,
  visitDoctorAccount: '0x0000000000000000000000000000000000000000',
  doctorAccount: '0x0000000000000000000000000000000000000000',
  doctorState: null,
  sendToLabAccount: '0x0000000000000000000000000000000000000000',
  labAccount: '0x0000000000000000000000000000000000000000',

  readForm: () => {
    App.roleAccount = $('#roleAccount').val();
    App.sessionId = $('#sessionId').val();
    App.sessionStatus = $('#sessionStatus').val();
    App.patientAccount = $('#patientAccount').val();
    App.patientState = $('#patientState').val();
    App.visitDoctorAccount = $('#visitDoctorAccount').val();
    App.doctorAccount = $('#doctorAccount').val();
    App.doctorState = $('#doctorState').val();
    App.sendToLabAccount = $('#sendToLabAccount').val();
    App.labAccount = $('#labAccount').val();
    console.log(
      App.roleAccount,
      App.sessionId,
      App.sessionStatus,
      App.patientAccount,
      App.patientState,
      App.visitDoctorAccount,
      App.doctorAccount,
      App.doctorState,
      App.sendToLabAccount,
      App.labAccount
    );
  },

  updateForm: () => {
    $('#roleAccount').val(App.roleAccount);
    $('#sessionId').val(App.sessionId);
    $('#sessionStatus').val(App.sessionStatus);
    $('#patientAccount').val(App.patientAccount);
    $('#patientState').val(App.patientState);
    $('#visitDoctorAccount').val(App.visitDoctorAccount);
    $('#doctorAccount').val(App.doctorAccount);
    $('#doctorState').val(App.doctorState);
    $('#sendToLabAccount').val(App.sendToLabAccount);
    $('#labAccount').val(App.labAccount);
  },

  resetForm: () => {
    App.roleAccount = App.emptyAccount;
    App.sessionId = -1;
    App.sessionStatus = 'Invalid';
    App.patientAccount = App.emptyAccount;
    App.patientState = null;
    App.visitDoctorAccount = App.emptyAccount;
    App.doctorAccount = App.emptyAccount;
    App.doctorState = null;
    App.sendToLabAccount = App.emptyAccount;
    App.labAccount = App.emptyAccount;
    App.updateForm();
  },

  initWeb3: async () => {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error('User denied account access');
      }
    }
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    else {
      App.web3Provider = (
        new Web3.providers.HttpProvider('http://localhost:7545'));
    }
    await App.getMetamaskAccountId();
    await App.initContract('HealthcareCore');
    await App.fetchEvents();
    App.bindEvents();
  },

  getAccountsPromise: () => {
    return new Promise((resolve, reject) => {
      const web3 = new Web3(App.web3Provider);
      web3.eth.getAccounts((error, accounts) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(accounts);
        }
      });
    });
  },

  getMetamaskAccountId: async () => {
    try {
      const accounts = await App.getAccountsPromise();
      console.log('getMetamaskAccountId Accounts:', accounts);
      App.metamaskAccountId = accounts[0];
    } catch (err) {
      console.log('getMetamaskAccountId Error:', err);
    }
  },

  initContract: async (contractName) => {
    try {
      const jsonContract = '../../build/contracts/' + contractName + '.json';
      const ContractArtifact = await $.getJSON(jsonContract);
      console.log(contractName, ContractArtifact);
      App.contracts[contractName] = TruffleContract(ContractArtifact);
      App.contracts[contractName].setProvider(App.web3Provider);
    } catch (err) {
      console.log('initContract Error:', err);
    }
  },

  bindEvents: () => {
    $(document).on('click', App.handleButtonClick);
  },

  handleButtonClick: async (event) => {
    event.preventDefault();
    App.readForm();
    await App.getMetamaskAccountId();
    const processId = parseInt($(event.target).data('id'));
    console.log('processId', processId);
    let refreshForm = true;
    try {
      switch (processId) {
      case 0:
        break;
      case 1:
        await App.visitDoctor();
        break;
      case 2:
        await App.takeBlood();
        break;
      case 3:
        await App.sendBloodToLab();
        break;
      case 4:
        await App.sendBloodResults();
        break;
      case 5:
        await App.writePrescription();
        break;
      case 6:
        await App.payBill();
        break;
      case 7:
        await App.leaveDoctor();
        break;
      default:
        refreshForm = false;
        break;
      }
      if (refreshForm) {
        await App.fetchSession();
        App.updateForm();
      }
    } catch (err) {
      if (processId == 0) {
        App.resetForm();
      }
      console.log(err.message);
    }
    try {
      switch (processId) {
      case 10:
        await App.addPatient();
        break;
      case 11:
        await App.addDoctor();
        break;
      case 12:
        await App.addLab();
        break;
      }
    } catch (err) {
      console.log(err.message);
    }
  },

  // Converts the given BigNumber to a number.
  toNumber: (bigNumber) => {
    return new BigNumber(bigNumber).toNumber();
  },

  addPatient: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.addPatient(
      App.roleAccount, { from: App.metamaskAccountId });
    console.log('addPatient', transaction);
  },

  addDoctor: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.addDoctor(
      App.roleAccount, { from: App.metamaskAccountId });
    console.log('addDoctor', transaction);
  },

  addLab: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.addLab(
      App.roleAccount, { from: App.metamaskAccountId });
    console.log('addLab', transaction);
  },

  fetchSession: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const sessionInfo = await healthcareCore.getSessionInfo(App.sessionId);
    App.patientAccount = sessionInfo._patient;
    App.patientState = sessionInfo._patientState;
    App.visitDoctorAccount = sessionInfo._doctor;
    App.doctorAccount = sessionInfo._doctor;
    App.doctorState = sessionInfo._doctorState;
    App.sendToLabAccount = sessionInfo._lab;
    App.labAccount = sessionInfo._lab;
    if (sessionInfo._terminated) {
      App.sessionStatus = 'Terminated';
    } else {
      App.sessionStatus = 'Active';
    }
    console.log('fetchSession', sessionInfo);
  },

  visitDoctor: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const sessionId = App.toNumber(await healthcareCore.visitDoctor.call(
      App.visitDoctorAccount, { from: App.metamaskAccountId }));
    const transaction = await healthcareCore.visitDoctor(
      App.visitDoctorAccount, { from: App.metamaskAccountId });
    App.sessionId = sessionId;
    console.log('visitDoctor', transaction);
  },

  takeBlood: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.takeBlood(
      App.sessionId, { from: App.metamaskAccountId });
    console.log('takeBlood', transaction);
  },

  sendBloodToLab: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.sendBloodToLab(
      App.sessionId, App.sendToLabAccount, { from: App.metamaskAccountId });
    console.log('sendBloodToLab', transaction);
  },

  sendBloodResults: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.sendBloodResults(
      App.sessionId, { from: App.metamaskAccountId });
    console.log('sendBloodResults', transaction);
  },

  writePrescription: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.writePrescription(
      App.sessionId, { from: App.metamaskAccountId });
    console.log('writePrescription', transaction);
  },

  payBill: async () => {
    const web3 = new Web3(App.web3Provider);
    const sessionPrice = web3.toWei(1, 'ether');
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.payBill(
      App.sessionId, { from: App.metamaskAccountId, value: sessionPrice });
    console.log('payBill', transaction);
  },

  leaveDoctor: async () => {
    const healthcareCore = await App.contracts.HealthcareCore.deployed();
    const transaction = await healthcareCore.leaveDoctor(
      App.sessionId, { from: App.metamaskAccountId });
    console.log('leaveDoctor', transaction);
  },

  fetchEvents: async () => {
    try {
      const healthcareCore = await App.contracts.HealthcareCore.deployed();
      const logEvent = (err, log) => {
        if (!err) {
          $('#ftc-events').append(
            '<li>' + log.event + ' - ' + log.transactionHash + '</li>');
        }
      };
      const events = await healthcareCore.getPastEvents(
        'allEvents', { fromBlock: 0, toBlock: 'latest' });
      const eventsLength = events.length;
      for (var i = 0; i < eventsLength; i++) {
        logEvent(null, events[i]);
      }
      healthcareCore.allEvents(logEvent);
    } catch (err) {
      console.log('fetchEvents Error:', err);
    }
  }
};

$(() => {
  $(window).load(async () => {
    await App.initWeb3();
  });
});