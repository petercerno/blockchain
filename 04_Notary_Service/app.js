const express = require('express');
const app = express();

app.use(express.static('public'));

const bodyParser = require('body-parser');
app.use(bodyParser.json());  // JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));  // URL-encoded bodies

const simpleChain = require('./simpleChain.js');
const Block = simpleChain.Block;
const Blockchain = simpleChain.Blockchain;
const blockchain = new Blockchain();

// Returns the current timestamp (in seconds).
const getCurrentTimeStamp = () => { return Math.floor(Date.now() / 1000); };

const identityValidation = require('./identityValidation.js');
const IdentityValidator = identityValidation.IdentityValidator;
const identityValidator = new IdentityValidator(getCurrentTimeStamp);

const starRegistration = require('./starRegistration.js');
const Star = starRegistration.Star;

app.get('/stars/address::address([a-zA-Z0-9]+)', async (req, res) => {
  let address = req.params['address'];
  try {
    let blocks = await blockchain.getBlocksByAddress(address);
    res.json(blocks);
  } catch (err) {
    res.status(400).send('GET Block Error: ' + err.message);
  }
});

app.get('/stars/hash::hash([a-f0-9]+)', async (req, res) => {
  let hash = req.params['hash'];
  try {
    let block = await blockchain.getBlockByHash(hash);
    if (!block) {
      res.status(404).send('Block Not Found! Unknown Hash!');
      return;
    }
    res.json(block);
  } catch (err) {
    res.status(400).send('GET Block Error: ' + err.message);
  }
});

app.get('/block/:block(\\d+)', async (req, res) => {
  let blockHeight = parseInt(req.params['block']);
  try {
    if (blockHeight > await blockchain.getBlockHeight()) {
      res.status(404).send('Block Not Found! Invalid Block Height!');
      return;
    }
    let block = await blockchain.getBlock(blockHeight);
    res.json(block);
  } catch (err) {
    res.status(400).send('GET Block Error: ' + err.message);
  }
});

app.post('/block', async (req, res) => {
  if (!req.body['address']) {
    res.status(400).send('Bad Request! Missing Address!');
    return;
  }
  if (!req.body['star']) {
    res.status(400).send('Bad Request! Missing Star!');
    return;
  }
  try {
    let star = Star.parseDict(req.body['star']);
    if (!identityValidator.canRegisterStar(req.body['address'])) {
      res.status(400).send('Register Star Error: Star Already Registered!');
      return;
    }
    let data = {
      'address': req.body['address'],
      'star': star,
    };
    let block = await blockchain.addBlock(new Block(data));
    res.json(block);
  } catch (err) {
    res.status(400).send('Register Star Error: ' + err.message);
  }
});

app.post('/requestValidation', (req, res) => {
  if (!req.body['address']) {
    res.status(400).send('Bad Request! Missing Address!');
    return;
  }
  try {
    let currentTimeStamp = getCurrentTimeStamp();
    let validationRequest = identityValidator.getValidationRequest(
      req.body['address'], currentTimeStamp);
    res.json(validationRequest);
  } catch (err) {
    res.status(400).send('Validation Error: ' + err.message);
  }
});

app.post('/message-signature/validate', (req, res) => {
  if (!req.body['address']) {
    res.status(400).send('Bad Request! Missing Address!');
    return;
  }
  if (!req.body['signature']) {
    res.status(400).send('Bad Request! Missing Signature!');
    return;
  }
  try {
    let currentTimeStamp = getCurrentTimeStamp();
    let validationResponse = identityValidator.verifyValidationRequest(
      req.body['address'], req.body['signature'], currentTimeStamp);
    res.json(validationResponse);
  } catch (err) {
    res.status(400).send('Verification Error: ' + err.message);
  }
});

let main = async () => {
  await blockchain.initialize();
  app.listen(8000, () => console.log('Blockchain app listening on port 8000!'));
};

main();