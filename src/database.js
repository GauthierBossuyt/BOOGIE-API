const { default: knex } = require("knex");
const ASCIIArray = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
];

const pg = require("knex")({
  client: "pg",
  connection: process.env.POSTGRES_CONNECTION
    ? process.env.POSTGRES_CONNECTION
    : "pg://user:@BSMB2022@localhost:5432/Boogie",
  searchPath: ["knex", "public"],
});

class Database {
  constructor() {}

  /**
   * initializes all tables
   */
  async initializeTables() {
    await this.createRoomTable();
  }

  /**
   * Checks if a table exists in the database.
   * @param {string} name of the table.
   * @return {boolean} that indicates if the table exists (TRUE) or doesn't (FALSE).
   */
  async doesTableExist(name) {
    let tableExists = await pg.schema.hasTable(name);
    return tableExists;
  }

  /**
   * Empties table from all content within.
   * @param {string} name of the table.
   * @returns {boolean} that indicates if the table is emptied (TRUE) or not (FALSE).
   */
  async truncateTable(name) {
    let tableExists = await this.doesTableExist(name);
    if (tableExists) {
      await pg.raw(`TRUNCATE TABLE ${name} RESTART IDENTITY CASCADE`);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Creates the rooms table in the database
   * @returns {boolean} indicating if the database was succesfully made (true) or not (false).
   */
  async createRoomTable() {
    if (!(await this.doesTableExist("rooms"))) {
      await pg.schema.createTable("rooms", (table) => {
        table.increments("TABLE_ID").primary();
        table.string("name");
        table.text("description");
        table.boolean("party");
        table.string("code");
        table.enu("service", ["Spotify", "Apple"]);
        table.text("host");
      });
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if a room already exists using the room code.
   * @param {string} code
   * @returns {boolean} indicating if the room exists (true) or (not).
   */
  async checkIfRoomExists(code) {
    let result = await pg("rooms").where("code", code);
    if (result.length > 0) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Adds a room to the rooms table
   * @param {Object} room containing all the values.
   * @returns {boolean} indicating if adding the room was succesfull.
   */
  async addRoom(room) {
    if (room.name && room.description) {
      if (room.service === "Apple" || room.service === "Spotify") {
        if (this.doesTableExist("rooms")) {
          let result;
          await pg("rooms")
            .insert({
              name: room.name,
              description: room.description,
              party: room.party,
              service: room.service,
              host: room.host,
              code: await this.generateRoomCode(),
            })
            .returning("code")
            .then((resp) => pg("rooms").where("code", resp[0].code))
            .then((resp) => (result = resp));
          return result.length > 0 ? result[0] : false;
        }
      }
      return false;
    } else {
      return false;
    }
  }

  /**
   * Generates a 4 character code with the alphabet and numbers.
   * @returns {string} a 4 character code
   */
  async generateRoomCode() {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += String.fromCharCode(
        ASCIIArray[Math.floor(Math.random() * ASCIIArray.length)]
      );
    }

    if (await this.checkIfRoomExists(code)) {
      this.generateRoomCode();
    } else {
      return code;
    }
  }

  /**
   * Gets an array of the room with the same code
   * @param {string} code to search the room with.
   * @returns {array} of all the corresponding room
   */
  async getRoom(code) {
    if (code && (await this.doesTableExist("rooms"))) {
      let result = await pg("rooms").where("code", code);
      return result;
    }
    return false;
  }

  /**
   * Removes a room from the database.
   * @param {string} code from the room.
   * @returns an array of the deleted rooms.
   */
  async removeRoom(code) {
    if (code && (await this.doesTableExist("rooms"))) {
      let result = await pg("rooms").where("code", code).del();
      return result === 1 ? true : false;
    }
    return false;
  }
}

const database = new Database();
module.exports = { database };
