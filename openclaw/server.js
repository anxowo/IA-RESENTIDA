const express = require("express");
const pty = require("node-pty");

console.log("INICIANDO SERVIDOR CON WARP...");

const app = express();
app.use(express.json());

// Lanzamos Warp como proceso persistente
const warpProcess = pty.spawn("warp", [], {
  name: "xterm-color",
  cols: 120,
  rows: 40,
  cwd: process.cwd(),
  env: process.env
});

let lastOutput = "";

warpProcess.onData((data) => {
  lastOutput += data;
});

// Endpoint
app.post("/webhook", async (req, res) => {
  const message = req.body.message;

  if (!message) {
    return res.send("No message received.");
  }

  lastOutput = "";

  // Enviamos mensaje a Warp
  warpProcess.write(message + "\r");

  // Esperamos 2 segundos a que Warp procese
  setTimeout(() => {
    const response = lastOutput.trim();
    res.send(response || "Sin respuesta de Warp");
  }, 2000);
});

app.listen(3000, () => {
  console.log("Servidor escuchando en puerto 3000");
});

