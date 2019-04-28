pragma solidity ^0.5.6;

import "./FlightSuretyStopLoss.sol";
import "./FlightSuretyUtility.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title FlightSurety Data
 * @dev Contract holding the FlightSurety data.
 */
contract FlightSuretyData is FlightSuretyStopLoss, FlightSuretyUtility {
  using SafeMath for uint256;

  // Authorized contracts that can access this data contract.
  mapping(address => bool) private authorizedContracts;

  /**
   * @dev Modifier that requires the authorized contract to be the caller.
   */
  modifier requireIsCallerAuthorized() {
    require(authorizedContracts[msg.sender], "Caller is not authorized");
    _;
  }

  /**
   * @dev Constructor
   */
  constructor() public {
    contractOwner = msg.sender;
  }

  /**
   * @dev Fallback function for funding smart contract.
   */
  function() external payable {
    this.fund();
  }

  /**
   * @dev Function for funding smart contract.
   */
  function fund() external payable {}

  /**
    * @dev Authorizes a contract to access this data contract.
    * @param contractAddress Address of a contract to be authorized.
    */
  function authorizeContract(address contractAddress)
  public requireContractOwner requireIsOperational {
    authorizedContracts[contractAddress] = true;
  }

  /**
    * @dev Deauthorizes a contract to access this data contract.
    * @param contractAddress Address of a contract to be deauthorized.
    */
  function deauthorizeContract(address contractAddress)
  public requireContractOwner requireIsOperational {
    delete authorizedContracts[contractAddress];
  }

  /**
   * @dev Returns whether the contract account is authorized.
   * @param contractAddress Contract address to be verified.
   * @return Whether the contract account is authorized.
   */
  function isAuthorizedContract(address contractAddress)
  public view requireIsOperational returns(bool) {
    return authorizedContracts[contractAddress];
  }

  // Info about an airline.
  struct Airline {
    // Whether the airline is registered.
    bool isRegistered;
    // Whether the airline provided funding.
    bool isFunded;
    // Name of the airline.
    string airlineName;
  }

  // Number of registered airlines.
  uint256 private airlineCount = 0;

  // Registered airlines.
  mapping(address => Airline) private airlines;

  // Maps airline address to its vote addresses.
  mapping(address => address[]) private airlineVotes;

  /**
   * @dev Vote for the to-be-registered airline.
   * @param origin Address of the original account.
   * @param airline Address of the airline to be registered.
   * @return voteCount Total number of votes the airline received.
   */
  function voteForAirline(address origin, address airline) public
  requireIsCallerAuthorized requireIsOperational returns (uint256 voteCount) {
    require(origin != address(0), "Origin must be valid address");
    require(airline != address(0), "Airline must be valid address");
    address[] storage votes = airlineVotes[airline];
    bool alreadyVoted = false;
    for (uint256 i = 0; i < votes.length; i = i.add(1)) {
      if (votes[i] == origin) {
        alreadyVoted = true;
        break;
      }
    }
    require(!alreadyVoted, "Origin has already voted");
    votes.push(origin);
    voteCount = votes.length;
  }

  /**
   * @dev Registers the airline.
   * @param airline Address of the airline to be registered.
   * @param airlineName Name of the airline to be registered.
   */
  function registerAirline(
    address airline,
    string memory airlineName)
  public requireIsCallerAuthorized requireIsOperational {
    require(airline != address(0), "Airline must be valid address");
    require(!isRegisteredAirline(airline), "Airline is already registered");
    require(!isEmpty(airlineName), "Airline name cannot be emtpy");
    airlines[airline] = Airline({
      isRegistered: true,
      isFunded: false,
      airlineName: airlineName
    });
    // We no longer need to remember the votes.
    delete airlineVotes[airline];
    airlineCount = airlineCount.add(1);
  }

  /**
   * @dev Sets airline to be funded.
   * @param airline Address of the airline to be funded.
   */
  function fundAirline(address airline)
  public requireIsCallerAuthorized requireIsOperational {
    require(airline != address(0), "Airline must be valid address");
    require(isRegisteredAirline(airline), "Airline is not registered");
    require(!isFundedAirline(airline), "Airline is already funded");
    airlines[airline].isFunded = true;
  }

  /**
   * @dev Returns whether the account is a registered airline.
   * @param account Address to be verified.
   * @return Whether the account is a registered airline.
   */
  function isRegisteredAirline(address account)
  public view requireIsOperational returns(bool) {
    return airlines[account].isRegistered;
  }

  /**
   * @dev Returns whether the account is a funded airline.
   * @param account Address to be verified.
   * @return Whether the account is a funded airline.
   */
  function isFundedAirline(address account)
  public view requireIsOperational returns(bool) {
    return airlines[account].isFunded;
  }

  /**
   * @dev Returns the total number of registered airlines.
   * @return Total number of registered airlines.
   */
  function getAirlineCount()
  public view requireIsOperational returns(uint256) {
    return airlineCount;
  }

  // Info about a flight.
  struct Flight {
    // Airline account.
    address airline;
    // Flight code.
    string flight;
    // Flight timestamp.
    uint256 timestamp;
    // Flight departure.
    string departure;
    // Flight destination.
    string destination;
  }

  // Registered flights.
  Flight[] public flights;

  // Maps a flight key to whether the flight is already registered.
  mapping(bytes32 => bool) private flightRegistered;

  /**
   * @dev Registers a flight.
   * @param airline Address of the airline.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   * @param departure Flight departure.
   * @param destination Flight destination.
   */
  function registerFlight(
    address airline,
    string memory flight,
    uint256 timestamp,
    string memory departure,
    string memory destination)
  public requireIsCallerAuthorized requireIsOperational {
    require(airline != address(0), "Airline must be valid address");
    require(isRegisteredAirline(airline), "Airline is not registered");
    require(isFundedAirline(airline), "Airline did not submit funding");
    require(!isEmpty(flight), "Flight code cannot be emtpy");
    require(!isEmpty(departure), "Departure name cannot be emtpy");
    require(!isEmpty(destination), "Destination name cannot be emtpy");
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    require(!flightRegistered[flightKey], "Flight already registered");
    flights.push(Flight({
      airline: airline,
      flight: flight,
      timestamp: timestamp,
      departure: departure,
      destination: destination
    }));
    flightRegistered[flightKey] = true;
  }

  /**
   * @dev Returns whether a flight is registered.
   * @param airline Address of the airline.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   * @return isRegistered whether a flight is registered.
   */
  function isFlightRegistered(
    address airline,
    string memory flight,
    uint256 timestamp)
  public view requireIsOperational returns(bool isRegistered) {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    isRegistered = flightRegistered[flightKey];
  }

  /**
   * @dev Returns the total number of registered flights.
   * @return flightCount total number of registered flights.
   */
  function getFlightCount()
  public view requireIsOperational returns(uint256 flightCount) {
    flightCount = flights.length;
  }

  /**
   * @dev Returns the i-th registered flight.
   * @param flightIndex Index of the flight.
   * @return airline Address of the airline.
   * @return airlineName Name of the airline.
   * @return flight Flight code.
   * @return timestamp Flight timestamp.
   * @return departure Flight departure.
   * @return destination Flight destination.
   */
  function getFlight(uint256 flightIndex)
  public view requireIsOperational
  returns (
    address airline,
    string memory airlineName,
    string memory flight,
    uint256 timestamp,
    string memory departure,
    string memory destination) {
    require(
      (flightIndex >= 0) && (flightIndex < flights.length),
      "flightIndex is out of bounds");
    Flight storage flightData = flights[flightIndex];
    airline = flightData.airline;
    airlineName = airlines[airline].airlineName;
    flight = flightData.flight;
    timestamp = flightData.timestamp;
    departure = flightData.departure;
    destination = flightData.destination;
  }

  // Info about an insurance.
  struct Insurance {
    // Insuree address.
    address insuree;
    // How much insurance has the insuree bought.
    uint256 insurance;
    // Airline address.
    address airline;
    // Flight code.
    string flight;
    // Flight timestamp.
    uint256 timestamp;
  }

  // Maps flight key to array of insurances.
  mapping(bytes32 => Insurance[]) private insurances;

  // Maps insuree addresses to how much credit the insuree can withdraw.
  mapping(address => uint256) private credits;

  /**
   * @dev Buys insurance for the given flight.
   * @param insuree Address of insuree.
   * @param insurance Insurance value.
   * @param airline Address of the airline.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   */
  function buyInsurance(
    address insuree,
    uint256 insurance,
    address airline,
    string memory flight,
    uint256 timestamp)
  public payable requireIsCallerAuthorized requireIsOperational {
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    require(flightRegistered[flightKey], "Flight is not registered");
    Insurance[] storage flightInsurances = insurances[flightKey];
    bool alreadyInsured = false;
    for (uint256 i = 0; i < flightInsurances.length; i = i.add(1)) {
      if ((flightInsurances[i].insuree == insuree) &&
          (flightInsurances[i].airline == airline) &&
          (keccak256(abi.encodePacked(flightInsurances[i].flight)) ==
          keccak256(abi.encodePacked(flight))) &&
          (flightInsurances[i].timestamp == timestamp)) {
        alreadyInsured = true;
        break;
      }
    }
    require(!alreadyInsured, "Insuree is already insured");
    flightInsurances.push(Insurance({
      insuree: insuree,
      insurance: insurance,
      airline: airline,
      flight: flight,
      timestamp: timestamp
    }));
  }

  /**
   * @dev Returns the total number of insurances for the flight.
   * @param flightKey Flight key.
   * @return insuranceCount total number of insurances for the flight.
   */
  function getFlightInsuranceCount(bytes32 flightKey)
  public view requireIsOperational returns (uint256 insuranceCount) {
    require(flightRegistered[flightKey], "Flight is not registered");
    insuranceCount = insurances[flightKey].length;
  }

  /**
   * @dev Returns the i-th insurance for the flight.
   * @param flightKey Flight key.
   * @param insuranceIndex Index of the insurance.
   * @return insuree Address of insuree.
   * @return insurance Insurance value.
   */
  function getFlightInsurance(bytes32 flightKey, uint256 insuranceIndex)
  public view requireIsOperational
  returns (address insuree, uint256 insurance) {
    require(flightRegistered[flightKey], "Flight is not registered");
    Insurance[] storage flightInsurances = insurances[flightKey];
    require(
      (insuranceIndex >= 0) && (insuranceIndex < flightInsurances.length),
      "insuranceIndex is out of bounds");
    Insurance storage flightInsurance = flightInsurances[insuranceIndex];
    insuree = flightInsurance.insuree;
    insurance = flightInsurance.insurance;
  }

  /**
   * @dev Clears all insurances for the flight.
   * @param flightKey Flight key.
   */
  function clearFlightInsurances(bytes32 flightKey)
  public requireIsCallerAuthorized requireIsOperational {
    require(flightRegistered[flightKey], "Flight is not registered");
    delete insurances[flightKey];
  }

  /**
   * @dev Credits payout to the insuree.
   * @param insuree Address of the insuree to be credited.
   * @param payout Payout.
   */
  function creditInsuree(address insuree, uint256 payout)
  public requireIsCallerAuthorized requireIsOperational {
    credits[insuree] = credits[insuree].add(payout);
  }

  /**
   * @dev Returns the total credit of an insuree.
   * @param insuree Address of the insuree.
   * @return insureeCredit Total credit of an insuree.
   */
  function getInsureeCredit(address insuree) public view requireIsOperational
  returns (uint256 insureeCredit) {
    insureeCredit = credits[insuree];
  }

  /**
   * @dev Transfers eligible payout funds to the insuree.
   * @param insuree Address of the insuree to be paid.
   */
  function pay(address payable insuree)
  public requireIsCallerAuthorized requireIsOperational {
    // Checks.
    uint256 payout = credits[insuree];
    require(payout > 0, "Invalid insurance claim");
    // Effects.
    credits[insuree] = 0;
    // Interaction.
    insuree.transfer(payout);
  }

  /**
   * @dev Returns true if the given string is empty.
   * @param str string to be checked.
   * @return bool whether the given string is empty.
   */
  function isEmpty(string memory str) internal pure returns (bool) {
    bytes memory strBytes = bytes(str);
    return strBytes.length == 0;
  }
}
