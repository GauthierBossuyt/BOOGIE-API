const { Server } = require("socket.io");
const { Database, database } = require("./mongoDatabase.js");
class Socket {
  constructor() {
    this.io;
    this.roomData = {};
    this.members = {};
    this.listeners = {};
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: `${process.env.SOCKET_URL}`,
      },
      pingInterval: 1000,
      pingTimeout: 2000,
    });

    this.io.on("connection", (socket) => {
      console.log(`User: ${socket.id} has connected!`);

      socket.on("disconnect", async (e) => {
        console.log(`User: ${socket.id} has disconnected!`);

        if (this.members[socket.id]) {
          let roomcode = this.members[socket.id].room;

          //Remove member from room
          let isMember = this.roomData[roomcode].members.findIndex(
            (user) => user.socket_id === socket.id
          );
          let isHost;

          if (isMember !== -1) {
            let item = this.roomData[roomcode].members.splice(isMember, 1);
            isHost = item[0].isHost;
            this.io
              .in(roomcode)
              .emit("display message", `${item[0].name} has left the room!`);
            this.roomData[roomcode].actions.push({
              message: `has left the room.`,
              target: item[0].name,
            });
          }

          //Remove room if no users are left
          if (this.roomData[roomcode].members.length <= 0) {
            this.io.in(roomcode).emit("force leave");
            let room = this.roomData[roomcode];
            database.endRoom(
              roomcode,
              room.joined_members,
              room.song_most_votes,
              room.played_songs,
              room.Q_songs,
              room.Q_votes
            );
            delete this.roomData[roomcode];
            console.log(roomcode + " has ended");
          } else if (this.roomData[roomcode].members.length > 0 && isHost) {
            this.roomData[roomcode].host =
              this.roomData[roomcode].members[0].socket_id;
            this.io
              .to(this.roomData[roomcode].members[0].socket_id)
              .emit("activate host mode");
            this.roomData[roomcode].members[0].isHost = true;
            this.roomData[roomcode].Q_songs--;
            this.roomData[roomcode].played_songs.pop();
            await database.changeHostOfRoom(
              roomcode,
              this.roomData[roomcode].members[0].name
            );
          }

          //Remove user from user object
          delete this.members[socket.id];
        } else if (this.listeners[socket.id]) {
          let roomcode = this.listeners[socket.id].room;
          if (this.roomData[roomcode]) {
            let isVisualsConnection = this.roomData[
              roomcode
            ].visual_connections.indexOf(socket.id);
            if (isVisualsConnection !== -1) {
              this.roomData[roomcode].visual_connections.splice(
                isVisualsConnection,
                1
              );
            }
          }

          delete this.listeners[socket.id];
        }
      });

      this.joinEvents(socket);
      this.statusEvents(socket);
      this.queueEvents(socket);
      this.votingEvents(socket);
      this.voteEvents(socket);
      this.addEvents(socket);
      this.banEvents(socket);
      this.setCurrentSong(socket);
      this.endEvents(socket);
      this.suggestionVoting(socket);
    });
  }

  joinEvents(socket) {
    socket.on("join", (room_id, user_info) => {
      if (!this.roomData[room_id]) {
        this.roomData[room_id] = {
          queue: [],
          members: [],
          visual_connections: [],
          banned_members: [],
          banned_songs: [],
          current_song: {},
          next_song: {},
          audio_features: {},
          joined_members: [],
          voting: [],
          actions: [],
          song_most_votes: { id: null, votes: 0 },
          played_songs: [],
          Q_songs: 0,
          Q_votes: 0,
          host: "",
        };
      }
      socket.join(room_id);
      let isHost = false;

      if (this.roomData[room_id].members.length === 0) {
        this.roomData[room_id].host = socket.id;
        this.io.to(socket.id).emit("activate host mode");
        isHost = true;
      } else {
        let index = this.roomData[room_id].banned_members.indexOf(
          user_info.display_name
        );
        if (index !== -1) {
          this.io.to(socket.id).emit("force leave");
        }
        if (this.roomData[room_id].voting.length > 0) {
          this.io
            .to(socket.id)
            .emit("start voting", true, this.roomData[room_id].voting);
        }

        // index = this.roomData[room_id].members.find(
        //   (x) => x.name === user_info.display_name
        // );
        // if (index !== undefined) {
        //   this.io.to(socket.id).emit("force leave");
        // }
      }

      this.roomData[room_id].members.push({
        socket_id: socket.id,
        name: user_info.display_name,
        spotify_id: user_info.id,
        isHost: isHost,
      });

      let joined = this.roomData[room_id].joined_members.findIndex(
        (x) => x.name === user_info.display_name
      );

      if (joined === -1) {
        this.roomData[room_id].joined_members.push({
          name: user_info.display_name,
          spotify_id: user_info.id,
        });
      }

      this.members[socket.id] = { room: room_id, name: user_info.display_name };
      this.io
        .in(room_id)
        .emit("person joined", this.roomData[room_id], user_info.display_name);
      this.roomData[room_id].actions.push({
        message: `has joined the room.`,
        target: user_info.display_name,
      });
    });

    socket.on("listener join", (room_id) => {
      if (!this.roomData[room_id]) {
        this.io.to(socket.id).emit("force leave");
      } else {
        if (this.roomData[room_id].visual_connections.length >= 1) {
          this.io.to(socket.id).emit("force leave");
        } else {
          socket.join(room_id);
          this.listeners[socket.id] = { room: room_id };
          this.roomData[room_id].visual_connections.push(socket.id);
          this.io
            .to(socket.id)
            .emit("new song being played", this.roomData[room_id].current_song);
          this.io
            .to(socket.id)
            .emit("audio features", this.roomData[room_id].audio_features);
        }
      }
    });
  }

  statusEvents(socket) {
    socket.on("room status", (room_id) => {
      if (this.roomData[room_id]) {
        if (socket.id === this.roomData[room_id].host) {
          this.io
            .to(socket.id)
            .emit("room info", this.roomData[room_id], this.members);
        }
      }
    });
  }

  queueEvents(socket) {
    socket.on("add song to queue", (object, room_id) => {
      if (this.roomData[room_id]) {
        if (
          this.roomData[room_id].queue.findIndex((x) => x.id === object.id) ===
            -1 &&
          this.roomData[room_id].banned_songs.findIndex(
            (x) => x.id === object.id
          ) === -1 &&
          this.roomData[room_id].banned_songs.findIndex(
            (x) => x.external_ids.isrc === object.external_ids.isrc
          ) === -1
        ) {
          this.roomData[room_id].queue.push(object);
          this.io
            .in(room_id)
            .emit(
              "successfully added song to queue",
              object.id,
              this.roomData[room_id].queue
            );
          this.roomData[room_id].actions.push({
            message: `added ${object.name} to the queue.`,
            target: this.members[socket.id].name,
          });
        } else {
          this.io
            .to(socket.id)
            .emit(
              "display message",
              `${object.name} could not be added to the queue.`
            );
        }
      }
    });

    socket.on("get queue", (room_id) => {
      if (this.roomData[room_id]) {
        this.io.to(socket.id).emit("send queue", this.roomData[room_id].queue);
      }
    });
  }

  getSongsFromQueue(x, room_id) {
    let queue = [];
    for (let i = 0; i < x; i++) {
      queue.push({ votes: 0, data: this.roomData[room_id].queue.shift() });
    }
    return queue;
  }

  votingEvents(socket) {
    socket.on("start voting", (room_id) => {
      if (this.roomData[room_id]) {
        if (socket.id === this.roomData[room_id].host) {
          this.io.in(room_id).emit("voting status", false);
          let queueLength = this.roomData[room_id].queue.length;

          if (this.roomData[room_id].voting.length > 0) {
            this.roomData[room_id].voting.sort((a, b) => b.votes - a.votes);
            this.io
              .to(this.roomData[room_id].host)
              .emit("add song to queue", this.roomData[room_id].voting[0].data);
            this.roomData[room_id].next_song =
              this.roomData[room_id].voting[0].data;
            if (
              this.roomData[room_id].song_most_votes.votes <
              this.roomData[room_id].voting[0].votes
            ) {
              this.roomData[room_id].song_most_votes = {
                id: this.roomData[room_id].voting[0].data.id,
                votes: this.roomData[room_id].voting[0].votes,
              };
            }
            this.roomData[room_id].voting = [];
          } else {
            this.roomData[room_id].next_song = {};
          }
          this.io
            .to(room_id)
            .emit("next song data", this.roomData[room_id].next_song);

          if (queueLength === 0) {
            this.io
              .to(this.roomData[room_id].host)
              .emit("request for suggestion songs");
          } else if (queueLength === 1) {
            this.roomData[room_id].next_song = this.roomData[room_id].queue[0];
            let song_id = this.roomData[room_id].queue.shift();

            this.io
              .to(room_id)
              .emit("next song data", this.roomData[room_id].next_song);
            this.io
              .to(this.roomData[room_id].host)
              .emit("add song to queue", song_id);
            this.io
              .to(this.roomData[room_id].host)
              .emit("request for suggestion songs");
          } else if (queueLength === 2) {
            let queue = this.getSongsFromQueue(2, room_id);
            this.roomData[room_id].voting = queue;
            this.io
              .in(room_id)
              .emit(
                "start voting",
                true,
                this.roomData[room_id].voting,
                this.roomData[room_id].queue
              );
          } else if (queueLength >= 3) {
            let queue = this.getSongsFromQueue(3, room_id);
            this.roomData[room_id].voting = queue;
            this.io
              .in(room_id)
              .emit(
                "start voting",
                true,
                this.roomData[room_id].voting,
                this.roomData[room_id].queue
              );
          }
        }
      }
    });
  }

  voteEvents(socket) {
    socket.on("vote for song", (room_id, song) => {
      this.roomData[room_id].voting.forEach((element, i) => {
        if (element.data.id === song.data.id) {
          this.roomData[room_id].voting[i].votes++;
          this.io
            .to(socket.id)
            .emit("succesfully voted on song", this.roomData[room_id]);
          this.io
            .in(room_id)
            .emit("someone voted on a song", this.roomData[room_id]);
          this.roomData[room_id].actions.push({
            message: `voted on ${song.data.name}`,
            target: this.members[socket.id].name,
          });
          this.roomData[room_id].Q_votes++;
        }
      });
    });
  }

  addEvents(socket) {
    socket.on("successfully added song to the queue", async (room_id, song) => {
      this.io
        .in(room_id)
        .emit(
          "display message",
          `${song.name} has been added to the Spotify queue!`
        );
      this.roomData[room_id].actions.push({
        message: `has been added to the Spotify queue.`,
        target: song.name,
      });
    });
  }

  setCurrentSong(socket) {
    socket.on("Set Current Song", async (room_id, song, audio_features) => {
      if (this.roomData[room_id] && song) {
        this.roomData[room_id].current_song = song;
        this.roomData[room_id].audio_features = audio_features;
        this.io.to(room_id).emit("new song being played", song);
        this.io
          .to(this.roomData[room_id].visual_connections[0])
          .emit("audio features", audio_features);
        this.roomData[room_id].played_songs.push(song.item.id);
        this.roomData[room_id].Q_songs++;
      }
    });

    socket.on("request current song", (room_id) => {
      if (this.roomData[room_id]) {
        this.io
          .to(this.roomData[room_id].host)
          .emit("get current song playing data", socket.id);
      }
    });

    socket.on("current song data", (room_id, data, id) => {
      if (room_id && data && id) {
        if (this.roomData[room_id]) {
          this.roomData[room_id].current_song = data;
          this.io.to(id).emit("requested current song data", data);
        }
      }
    });
  }

  banEvents(socket) {
    socket.on("ban user", (sessionCode, name) => {
      if (sessionCode && name) {
        let user = this.roomData[sessionCode].members.findIndex(
          (x) => x.name === name
        );
        if (user !== -1) {
          this.io
            .to(this.roomData[sessionCode].members[user].socket_id)
            .emit("force leave");
          if (this.roomData[sessionCode].banned_members.indexOf(name) === -1) {
            this.roomData[sessionCode].banned_members.push(name);
            this.io
              .to(socket.id)
              .emit("display message", `${name} has been banned.`);
            this.roomData[sessionCode].actions.push({
              message: `banned ${name}`,
              target: this.members[socket.id].name,
            });
            this.io
              .to(this.roomData[sessionCode].host)
              .emit("update settings", this.roomData[sessionCode]);
          }
        } else {
          this.io
            .to(socket.id)
            .emit("display message", `Couldn't find user ${name}!`);
        }

        let joined = this.roomData[sessionCode].joined_members.findIndex(
          (x) => x.name === name
        );
        if (joined !== -1) {
          this.roomData[sessionCode].joined_members.splice(joined, 1);
        }
      }
    });

    socket.on("ban song", (sessionCode, song) => {
      if (sessionCode && song) {
        if (
          this.roomData[sessionCode].banned_songs.findIndex(
            (x) => x.id === song.id
          ) === -1 &&
          this.roomData[sessionCode].banned_songs.findIndex(
            (x) => x.external_ids.isrc === song.external_ids.isrc
          ) === -1
        ) {
          this.roomData[sessionCode].banned_songs.push(song);
          this.io
            .to(socket.id)
            .emit("display message", `${song.name} has been banned.`);
          this.roomData[sessionCode].actions.push({
            message: `banned ${song.name}`,
            target: this.members[socket.id].name,
          });
          this.io
            .to(this.roomData[sessionCode].host)
            .emit("update settings", this.roomData[sessionCode]);
        }

        let i_id = this.roomData[sessionCode].queue.findIndex(
          (x) => x.id === song.id
        );

        let i_isrc = this.roomData[sessionCode].queue.findIndex(
          (x) => x.external_ids.isrc === song.external_ids.isrc
        );

        if (i_id >= 0) {
          this.roomData[sessionCode].queue.shift(i_id, 1);
          this.io
            .to(socket.id)
            .emit(
              "display message",
              `${song.name} has been removed from the queue!`
            );
        } else if (i_isrc >= 0) {
          this.roomData[sessionCode].queue.shift(i_isrc, 1);
          this.io
            .to(socket.id)
            .emit(
              "display message",
              `${song.name} has been removed from the queue!`
            );
        }
      }
    });

    socket.on("unban song", (sessionCode, song) => {
      if (sessionCode && song) {
        let index = this.roomData[sessionCode].banned_songs.findIndex(
          (x) => x.id === song.id
        );
        if (index >= 0) {
          this.roomData[sessionCode].banned_songs.shift(index, 1);
          this.io.to(socket.id).emit(`You have unbanned ${song.name}.`);
          this.roomData[sessionCode].actions.push({
            message: `unbanned ${song.name}`,
            target: this.members[socket.id].name,
          });
          this.io
            .to(this.roomData[sessionCode].host)
            .emit("update settings", this.roomData[sessionCode]);
        }
      }
    });

    socket.on("unban user", (sessionCode, name) => {
      if (this.roomData[sessionCode] && name) {
        let index = this.roomData[sessionCode].banned_members.indexOf(name);
        if (index >= 0) {
          this.roomData[sessionCode].banned_members.shift(index, 1);
          this.io
            .to(socket.id)
            .emit("display message", `You have unbanned ${name}.`);
          this.roomData[sessionCode].actions.push({
            message: `unbanned ${name}`,
            target: this.members[socket.id].name,
          });
          this.io
            .to(this.roomData[sessionCode].host)
            .emit("update settings", this.roomData[sessionCode]);
        }
      }
    });
  }

  endEvents(socket) {
    socket.on("end room", (sessionCode) => {
      if (sessionCode) {
        if (this.roomData[sessionCode].host === socket.id) {
          this.io.in(sessionCode).emit("force leave");
          let room = this.roomData[sessionCode];
          database.endRoom({
            members: room.joined_members,
            song_most_votes: room.song_most_votes,
            played_songs: room.played_songs,
            Q_songs: room.Q_songs,
            Q_votes: room.Q_votes,
          });
        }
      }
    });
  }

  suggestionVoting(socket) {
    socket.on("suggestion voting", (data, room_id) => {
      let voting = [];
      for (let i = 0; i < 3; i++) {
        voting.push({ data: data[i], votes: 0 });
      }
      this.roomData[room_id].voting = voting;
      this.io
        .to(room_id)
        .emit(
          "start voting",
          true,
          this.roomData[room_id].voting,
          this.roomData[room_id].queue
        );
    });
  }
}

module.exports = new Socket();
