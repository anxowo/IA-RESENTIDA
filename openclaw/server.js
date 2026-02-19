const express = require("express");
const app = express();

app.use(express.json());

const interpret = require("./services/aiInterpreter");
const mapToCommand = require("./services/commandMapper");
const executeCommand = require("./services/commandExecutor");
const validateCommand = require("./services/securityValidator");
const sendToWarp = require("./services/warpSender");

app.post("/webhook", async (req, res) => {
  const message = req.body.message;

  // Demo visual
  //sendToWarp(message);

  const intent = interpret(message);

  if (!intent) {
    return res.send("[openclaw] No entiendo la petición.");
  }

  const command = mapToCommand(intent);

  if (!command) {
    return res.send("[openclaw] No puedo ejecutar esa acción.");
  }

  if (!validateCommand(command)) {
    return res.send("[openclaw] Comando bloqueado por seguridad.");
  }

  try {
    const result = await executeCommand(command);
    return res.send("[openclaw]\n\n" + result);
  } catch (err) {
    return res.send("[openclaw] Error:\n" + err);
  }
});


app.listen(3000, () => {
  console.log("OpenClaw corriendo en puerto 3000");
});

