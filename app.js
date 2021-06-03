var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var stylus = require("stylus");
var helmet = require("helmet");
var cookieSession = require("cookie-session");

var indexRouter = require("./routes/index");
var votesRouter = require("./routes/votes");
var { DEFAULT_WAIT_INTERVAL_MS } = require("./consts");

// const isProduction = process.env.NODE_ENV === "production";

var app = express();
app.use(helmet());
app.use(
  cookieSession({
    name: "sessionId",
    secret: process.env.SECRET,
    maxAge: 5 * 60 * 1000, // 5 minutes
    // secure: isProduction,
  })
);

app.use(function (req, res, next) {
  req.sessionOptions.maxAge = req.session.maxAge || req.sessionOptions.maxAge;
  next();
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(stylus.middleware(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/votes", votesRouter);

module.exports = app;
