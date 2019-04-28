pragma solidity ^0.5.6;

import "./FlightSuretyStopLoss.sol";
import "./FlightSuretyUtility.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title FlightSurety App
 * @dev Contract with the main FlightSurety functionality.
 */
contract FlightSuretyApp is FlightSuretyStopLoss, FlightSuretyUtility {
  using SafeMath for uint256;

  // Flight status codes.
  uint8 private constant STATUS_CODE_UNKNOWN = 0;
  uint8 private constant STATUS_CODE_ON_TIME = 10;
  uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
  uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
  uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
  uint8 private constant STATUS_CODE_LATE_OTHER = 50;

  // Fee to be paid when funding an airline.
  uint256 public constant AIRLINE_FUNDING = 10 ether;

  // Maximum allowed flight insurance.
  uint256 public constant MAX_FLIGHT_INSURANCE = 1 ether;

  // Account that holds all FlightSurety data.
  FlightSuretyData private flightSuretyData;

  /**
  * @dev Sets the FlightSuretyData contract for this contract.
  * @param dataContract FlightSuretyData contract address.
  */
  function setDataContract(address payable dataContract)
  public requireContractOwner requireIsOperational {
    flightSuretyData = FlightSuretyData(dataContract);
  }

  /**
   * @dev Adds an airline to the registration queue.
   * @param airline Address of the airline to be registered.
   * @param airlineName Name of the airline to be registered.
   * @return success Whether the airline registration was successful.
   * @return voteCount Number of votes.
   */
  function registerAirline(address airline, string memory airlineName)
  public requireIsOperational returns (bool success, uint256 voteCount) {
    success = false;
    voteCount = 0;
    uint256 airlineCount = flightSuretyData.getAirlineCount();
    if (airlineCount == 0) {
      // There are no registered airlines.
      // Only the contract owner can register the first airline.
      require(msg.sender == contractOwner, "Caller is not contract owner");
      success = true;
      voteCount = 1;
    } else {
      require(flightSuretyData.isRegisteredAirline(msg.sender),
        "Caller is not registered airline");
      require(flightSuretyData.isFundedAirline(msg.sender),
        "Caller did not submit funding");
      if (airlineCount < 4) {
        // There are less than four registered airlines.
        success = true;
        voteCount = 1;
      } else {
        // There are at least four registered airlines.
        require(airlineCount >= 4, "This should never happen!");
        voteCount = flightSuretyData.voteForAirline(msg.sender, airline);
        if (voteCount.mul(2) >= airlineCount) {
          success = true;
        }
      }
    }
    if (success) {
      flightSuretyData.registerAirline(airline, airlineName);
    }
  }

  /**
   * @dev Funds the airline. Called by a registered airline.
   */
  function fundAirline() public payable requireIsOperational {
    require(msg.value == AIRLINE_FUNDING,
      "Airline fund fee of 10 ether is required");
    flightSuretyData.fundAirline(msg.sender);
    address(flightSuretyData).transfer(msg.value);
  }

  // Event fired when a new flight is registered.
  event FlightRegistered(
    string flight, uint256 timestamp, string departure, string destination);

   /**
   * @dev Airline can register a flight.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   * @param departure Flight departure.
   * @param destination Flight destination.
   */
  function registerFlight(
    string memory flight,
    uint256 timestamp,
    string memory departure,
    string memory destination)
  public requireIsOperational {
    flightSuretyData.registerFlight(
      msg.sender, flight, timestamp, departure, destination);
    emit FlightRegistered(flight, timestamp, departure, destination);
  }

  /**
   * @dev Returns the total number of registered flights.
   * @return flightCount Total number of registered flights.
   */
  function getFlightCount()
  public view requireIsOperational returns(uint256 flightCount) {
    flightCount = flightSuretyData.getFlightCount();
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
  function getFlight(uint256 flightIndex) public view requireIsOperational
  returns (
    address airline,
    string memory airlineName,
    string memory flight,
    uint256 timestamp,
    string memory departure,
    string memory destination) {
    (airline, airlineName, flight, timestamp, departure, destination) = 
      flightSuretyData.getFlight(flightIndex);
  }

  // Event fired when an insurance payout was credited to an insuree.
  event InsurancePayout(address insuree, uint256 payout);

  /**
   * @dev Buys insurance for the given flight.
   * @param airline Address of the airline.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   */
  function buyInsurance(
    address airline,
    string memory flight,
    uint256 timestamp)
  public payable requireIsOperational {
    require((msg.value > 0),
      "Non-zero funds are required for buying flight insurance");
    require((msg.value <= MAX_FLIGHT_INSURANCE),
      "Exceeded maximum allowed flight insurance value");
    flightSuretyData.buyInsurance(
      msg.sender, msg.value, airline, flight, timestamp);
    address(flightSuretyData).transfer(msg.value);
  }

  /**
   * @dev Returns the total credit of an insuree.
   * @return insureeCredit Total credit of an insuree.
   */
  function getInsureeCredit() public view requireIsOperational
  returns (uint256 insureeCredit) {
    insureeCredit = flightSuretyData.getInsureeCredit(msg.sender);
  }

  /**
   * @dev Transfers eligible insurance payout to the insuree.
   */
  function claimInsurancePayout() public requireIsOperational {
    uint256 insureeCredit = getInsureeCredit();
    flightSuretyData.pay(msg.sender);
    emit InsurancePayout(msg.sender, insureeCredit);
  }

  // Incremented to add pseudo-randomness at various points.
  uint8 private nonce = 0;

  // Fee to be paid when registering oracle.
  uint256 public constant REGISTRATION_FEE = 1 ether;

  // Number of oracles that must respond for valid status.
  uint256 private constant MIN_RESPONSES = 3;

  // Info about an oracle.
  struct Oracle {
    bool isRegistered;
    uint8[3] indexes;
  }

  // Tracks all registered oracles.
  mapping(address => Oracle) private oracles;

  // Response from oracle.
  struct ResponseInfo {
    // Account that requested the status.
    address requester;
    // If open, oracle responses are accepted.
    bool open;
    // Maps oracle address to whether the oracle responded or not.
    mapping(address => bool) responded;
    // Maps status code to list of oracle addresses that reported it.
    // This lets us group responses and identify the majority response.
    mapping(uint8 => address[]) responses;
  }

  // Tracks all oracle responses.
  // Key = hash(index, airline, flight, timestamp).
  mapping(bytes32 => ResponseInfo) private oracleResponses;

  // Maps flight key to flight status code.
  // Key = hash(airline, flight, timestamp).
  mapping(bytes32 => uint8) private flightStatus;

  // Event fired when flight status request is submitted.
  // Oracles track this and if they have a matching index
  // they fetch data and submit a response.
  event OracleRequest(
    uint8 index, address airline, string flight, uint256 timestamp);

  // Event fired each time an oracle submits a response.
  event OracleReport(
    address airline, string flight, uint256 timestamp, uint8 status);

  // Event fired when flight status is updated.
  event FlightStatusInfo(
    address airline, string flight, uint256 timestamp, uint8 status);

  /**
  * @dev Modifier that requires a registered oracle account to be the caller.
  */
  modifier requireRegisteredOracle() {
    require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
    _;
  }

  /**
   * @dev Generates a request for oracles to fetch flight information.
   * @param airline Address of the requested airline.
   * @param flight Requested flight code.
   * @param timestamp Requested flight timestamp.
   */
  function fetchFlightStatus(
    address airline,
    string memory flight,
    uint256 timestamp)
  public requireIsOperational {
    bool isFlightRegistered = flightSuretyData.isFlightRegistered(
      airline, flight, timestamp);
    require(isFlightRegistered, "Flight is not registered");
    uint8 index = getRandomIndex(msg.sender);
    bytes32 key = getOracleResponseKey(index, airline, flight, timestamp);
    oracleResponses[key] = ResponseInfo({
      requester: msg.sender,
      open: true
    });
    emit OracleRequest(index, airline, flight, timestamp);
  }

  /**
   * @dev Registers an oracle.
   */
  function registerOracle() public payable requireIsOperational {
    require(!oracles[msg.sender].isRegistered, "Oracle already registered");
    require(msg.value >= REGISTRATION_FEE,
      "Oracle registration fee is required");
    uint8[3] memory indexes = generateIndexes(msg.sender);
    oracles[msg.sender] = Oracle({
      isRegistered: true,
      indexes: indexes
    });
    address(flightSuretyData).transfer(msg.value);
  }

  /**
   * @dev Returns whether the sender is a registered oracle.
   * @return isRegistered Whether the sender is a registered oracle.
   */
  function isRegisteredOracle() public view requireIsOperational
  returns (bool isRegistered) {
    isRegistered = oracles[msg.sender].isRegistered;
  }

  /**
   * @dev Returns the three indexes of a registered oracle.
   * @return oracleIndexes Three indexes of a registered oracle.
   */
  function getOracleIndexes()
  public view requireIsOperational requireRegisteredOracle
  returns(uint8[3] memory oracleIndexes) {
    oracleIndexes = oracles[msg.sender].indexes;
  }

  /**
   * @dev Returns whether the oracle request is open.
   * @param index Index from the request.
   * @param airline Address of the airline from the request.
   * @param flight Flight code from the request.
   * @param timestamp Flight timestamp from the request.
   * @return isOpen Whether the oracle request is open.
   */
  function isOracleRequestOpen(
    uint8 index,
    address airline,
    string memory flight,
    uint256 timestamp)
  public view requireIsOperational returns (bool isOpen) {
    bytes32 key = getOracleResponseKey(index, airline, flight, timestamp);
    isOpen = oracleResponses[key].open;
  }

  /**
   * @dev Called by an oracle when a response is available to a request.
   *      For the response to be accepted, there must be a pending request that
   *      is open and matches one of the three Indexes randomly assigned to the
   *      oracle at the time of registration.
   * @param index Index from the request.
   * @param airline Address of the airline from the request.
   * @param flight Flight code from the request.
   * @param timestamp Flight timestamp from the request.
   * @param statusCode Status code returned by the oracle.
   */
  function submitOracleResponse(
    uint8 index,
    address airline,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode)
  public requireIsOperational requireRegisteredOracle {
    uint8[3] memory oracleIndexes = getOracleIndexes();
    require(
        (oracleIndexes[0] == index) ||
        (oracleIndexes[1] == index) ||
        (oracleIndexes[2] == index),
        "Oracle indexes do not match the oracle request index");
    bytes32 key = getOracleResponseKey(index, airline, flight, timestamp);
    // Note: One problem with this apporach is that there might be many (e.g.
    // 10) different requests for the same flight (all with different indexes).
    // This (in theory) allows a single Oracle to submit 3 different responses
    // for the same flight (when answering requests with different indexes).
    // One option how to prevent this behavior would be to record every Oracle
    // response for a given flight. But this would require a lot of memory.
    bool respondend = oracleResponses[key].responded[msg.sender];
    bool open = oracleResponses[key].open;
    require(!respondend, "Oracle already responded");
    require(open, "No matching open oracle request");
    oracleResponses[key].responded[msg.sender] = true;
    oracleResponses[key].responses[statusCode].push(msg.sender);
    // Information is not considered verified until at least MIN_RESPONSES
    // oracles respond with the *** same *** information.
    emit OracleReport(airline, flight, timestamp, statusCode);
    if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
      // Prevent any more responses as MIN_RESPONSE threshold has been reached.
      oracleResponses[key].open = false;
      processFlightStatus(airline, flight, timestamp, statusCode);
    }
  }

  /**
   * @dev Called after oracle has updated flight status.
   * @param airline Address of the airline from the request.
   * @param flight Flight code from the request.
   * @param timestamp Flight timestamp from the request.
   * @param statusCode Status code returned by the oracle.
   */
  function processFlightStatus(
    address airline,
    string memory flight,
    uint256 timestamp,
    uint8 statusCode)
  internal {
    // Save the flight information for posterity.
    bytes32 flightKey = getFlightKey(airline, flight, timestamp);
    flightStatus[flightKey] = statusCode;
    // Credit insurees if the flight is late due to the airline.
    if (statusCode == STATUS_CODE_LATE_AIRLINE) {
      creditInsurees(flightKey);
    }
    // Announce to the world that verified flight status information
    // is available.
    emit FlightStatusInfo(airline, flight, timestamp, statusCode);
  }

  /**
   * @dev Credits payouts to insurees of a given flight.
   *      Internal, called only if the flight is eligible for insurance claims.
   * @param flightKey Flight key.
   */
  function creditInsurees(bytes32 flightKey) internal {
    uint256 flightInsuranceCount =
      flightSuretyData.getFlightInsuranceCount(flightKey);
    for (uint256 i = 0; i < flightInsuranceCount; i = i.add(1)) {
      address insuree;
      uint256 insurance;
      (insuree, insurance) =
        flightSuretyData.getFlightInsurance(flightKey, i);
      uint256 payout = insurance.mul(3).div(2);
      flightSuretyData.creditInsuree(insuree, payout);
    }
    flightSuretyData.clearFlightInsurances(flightKey);
  }

  /**
   * @dev Returns a unique oracle response key.
   * @param index Index of the request.
   * @param airline Address of the airline of the request.
   * @param flight Flight code of the request.
   * @param timestamp Flight timestamp of the request.
   * @return Unique oracle response key.
   */
  function getOracleResponseKey(
    uint8 index,
    address airline,
    string memory flight,
    uint256 timestamp)
  internal pure returns(bytes32) {
    return keccak256(abi.encodePacked(index, airline, flight, timestamp));
  }

  /**
   * @dev Returns array of three different integers from 0-9.
   * @param account Address to be used.
   * @return Three different integers from 0-9.
   */
  function generateIndexes(address account) internal returns(uint8[3] memory) {
    uint8[3] memory indexes;
    indexes[0] = getRandomIndex(account);
    indexes[1] = indexes[0];
    while (indexes[1] == indexes[0]) {
      indexes[1] = getRandomIndex(account);
    }
    indexes[2] = indexes[1];
    while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
      indexes[2] = getRandomIndex(account);
    }
    return indexes;
  }

  /**
   * @dev Returns a random integer from 0-9.
   * @param account Address to be used.
   * @return Random integer from 0-9.
   */
  function getRandomIndex(address account) internal returns (uint8) {
    uint8 maxValue = 10;
    // Pseudo random number. Incrementing of nonce adds variation.
    uint8 random = uint8(
        uint256(keccak256(abi.encodePacked(
            blockhash(block.number - nonce++), account))) % maxValue);
    if (nonce > 250) {
      // We can only fetch blockhashes for the last 256 blocks.
      nonce = 0;
    }
    return random;
  }
}


/**
 * @title FlightSurety Data
 * @dev Contract holding the FlightSurety data.
 */
contract FlightSuretyData {
  /**
   * @dev Fallback function for funding smart contract.
   */
  function() external payable;

  /**
   * @dev Vote for the to-be-registered airline.
   * @param origin Address of the original account.
   * @param airline Address of the airline to be registered.
   * @return voteCount Total number of votes the airline received.
   */
  function voteForAirline(address origin, address airline)
  public returns (uint256 voteCount);

  /**
   * @dev Registers the airline.
   * @param airline Address of the airline to be registered.
   * @param airlineName Name of the airline to be registered.
   */
  function registerAirline(address airline, string memory airlineName) public;

  /**
   * @dev Sets airline to be funded.
   * @param airline Address of the airline to be funded.
   */
  function fundAirline(address airline) public;

  /**
   * @dev Returns whether the account is a registered airline.
   * @param account Address to be verified.
   * @return Whether the account is a registered airline.
   */
  function isRegisteredAirline(address account) public view returns(bool);

  /**
   * @dev Returns whether the account is a funded airline.
   * @param account Address to be verified.
   * @return Whether the account is a funded airline.
   */
  function isFundedAirline(address account) public view returns(bool);

  /**
   * @dev Returns the total number of registered airlines.
   * @return Total number of registered airlines.
   */
  function getAirlineCount() public view returns(uint256);

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
    string memory destination) public;
  
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
  public view returns(bool isRegistered);

  /**
   * @dev Returns the total number of registered flights.
   * @return flightCount total number of registered flights.
   */
  function getFlightCount() public view returns(uint256 flightCount);

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
  function getFlight(uint256 flightIndex) public view
  returns (
    address airline,
    string memory airlineName,
    string memory flight,
    uint256 timestamp,
    string memory departure,
    string memory destination);

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
  public payable;

  /**
   * @dev Returns the total number of insurances for the flight.
   * @param flightKey Flight key.
   * @return insuranceCount total number of insurances for the flight.
   */
  function getFlightInsuranceCount(bytes32 flightKey)
  public view returns (uint256 insuranceCount);

  /**
   * @dev Returns the i-th insurance for the flight.
   * @param flightKey Flight key.
   * @param insuranceIndex Index of the insurance.
   * @return insuree Address of insuree.
   * @return insurance Insurance value.
   */
  function getFlightInsurance(bytes32 flightKey, uint256 insuranceIndex)
  public view returns (address insuree, uint256 insurance);

  /**
   * @dev Clears all insurances for the flight.
   * @param flightKey Flight key.
   */
  function clearFlightInsurances(bytes32 flightKey) public;

  /**
   * @dev Credits payout to the insuree.
   * @param insuree Address of the insuree to be credited.
   * @param payout Payout.
   */
  function creditInsuree(address insuree, uint256 payout) public;

  /**
   * @dev Returns the total credit of an insuree.
   * @param insuree Address of the insuree.
   * @return insureeCredit Total credit of an insuree.
   */
  function getInsureeCredit(address insuree)
  public view returns (uint256 insureeCredit);

  /**
   * @dev Transfers eligible payout funds to the insuree.
   * @param insuree Address of the insuree to be paid.
   */
  function pay(address payable insuree) public;
}
