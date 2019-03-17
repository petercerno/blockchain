// Based on: https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/access/roles/MinterRole.sol
pragma solidity ^0.5.0;

import "../Roles.sol";


/**
 * @title Patient Role
 * @dev Contract for managing addresses assigned to a role Patient.
 */
contract PatientRole {
  using Roles for Roles.Role;

  event PatientAdded(address indexed account);
  event PatientRemoved(address indexed account);

  Roles.Role private _patients;

  constructor() internal {
    _addPatient(msg.sender);
  }

  modifier onlyPatient() {
    require(isPatient(msg.sender));
    _;
  }

  function isPatient(address account) public view returns (bool) {
    return _patients.has(account);
  }

  function addPatient(address account) public onlyPatient {
    _addPatient(account);
  }

  function renouncePatient() public {
    _removePatient(msg.sender);
  }

  function _addPatient(address account) internal {
    _patients.add(account);
    emit PatientAdded(account);
  }

  function _removePatient(address account) internal {
    _patients.remove(account);
    emit PatientRemoved(account);
  }
}