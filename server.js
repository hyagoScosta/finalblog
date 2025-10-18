import express from "express";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

const DB_PATH = "./chat.db.json";
let history = [];

function loadHistory() {
  try {
    if (fs.existsSync(DB_PATH)) {
      history = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Falha ao carregar histórico:", e);
  }
}
function saveHistory() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(history.slice(-500), null, 2));
  } catch (e) {
    console.error("Falha ao salvar histórico:", e);
  }
}
loadHistory();

io.on("connection", (socket) => {
  socket.emit("chat:history", history.slice(-100));

  socket.on("chat:send", (msg) => {
    const text = String(msg?.text ?? "").slice(0, 2000);
    const author = String(msg?.author ?? "visitante").slice(0, 50);
    const payload = {
      id: crypto.randomUUID?.() ?? String(Math.random()).slice(2),
      text,
      author,
      t: Date.now()
    };
    history.push(payload);
    if (history.length % 10 === 0) saveHistory();
    io.emit("chat:new", payload);
  });
});

process.on("SIGINT", () => { saveHistory(); process.exit(0); });
process.on("SIGTERM", () => { saveHistory(); process.exit(0); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor no ar em http://localhost:" + PORT);
});
