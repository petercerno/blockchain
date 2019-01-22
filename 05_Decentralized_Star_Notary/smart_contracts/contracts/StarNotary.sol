pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";


/**
 * @title Star Notary contract implementation.
 */
contract StarNotary is ERC721 {

  // Star coordinates.
  struct StarCoord {
    // Right Ascension.
    string ra;
    // Declination.
    string dec;
    // Magnitude.
    string mag;
    // Constellation.
    string cen;
  }

  // Star
  struct Star {
    // Name of the star.
    string name;
    // Story of the star.
    string story;
    // Star coordinates.
    StarCoord coord;
  }

  // Mapping from token ID to star info.
  mapping(uint256 => Star) public tokenIdToStarInfo;

  // Mapping from token ID to star cost.
  mapping(uint256 => uint256) public starsForSale;

  // Mapping from hash of star coordinates to whether the star is taken.
  mapping(bytes32 => bool) private starCoordToTaken;

  /**
   * @dev Creates the star for the specified token ID.
   * @param _name string name of the star. (Required)
   * @param _story string story of the star. (Required)
   * @param _ra string Right Ascension. (Required)
   * @param _dec string Declination. (Required)
   * @param _mag string Magnitude. (Optional)
   * @param _cen string Constellation. (Optional)
   * @param _tokenId uint256 ID of the token of the star.
   */
  function createStar(string _name, string _story,
                      string _ra, string _dec, string _mag, string _cen,
                      uint256 _tokenId) public {
    require(!_isEmpty(_name), "Star name cannot be empty!");
    require(!_isEmpty(_story), "Star story cannot be empty!");
    require(!_isEmpty(_ra), "Star right ascension cannot be empty!");
    require(!_isEmpty(_dec), "Star declination cannot be empty!");

    StarCoord memory newStarCoord = StarCoord(_ra, _dec, _mag, _cen);
    bytes32 newStarCoordHash = _getStarCoordHash(newStarCoord);
    require(!starCoordToTaken[newStarCoordHash],
            "Star coordinates already taken!");
    Star memory newStar = Star(_name, _story, newStarCoord);

    tokenIdToStarInfo[_tokenId] = newStar;
    starCoordToTaken[newStarCoordHash] = true;

    _mint(msg.sender, _tokenId);
  }

  /**
   * @dev Puts up the star with the given token ID for sale.
   * @param _tokenId uint256 ID of the token of the star.
   * @param _price uint256 Nonnegative price of the star.
   */
  function putStarUpForSale(uint256 _tokenId, uint256 _price) public {
    require(this.ownerOf(_tokenId) == msg.sender,
            "Only the owner of the star can put their star up for sale!");

    starsForSale[_tokenId] = _price;
  }

  /**
   * @dev Buys the star with the given token ID.
   * @param _tokenId uint256 ID of the token of the star.
   */
  function buyStar(uint256 _tokenId) public payable {
    require(starsForSale[_tokenId] > 0, "Star is not for sale!");
    
    uint256 starCost = starsForSale[_tokenId];
    address starOwner = this.ownerOf(_tokenId);
    require(msg.value >= starCost, "Insufficient value to buy the star!");

    _removeTokenFrom(starOwner, _tokenId);
    _addTokenTo(msg.sender, _tokenId);
    
    starOwner.transfer(starCost);

    if (msg.value > starCost) {
      msg.sender.transfer(msg.value - starCost);
    }
  }

  /**
   * @dev Checks if the star with the given coordinates already exists.
   * @param _ra string Right Ascension. (Required)
   * @param _dec string Declination. (Required)
   * @param _mag string Magnitude. (Optional)
   * @param _cen string Constellation. (Optional)
   * @return bool if the star with the given coordinates already exists.
   */
  function checkIfStarExist(
      string _ra, string _dec, string _mag, string _cen)
  public view returns (bool) {
    require(!_isEmpty(_ra), "Star right ascension cannot be empty!");
    require(!_isEmpty(_dec), "Star declination cannot be empty!");

    StarCoord memory starCoord = StarCoord(_ra, _dec, _mag, _cen);
    bytes32 starCoordHash = _getStarCoordHash(starCoord);

    return starCoordToTaken[starCoordHash];
  }

  /**
   * @dev Mints the given token ID.
   * @param _tokenId uint256 token ID.
   */
  function mint(uint256 _tokenId) public {
    _mint(msg.sender, _tokenId);
  }

  /**
   * @dev Gets the star info for the given token ID.
   * @param _tokenId uint256 ID of the token of the star.
   * @return Star info tuple.
   */
  function tokenIdToStarInfo(uint256 _tokenId) public view returns (
      string _name, string _story,
      string _ra, string _dec,
      string _mag, string _cen) {
    require(_exists(_tokenId), "Star with the given tokenId does not exist!");
    Star storage star = tokenIdToStarInfo[_tokenId];
    _name = star.name;
    _story = star.story;
    _ra = star.coord.ra;
    _dec = star.coord.dec;
    _mag = star.coord.mag;
    _cen = star.coord.cen;
  }

  /**
   * @dev Returns the hash for the given star coordinates.
   * @param _starCoord StarCoord star coordinates.
   * @return bytes32 hash of star coordinates.
   */
  function _getStarCoordHash(
      StarCoord memory _starCoord) internal pure returns (bytes32) {
    // We use only Right Ascension and Declination.
    return keccak256(abi.encode(_starCoord.ra, _starCoord.dec));
  }

  /**
   * @dev Returns true if the given string is empty.
   * @param _str string to be checked.
   * @return bool whether the given string is empty.
   */
  function _isEmpty(string _str) internal pure returns (bool) {
    bytes memory strBytes = bytes(_str);
    return strBytes.length == 0;
  }
}
