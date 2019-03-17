var Roles = artifacts.require('./Roles.sol');
var PatientRole = artifacts.require('./PatientRole.sol');
var DoctorRole = artifacts.require('./DoctorRole.sol');
var LabRole = artifacts.require('./LabRole.sol');
var HealthcareCore = artifacts.require('./HealthcareCore.sol');

module.exports = function (deployer) {
  deployer.deploy(Roles);
  deployer.link(Roles, [PatientRole, DoctorRole, LabRole]);
  deployer.deploy(HealthcareCore);
};