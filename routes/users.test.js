"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const { SECRET_KEY } = require("../config")


describe("Users Routes Test", function () {
  let u1, u2, u1Token, u2Token;

  beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    u1 = await User.register({
      username: "test1",
      password: "password",
      first_name: "Test1",
      last_name: "Testy1",
      phone: "+14155550000",
    });

    u2 = await User.register({
      username: "test2",
      password: "password",
      first_name: "Test2",
      last_name: "Testy2",
      phone: "+14155551111",
    });

    // const u1Login = await request(app)
    //     .post("/auth/login")
    //     .send({ username: "test1", password: "password" });

    // const u2Login = await request(app)
    //     .post("/auth/login")
    //     .send({ username: "test2", password: "password" });

    // u1Token = u1Login.body.token;
    // u2Token = u2Login.body.token;

    u1Token = jwt.sign({ username: "test1"}, SECRET_KEY);
    u2Token = jwt.sign({ username: "test2"}, SECRET_KEY);
  });

  /** GET /users/ => 
   *    [{username, first_name, last_name, phone}, ...] */

  describe("GET /users/", function () {
    test("can list all users", async function () {
      const response = await request(app)
        .get("/users")
        .send({_token: u1Token});

      delete u1.password;
      delete u2.password;

      expect(response.body).toEqual({users: [u1, u2]});
      expect(response.statusCode).toEqual(200);
    });

    test("won't list if not logged in", async function () {
      const response = await request(app).get("/users");

      expect(response.statusCode).toEqual(401)
    })

    test("returns 401 with invalid token", async function () {
      const response = await request(app)
        .get("/users")
        .send({ _token: "invalid" }); // invalid token!

      expect(response.statusCode).toEqual(401);
      });
  });

  /** GET /:username => 
   *    {user: {username, first_name, last_name, phone, join_at, last_login_at}} */
  
  describe("GET /:username", function () {
    test("get detail of user", async function () {
      const response = await request(app)
        .get(`/users/${u1.username}`)
        .send({_token: u1Token});

      expect(response.body).toEqual({user: {
        username: "test1",
        first_name: "Test1",
        last_name: "Testy1",
        phone: "+14155550000",
        join_at: expect.any(String),
        last_login_at: expect.any(String)
      }});
      expect(response.statusCode).toEqual(200);
    })

    // test invalid username input
  })

  // new describe block for user mesages
    // before each will create messages 

  /** GET /:username/to => 
   *    { messages: [{id, body, sent_at, read_at, from_user: {}} ...]} */

  describe("GET /:username/to", function () {
    test("get messages sent to user", async function () {
      const sendMessage = await request(app)
        .post("/messages/")
        .send({ _token: u1Token, 
                to_username: u2.username, 
                body: "test message"});
      // lean towards in before each (new describe block)
          // m1 = await Message.create( arguements )
          // create a few test messages to use

      const response = await request(app)
        .get(`/users/${u2.username}/to`)
        .send({_token: u2Token});
      
      delete u1.password;
      
      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({messages: [{
        id: expect.any(Number),
        body: "test message",
        sent_at: expect.any(String),
        read_at: null,
        from_user: u1
      }]})
    });

    // add pessimistic test for invalid username
    // add pessimistic test for not logged in user

  });

  /** GET /:username/from => { messages: [{} ...]} */

  describe("GET /:username/from", function () {
    test("get messages sent from user", async function () {
      const sendMessage = await request(app)
        .post("/messages/")
        .send({ _token: u1Token, 
                to_username: u2.username, 
                body: "test message"});

      const response = await request(app)
        .get(`/users/${u1.username}/from`)
        .send({_token: u1Token});
      
      delete u2.password;

      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({messages: [{
        id: expect.any(Number),
        body: "test message",
        sent_at: expect.any(String),
        read_at: null,
        to_user: u2
      }]})
    });
  });

  // add pessimistic test for invalid username
  // add pessimistic test for not logged in user
});

afterAll(async function () {
  await db.end();
});