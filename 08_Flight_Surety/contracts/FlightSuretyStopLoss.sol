pragma solidity ^0.5.6;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title FlightSurety Stop-Loss Management
 * @dev Contract with the base stop-loss mulitparty functionality.
 */
contract FlightSuretyStopLoss {
  using SafeMath for uint256;

  // Account used to deploy this contract.
  address internal contractOwner;

  // Indicates whether the contract is operational.
  bool internal operational = true;

  /**
  * @dev Modifier that requires the contract owner account to be the caller.
  */
  modifier requireContractOwner() {
    require(msg.sender == contractOwner, "Caller is not contract owner");
    _;
  }

  /**
  * @dev Modifier that requires the contract to be operational.
  */
  modifier requireIsOperational() {
    require(operational, "Contract is currently not operational");
    _;
  }

  /**
  * @dev Constructor of this contract.
  */
  constructor() public {
    contractOwner = msg.sender;
  }

  // Number of registered contract admins.
  uint256 private adminCount;

  // Mapping for storing the contract admins.
  mapping(address => bool) private admins;

  /**
  * @dev Returns whether the contract is operational.
  * @return bool whether the contract is operational.
  */
  function isOperational() public view returns(bool) {
    return operational;
  }

  /**
  * @dev Registers a new contract admin.
  * @param account Address of contract admin to be registered.
  */
  function registerAdmin(address account)
  public requireContractOwner requireIsOperational {
    require(!admins[account], "Admin already registered");
    admins[account] = true;
  }

  // Minimum number of admin votes for reaching multiparty consensus.
  uint8 private constant MIN_MULTIPARTY_COUNT = 2;

  // Multiparty calls.
  address[] private multipartyCalls = new address[](0);

  /**
    * @dev Sets the operating status of the contract.
    * @param mode New operating status.
    * @return Success of the call (true if the consensus was reached).
    */
  function setOperatingStatus(bool mode)
  public returns(bool success) {
    success = false;
    require(mode != operational,
      "New mode must be different from the existing one");
    require(admins[msg.sender], "Caller is not an admin");
    bool isDuplicate = false;
    for (uint256 i = 0; i < multipartyCalls.length; i = i.add(1)) {
      if (multipartyCalls[i] == msg.sender) {
        isDuplicate = true;
        break;
      }
    }
    require(!isDuplicate, "Caller has already voted");
    multipartyCalls.push(msg.sender);
    if (multipartyCalls.length >= MIN_MULTIPARTY_COUNT) {
      operational = mode;     
      delete multipartyCalls;
      success = true;
    }
  }
}
