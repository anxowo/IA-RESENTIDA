const express = require("express");
const { exec } = require("child_process");

console.log("INICIANDO SERVIDOR WARP...");

const app = express();
app.use(express.json());

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { env: process.env }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

app.post("/webhook", async (req, res) => {
  console.log("Petición recibida");

  const message = req.body.message;
  if (!message) return res.send("No message");

  try {
    await run(`wmctrl -a Warp`);
    await run(`xdotool type --delay 10 "${message.replace(/"/g, '\\"')}"`);
    await run(`xdotool key Return`);

    await new Promise(r => setTimeout(r, 4000));

    await run(`xdotool key ctrl+a`);
    await run(`xdotool key ctrl+c`);

    await new Promise(r => setTimeout(r, 500));

    const output = await run(`xclip -o -selection clipboard`);

    res.send(output);

  } catch (e) {
    console.error("Error:", e);
    res.send("Error:\n" + e.message);
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en ${PORT}`);
});

// Esto evita que el proceso muera por error silencioso
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// Mantener vivo explícitamente
setInterval(() => {}, 10000);

