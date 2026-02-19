const express = require("express");
const { exec } = require("child_process");

console.log("INICIANDO SERVIDOR WARP AGENT...");

const app = express();
app.use(express.json());

function runWarpAgent(prompt) {
  return new Promise((resolve, reject) => {
    exec(
      `warp-terminal agent run --output-format text --prompt "${prompt.replace(/"/g, '\\"')}"`,
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(stderr || error.message);
        }
        resolve(stdout);
      }
    );
  });
}

app.post("/webhook", async (req, res) => {
  const message = req.body.message;

  if (!message) {
    return res.send("No se recibió mensaje.");
  }

  try {
    const result = await runWarpAgent(message);
    res.send(result);
  } catch (err) {
    res.send("Error:\n" + err);
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor Warp Agent activo en ${PORT}`);
});

