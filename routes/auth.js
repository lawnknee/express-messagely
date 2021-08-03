"use strict";

const Router = require("express").Router;
const router = new Router();

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config")
const { UnauthorizedError } = require("../expressError")
const User = require("../models/user")

/** POST /login: {username, password} => {token} */
router.post("/login", async function(req, res, next) {
  const { username, password } = req.body;

  if (await User.authenticate(username, password)) {
    // if username and password is valid, create token and returns token
    let payload = { username };
    let token = jwt.sign(payload, SECRET_KEY);
    return res.json({ token });
  } else {
    // username and/or password is invalid, throw error back
    throw new UnauthorizedError(`Invalid username and/or password.`)
  }
})

/** POST /register: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 */
 router.post("/register", async function (req, res, next) {
  let { username } = await User.register(req.body);
  let token = jwt.sign({ username }, SECRET_KEY);
  User.updateLoginTimestamp(username);
  return res.json({ token });
});


module.exports = router;