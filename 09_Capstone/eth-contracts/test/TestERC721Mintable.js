const RealEstateERC721Token = artifacts.require('RealEstateERC721Token');
const BigNumber = require('bignumber.js');


contract('TestRealEstateERC721Token', accounts => {

  // Converts the given BigNumber to a number.
  const toNumber = (bigNumber) => {
    return new BigNumber(bigNumber).toNumber();
  };

  // Asserts that the given promise fails.
  const expectThrow = async (promise) => {
    try {
      await promise;
    } catch (error) {
      assert.exists(error);
      return;
    }
    assert.fail('Expected an error but did not see any!');
  };

  const account_one = accounts[0];
  const account_two = accounts[1];
  const other_account = accounts[2];

  // RealEstateERC721Token contract
  let contract = null;

  describe('match erc721 spec', () => {

    before('contract setup', async () => {
      contract = await RealEstateERC721Token.new({ from: account_one });

      await contract.mint(account_one, 1, { from: account_one });
      await contract.mint(account_one, 2, { from: account_one });
      await contract.mint(account_two, 3, { from: account_one });
      await expectThrow(contract.mint(account_one, 3, { from: account_one }));
      await expectThrow(contract.mint(account_two, 4, { from: other_account }));

      const events = await contract.getPastEvents('Transfer',
        { fromBlock: 0, toBlock: 'latest' });

      assert.equal(events.length, 3, 'Transfer event not emitted 3x');

      assert.equal(events[0].args.from,
        '0x0000000000000000000000000000000000000000', 'Invalid from');
      assert.equal(events[0].args.to, account_one, 'Invalid to');
      assert.equal(toNumber(events[0].args.tokenId), 1, 'Invalid tokenId');

      assert.equal(events[1].args.from,
        '0x0000000000000000000000000000000000000000', 'Invalid from');
      assert.equal(events[1].args.to, account_one, 'Invalid to');
      assert.equal(toNumber(events[1].args.tokenId), 2, 'Invalid tokenId');

      assert.equal(events[2].args.from,
        '0x0000000000000000000000000000000000000000', 'Invalid from');
      assert.equal(events[2].args.to, account_two, 'Invalid to');
      assert.equal(toNumber(events[2].args.tokenId), 3, 'Invalid tokenId');
    });

    it('should return total supply', async () => {
      const totalSupply = await contract.totalSupply.call(
        { from: other_account });
      assert.equal(toNumber(totalSupply), 3, 'Invalid total supply');
    });

    it('should get token balance', async () => {
      let balance = await contract.balanceOf.call(
        account_one, { from: other_account });
      assert.equal(toNumber(balance), 2, 'Invalid balance of account_one');
      balance = await contract.balanceOf.call(
        account_two, { from: other_account });
      assert.equal(toNumber(balance), 1, 'Invalid balance of account_two');
      balance = await contract.balanceOf.call(
        other_account, { from: other_account });
      assert.equal(toNumber(balance), 0, 'Invalid balance of other_account');
    });

    // token uri should be complete i.e: https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1
    it('should return token uri', async () => {
      assert.equal(
        await contract.tokenURI.call(1, { from: other_account }),
        'https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1',
        'Invalid tokenURI');
      assert.equal(
        await contract.tokenURI.call(2, { from: other_account }),
        'https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/2',
        'Invalid tokenURI');
      assert.equal(
        await contract.tokenURI.call(3, { from: other_account }),
        'https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/3',
        'Invalid tokenURI');
      await expectThrow(contract.tokenURI.call(4, { from: other_account }));
    });

    it('should transfer token from one owner to another', async () => {
      await expectThrow(contract.safeTransferFrom(
        account_one, account_two, 1, { from: other_account }));
      await expectThrow(contract.safeTransferFrom(
        account_one, account_two, 3, { from: account_one }));

      await contract.safeTransferFrom(
        account_one, account_two, 1, { from: account_one });

      const events = await contract.getPastEvents('Transfer');
      assert.equal(events.length, 1, 'Transfer event not emitted');
      assert.equal(events[0].args.from, account_one, 'Invalid from');
      assert.equal(events[0].args.to, account_two, 'Invalid to');
      assert.equal(toNumber(events[0].args.tokenId), 1, 'Invalid tokenId');

      let balance = await contract.balanceOf.call(
        account_one, { from: other_account });
      assert.equal(toNumber(balance), 1, 'Invalid balance of account_one');
      balance = await contract.balanceOf.call(
        account_two, { from: other_account });
      assert.equal(toNumber(balance), 2, 'Invalid balance of account_two');
    });
  
  });

  describe('have ownership properties', () => {

    before('contract setup', async () => {
      contract = await RealEstateERC721Token.new({ from: account_one });
    });

    it('should fail when minting when address is not contract owner', async () => {
      await expectThrow(contract.mint(account_one, 1, { from: other_account }));
    });

    it('should return contract owner', async () => {
      const account = await contract.owner.call({ from: other_account });
      assert.equal(account, account_one, 'Invalid owner account');
    });

  });
});