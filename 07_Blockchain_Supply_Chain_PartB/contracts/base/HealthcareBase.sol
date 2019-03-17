pragma solidity ^0.5.0;

import "../access/HealthcareAccessControl.sol";


/**
 * @title Healthcare Base
 * @dev Contract with base functionality in the Healthcare Supply Chain.
 */
contract HealthcareBase is HealthcareAccessControl {
  // Enumeration of Patient states.
  enum PatientState {
    Idle,
    AtDoctor,
    BloodTaken,
    PrescriptionReceived,
    BillPaid
  }

  // Enumeration of Doctor states.
  enum DoctorState {
    Idle,
    PatientReceived,
    BloodReceived,
    BloodSentToLab,
    BloodResultsReceived,
    PrescriptionWritten,
    MoneyReceived
  }

  // Mapping from Patient address to Patient state.
  mapping (address => PatientState) public patientState;

  // Mapping from Doctor address to Doctor state.
  mapping (address => DoctorState) public doctorState;

  // Id of the next Session.
  uint256 public nextSessionId;

  // Maps Session id to Session struct.
  mapping (uint256 => Session) public sessions;

  // Patient-Doctor-Lab Session.
  struct Session {
    // Session Id.
    uint256 sessionId;
    // Patient involved in the session.
    address patient;
    // Doctor involved in the session.
    address payable doctor;
    // Lab involved in the session.
    address lab;
    // Price for the session.
    uint256 price;
    // Whether the session is terminated.
    bool terminated;
  }

  event DoctorVisited(uint256 sessionId);
  event BloodTaken(uint256 sessionId);
  event BloodSentToLab(uint256 sessionId);
  event BloodResultsReceived(uint256 sessionId);
  event PrescriptionReceived(uint256 sessionId);
  event BillPaid(uint256 sessionId);
  event DoctorLeft(uint256 sessionId);

  modifier isValidSessionId(uint256 sessionId) {
    require(
        (sessionId >= 0) &&
        (sessionId < nextSessionId), "INVALID_SESSION_ID");
    require(sessions[sessionId].sessionId == sessionId, "INVALID_SESSION");
    _;
  }

  modifier paidEnough(uint256 price) {
    require(msg.value >= price);
    _;
  }

  modifier refundIfNeeded(uint256 price) {
    _;
    if (msg.value > price) {
      msg.sender.transfer(msg.value - price);
    }
  }

  /**
   * @dev Converts the input PatientState enum to the corresponding string.
   * @param _patientState PatientState enum to be converted.
   * @return string representation of the input _patientState enum.
   */
  function patientStateToString(PatientState _patientState) public pure
  returns (string memory _patientStateString) {
    if (_patientState == PatientState.Idle) {
      _patientStateString = "Idle";
    } else if (_patientState == PatientState.AtDoctor) {
      _patientStateString = "AtDoctor";
    } else if (_patientState == PatientState.BloodTaken) {
      _patientStateString = "BloodTaken";
    } else if (_patientState == PatientState.PrescriptionReceived) {
      _patientStateString = "PrescriptionReceived";
    } else if (_patientState == PatientState.BillPaid) {
      _patientStateString = "BillPaid";
    } else {
      revert();
    }
  }

  /**
   * @dev Converts the input DoctorState enum to the corresponding string.
   * @param _doctorState DoctorState enum to be converted.
   * @return string representation of the input _doctorState enum.
   */
  function doctorStateToString(DoctorState _doctorState) public pure
  returns (string memory _doctorStateString) {
    if (_doctorState == DoctorState.Idle) {
      _doctorStateString = "Idle";
    } else if (_doctorState == DoctorState.PatientReceived) {
      _doctorStateString = "PatientReceived";
    } else if (_doctorState == DoctorState.BloodReceived) {
      _doctorStateString = "BloodReceived";
    } else if (_doctorState == DoctorState.BloodSentToLab) {
      _doctorStateString = "BloodSentToLab";
    } else if (_doctorState == DoctorState.BloodResultsReceived) {
      _doctorStateString = "BloodResultsReceived";
    } else if (_doctorState == DoctorState.PrescriptionWritten) {
      _doctorStateString = "PrescriptionWritten";
    } else if (_doctorState == DoctorState.MoneyReceived) {
      _doctorStateString = "MoneyReceived";
    } else {
      revert();
    }
  }

  /**
   * @dev Returns session info for the given sessionId.
   * @param sessionId uint256 Id of the session.
   * @return Session info tuple.
   */
  function getSessionInfo(uint256 sessionId) public view
    isValidSessionId(sessionId) returns (
      address _patient,
      string memory _patientState,
      address _doctor,
      string memory _doctorState,
      address _lab,
      uint256 _price,
      bool _terminated) {
    Session storage session = sessions[sessionId];
    _patient = session.patient;
    _patientState = patientStateToString(patientState[session.patient]);
    _doctor = session.doctor;
    _doctorState = doctorStateToString(doctorState[session.doctor]);
    _lab = session.lab;
    _price = session.price;
    _terminated = session.terminated;
  }

  /**
   * @dev Patient visits a doctor. Creates a new Patient-Doctor-Lab Session.
   * @param doctor address Doctor to be visited.
   * @return uint256 sessionId of the visit.
   */
  function visitDoctor(address doctor) public
    onlyPatient isDoctorModifier(doctor) returns (uint256 sessionId) {
    address patient = msg.sender;
    require(patientState[patient] == PatientState.Idle, "PATIENT_NOT_IDLE");
    require(doctorState[doctor] == DoctorState.Idle, "DOCTOR_NOT_IDLE");
    patientState[patient] = PatientState.AtDoctor;
    doctorState[doctor] = DoctorState.PatientReceived;
    // HACK: Here we convert the doctor address to a payable address.
    // We could have marked the input parameter doctor as payble, but it
    // would break solhint.
    address payable doctorPayable = address(uint160(doctor));
    sessions[nextSessionId] = Session(
        nextSessionId, patient, doctorPayable, address(0), 1 finney, false);
    emit DoctorVisited(nextSessionId);
    sessionId = nextSessionId;
    nextSessionId = nextSessionId + 1;
  }

  /**
   * @dev Doctor takes blood from the patient.
   * @param sessionId uint256 Id of the session.
   */
  function takeBlood(uint256 sessionId) public
    onlyDoctor isValidSessionId(sessionId) {
    Session storage session = sessions[sessionId];
    require(session.doctor == msg.sender, "INVALID_SESSION_DOCTOR");
    require(patientState[session.patient] == PatientState.AtDoctor,
        "PATIENT_NOT_AT_DOCTOR");
    require(doctorState[session.doctor] == DoctorState.PatientReceived,
        "DOCTOR_NOT_RECEIVED_PATIENT");
    patientState[session.patient] = PatientState.BloodTaken;
    doctorState[session.doctor] = DoctorState.BloodReceived;
    emit BloodTaken(sessionId);
  }

  /**
   * @dev Doctor sends blood to the lab.
   * @param sessionId uint256 Id of the session.
   * @param lab address Lab that analyzes the blood.
   */
  function sendBloodToLab(uint256 sessionId, address lab) public
    onlyDoctor isValidSessionId(sessionId) isLabModifier(lab) {
    Session storage session = sessions[sessionId];
    require(session.doctor == msg.sender, "INVALID_SESSION_DOCTOR");
    require(session.lab == address(0), "INVALID_SESSION_LAB");
    require(patientState[session.patient] == PatientState.BloodTaken,
        "PATIENT_NOT_TAKEN_BLOOD");
    require(doctorState[session.doctor] == DoctorState.BloodReceived,
        "DOCTOR_NOT_RECEIVED_BLOOD");
    doctorState[session.doctor] = DoctorState.BloodSentToLab;
    session.lab = lab;
    emit BloodSentToLab(sessionId);
  }

  /**
   * @dev Lab sends blood results to the doctor.
   * @param sessionId uint256 Id of the session.
   */
  function sendBloodResults(uint256 sessionId) public
    onlyLab isValidSessionId(sessionId) {
    Session storage session = sessions[sessionId];
    require(session.lab == msg.sender, "INVALID_SESSION_LAB");
    require(patientState[session.patient] == PatientState.BloodTaken,
        "PATIENT_NOT_TAKEN_BLOOD");
    require(doctorState[session.doctor] == DoctorState.BloodSentToLab,
        "DOCTOR_NOT_SENT_BLOOD");
    doctorState[session.doctor] = DoctorState.BloodResultsReceived;
    emit BloodResultsReceived(sessionId);
  }

  /**
   * @dev Doctor writes a prescription and gives it to the patient.
   * @param sessionId uint256 Id of the session.
   */
  function writePrescription(uint256 sessionId) public
    onlyDoctor isValidSessionId(sessionId) {
    Session storage session = sessions[sessionId];
    require(session.doctor == msg.sender, "INVALID_SESSION_DOCTOR");
    require(patientState[session.patient] == PatientState.BloodTaken,
        "PATIENT_NOT_TAKEN_BLOOD");
    require(doctorState[session.doctor] == DoctorState.BloodResultsReceived,
        "DOCTOR_NOT_RECEIVED_BLOOD_RESULTS");
    patientState[session.patient] = PatientState.PrescriptionReceived;
    doctorState[session.doctor] = DoctorState.PrescriptionWritten;
    emit PrescriptionReceived(sessionId);
  }

  /**
   * @dev Patient pays the bill for the session.
   * @param sessionId uint256 Id of the session.
   */
  function payBill(uint256 sessionId) public payable
    onlyPatient isValidSessionId(sessionId)
    paidEnough(sessions[sessionId].price)
    refundIfNeeded(sessions[sessionId].price) {
    Session storage session = sessions[sessionId];
    require(session.patient == msg.sender, "INVALID_SESSION_PATIENT");
    require(patientState[session.patient] == PatientState.PrescriptionReceived,
        "PATIENT_NOT_RECEIVED_PRESCRIPTION");
    require(doctorState[session.doctor] == DoctorState.PrescriptionWritten,
        "DOCTOR_NOT_WRITTEN_PRESCRIPTION");
    patientState[session.patient] = PatientState.BillPaid;
    doctorState[session.doctor] = DoctorState.MoneyReceived;
    session.doctor.transfer(session.price);
    emit BillPaid(sessionId);
  }

  /**
   * @dev Patient leaves the doctor.
   * @param sessionId uint256 Id of the session.
   */
  function leaveDoctor(uint256 sessionId) public
    onlyPatient isValidSessionId(sessionId) {
    Session storage session = sessions[sessionId];
    require(session.patient == msg.sender, "INVALID_SESSION_PATIENT");
    require(patientState[session.patient] == PatientState.BillPaid,
        "PATIENT_NOT_PAID_BILL");
    require(doctorState[session.doctor] == DoctorState.MoneyReceived,
        "DOCTOR_NOT_RECEIVED_MONEY");
    patientState[session.patient] = PatientState.Idle;
    doctorState[session.doctor] = DoctorState.Idle;
    session.terminated = true;
    emit DoctorLeft(sessionId);
  }
}