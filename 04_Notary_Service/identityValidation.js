const bitcore = require('bitcore-lib');
const Address = bitcore.Address;
const Message = require('bitcore-message');

/**
 * Class representing a validation request for the given Bitcoin address.
 *
 * @class ValidationRequest
 */
class ValidationRequest {
  /**
   * Creates an instance of ValidationRequest for the given Bitcoin address.
   * 
   * @param {string} address Valid Bitcoin address.
   * @param {number} currentTimeStamp Current timestamp (in seconds).
   * @memberof ValidationRequest
   */
  constructor(address, currentTimeStamp) {
    this.address = address;
    this.requestTimeStamp = currentTimeStamp.toString();
    this.message = (
      this.address + ':' + this.requestTimeStamp + ':starRegistry');
    this.validationWindow = 300;
  }

  /**
   * Returns true if this request has expired.
   *
   * @param {number} currentTimeStamp Current timestamp (in seconds).
   * @returns {boolean} True if this request has expired.
   * @memberof ValidationRequest
   */
  expired(currentTimeStamp) {
    let requestTimeStamp = parseInt(this.requestTimeStamp);
    return currentTimeStamp > requestTimeStamp + this.validationWindow;
  }

  /**
   * Updates the existing ValidationRequest when it is re-submitted.
   *
   * @param {number} currentTimeStamp Current timestamp (in seconds).
   * @memberof ValidationRequest
   */
  update(currentTimeStamp) {
    let requestTimeStamp = parseInt(this.requestTimeStamp);
    let expirationTimeStamp = requestTimeStamp + this.validationWindow;
    // TODO: Should we also update the message (to be signed)?
    if (expirationTimeStamp > currentTimeStamp) {
      this.requestTimeStamp = currentTimeStamp.toString();
      this.validationWindow = expirationTimeStamp - currentTimeStamp;
    } else {
      // Request has expired. Renewing the validation window.
      this.requestTimeStamp = currentTimeStamp.toString();
      this.validationWindow = 300;
    }
  }
}

/**
 * Class representing a verification response for the given validation request.
 *
 * @class ValidationResponse
 */
class ValidationResponse {
  /**
   * Creates an instance of ValidationResponse for the given ValidationRequest.
   * 
   * @param {ValidationRequest} validationRequest Input validation request.
   * @param {boolean} verified Whether the validation request was verified.
   * @memberof ValidationResponse
   */
  constructor(validationRequest, verified) {
    this.registerStar = verified;
    this.status = Object.assign({}, validationRequest);  // Deep copy
    this.status.messageSignature = (verified ? 'valid' : 'invalid');
  }
}

/**
 * Class managing Blockchain identity validation routine.
 *
 * @class IdentityValidator
 */
class IdentityValidator {
  /**
   * Creates an instance of IdentityValidator.
   * 
   * @param {function} getCurrentTimeStamp Current timestamp callback.
   * @param {number} cleanUpIntervalMs Clean-up interval (in milliseconds).
   * @memberof IdentityValidator
   */
  constructor(getCurrentTimeStamp, cleanUpIntervalMs = 1000) {
    // Memory pool of all validation requests keyed by addresses.
    this._validationRequests = {};
    // Memory pool of all verified validation responses keyed by addresses.
    this._verifiedResponses = {};
    // Regularly clean-up expired validation requests (to free memory).
    // Note that we do not clean-up the verified validation responses, as they
    // do not have any expiration period.
    setInterval(() => {
      this._cleanUpExpiredValidationRequests(getCurrentTimeStamp);
    }, cleanUpIntervalMs);
  }

  /**
   * Deletes all expired validation requests.
   * 
   * @param {function} getCurrentTimeStamp Get current timestamp callback.
   * @memberof IdentityValidator
   */
  _cleanUpExpiredValidationRequests(getCurrentTimeStamp) {
    let expiredAddresses = [];
    let currentTimeStamp = getCurrentTimeStamp();
    for (const [address, request] of
      Object.entries(this._validationRequests)) {
      if (request.expired(currentTimeStamp)) {
        expiredAddresses.push(address);
      }
    }
    for (const address of expiredAddresses) {
      delete this._validationRequests[address];
    }
  }

  /**
   * Creates and returns a new ValidationRequest for the given address.
   * Throws an error if the given address is not a valid Bitcoin address.
   *
   * @param {string} address Bitcoin address.
   * @param {number} currentTimeStamp Current timestamp (in seconds).
   * @returns {ValidationRequest} New ValidationRequest.
   * @memberof IdentityValidator
   */
  getValidationRequest(address, currentTimeStamp) {
    if (!Address.isValid(address)) {
      throw new Error('Invalid Address!');
    }
    if (this._validationRequests[address]) {
      // Request already submitted.
      this._validationRequests[address].update(currentTimeStamp);
    } else {
      this._validationRequests[address] = new ValidationRequest(
        address, currentTimeStamp);
    }
    return this._validationRequests[address];
  }

  /**
   * Verifies the validation request for the given address and returns the
   * corresponding validation response.
   * Throws an error if the validation request does not exist or has expired.
   * Throws an error if the signature format is invalid.
   *
   * @param {string} address Valid Bitcoin address.
   * @param {string} signature Signature for the validation request.
   * @param {number} currentTimeStamp Current timestamp (in seconds).
   * @returns {ValidationResponse} Validation response for the verification.
   * @memberof IdentityValidator
   */
  verifyValidationRequest(address, signature, currentTimeStamp) {
    if (!this._validationRequests[address]) {
      throw new Error('Validation Request Not Found!');
    }
    let validationRequest = this._validationRequests[address];
    if (validationRequest.expired(currentTimeStamp)) {
      delete this._validationRequests[address];
      throw new Error('Validation Request Has Expired!');
    }
    let verified = new Message(
      validationRequest.message).verify(address, signature);
    let validationResponse = new ValidationResponse(
      validationRequest, verified);
    if (verified) {
      // Removing the verified validation request from the memory pool.
      delete this._validationRequests[address];
      // Remembering the verified validation response.
      this._verifiedResponses[address] = validationResponse;
    }
    return validationResponse;
  }

  /**
   * Returns true if a Star can be registered for this address.
   * Throws an error if the address was not verified before.
   *
   * @param {string} address Valid and verified Bitcoin address.
   * @returns {boolean} True if a Star can be registered for this address.
   * @memberof IdentityValidator
   */
  canRegisterStar(address) {
    if (!this._verifiedResponses[address]) {
      throw new Error('Address Not Verified!');
    }
    let validationResponse = this._verifiedResponses[address];
    if (validationResponse.status.messageSignature !== 'valid') {
      // Note that this should never happen as we keep only the valid
      // (verified) validation responses in the memory pool.
      throw new Error('Invalid Signature!');
    }
    if (validationResponse.registerStar) {
      // Star can be registered only once for this address.
      validationResponse.registerStar = false;
      return true;
    }
    return false;
  }
}

module.exports = {
  ValidationRequest: ValidationRequest,
  ValidationResponse: ValidationResponse,
  IdentityValidator: IdentityValidator,
};