const express = require('express');
const app = express();

app.use(express.static('public'));

const bodyParser = require('body-parser');
app.use(bodyParser.json());  // JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));  // URL-encoded bodies

const StarNotary = require('./starNotary.js').StarNotary;
const starNotary = new StarNotary();

app.get('/star/:starTokenId([0-9]+)', async (req, res) => {
  let starTokenId = req.params['starTokenId'];
  try {
    let starInfo = await starNotary.tokenIdToStarInfo(parseInt(starTokenId));
    res.json(starInfo);
  } catch (err) {
    res.status(400).send('GET Block Error: ' + err.message);
  }
});

let main = async () => {
  app.listen(8000, () => console.log('Blockchain app listening on port 8000!'));
};

main();