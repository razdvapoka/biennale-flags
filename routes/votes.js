process.env.TZ = "Europe/Rome";

var express = require("express");
var { getDBClient } = require("../db");
var { WAIT_INTERVAL_MS } = require("../consts");
var getDayOfYear = require("date-fns/getDayOfYear");
var differenceInMilliseconds = require("date-fns/differenceInMilliseconds");
var set = require("date-fns/set");
var max = require("date-fns/max");
var subHours = require("date-fns/subHours");
var set = require("date-fns/set");

var router = express.Router();

const timeToWait = (req) => {
  console.log(req.hostname);
  console.log(req.subdomains);
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

const processVotes = (votes, prevDayVotes) => {
  const firstVoteTime = new Date(votes[0].voted_at);
  const lastVoteTime = new Date(votes[votes.length - 1].voted_at);
  const currentTime = new Date();
  const finalTime =
    getDayOfYear(currentTime) > getDayOfYear(lastVoteTime)
      ? set(lastVoteTime, {
          hours: 23,
          minutes: 59,
          seconds: 59,
        })
      : currentTime;

  let transitionVote = null;
  if (prevDayVotes) {
    const lastPrevDayVote = prevDayVotes[prevDayVotes.length - 1];
    transitionVote = {
      ...lastPrevDayVote,
      voted_at: max([
        subHours(firstVoteTime, 1),
        set(firstVoteTime, { hours: 0, minutes: 0, seconds: 1 }),
      ]),
    };
  }

  const totalTimeMS = differenceInMilliseconds(
    finalTime,
    transitionVote ? new Date(transitionVote.voted_at) : firstVoteTime
  );

  const finalVotes = transitionVote ? [transitionVote, ...votes] : votes;
  const votesWithStops = finalVotes.map((vote) => {
    return {
      ...vote,
      stop:
        1 -
        differenceInMilliseconds(finalTime, new Date(vote.voted_at)) /
          totalTimeMS,
    };
  });
  return votesWithStops;
};

router.get("/", async (_, res) => {
  const dbClient = await getDBClient();
  const votes = await dbClient.query(
    "SELECT * from votes ORDER BY voted_at ASC"
  );
  const votesByDay = groupBy(votes.rows, (vote) =>
    getDayOfYear(new Date(vote.voted_at))
  );
  const sortedDays = Object.keys(votesByDay)
    .map((day) => parseInt(day))
    .sort((d1, d2) => (d1 > d2 ? 1 : -1));
  const votesWithStops = sortedDays.map((day, dayIndex) =>
    processVotes(
      votesByDay[day],
      dayIndex > 0 ? votesByDay[sortedDays[dayIndex - 1]] : null
    )
  );
  res.json({
    data: votesWithStops,
  });
});

router.post("/", async (req, res) => {
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

router.get("/ts", (req, res) => {
  res.json({ ts: timeToWait(req) });
});

module.exports = router;
