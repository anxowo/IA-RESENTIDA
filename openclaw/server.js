const express = require("express");
const { exec } = require("child_process");

console.log("INICIANDO SERVIDOR WARP...");

const app = express();
app.use(express.json());

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

async function sendToWarp(message) {
  try {
    await run(`wmctrl -x -a warp.Warp`);
    await new Promise(r => setTimeout(r, 800));

    const safeMessage = message.replace(/"/g, '\\"');

    // Ejecutamos comando y redirigimos salida a archivo temporal
    await run(`xdotool type --delay 5 "${safeMessage} > /tmp/warp_output.txt 2>&1"`);
    await new Promise(r => setTimeout(r, 300));

    await run(`xdotool key Return`);
    await new Promise(r => setTimeout(r, 15000));

    const output = await run(`cat /tmp/warp_output.txt`);

    return output || "Comando ejecutado pero sin salida.";

  } catch (error) {
    return `Error interactuando con Warp:\n${error}`;
  }
}

app.post("/webhook", async (req, res) => {
  console.log("Petición recibida:", req.body);

  const message = req.body.message;

  if (!message) {
    return res.send("No se recibió mensaje.");
  }

  try {
    const result = await sendToWarp(message);
    res.send(result);
  } catch (err) {
    res.send("Error:\n" + err);
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor Warp UI activo en puerto ${PORT}`);
});

