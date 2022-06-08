//PACKAGES
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const { database } = require("./mongoDatabase.js");
const spotify = require("./routes/spotify.js");
const { Timestamp } = require("mongodb");
require("dotenv").config();
//GLOBAL VARIABLES
const SERVER = express();
const ROOM_ROUTER = express.Router();
const LOGIN_ROUTER = express.Router();

//FUNCTIONS
SERVER.use(cors());
SERVER.use(bodyParser.json());
SERVER.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

LOGIN_ROUTER.route("/spotify").post(spotify.spotify_login);

ROOM_ROUTER.route("/")

  .get(async (req, res) => {
    if (req.query.code) {
      let result = await database.getRoom(req.query.code);
      if (result.length > 0) {
        res.status(200).send({ room: result });
      } else {
        res.status(404).send({ message: "Room not found!" });
      }
    } else {
      res.status(400).send({
        message: "A code is necessary to join a room!",
      });
    }
  })

  .delete(async (req, res) => {
    if (req.body.code) {
      if (await database.removeRoom(req.body.code)) {
        res.status(200).send({
          message: "Room has been deleted succesfully!",
        });
      } else {
        res.status(404).send({
          message: `A room couldn't be found with this code.`,
        });
      }
    } else {
      res.status(400).send({
        message: "A code is necessary to delete a room!",
      });
    }
  })

  .post(async (req, res) => {
    if (req.body.room) {
      if (
        req.body.room.name &&
        req.body.room.description &&
        req.body.room.email &&
        req.body.room.host
      ) {
        let result = await database.createRoom(req.body.room);
        if (result === false) {
          res.status(404).send({
            ERROR: `The credentials given are incorrect!`,
          });
        } else {
          res.status(200).send({ room: result });
        }
      } else {
        res.status(400).send({
          ERROR: "All credentials to make a room should be given!",
        });
      }
    } else {
      res.status(400).send({ ERROR: "Credentials must be given!" });
    }
  });

SERVER.patch("/update", async (req, res) => {
  if (req.body.type === "host") {
    (await database.changeHostOfRoom(req.body.code, req.body.host))
      ? res.status(200).send({ message: "The room's host has been updated!" })
      : res.status(400).send({ ERROR: "Could not change the host names!" });
  } else if (req.body.type === "song") {
    (await database.addSongToRoom(req.body.code, req.body.songdata))
      ? res
          .status(200)
          .send({ message: "Song has been added to the array successfully!" })
      : res.status(400).send({ ERROR: "Could not add the song to the array!" });
  } else {
    res.status(400).send({ ERROR: "Unable to update room data!" });
  }
});

SERVER.get("/", async (req, res) => {
  res.status(200).send({ name: "Boogie-api", time: Date.now() });
});

SERVER.use("/rooms", ROOM_ROUTER);
SERVER.use("/login", LOGIN_ROUTER);

module.exports = SERVER;
