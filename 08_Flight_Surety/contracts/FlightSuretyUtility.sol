pragma solidity ^0.5.6;


/**
 * @title FlightSurety Utility Functions
 * @dev Contract with the FlightSurety utility functions.
 */
contract FlightSuretyUtility {
  /**
   * @dev Returns a unique flight key.
   * @param airline Address of airline.
   * @param flight Flight code.
   * @param timestamp Flight timestamp.
   * @return Unique flight key.
   */
  function getFlightKey(
    address airline,
    string memory flight,
    uint256 timestamp)
  public pure returns(bytes32) {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
  }
}