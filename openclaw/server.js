const express = require("express");
const { exec } = require("child_process");

console.log("INICIANDO SERVIDOR DIRECTO...");

const app = express();
app.use(express.json());

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, {
      maxBuffer: 1024 * 1024 * 10,
      timeout: 60000
    }, (error, stdout, stderr) => {
      if (error) {
        return resolve(stderr || error.message);
      }
      resolve(stdout || stderr);
    });
  });
}

app.post("/webhook", async (req, res) => {
  console.log("Petición recibida");

  const message = req.body.message;

  if (!message) {
    return res.send("No se recibió comando.");
  }

  try {
    const result = await runCommand(message);
    res.send(result);
  } catch (err) {
    res.send("Error:\n" + err.message);
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor ejecutando comandos en puerto ${PORT}`);
});

