// Based on: https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/access/roles/MinterRole.sol
pragma solidity ^0.5.0;

import "../Roles.sol";


/**
 * @title Lab Role
 * @dev Contract for managing addresses assigned to a role Lab.
 */
contract LabRole {
  using Roles for Roles.Role;

  event LabAdded(address indexed account);
  event LabRemoved(address indexed account);

  Roles.Role private _labs;

  constructor() internal {
    _addLab(msg.sender);
  }

  modifier onlyLab() {
    require(isLab(msg.sender));
    _;
  }

  function isLab(address account) public view returns (bool) {
    return _labs.has(account);
  }

  function addLab(address account) public onlyLab {
    _addLab(account);
  }

  function renounceLab() public {
    _removeLab(msg.sender);
  }

  function _addLab(address account) internal {
    _labs.add(account);
    emit LabAdded(account);
  }

  function _removeLab(address account) internal {
    _labs.remove(account);
    emit LabRemoved(account);
  }
}