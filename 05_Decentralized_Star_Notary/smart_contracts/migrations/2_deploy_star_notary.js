var StarNotary = artifacts.require('./StarNotary.sol');

var ERC165 = artifacts.require('openzeppelin-solidity/contracts/introspection/ERC165.sol');
var ERC721 = artifacts.require('openzeppelin-solidity/contracts/token/ERC721/ERC721.sol');
var SafeMath = artifacts.require('openzeppelin-solidity/contracts/math/SafeMath.sol');
var Address = artifacts.require('openzeppelin-solidity/contracts/math/Address.sol');

module.exports = function(deployer) {
  deployer.deploy(ERC165);
  deployer.deploy(SafeMath);
  deployer.deploy(Address);
  deployer.link(ERC165, ERC721);
  deployer.link(SafeMath, ERC721);
  deployer.link(Address, ERC721);
  deployer.deploy(ERC721);
  deployer.link(ERC721, StarNotary);
  deployer.deploy(StarNotary);
};
