const SHA256 = require('crypto-js/sha256');
const Promise = require('promise');
const level = require('level');

/**
 * Class representing a single block.
 *
 * @class Block
 */
class Block {
  /**
   * Creates an empty instance of a block with the provided data.
   * @param {Object} data Data for the block.
   * @memberof Block
   */
  constructor(data) {
    this.hash = '';
    this.height = 0;
    this.body = data;
    this.time = 0;
    this.previousBlockHash = '';
  }
}

/**
 * Class representing a blockchain.
 *
 * @class Blockchain
 */
class Blockchain {
  /**
   * Creates an instance of a non-initialized blockchain.
   * The blockchain needs to be initialized by calling the asynchronous method
   * initialize() (see below). The reason why we need a separate initialize()
   * method is that constructor cannot be asynchronous.
   * 
   * @param {string} chainDB Name of the blockchain database.
   * @memberof Blockchain
   */
  constructor(chainDB = './chaindata') {
    // Database entry point.
    this._db = level(chainDB);
    // Whether the blockchain is initialized.
    this._initialized = false;
    // Whether the blockchain is locked (due to an ongoing update).
    this._locked = false;
    // Waiting delay for locking requests (in milliseconds).
    this._lockWaitMs = 500;
  }

  /**
   * Initializes the blockchain.
   * Throws an error if the initialization fails.
   *
   * @memberof Blockchain
   */
  async initialize() {
    this._initialized = true;  // This enables us to call all methods.
    try {
      let blockHeight = await this.getBlockHeight();
      if (blockHeight >= 0) {
        console.log('Initialization: The blockchain already exists. ' +
          'Number of blocks: ' + (blockHeight + 1).toString());
        console.log('Initialization SUCCESSFUL!');
        return;
      }
    } catch (err) {
      // We could not obtain the 'height' so the blockchain must be empty.
      console.log('Initialization: The blockchain is empty.');
    }
    try {
      console.log('Initialization: Adding the Genesis block.');
      await this._addGenesisBlock();
      console.log('Initialization SUCCESSFUL!');
      return;
    } catch (err) {
      console.log('Initialization: Adding the genesis block FAILED!');
      console.log('Initialization FAILED!');
      this._initialized = false;
      throw err;
    }
  }

  /**
   * Throws an error if the blockchain is not initialized.
   *
   * @memberof Blockchain
   */
  _checkIfInitialized() {
    if (!this._initialized) {
      throw new Error('Blockchain is not initialized!');
    }
  }

  /**
   * Returns a promise for waiting a given time (in milliseconds).
   * 
   * @static
   * @param {number} timeMs Time (in milliseconds).
   * @return {Promise} Promise for waiting a given time (in milliseconds).
   * @memberof Blockchain
   */
  static _delay(timeMs) {
    return new Promise((fulfill) => setTimeout(fulfill, timeMs));
  }

  /**
   * Locks the blockchain for write updates.
   * Waits until the lock is obtained.
   *
   * @memberof Blockchain
   */
  async _lock() {
    while (this._locked) {
      await Blockchain._delay(this._lockWaitMs);
    }
    this._locked = true;
  }

  /**
   * Releases the blockchain lock.
   *
   * @memberof Blockchain
   */
  _unlock() {
    this._locked = false;
  }

  /**
   * Uploads the given block to the database and updates the blockchain height.
   * Throws an error if the blockchain is not locked or if the upload failed.
   *
   * @param {Block} block Block to be uploaded.
   * @memberof Blockchain
   */
  async _uploadBlock(block) {
    if (!this._locked) {
      throw new Error('Blockchain is not locked!');
    }
    let blockHeightStr = block.height.toString();
    let blockStr = JSON.stringify(block);
    await this._db.put(blockHeightStr, blockStr);
    await this._db.put('height', blockHeightStr);
  }

  /**
   * Adds a genesis block to the empty blockchain.
   * Throws an error if the genesis block could not be added.
   *
   * @memberof Blockchain
   */
  async _addGenesisBlock() {
    let newBlock = new Block('First block in the chain - Genesis block');
    // Genesis block height.
    newBlock.height = 0;
    // UTC timestamp.
    newBlock.time = new Date().getTime().toString().slice(0, -3);
    // Block hash with SHA256 using newBlock and converting to a string.
    newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
    await this._lock();
    try {
      await this._uploadBlock(newBlock);
      this._unlock();
    } catch (err) {
      console.log('Adding the genesis block FAILED!');
      console.log('BLOCK:\n' + JSON.stringify(newBlock));
      this._unlock();
      throw err;
    }
  }

  /**
   * Adds a new block to the non-empty blockchain.
   * Throws an error if the new block could not be added.
   *
   * @param {Block} newBlock New block to be added.
   * @memberof Blockchain
   */
  async addBlock(newBlock) {
    this._checkIfInitialized();
    await this._lock();
    try {
      // Previous block height.
      let blockHeight = await this.getBlockHeight();
      // Previous block.
      let block = await this.getBlock(blockHeight);
      // New block height.
      newBlock.height = blockHeight + 1;
      // UTC timestamp.
      newBlock.time = new Date().getTime().toString().slice(0, -3);
      // Previous block hash.
      newBlock.previousBlockHash = block.hash;
      // Block hash with SHA256 using newBlock and converting to a string.
      newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
      // Upload the new block.
      await this._uploadBlock(newBlock);
      this._unlock();
    } catch (err) {
      console.log('Adding the new block FAILED!');
      console.log('BLOCK:\n' + JSON.stringify(newBlock));
      this._unlock();
      throw err;
    }
  }

  /**
   * Returns the height of the highest block in the blockchain.
   * Throws an error if the height of the highest block cannot be obtained.
   *
   * @returns {number} Height of the highest block in the blockchain.
   * @memberof Blockchain
   */
  async getBlockHeight() {
    this._checkIfInitialized();
    return parseInt(await this._db.get('height'));
  }

  /**
   * Returns the block at the given block height.
   * Throws an error if the block at the given block height cannot be obtained.
   *
   * @param {number} blockHeight Height of the block to be returned.
   * @returns {Block} Block at the given height.
   * @memberof Blockchain
   */
  async getBlock(blockHeight) {
    this._checkIfInitialized();
    return JSON.parse(await this._db.get(blockHeight.toString()));
  }

  /**
   * Validates the block at the given block height.
   * Throws an error if the block at the given block height cannot be obtained.
   *
   * @param {number} blockHeight Height of the block to be validated.
   * @returns {boolean} True if the block is successfully validated.
   * @memberof Blockchain
   */
  async validateBlock(blockHeight) {
    this._checkIfInitialized();
    let block = await this.getBlock(blockHeight);
    let blockHash = block.hash;
    block.hash = '';
    let validBlockHash = SHA256(JSON.stringify(block)).toString();
    if (blockHash === validBlockHash) {
      return true;
    } else {
      console.log('Block #' + blockHeight + ' invalid hash:\n' +
        blockHash + ' != ' + validBlockHash);
      return false;
    }
  }

  /**
   * Validates the blockchain.
   * Throws an error if the blockchain is not initialized.
   *
   * @returns {boolean} True if the blockchain is successfully validated.
   * @memberof Blockchain
   */
  async validateChain() {
    this._checkIfInitialized();
    let blockCount = await this.getBlockHeight() + 1;
    let errorLog = [];
    let previousBlock = null;
    for (var blockHeight = 0; blockHeight < blockCount; blockHeight++) {
      try {
        if (await this.validateBlock(blockHeight) == false) {
          errorLog.push(blockHeight);
        }
        // Note: This is not super-efficient, as we are now fetching the block
        // for the 2nd time here. To fix this we could change the interface of
        // the validateBlock method to accept the block instead of blockHeight.
        let block = await this.getBlock(blockHeight);
        if (previousBlock) {
          if (block.previousBlockHash != previousBlock.hash) {
            console.log('Block #' + blockHeight + ' invalid previous hash:\n' +
              block.previousBlockHash + ' != ' + previousBlock.hash);
            errorLog.push(blockHeight);
          }
        }
        previousBlock = block;
      } catch (err) {
        console.log('Block #' + blockHeight + ' validation FAILED!');
        console.log('ERROR:\n' + JSON.stringify(err));
        errorLog.push(blockHeight);
      }
    }
    if (errorLog.length > 0) {
      console.log('Block errors: ' + errorLog.length);
      console.log('Blocks: ' + errorLog);
      return false;
    } else {
      console.log('No errors detected!');
      return true;
    }
  }
}


// TESTING CODE

/**
 * Auxiliary function for testing the blockchain implementation.
 *
 * @param {boolean} addNewBlocks Add some blocks on top of the Genesis block.
 * @param {Array.<number>} messDataBlocks Array of blocks to mess data.
 * @param {Array.<number>} messPreviousHashesBlocks Array of blocks to mess previous hashes.
 */
let testBlockchain = async (
  addNewBlocks = false,
  messDataBlocks = [],
  messPreviousHashesBlocks = []) => {
  console.log('=== BLOCKCHAIN TEST STARTED! ===');
  let blockchain = new Blockchain();
  await blockchain.initialize();
  let blockHeight = await blockchain.getBlockHeight();
  if ((blockHeight == 0) && addNewBlocks) {
    console.log('Blockchain contains only the genesis block. Adding more:');
    for (var i = 0; i < 10; i++) {
      let newBlockData = 'Test Block #' + (i + 1).toString();
      console.log('Adding ' + newBlockData);
      await blockchain.addBlock(new Block(newBlockData));
    }
  }
  if (messDataBlocks.length > 0) {
    console.log('Messing data of the following blocks: ' +
      JSON.stringify(messDataBlocks));
    for (var j = 0; j < messDataBlocks.length; j++) {
      let block = await blockchain.getBlock(messDataBlocks[j]);
      block.body = 'Hello!';
      await blockchain._db.put(
        messDataBlocks[j].toString(), JSON.stringify(block));
    }
  }
  if (messPreviousHashesBlocks.length > 0) {
    console.log('Messing previous hash of the following blocks: ' +
      JSON.stringify(messPreviousHashesBlocks));
    for (var k = 0; k < messPreviousHashesBlocks.length; k++) {
      let block = await blockchain.getBlock(messPreviousHashesBlocks[k]);
      block.previousBlockHash = 'World!';
      await blockchain._db.put(
        messPreviousHashesBlocks[k].toString(), JSON.stringify(block));
    }
  }
  console.log('Reading blockchain:');
  let blockCount = await blockchain.getBlockHeight() + 1;
  for (blockHeight = 0; blockHeight < blockCount; blockHeight++) {
    let block = await blockchain.getBlock(blockHeight);
    console.log('Block #' + blockHeight + ': ' + JSON.stringify(block));
  }
  console.log('Validating blockchain:');
  if (await blockchain.validateChain()) {
    console.log('Blockchain validation PASSED!');
  } else {
    console.log('Blockchain validation FAILED!');
  }
  console.log('=== BLOCKCHAIN TEST FINISHED! ===');
};

testBlockchain();
// testBlockchain(true);
// testBlockchain(true, [2, 4, 5], [3, 7]);