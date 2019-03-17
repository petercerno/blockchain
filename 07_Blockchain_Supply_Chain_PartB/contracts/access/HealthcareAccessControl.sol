pragma solidity ^0.5.0;

import "./roles/PatientRole.sol";
import "./roles/DoctorRole.sol";
import "./roles/LabRole.sol";


/**
 * @title Healthcare Access Control
 * @dev Contract for managing Access Control for Healthcare Supply Chain.
 */
contract HealthcareAccessControl is PatientRole, DoctorRole, LabRole {
  modifier isPatientModifier(address patient) {
    require(isPatient(patient), "DOES_NOT_HAVE_PATIENT_ROLE");
    _;
  }

  modifier isDoctorModifier(address doctor) {
    require(isDoctor(doctor), "DOES_NOT_HAVE_DOCTOR_ROLE");
    _;
  }

  modifier isLabModifier(address lab) {
    require(isLab(lab), "DOES_NOT_HAVE_LAB_ROLE");
    _;
  }
}