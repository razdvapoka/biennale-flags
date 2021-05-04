var express = require("express");
var { getDBClient } = require("../db");
var { WAIT_INTERVAL_MS } = require("../consts");
var getDayOfYear = require("date-fns/getDayOfYear");
var differenceInMilliseconds = require("date-fns/differenceInMilliseconds");
var set = require("date-fns/set");
var compareAsc = require("date-fns/compareAsc");

var router = express.Router();

const timeToWait = (req) => {
  return req.session && req.session.voteTS
    ? WAIT_INTERVAL_MS - (Date.now() - req.session.voteTS)
    : 0;
};

const groupBy = (items, getGroupKey) => {
  return items.reduce((groups, item) => {
    const itemGroupKey = getGroupKey(item);
    return {
      ...groups,
      [itemGroupKey]: [...(groups[itemGroupKey] || []), item],
    };
  }, {});
};

const processVotes = (votes) => {
  const firstVoteTime = new Date(votes[votes.length - 1].voted_at);
  const lastVoteTime = new Date(votes[0].voted_at);
  const currentTime = new Date();
  const finalTime =
    getDayOfYear(currentTime) > getDayOfYear(lastVoteTime)
      ? set(lastVoteTime, {
          hours: 23,
          minutes: 59,
          seconds: 59,
        })
      : currentTime;
  const totalTimeMS = differenceInMilliseconds(finalTime, firstVoteTime);
  const votesWithStops = votes
    .map((vote) => {
      return {
        ...vote,
        stop:
          1 -
          differenceInMilliseconds(finalTime, new Date(vote.voted_at)) /
            totalTimeMS,
      };
    })
    .sort((v1, v2) => compareAsc(new Date(v1.voted_at), new Date(v2.voted_at)));
  return votesWithStops;
};

router.get("/", async (req, res, next) => {
  const dbClient = await getDBClient();
  const votes = await dbClient.query(
    "SELECT * from votes ORDER BY voted_at DESC"
  );
  const votesByDay = groupBy(votes.rows, (vote) =>
    getDayOfYear(new Date(vote.voted_at))
  );
  const sortedDays = Object.keys(votesByDay)
    .map((day) => parseInt(day))
    .sort((d1, d2) => (d1 > d2 ? 1 : -1));
  const votesWithStops = sortedDays.map((day) => processVotes(votesByDay[day]));
  res.json({
    data: votesWithStops,
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

router.get("/ts", (req, res, next) => {
  res.json({ ts: timeToWait(req) });
});

module.exports = router;
