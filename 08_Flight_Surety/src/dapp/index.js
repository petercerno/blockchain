import DOM from './dom';
import Contract from './contract';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import './flightsurety.css';

class App {
  constructor() { }

  async initialize(network) {
    this.contract = new Contract();
    await this.contract.initialize(network);
    this.watchFlightRegisteredEvent();
    this.watchFlightStatusInfo();
    this.watchInsurancePayout();
  }

  toString = (bigNumber) => {
    return new BigNumber(bigNumber).toString();
  };

  watchFlightRegisteredEvent() {
    this.flightRegisteredEvents = {};
    this.contract.getFlightSuretyApp().events.FlightRegistered()
      .on('data', async (event) => {
        // Due to a bug in web3@1.0.0-beta.37 we need a protection from
        // event over-triggering. We cannot update to later web3 releases
        // as they are not compatible with MetaMask.
        if (this.flightRegisteredEvents[event.transactionHash]) {
          return;
        }
        this.flightRegisteredEvents[event.transactionHash] = true;
        await this.updateAllFlightLabels();
      })
      .on('error', console.error);
  }

  watchFlightStatusInfo() {
    this.flightStatusInfoEvents = {};
    this.contract.getFlightSuretyApp().events.FlightStatusInfo()
      .on('data', async (event) => {
        if (this.flightStatusInfoEvents[event.transactionHash]) {
          return;
        }
        this.flightStatusInfoEvents[event.transactionHash] = true;
        App.display('fetch-flight-status-output', 'Flight Status Info',
          'Flight status info retrieved from Oracles',
          [
            { label: 'Flight Code', value: event.returnValues.flight },
            { label: 'Flight Status', value: event.returnValues.status },
          ]);
      })
      .on('error', console.error);
  }

  watchInsurancePayout() {
    this.insurancePayoutEvents = {};
    this.contract.getFlightSuretyApp().events.InsurancePayout()
      .on('data', async (event) => {
        if (this.insurancePayoutEvents[event.transactionHash]) {
          return;
        }
        this.insurancePayoutEvents[event.transactionHash] = true;
        console.log(event);
        App.display('claim-insurance-output', 'Claim Insurance Info',
          'Insurance was successfully claimed',
          [
            { label: 'Insuree', value: event.returnValues.insuree },
            {
              label: 'Payout',
              value: Web3.utils.fromWei(event.returnValues.payout, 'ether')
            },
          ]);
        await this.getInsureeCreditAndBalance();
      })
      .on('error', console.error);
  }

  async updateOperationalStatus() {
    let statusResults = [];
    try {
      let status = await this.contract.isOperational();
      statusResults.push({ label: 'Operational Status', value: status });
    } catch (error) {
      statusResults.push({ label: 'Operational Status Error', error: error });
    }
    App.display('display-wrapper',
      'Operational Status', 'Check if contract is operational', statusResults);
  }

  async updateAllFlightLabels() {
    try {
      const flightLabels = await this.contract.getFlightLabels();
      App.updateSelect('select-flight-1', flightLabels);
      App.updateSelect('select-flight-2', flightLabels);
    } catch (error) {
      App.display('display-wrapper', 'List of Flights Error',
        'Exception was thrown when retrieving list of flights',
        [{ label: 'Flight Error', error: error }]);
    }
  }

  static updateSelect(selectId, options) {
    let select = DOM.elid(selectId);
    select.options.length = 0;
    for (let i = 0; i < options.length; i++) {
      select.options[select.options.length] = new Option(options[i], i);
    }
  }

  async registerAirline() {
    const airlineAddress = DOM.elid('airline-address').value;
    const airlineName = DOM.elid('airline-name').value;
    try {
      const result = await this.contract.registerAirline(
        airlineAddress, airlineName);
      App.display('register-airline-output',
        airlineName + ' Registration Result',
        'Registration submitted with the following result',
        [
          { label: 'Registration Success', value: result.success },
          { label: 'Registration Votes', value: result.voteCount },
        ]);
    } catch (error) {
      App.display('register-airline-output',
        airlineName + ' Registration Error',
        'Exception was thrown during the airline registration',
        [{ label: 'Registration Error', error: error }]);
    }
  }

  async fundAirline() {
    const airlineFundsEther = DOM.elid('airline-funds').value;
    try {
      await this.contract.fundAirline(airlineFundsEther);
      App.display('fund-airline-output', 'Airline Funding Result',
        'Airline funds were accepted',
        [
          {
            label: 'Funding Accepted',
            value: airlineFundsEther.toString() + ' Ether'
          },
        ]);
    } catch (error) {
      App.display('fund-airline-output', 'Airline Funding Error',
        'Exception was thrown during the airline funding',
        [{ label: 'Funding Error', error: error }]);
    }
  }

  async registerFlight() {
    const flightCode = DOM.elid('flight-code').value;
    const flightTimestamp = DOM.elid('flight-timestamp').value;
    const flightDeparture = DOM.elid('flight-departure').value;
    const flightDestination = DOM.elid('flight-destination').value;
    const flightDescription = (
      flightCode + ' ' + flightDeparture + ' -> ' + flightDestination);
    try {
      await this.contract.registerFlight(
        flightCode, flightTimestamp, flightDeparture, flightDestination);
      await this.updateAllFlightLabels();
      App.display('register-flight-output',
        flightCode + ' Registration Result',
        'Flight was registered successfully',
        [{ label: 'Registered Flight', value: flightDescription }]);
    } catch (error) {
      App.display('register-flight-output',
        flightCode + ' Registration Error',
        'Exception was thrown during the flight registration',
        [{ label: 'Registration Error', error: error }]);
    }
  }

  async buyInsurance() {
    const flightIndex = DOM.elid('select-flight-1').value;
    const insuranceEther = DOM.elid('flight-insurance').value;
    try {
      await this.contract.buyInsurance(flightIndex, insuranceEther);
      App.display('buy-flight-insurance-output', 'Flight Insurance Result',
        'Flight insurance was purchased successfully',
        [
          {
            label: 'Insurance Purchased',
            value: insuranceEther.toString() + ' Ether'
          },
        ]);
    } catch (error) {
      App.display('buy-flight-insurance-output', 'Flight Insurance Error',
        'Exception was thrown during the flight insurance purchase',
        [{ label: 'Insurance Error', error: error }]);
    }
  }

  async fetchFlightStatus() {
    const flightIndex = DOM.elid('select-flight-2').value;
    try {
      await this.contract.fetchFlightStatus(flightIndex);
      App.display('fetch-flight-status-output', 'Flight Status Request',
        'Flight status was requested successfully',
        [
          {
            label: 'Flight Status Requested',
            value: DOM.elid('select-flight-2').options[flightIndex].text
          },
        ]);
    } catch (error) {
      App.display('fetch-flight-status-output', 'Flight Status Request Error',
        'Exception was thrown during the flight status request',
        [{ label: 'Flight Status Request Error', error: error }]);
    }
  }

  async getInsureeCreditAndBalance() {
    try {
      const result = await this.contract.getInsureeCreditAndBalance();
      DOM.elid('credit').value = result.credit;
      DOM.elid('balance').value = result.balance;
    } catch (error) {
      App.display('claim-insurance-output', 'Check My Credit Error',
        'Exception was thrown during check my credit request',
        [{ label: 'Check My Credit Error', error: error }]);
    }
  }

  async claimInsurancePayout() {
    try {
      await this.contract.claimInsurancePayout();
    } catch (error) {
      App.display('claim-insurance-output', 'Claim Insurance Error',
        'Exception was thrown during the claim insurance request',
        [{ label: 'Claim Insurance Error', error: error }]);
    }
  }

  static display(displayId, title, description, results) {
    let displayDiv = DOM.elid(displayId);
    let section = DOM.section();
    if (title) {
      section.appendChild(DOM.h2(title));
    }
    if (description) {
      section.appendChild(DOM.h5(description));
    }
    results.map((result) => {
      let row = section.appendChild(DOM.div({ className: 'row' }));
      row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
      row.appendChild(DOM.div({ className: 'col-sm-8 field-value' },
        result.error ? String(result.error) : String(result.value)));
      section.appendChild(row);
    })
    displayDiv.append(section);
  }
}

(async () => {
  const app = new App();
  await app.initialize('localhost');
  await app.updateOperationalStatus();
  await app.updateAllFlightLabels();
  DOM.elid('register-airline').addEventListener('click', async () => {
    await app.registerAirline();
  });
  DOM.elid('fund-airline').addEventListener('click', async () => {
    await app.fundAirline();
  });
  DOM.elid('register-flight').addEventListener('click', async () => {
    await app.registerFlight();
  });
  DOM.elid('buy-flight-insurance').addEventListener('click', async () => {
    await app.buyInsurance();
  });
  DOM.elid('fetch-flight-status').addEventListener('click', async () => {
    await app.fetchFlightStatus();
  });
  DOM.elid('check-credit').addEventListener('click', async () => {
    await app.getInsureeCreditAndBalance();
  });
  DOM.elid('claim-insurance').addEventListener('click', async () => {
    await app.claimInsurancePayout();
  });
})();
