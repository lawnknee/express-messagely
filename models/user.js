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
          WHERE username = $1`,
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
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
      SELECT username, first_name, last_name, phone
          FROM users
          ORDER BY username`);
    return results.rows;
    // db will return out of order unless specified
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
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */
  static async messagesFrom(username) {
    const results = await db.query(
      `SELECT m.id,
              m.to_username,
              users.first_name,
              users.last_name,
              users.phone,
              m.body,
              m.sent_at,
              m.read_at
          FROM messages AS m
              JOIN users
                  ON m.to_username = users.username
          WHERE from_username = $1`,
          [username]);
    
    // arrow function m will return this thing which happens to be an object
    return results.rows.map((m) => (
      {
        id: m.id,
        to_user: {
          username: m.to_username,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(
      `
      SELECT m.id,
             m.from_username,
             users.first_name,
             users.last_name,
             users.phone,
             m.body,
             m.sent_at,
             m.read_at
          FROM messages as m
              JOIN users
                  ON m.from_username = users.username
          WHERE to_username = $1`,
          [username]
      );
      
    return results.rows.map( function(m) {
      return {
        id: m.id,
        from_user: {
          username: m.from_username,
          first_name: m.first_name,
          last_name: m.last_name,
          phone: m.phone,
        },
        body: m.body,
        sent_at: m.sent_at,
        read_at: m.read_at,
      }
    });
  }
}

module.exports = User;
