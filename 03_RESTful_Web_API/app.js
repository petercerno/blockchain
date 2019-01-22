const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());  // JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));  // URL-encoded bodies

const simpleChain = require('./simpleChain.js');
const Block = simpleChain.Block;
const Blockchain = simpleChain.Blockchain;
const blockchain = new Blockchain();

app.get('/block/:block(\\d+)', async (req, res) => {
  let blockHeight = parseInt(req.params['block']);
  if (blockHeight > await blockchain.getBlockHeight()) {
    res.status(404).send('Block Not Found! Invalid Block Height!');
    return;
  }
  let block = await blockchain.getBlock(blockHeight);
  res.json(block);
});

app.post('/block', async (req, res) => {
  if (!req.body['body']) {
    res.status(403).send('Forbidden! Cannot Add Block with Empty Body!');
    return;
  }
  let block = await blockchain.addBlock(new Block(req.body['body']));
  res.json(block);
});

let main = async () => {
  await blockchain.initialize();
  app.listen(8000, () => console.log('Blockchain app listening on port 8000!'));
};

main();