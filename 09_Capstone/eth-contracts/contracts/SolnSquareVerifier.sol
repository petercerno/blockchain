pragma solidity ^0.5.7;

import "./ERC721Mintable.sol";


/**
 * @title ERC-721 Non-Fungible Real Estate Token with SquareVerifier.
 */
contract SolnSquareVerifier is RealEstateERC721Token {
    // SquareVerifier contract.
    SquareVerifier private verifier;

    /**
     * @dev Sets the SquareVerifier contract for this contract.
     * Note: This allows the owner to update the verification contract.
     * @param verifierAddress SquareVerifier contract address.
     */
    function setVerifier(address verifierAddress)
    public onlyOwner whenNotPaused {
        verifier = SquareVerifier(verifierAddress);
    }

    // Structure holding SquareVerifier solution.
    struct Solution {
        // True if the solution was submitted.
        bool isSubmitted;
        // True if the solution was used to mint a new token.
        bool isMinted;
        // Solution parameters.
        uint[2] a;
        uint[2] a_p;
        uint[2][2] b;
        uint[2] b_p;
        uint[2] c;
        uint[2] c_p;
        uint[2] h;
        uint[2] k;
        uint[2] input;
    }

    // Maps hash of (verified) solution to the Solution struct.
    // We only keep verified solutions.
    mapping(bytes32 => Solution) private solutions;
    // Maps user address to the hash of their latest submitted solution.
    mapping(address => bytes32) private userSolutions;

    // Event fired when a new solution is submitted.
    event SolutionSubmitted(address user, bytes32 solutionHash);

    /**
     * @dev Submits a new solution, if it can be verified.
     */
    function submitSolution(
        uint[2] memory a,
        uint[2] memory a_p,
        uint[2][2] memory b,
        uint[2] memory b_p,
        uint[2] memory c,
        uint[2] memory c_p,
        uint[2] memory h,
        uint[2] memory k,
        uint[2] memory input
    ) public whenNotPaused {
        bytes32 solutionHash = getSolutionHash(
            a, a_p, b, b_p, c, c_p, h, k, input);
        bool isSubmitted = solutions[solutionHash].isSubmitted;
        require(!isSubmitted, "Solution already exists");
        require(!solutions[userSolutions[msg.sender]].isSubmitted,
            "User already submitted some solution before");
        bool isVerified = verifier.verifyTx(
            a, a_p, b, b_p, c, c_p, h, k, input);
        require(isVerified, "Solution could not be verified");
        solutions[solutionHash] = Solution(
            true, false, a, a_p, b, b_p, c, c_p, h, k, input);
        userSolutions[msg.sender] = solutionHash;
        emit SolutionSubmitted(msg.sender, solutionHash);
    }

    /**
     * @dev Mints a new token. Only the contract owner can mint new tokens.
     * @param to address the beneficiary that will own the minted token
     * @param tokenId uint256 ID of the token to be minted
     */
    function mint(address to, uint256 tokenId)
    public onlyOwner whenNotPaused returns (bool) {
        bytes32 solutionHash = userSolutions[to];
        require(solutions[solutionHash].isSubmitted,
            "Beneficiary did not submit a valid solution");
        require(!solutions[solutionHash].isMinted,
            "Beneficiary already minted a token");
        solutions[solutionHash].isMinted = true;
        return super.mint(to, tokenId);
    }

    /**
     * @dev Returns the hash of the solution.
     */
    function getSolutionHash(
        uint[2] memory a,
        uint[2] memory a_p,
        uint[2][2] memory b,
        uint[2] memory b_p,
        uint[2] memory c,
        uint[2] memory c_p,
        uint[2] memory h,
        uint[2] memory k,
        uint[2] memory input
    ) private pure returns(bytes32) {
        return keccak256(abi.encodePacked(a, a_p, b, b_p, c, c_p, h, k, input));
    }
}


/**
 * @title SquareVerifier
 */
contract SquareVerifier {
    function verifyTx(
        uint[2] memory a,
        uint[2] memory a_p,
        uint[2][2] memory b,
        uint[2] memory b_p,
        uint[2] memory c,
        uint[2] memory c_p,
        uint[2] memory h,
        uint[2] memory k,
        uint[2] memory input
    ) public returns (bool r);
}
