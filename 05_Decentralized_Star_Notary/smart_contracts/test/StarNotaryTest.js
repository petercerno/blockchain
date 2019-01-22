const StarNotary = artifacts.require('StarNotary');

contract('StarNotary', accounts => {
  let defaultAccount = accounts[0];
  let user1 = accounts[1];
  let user2 = accounts[2];

  beforeEach(async function () {
    this.contract = await StarNotary.new({ from: defaultAccount });
  });

  describe('can create a star', () => {
    let starId = 1;
    let anotherStarId = 2;

    it('can create a star and get its name and info', async function () {
      await this.contract.createStar(
        'Star power 103!', 'I love my wonderful star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', starId,
        { from: defaultAccount });

      assert.equal(
        JSON.stringify(await this.contract.tokenIdToStarInfo(starId)),
        JSON.stringify(['Star power 103!', 'I love my wonderful star',
          'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion']));
    });

    it('cannot create a star with empty name', async function () {
      await expectThrow(this.contract.createStar(
        '', 'I hate my disgusting star',
        'ra_030.000', 'dec_120.000', 'mag_240.000', 'orion', starId,
        { from: defaultAccount }));
    });

    it('cannot create a star with empty story', async function () {
      await expectThrow(this.contract.createStar(
        'Star power 206!', '',
        'ra_030.000', 'dec_120.000', 'mag_240.000', 'orion', starId,
        { from: defaultAccount }));
    });

    it('cannot create a star with empty right ascension', async function () {
      await expectThrow(this.contract.createStar(
        'Star power 206!', 'I hate my disgusting star',
        '', 'dec_120.000', 'mag_240.000', 'orion', starId,
        { from: defaultAccount }));
    });

    it('cannot create a star with empty declination', async function () {
      await expectThrow(this.contract.createStar(
        'Star power 206!', 'I hate my disgusting star',
        'ra_030.000', '', 'mag_240.000', 'orion', starId,
        { from: defaultAccount }));
    });

    it('cannot create two stars with the same token id', async function () {
      await this.contract.createStar(
        'Star power 103!', 'I love my wonderful star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', starId,
        { from: defaultAccount });
      await expectThrow(this.contract.createStar(
        'Star power 206!', 'I hate my disgusting star',
        'ra_030.000', 'dec_120.000', 'mag_240.000', 'orion', starId,
        { from: defaultAccount }));
    });

    it('cannot create two stars with the same coordinates', async function () {
      await this.contract.createStar(
        'Star power 103!', 'I love my wonderful star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', starId,
        { from: defaultAccount });
      await expectThrow(this.contract.createStar(
        'Star power 206!', 'I hate my disgusting star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', anotherStarId,
        { from: defaultAccount }));
    });

    it('cannot get star info for non-existent star', async function () {
      await expectThrow(this.contract.tokenIdToStarInfo(starId));
    });
  });

  describe('buying and selling stars', () => {
    let maliciousUser = accounts[3];

    let starId = 1;
    let anotherStarId = 2;

    let starPrice = web3.toWei(.05, "ether");
    let starPriceOverpaid = web3.toWei(.10, "ether");
    let starPriceUnderpaid = web3.toWei(.01, "ether");

    beforeEach(async function () {
      await this.contract.createStar(
        'Star power 103!', 'I love my wonderful star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', starId,
        { from: user1 });
      await this.contract.createStar(
        'Star power 206!', 'I hate my disgusting star',
        'ra_030.000', 'dec_120.000', 'mag_240.000', 'orion', anotherStarId,
        { from: user1 });
    });

    it('user1 can put up their star for sale', async function () {
      assert.equal(await this.contract.ownerOf(starId), user1);

      await this.contract.putStarUpForSale(starId, starPrice,
        { from: user1 });

      assert.equal(await this.contract.starsForSale(starId), starPrice);
      assert.equal(await this.contract.starsForSale(anotherStarId), 0);
    });

    it('malicious user cannot put a star of user1 for sale', async function () {
      assert.equal(await this.contract.ownerOf(starId), user1);

      await expectThrow(this.contract.putStarUpForSale(starId, starPrice,
        { from: maliciousUser }));

      assert.equal(await this.contract.starsForSale(starId), 0);
    });

    it('user1 gets the funds after selling the star', async function () {
      assert.equal(await this.contract.ownerOf(starId), user1);

      await this.contract.putStarUpForSale(starId, starPrice, { from: user1 });
      const balanceBeforeTransaction = web3.eth.getBalance(user1);
      await this.contract.buyStar(starId,
        { from: user2, value: starPrice, gasPrice: 0 });
      const balanceAfterTransaction = web3.eth.getBalance(user1);

      assert.equal(
        balanceBeforeTransaction.add(starPrice).toNumber(),
        balanceAfterTransaction.toNumber());
    });

    it('user1 gets the same funds even if user2 overpays', async function () {
      assert.equal(await this.contract.ownerOf(starId), user1);

      await this.contract.putStarUpForSale(starId, starPrice, { from: user1 });
      const balanceBeforeTransaction = web3.eth.getBalance(user1);
      await this.contract.buyStar(starId,
        { from: user2, value: starPriceOverpaid, gasPrice: 0 });
      const balanceAfterTransaction = web3.eth.getBalance(user1);

      assert.equal(
        balanceBeforeTransaction.add(starPrice).toNumber(),
        balanceAfterTransaction.toNumber());
    });

    describe('user2 can buy a star that was put up for sale', () => {
      beforeEach(async function () {
        await this.contract.putStarUpForSale(starId, starPrice,
          { from: user1 });
      });

      it('user2 is the owner of the star after they buy it', async function () {
        await this.contract.buyStar(starId,
          { from: user2, value: starPrice, gasPrice: 0 });

        assert.equal(await this.contract.ownerOf(starId), user2);
      });

      it('user2 ether balance changed correctly', async function () {
        const balanceBeforeTransaction = web3.eth.getBalance(user2);
        await this.contract.buyStar(starId,
          { from: user2, value: starPrice, gasPrice: 0 });
        const balanceAfterTransaction = web3.eth.getBalance(user2);

        assert.equal(
          balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice);
      });

      it('user2 ether balance changed correctly (overpaid)', async function () {
        const balanceBeforeTransaction = web3.eth.getBalance(user2);
        await this.contract.buyStar(starId,
          { from: user2, value: starPriceOverpaid, gasPrice: 0 });
        const balanceAfterTransaction = web3.eth.getBalance(user2);

        assert.equal(
          balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice);
      });

      it('user2 cannot buy the star for a cheaper price', async function () {
        const balanceBeforeTransaction = web3.eth.getBalance(user2);
        await expectThrow(this.contract.buyStar(starId,
          { from: user2, value: starPriceUnderpaid, gasPrice: 0 }));
        const balanceAfterTransaction = web3.eth.getBalance(user2);

        assert.equal(
          balanceBeforeTransaction.toNumber(),
          balanceAfterTransaction.toNumber());
      });

    });
  });

  describe('check if star exists', () => {

    beforeEach(async function () {
      await this.contract.createStar(
        'Star power 103!', 'I love my wonderful star',
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion', 1,
        { from: user1 });
    });

    it('anyone can check if star exists', async function () {
      assert.equal(await this.contract.checkIfStarExist(
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion',
        { from: user1 }), true);
      assert.equal(await this.contract.checkIfStarExist(
        'ra_032.155', 'dec_121.874', 'mag_245.978', 'orion',
        { from: user2 }), true);
    });
  });

  describe('can create a token', () => {
    let tokenId = 1;
    let tx;

    beforeEach(async function () {
      tx = await this.contract.mint(tokenId, { from: user1 });
    });

    it('ownerOf tokenId is user1', async function () {
      assert.equal(await this.contract.ownerOf(tokenId), user1);
    });

    it('balanceOf user1 is incremented by 1', async function () {
      let balance = await this.contract.balanceOf(user1);

      assert.equal(balance.toNumber(), 1);
    });

    it('emits the correct event for new token', async function () {
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from, 0);
      assert.equal(tx.logs[0].args.to, user1);
      assert.equal(tx.logs[0].args.tokenId, tokenId);
    });
  });

  describe('can transfer token', () => {
    let tokenId = 1;
    let tx;

    beforeEach(async function () {
      await this.contract.mint(tokenId, { from: user1 });

      tx = await this.contract.safeTransferFrom(user1, user2, tokenId,
        { from: user1 });
    });

    it('token has new owner', async function () {
      assert.equal(await this.contract.ownerOf(tokenId), user2);
    });

    it('emits the correct event for transfer of token', async function () {
      assert.equal(tx.logs[0].event, 'Transfer');
      assert.equal(tx.logs[0].args.from, user1);
      assert.equal(tx.logs[0].args.to, user2);
      assert.equal(tx.logs[0].args.tokenId, tokenId);
    })

    it('only approved users can transfer tokens', async function () {
      let randomPersonTryingToStealTokens = accounts[4];

      await expectThrow(
        this.contract.safeTransferFrom(
          user1, randomPersonTryingToStealTokens, tokenId,
          { from: randomPersonTryingToStealTokens }));
    });
  });

  describe('can grant approval to transfer', () => {
    let tokenId = 1;
    let tx;

    beforeEach(async function () {
      await this.contract.mint(tokenId, { from: user1 });
      tx = await this.contract.approve(user2, tokenId, { from: user1 });
    });

    it('set user2 as an approved address', async function () {
      assert.equal(await this.contract.getApproved(tokenId), user2);
    });

    it('user2 can now transfer', async function () {
      await this.contract.safeTransferFrom(user1, user2, tokenId,
        { from: user2 });

      assert.equal(await this.contract.ownerOf(tokenId), user2);
    });

    it('emits the correct event for transfer approval', async function () {
      assert.equal(tx.logs[0].event, 'Approval');
      assert.equal(tx.logs[0].args.owner, user1);
      assert.equal(tx.logs[0].args.approved, user2);
      assert.equal(tx.logs[0].args.tokenId, tokenId);
    });
  });

  describe('can set an operator', () => {
    let operatorUser = accounts[2];

    let tokenId = 1;
    let tx;

    beforeEach(async function () {
      await this.contract.mint(tokenId, { from: user1 });

      tx = await this.contract.setApprovalForAll(
        operatorUser, true, { from: user1 });
    });

    it('can set an operator', async function () {
      assert.equal(
        await this.contract.isApprovedForAll(user1, operatorUser), true);
    });

    it('emits the correct event for operator approval', async function () {
      assert.equal(tx.logs[0].event, 'ApprovalForAll');
      assert.equal(tx.logs[0].args.owner, user1);
      assert.equal(tx.logs[0].args.operator, operatorUser);
      assert.equal(tx.logs[0].args.approved, true);
    });

  });
});

let expectThrow = async function (promise) {
  try {
    await promise;
  } catch (error) {
    assert.exists(error);
    return;
  }
  assert.fail('Expected an error but did not see any!');
};
