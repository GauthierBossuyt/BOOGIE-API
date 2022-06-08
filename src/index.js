const HTTP = require("http");
const EXPRESS = require("./server.js");
const SOCKET = require("./socket.js");
const PORT = process.env.PORT || 8080;

const SERVER = HTTP.createServer(EXPRESS);
SOCKET.initialize(SERVER);

SERVER.listen(PORT, () => {
  console.log(`BOOGIE DATABASE API running on ${PORT}`);
});
