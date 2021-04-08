var express = require("express");
var { getDBClient } = require("../db");
var { WAIT_INTERVAL_MS } = require("../consts");

var router = express.Router();

function timeToWait(req) {
  return req.session && req.session.voteTS
    ? WAIT_INTERVAL_MS - (Date.now() - req.session.voteTS)
    : 0;
}

router.get("/", async (req, res, next) => {
  const dbClient = await getDBClient();
  const votes = await dbClient.query("SELECT * from votes");
  res.json({
    data: votes.rows,
  });
});

router.post("/", async (req, res, next) => {
  if (timeToWait(req) > 0) {
    res.status(429).json({ error: "Try again later" });
  } else {
    const dbClient = await getDBClient();
    const result = await dbClient.query({
      text: "INSERT INTO votes(voted_at, color) VALUES($1, $2) RETURNING *",
      values: [new Date(), req.body.color],
    });
    req.session.voteTS = Date.now();
    res.json({
      data: result.rows[0],
    });
  }
});

router.get("/ts", function (req, res, next) {
  res.json({ ts: timeToWait(req) });
});

module.exports = router;
