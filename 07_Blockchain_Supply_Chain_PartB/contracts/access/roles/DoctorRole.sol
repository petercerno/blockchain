// Based on: https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/access/roles/MinterRole.sol
pragma solidity ^0.5.0;

import "../Roles.sol";


/**
 * @title Doctor Role
 * @dev Contract for managing addresses assigned to a role Doctor.
 */
contract DoctorRole {
  using Roles for Roles.Role;

  event DoctorAdded(address indexed account);
  event DoctorRemoved(address indexed account);

  Roles.Role private _doctors;

  constructor() internal {
    _addDoctor(msg.sender);
  }

  modifier onlyDoctor() {
    require(isDoctor(msg.sender));
    _;
  }

  function isDoctor(address account) public view returns (bool) {
    return _doctors.has(account);
  }

  function addDoctor(address account) public onlyDoctor {
    _addDoctor(account);
  }

  function renounceDoctor() public {
    _removeDoctor(msg.sender);
  }

  function _addDoctor(address account) internal {
    _doctors.add(account);
    emit DoctorAdded(account);
  }

  function _removeDoctor(address account) internal {
    _doctors.remove(account);
    emit DoctorRemoved(account);
  }
}