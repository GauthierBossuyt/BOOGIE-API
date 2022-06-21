const { MongoClient } = require("mongodb");
require("dotenv").config();
const url = `mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@boogie-database.fcjnf7m.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(url);

const ASCIIArray = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73,
  74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
];

class Database {
  constructor(dbname) {
    this.dbname = dbname;
    this.db;
    this.rooms;
    this.initialize();
  }

  /**
   * Initializes the variables when the database gets imported.
   */
  async initialize() {
    try {
      await client.connect();
      console.log("Successfully connected to the database!");
      this.db = client.db(this.dbname);
      this.rooms = this.db.collection("rooms");
    } catch (err) {
      console.log(err.stack);
    }
  }

  /**
   * Checks if a room already exists
   * @param {string} room_code
   * @returns a boolean that indicates whether the room already exists or not.
   */
  async doesRoomAlreadyExist(room_code) {
    let result = await this.rooms.countDocuments({ code: room_code });
    return result > 0 ? true : false;
  }

  /**
   * Generates a room code
   * @returns {string} code
   */
  async generateRoomCode() {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += String.fromCharCode(
        ASCIIArray[Math.floor(Math.random() * ASCIIArray.length)]
      );
    }

    if (await this.doesRoomAlreadyExist(code)) {
      this.generateRoomCode();
    } else {
      return code;
    }
  }

  /**
   * Creates a room object in the database
   * @param {object} room
   * @returns a boolean that indicates if the creation was successfull
   */
  async createRoom(room) {
    if (room.name && room.description && room.host && room.email) {
      try {
        let code = await this.generateRoomCode();
        let result = await this.rooms.insertOne({
          email: room.email,
          host: room.host,
          name: room.name,
          description: room.description,
          party: room.party,
          code: code,
          Created_at: Date.now(),
        });
        return result.insertedId ? await this.getRoom(code) : false;
      } catch (e) {
        console.log(e.stack);
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Gets a room based on the room code.
   * @param {string} code
   * @returns {object} returns the information from the room.
   */
  async getRoom(code) {
    if (await this.doesRoomAlreadyExist(code)) {
      try {
        let res = await this.rooms.findOne({ code: code }, { code: 1 });
        return res;
      } catch (e) {
        console.log(e.stack);
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Removes a room from the database
   * @param {string} code
   * @returns a boolean that indicates if the deletion was successfull or not
   */
  async removeRoom(code) {
    if (code && (await this.doesRoomAlreadyExist(code))) {
      try {
        let res = await this.rooms.deleteMany({ code: code });
        return res.deletedCount > 0 ? true : false;
      } catch (e) {
        console.log(e.stack);
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Adds a song to the played_songs array.
   * @param {string} code room code
   * @param {string} id id of the song
   * @returns a boolean to indicate whether the update was successfull.
   */
  async addSongToRoom(code, data) {
    if ((await this.doesRoomAlreadyExist(code)) && data) {
      try {
        let res = await this.rooms.updateMany(
          { code: code },
          { $push: { played_songs: data } }
        );
        return res.modifiedCount > 0 ? true : false;
      } catch (e) {
        console.log(e.stack);
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Modifies the current host of the room.
   * @param {string} code room code
   * @param {string} host name of the host
   * @returns a boolean to indicate whether the update was successfull.
   */
  async changeHostOfRoom(code, host) {
    if ((await this.doesRoomAlreadyExist(code)) && host) {
      try {
        let res = await this.rooms.updateMany(
          { code: code },
          { $set: { host: host } }
        );
        return res.modifiedCount > 0 ? true : false;
      } catch (e) {
        console.log(e.stack);
      }
    } else {
      return false;
    }
  }

  async endRoom(
    code,
    members,
    song_most_votes,
    played_songs,
    Q_votes,
    Q_songs
  ) {
    if (await this.doesRoomAlreadyExist(code)) {
      try {
        let res = await this.rooms.updateOne(
          { code: code },
          {
            $set: {
              joined_members: members,
              song_most_votes: song_most_votes,
              played_songs: played_songs,
              Q_votes: Q_votes,
              Q_songs: Q_songs,
            },
          },
          { upsert: true }
        );
        return res.modifiedCount > 0 ? true : false;
      } catch (e) {
        console.log(e.stack);
      }
      return true;
    } else {
      return false;
    }
  }
}

const database = new Database("room-database");
module.exports = { database };
