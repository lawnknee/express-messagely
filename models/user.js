"use strict";

/** User of the site. */

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

const { NotFoundError } = require("../expressError");
const db = require("../db");

class User {
  /** Register new user. Returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `
      INSERT INTO users (username, 
                         password, 
                         first_name, 
                         last_name, 
                         phone, 
                         join_at, 
                         last_login_at)
            VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
            RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `
      SELECT password
          FROM users
          WHERE username = $1
          RETURNING password`,
      [username]
    );
    const user = result.rows[0];

    // if user exists AND pw matches hashedpassword in DB, return true
    if (user && (await bcrypt.compare(password, user.password)) === true) {
      return true;
    } else {
      return false;
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `
      UPDATE users
          set last_login_at = current_timestamp
          WHERE username = $1`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name}, ...] */

  static async all() {
    const results = await db.query(`
      SELECT username, first_name, last_name
          FROM users`);
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `
      SELECT username, 
             first_name, 
             last_name, 
             phone, 
             join_at, 
             last_login_at
          FROM users
          WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`${username} cannot be found.`);

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_username, body, sent_at, read_at}]
   *
   * where to_username is
   *   {username, first_name, last_name, phone}
   */
  static async messagesFrom(username) {
    // const mResults = await db.query(
    //   `
    //   SELECT id, to_username, body, sent_at, read_at
    //       FROM messages
    //           JOIN users
    //               ON messages.to_username = users.username
    //       WHERE username = $1`,
    //   [username]
    // );

    // const { to_username, ...messages } = mResults.rows;

    // const uResults = await db.query(
    //   `
    //   SELECT username, first_name, last_name, phone
    //       FROM users
    //       WHERE username = $1`,
    //   [to_username]
    // );

    // const user = uResults.rows[0];

    // messages.to_user = user;

    // return messages;

    const results = await db.query(
    `
    SELECT m.id,
           m.to_username,
           to.first_name,
           to.last_name,
           to.phone,
           m.body,
           m.sent_at,
           m.read_at
        FROM messages as m
            JOIN users as to
                ON messages.to_username = users.username
        WHERE from_username = $1`,
        [username]
    );
    
    return results.rows.map( function(message) {
      return {
        id: m.id,
        to_username: {
          username: m.to_username,
          first_name: to.first_name,
          last_name: to.last_name,
          phone: to.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      }
    });

    }

  /** Return messages to this user.
   *
   * [{id, from_username, body, sent_at, read_at}]
   *
   * where from_username is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    // const mResults = await db.query(
    //   `
    //   SELECT id, from_username, body, sent_at, read_at
    //       FROM messages
    //           JOIN users
    //               ON messages.from_username = users.username
    //       WHERE username = $1`,
    //   [username]
    // );

    // const { from_username, ...messages } = mResults.rows;

    // const uResults = await db.query(
    //   `
    //   SELECT username, first_name, last_name, phone
    //       FROM users
    //       WHERE username = $1`,
    //   [from_username]
    // );

    // const user = uResults.rows[0];

    // messages.from_user = user;

    // return messages;

    const results = await db.query(
      `
      SELECT m.id,
             m.from_username,
             from.first_name,
             from.last_name,
             from.phone,
             m.body,
             m.sent_at,
             m.read_at
          FROM messages as m
              JOIN users as from
                  ON messages.from_username = users.username
          WHERE from_username = $1`,
          [username]
      );
      
    return results.rows.map( function(message) {
      return {
        id: m.id,
        from_username: {
          username: m.from_username,
          first_name: from.first_name,
          last_name: from.last_name,
          phone: from.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      }
    });
  }
}

module.exports = User;
