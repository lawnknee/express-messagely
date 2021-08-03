"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const db = require("../db");
const User = require("../models/user");
const Message = require("../models/message")
const { SECRET_KEY } = require("../config")


describe("Messages Routes Test", function () {
  let u1, u2, u1Token, u2Token, m1;

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

    const u1Login = await request(app)
        .post("/auth/login")
        .send({ username: "test1", password: "password" });

    const u2Login = await request(app)
        .post("/auth/login")
        .send({ username: "test2", password: "password" });

    u1Token = u1Login.body.token;
    u2Token = u2Login.body.token;

    // const u1TestMessage = await request(app)
    //     .post("/messages/")
    //     .send({ _token: u1Token, 
    //             to_username: u2.username, 
    //             body: "test message u1 to u2"});

    // msgId = u1TestMessage.body.message.id

    m1 = await Message.create({ from_username: u1.username, 
                                to_username: u2.username, 
                                body: "test message u1 to u2"
                              })
  });

  /** GET /messages/:id => 
   *    [{username, first_name, last_name, phone}, ...] */

  describe("GET /messages/:id", function () {
    test("can detail of a message", async function () {
      const response = await request(app)
        .get(`/messages/${msgId}`)
        .send({_token: u1Token});

      delete u1.password;
      delete u2.password;

      expect(response.statusCode).toEqual(200);
      expect(response.body).toEqual({message: {
        id: expect.any(Number),
        body: "test message u1 to u2",
        sent_at: expect.any(String),
        read_at: null,
        from_user: u1,
        to_user: u2,
      }}) 
    });
  });

  /** POST /messages/ => 
   *    { message: {id, from_username, to_username, body, sent_at}} */

  describe("POST /messages", function () {
    test("can post a message", async function () {
      const response = await request(app)
        .post("/messages/")
        .send({ _token: u1Token, 
                to_username: u2.username, 
                body: "test message u1 to u2"});
    })
  })
});

afterAll(async function () {
  await db.end();
});